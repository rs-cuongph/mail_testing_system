import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ImapFlow } from 'imapflow';
import { MailParserService } from './mail-parser.service';
import { ThreadsService } from '../threads/threads.service';
import { EmailsService } from '../emails/emails.service';
import { EventsGateway } from '../events/events.gateway';
import { AttachmentsService } from '../attachments/attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialBridgeService } from '../credentials/credential-bridge.service';

@Injectable()
export class ImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImapService.name);
  private client: ImapFlow | null = null;
  private isRunning = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY_MS = 5000;
  private configuredDomain: string;
  private configuredBaseAddress: string;

  private imapOptions: any = null;
  private currentMode: string = 'idle';
  private currentPollInterval: number = 5000;

  // State Tracking
  private status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  private lastChecked: Date | null = null;
  private lastError: string | null = null;

  private setStatus(status: typeof this.status, error?: string) {
    this.status = status;
    this.lastChecked = new Date();
    this.lastError = error || null;
    this.eventsGateway.server?.emit('imap.status', this.getStatus()); // Broadcast status if connected
  }

  public getStatus() {
    return {
      status: this.status,
      lastChecked: this.lastChecked?.toISOString() || null,
      error: this.lastError,
    };
  }

  constructor(
    private readonly mailParser: MailParserService,
    private readonly threadsService: ThreadsService,
    private readonly emailsService: EmailsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly eventsGateway: EventsGateway,
    private readonly prisma: PrismaService,
    private readonly credentialBridge: CredentialBridgeService,
  ) {}

  async onModuleInit() {
    this.connect().catch((err) =>
      this.logger.error(`IMAP startup failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    this.isRunning = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.disconnect();
  }

  private currentProfileId: string | null = null;

  @OnEvent('profile.switched')
  async handleProfileSwitched() {
    this.logger.log('🔄 Profile switched -> Restarting IMAP connection');
    this.isRunning = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.disconnect();
    setTimeout(() => this.connect(), 1000); // 1-second backoff before reconnect
  }

  private async loadConfig() {
    try {
      const activeProfile = await this.prisma.imapProfile.findFirst({ where: { isActive: true } });
      if (activeProfile) {
        const password = await this.credentialBridge.getPassword(activeProfile.credentialKey);
        if (!password) {
          throw new Error(`No IMAP credential available for active profile ${activeProfile.id}`);
        }

        this.imapOptions = {
          host: activeProfile.imapHost,
          port: activeProfile.imapPort,
          secure: activeProfile.imapTls,
          auth: {
            user: activeProfile.imapUser,
            pass: password,
          },
          logger: false,
        };
        this.configuredDomain = activeProfile.mailDomain;
        this.configuredBaseAddress = activeProfile.mailBaseAddress;
        this.currentMode = activeProfile.imapMode;
        this.currentPollInterval = activeProfile.imapPollInterval;
        this.currentProfileId = activeProfile.id;
        return;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to read active profile from DB: ${err.message}`);
    }

    // Default or pause if no profiles are found but we have no fallback now that we use profiles
    this.imapOptions = null;
    this.currentProfileId = null;
  }

  private buildClient(): ImapFlow {
    if (!this.imapOptions) {
      throw new Error('IMAP Config not loaded or no active profile');
    }
    const client = new ImapFlow(this.imapOptions);

    client.on('error', (err) => {
      this.logger.error(`ImapFlow unexpected error: ${err.message}`);
    });

    client.on('close', () => {
      this.logger.warn(`ImapFlow connection closed.`);
      this.isRunning = false;
      this.scheduleReconnect();
    });

    return client;
  }

  private async connect() {
    this.setStatus('connecting');
    this.isRunning = true;
    try {
      await this.loadConfig();
      this.client = this.buildClient();
      await this.client.connect();
      this.logger.log('✅ IMAP connected');
      this.setStatus('connected');

      // Initial sync of recent history
      await this.syncRecentHistory();

      // The mode should be loaded from DB if available, else from ENV
      if (this.currentMode === 'idle') {
        await this.listenWithIdle();
      } else {
        await this.listenWithPolling();
      }
    } catch (err) {
      this.logger.error(`IMAP connection failed: ${err.message}`);
      this.setStatus('error', err.message);
      this.scheduleReconnect();
    }
  }

  private async disconnect() {
    this.setStatus('disconnected');
    try {
      await this.client?.logout();
    } catch {
      // ignore
    }
    this.client = null;
  }

  private scheduleReconnect() {
    if (!this.isRunning) return;
    this.logger.warn(`Reconnecting in ${this.RECONNECT_DELAY_MS}ms...`);
    this.setStatus('connecting');
    this.reconnectTimer = setTimeout(
      () => this.connect(),
      this.RECONNECT_DELAY_MS,
    );
  }

  private idleLock: any = null;

  private async listenWithIdle() {
    if (!this.client) return;
    const onExists = async (data: any) => {
      this.logger.log(`Inbox changed (exists event). Total: ${data.count}`);
      await this.fetchUnseen();
    };

    try {
      this.idleLock = await this.client.getMailboxLock('INBOX');
      
      this.client.on('exists', onExists);
      
      await this.fetchUnseen();
      this.logger.log('👂 Listening via IMAP IDLE (event-based)...');
      
      // Keep the loop alive as long as we are running
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isRunning || !this.client) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 1000);
      });

    } catch (err) {
      this.logger.error(`IDLE error: ${err.message}`);
      this.scheduleReconnect();
    } finally {
      if (this.client) {
        this.client.removeListener('exists', onExists);
      }
      if (this.idleLock) {
        this.idleLock.release();
        this.idleLock = null;
      }
    }
  }

  private async listenWithPolling() {
    const interval = this.currentPollInterval;
    this.logger.log(`📡 Polling every ${interval}ms...`);
    while (this.isRunning) {
      try {
        const lock = await this.client!.getMailboxLock('INBOX');
        try {
          await this.fetchUnseen();
        } finally {
          lock.release();
        }
      } catch (err) {
        this.logger.error(`Poll error: ${err.message}`);
        this.scheduleReconnect();
        return;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
  }

  private async fetchUnseen() {
    if (!this.client) return;

    try {
      // Find UIDs of all UNSEEN messages
      const uids = await this.client.search({ seen: false }, { uid: true });
      if (!uids || uids.length === 0) {
        return;
      }

      this.logger.log(`Found ${uids.length} unseen messages. Fetching...`);

      const processedUids: number[] = [];

      for await (const msg of this.client.fetch(
        uids,
        { envelope: true, source: true },
        { uid: true },
      )) {
        if (!msg.source) continue;
        await this.processRawEmail(msg.source);
        processedUids.push(msg.uid);
      }

      // Mark the processed messages as SEEN outside the fetch loop to prevent IMAP lock deadlocks
      if (processedUids.length > 0) {
        try {
          await this.client.messageFlagsAdd(processedUids, ['\\Seen'], { uid: true });
        } catch (flagErr) {
          this.logger.warn(`Failed to mark msgs as seen: ${flagErr.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Error in fetchUnseen: ${err.message}`);
    }
  }

  private async syncRecentHistory() {
    if (!this.client) return;

    try {
      this.logger.log(`🔄 Syncing historical recent messages...`);
      const lock = await this.client.getMailboxLock('INBOX');
      try {
        const total = this.client.mailbox && typeof this.client.mailbox !== 'boolean' ? this.client.mailbox.exists : 0;
        this.logger.log(`Historical sync: Mailbox has ${total} total messages.`);
        if (total === 0) return;
        
        // Fetch up to the last 30 emails to populate history
        const start = Math.max(1, total - 29);
        const seqRange = `${start}:*`;
        this.logger.log(`Historical sync: Fetching seqRange ${seqRange}`);
        
        for await (const msg of this.client.fetch(seqRange, { envelope: true, source: true }, { uid: false })) {
          if (!msg.source) continue;
          await this.processRawEmail(msg.source);
        }
        this.logger.log(`✅ Completed historical sync.`);
      } finally {
        lock.release();
      }
    } catch (err) {
      this.logger.error(`Error syncing historical messages: ${err.message}`);
    }
  }

  private async processRawEmail(source: Buffer) {
    try {
      const extracted = await this.mailParser.parse(source, this.configuredDomain);
      if (!extracted) {
        this.logger.debug('Skipped email: Domain mismatch or invalid address.');
        return;
      }

      // Deduplication — skip if messageId already exists
      const existing = await this.emailsService.findByMessageId(
        extracted.messageId,
      );
      if (existing) return;

      const domain = extracted.toEmail.split('@')[1] ?? this.configuredDomain;
      const baseAddr = this.configuredBaseAddress;
      const fullAddress = extracted.tag
        ? `${baseAddr}+${extracted.tag}@${domain}`
        : `${baseAddr}@${domain}`;
      const tag = extracted.tag ?? 'default';
      const threadFullAddress = extracted.tag
        ? fullAddress
        : `${fullAddress} (default)`;

      // Find or create thread
      const { thread, isNew } = await this.threadsService.findOrCreate({
        tag,
        baseAddress: extracted.baseAddress,
        fullAddress: threadFullAddress,
        profileId: this.currentProfileId ?? undefined,
      });

      // Create email record
      const email = await this.emailsService.create({
        messageId: extracted.messageId,
        fromEmail: extracted.fromEmail,
        toEmail: extracted.toEmail,
        subject: extracted.subject,
        textBody: extracted.textBody,
        htmlBody: extracted.htmlBody,
        threadId: thread.id,
        receivedAt: extracted.receivedAt,
        rawHeaders: extracted.rawHeaders,
      });

      // Store attachments
      for (const att of extracted.attachments) {
        await this.attachmentsService.save(att, email.id);
      }

      this.logger.log(`📧 New email: ${extracted.subject} → thread:${tag}`);

      // Emit WebSocket events
      if (isNew) this.eventsGateway.emitThreadNew(thread);
      this.eventsGateway.emitEmailNew(thread.tag, thread.fullAddress, email);
    } catch (err) {
      this.logger.error(`Failed to process email: ${err.message}`);
    }
  }

  // Used by Settings feature to validate credentials before saving
  async testConnection(config: { host: string; port: number; secure: boolean; user: string; pass: string }) {
    return new Promise<void>((resolve, reject) => {
      const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        logger: false,
      });

      // 30 seconds timeout
      const timeoutTimer = setTimeout(() => {
        client.close();
        reject(new Error('Connection timeout after 30000ms'));
      }, 30000);

      client.connect().then(async () => {
        clearTimeout(timeoutTimer);
        await client.logout();
        resolve();
      }).catch((err) => {
        clearTimeout(timeoutTimer);
        reject(err);
      });
    });
  }
}
