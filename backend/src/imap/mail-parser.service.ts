import { Injectable } from '@nestjs/common';
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
  async parse(rawEmail: Buffer): Promise<ExtractedEmail | null> {
    const parsed: ParsedMail = await simpleParser(rawEmail);

    // Extract target address from To header (To field only, not CC/BCC)
    const toAddresses = parsed.to
      ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
          .flatMap((addr) => addr.value)
      : [];

    const targetAddress = toAddresses.find(
      (addr) => addr.address && addr.address.includes('@rn.work'),
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

  private extractTag(email: string): { tag: string | null; baseAddress: string } {
    const [local] = email.split('@');
    const [base, tag] = local.split('+');
    return { baseAddress: base, tag: tag ?? null };
  }
}
