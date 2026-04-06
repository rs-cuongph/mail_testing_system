import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { ImapFlow } from 'imapflow';
import { MailParserService } from './mail-parser.service';
import { ThreadsService } from '../threads/threads.service';
import { EmailsService } from '../emails/emails.service';
import { EventsGateway } from '../events/events.gateway';
import { AttachmentsService } from '../attachments/attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt } from '../utils/crypto.util';

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
    private readonly config: ConfigService,
    private readonly mailParser: MailParserService,
    private readonly threadsService: ThreadsService,
    private readonly emailsService: EmailsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly eventsGateway: EventsGateway,
    private readonly prisma: PrismaService,
  ) {
    this.configuredDomain =
      this.config.get<string>('MAIL_DOMAIN', 'runsystem.work').trim() ||
      'runsystem.work';
    this.configuredBaseAddress =
      this.config.get<string>('MAIL_BASE_ADDRESS', 'gens').trim() || 'gens';
  }

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

  @OnEvent('config.updated')
  async handleConfigUpdated() {
    this.logger.log('🔄 Configuration updated -> Restarting IMAP connection');
    this.isRunning = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.disconnect();
    setTimeout(() => this.connect(), 1000); // 1-second backoff before reconnect
  }

  private async loadConfig() {
    try {
      const dbConfig = await this.prisma.systemConfig.findUnique({ where: { id: 1 } });
      if (dbConfig) {
        this.imapOptions = {
          host: dbConfig.imapHost,
          port: dbConfig.imapPort,
          secure: dbConfig.imapTls,
          auth: {
            user: dbConfig.imapUser,
            pass: decrypt(dbConfig.imapPassword),
          },
          logger: false,
        };
        this.configuredDomain = dbConfig.mailDomain;
        this.configuredBaseAddress = dbConfig.mailBaseAddress;
        this.currentMode = dbConfig.imapMode;
        this.currentPollInterval = dbConfig.imapPollInterval;
        return;
      }
    } catch (err) {
      this.logger.warn(`Failed to read from DB: ${err.message}, falling back to process.env`);
    }

    // Fallback exactly as before setup
    this.imapOptions = {
      host: this.config.get('IMAP_HOST', 'localhost'),
      port: parseInt(this.config.get('IMAP_PORT', '993')),
      secure: this.config.get('IMAP_TLS', 'true') === 'true',
      auth: {
        user: this.config.get('IMAP_USER', ''),
        pass: this.config.get('IMAP_PASSWORD', ''),
      },
      logger: false,
    };
    this.currentMode = this.config.get('IMAP_MODE', 'idle');
    this.currentPollInterval = parseInt(this.config.get('IMAP_POLL_INTERVAL', '5000'));
  }

  private buildClient(): ImapFlow {
    if (!this.imapOptions) {
      throw new Error('IMAP Config not loaded yet');
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

  private async listenWithIdle() {
    if (!this.client) return;
    try {
      const lock = await this.client.getMailboxLock('INBOX');
      try {
        await this.fetchUnseen();
        this.logger.log('👂 Listening via IMAP IDLE...');
        // imapflow idle() is a Promise<boolean>; re-call it to stay in IDLE
        while (this.isRunning) {
          const hasChanges = await this.client.idle();
          if (hasChanges) {
            await this.fetchUnseen();
          }
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      this.logger.error(`IDLE error: ${err.message}`);
      this.scheduleReconnect();
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

  private async processRawEmail(source: Buffer) {
    try {
      const extracted = await this.mailParser.parse(source);
      if (!extracted) return;

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

