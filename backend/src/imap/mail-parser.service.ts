import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { simpleParser, ParsedMail } from 'mailparser';

export interface ExtractedEmail {
  messageId: string;
  fromEmail: string;
  toEmail: string;
  tag: string | null;
  baseAddress: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: Date;
  rawHeaders: Record<string, string>;
  attachments: ExtractedAttachment[];
}

export interface ExtractedAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

@Injectable()
export class MailParserService {
  private readonly logger = new Logger(MailParserService.name);
  private readonly domain: string;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('MAIL_DOMAIN', 'runsystem.work').trim();
    // Validate domain: basic pattern check
    if (raw && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(raw)) {
      this.domain = raw;
    } else {
      this.logger.warn(
        `⚠️ MAIL_DOMAIN="${raw}" is invalid or empty — falling back to "rn.work"`,
      );
      this.domain = 'rn.work';
    }
    this.logger.log(`📧 Filtering emails for domain: @${this.domain}`);
  }

  getDomain(): string {
    return this.domain;
  }

  async parse(rawEmail: Buffer, expectedDomain?: string): Promise<ExtractedEmail | null> {
    const parsed: ParsedMail = await simpleParser(rawEmail);

    // Extract target address from To header (To field only, not CC/BCC)
    const toAddresses = parsed.to
      ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap(
          (addr) => addr.value,
        )
      : [];

    const checkDomain = expectedDomain || this.domain;
    const targetAddress = toAddresses.find(
      (addr) => addr.address && addr.address.endsWith(`@${checkDomain}`),
    );

    if (!targetAddress?.address) return null;

    const { tag, baseAddress } = this.extractTag(targetAddress.address);

    const rawHeaders: Record<string, string> = {};
    parsed.headerLines?.forEach((h) => {
      rawHeaders[h.key] = h.line;
    });

    return {
      messageId: parsed.messageId ?? `generated-${Date.now()}`,
      fromEmail: parsed.from?.value[0]?.address ?? 'unknown',
      toEmail: targetAddress.address,
      tag,
      baseAddress,
      subject: parsed.subject ?? '',
      textBody: parsed.text ?? null,
      htmlBody: parsed.html || null,
      receivedAt: parsed.date ?? new Date(),
      rawHeaders,
      attachments: (parsed.attachments ?? []).map((a) => ({
        filename: a.filename ?? 'attachment',
        contentType: a.contentType,
        size: a.size,
        content: a.content,
      })),
    };
  }

  private extractTag(email: string): {
    tag: string | null;
    baseAddress: string;
  } {
    const [local] = email.split('@');
    const [base, tag] = local.split('+');
    return { baseAddress: base, tag: tag ?? null };
  }
}
