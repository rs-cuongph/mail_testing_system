import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { MailParserService } from './mail-parser.service';
import { ThreadsService } from '../threads/threads.service';
import { EmailsService } from '../emails/emails.service';
import { EventsGateway } from '../events/events.gateway';
import { AttachmentsService } from '../attachments/attachments.service';


@Injectable()
export class ImapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImapService.name);
  private client: ImapFlow | null = null;
  private isRunning = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY_MS = 5000;
  private readonly configuredDomain: string;
  private readonly configuredBaseAddress: string;

  constructor(
    private readonly config: ConfigService,
    private readonly mailParser: MailParserService,
    private readonly threadsService: ThreadsService,
    private readonly emailsService: EmailsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.configuredDomain = this.config.get<string>('MAIL_DOMAIN', 'runsystem.work').trim() || 'runsystem.work';
    this.configuredBaseAddress = this.config.get<string>('MAIL_BASE_ADDRESS', 'gens').trim() || 'gens';
  }

  async onModuleInit() {
    // Don't await — connect() contains an infinite IDLE loop.
    // Fire-and-forget so NestJS can finish binding the HTTP port.
    this.connect().catch((err) =>
      this.logger.error(`IMAP startup failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    this.isRunning = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.disconnect();
  }

  private buildClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.get('IMAP_HOST', 'localhost'),
      port: parseInt(this.config.get('IMAP_PORT', '993')),
      secure: this.config.get('IMAP_TLS', 'true') === 'true',
      auth: {
        user: this.config.get('IMAP_USER', ''),
        pass: this.config.get('IMAP_PASSWORD', ''),
      },
      logger: false,
    });
  }

  private async connect() {
    this.isRunning = true;
    try {
      this.client = this.buildClient();
      await this.client.connect();
      this.logger.log('✅ IMAP connected');

      const mode = this.config.get('IMAP_MODE', 'idle');
      if (mode === 'idle') {
        await this.listenWithIdle();
      } else {
        await this.listenWithPolling();
      }
    } catch (err) {
      this.logger.error(`IMAP connection failed: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  private async disconnect() {
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
    this.reconnectTimer = setTimeout(() => this.connect(), this.RECONNECT_DELAY_MS);
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
    const interval = parseInt(this.config.get('IMAP_POLL_INTERVAL', '5000'));
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
    for await (const msg of this.client.fetch('1:*', { envelope: true, source: true }, { uid: true })) {
      if (!msg.source) continue;
      await this.processRawEmail(msg.source);
    }
  }

  private async processRawEmail(source: Buffer) {
    try {
      const extracted = await this.mailParser.parse(source);
      if (!extracted) return;

      // Deduplication — skip if messageId already exists
      const existing = await this.emailsService.findByMessageId(extracted.messageId);
      if (existing) return;

      const domain = extracted.toEmail.split('@')[1] ?? this.configuredDomain;
      const baseAddr = this.configuredBaseAddress;
      const fullAddress = extracted.tag
        ? `${baseAddr}+${extracted.tag}@${domain}`
        : `${baseAddr}@${domain}`;
      const tag = extracted.tag ?? 'default';
      const threadFullAddress = extracted.tag ? fullAddress : `${fullAddress} (default)`;

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
}
