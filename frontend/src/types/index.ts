export interface Thread {
  id: string;
  tag: string;
  fullAddress: string;
  emailCount: number;
  latestSubject: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSummary {
  id: string;
  messageId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  receivedAt: string;
  hasAttachments: boolean;
  attachmentCount: number;
}

export interface ThreadDetail {
  thread: Thread;
  emails: EmailSummary[];
  total: number;
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailDetail {
  id: string;
  messageId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: string;
  rawHeaders: Record<string, string>;
  attachments: AttachmentInfo[];
}

export interface ThreadsResponse {
  data: Thread[];
  total: number;
}
