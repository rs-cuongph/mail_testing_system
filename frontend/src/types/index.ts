export interface Category {
  id: string;
  name: string;
  color: string;
  threadCount?: number;
}

export interface Thread {
  id: string;
  tag: string;
  fullAddress: string;
  emailCount: number;
  unreadCount: number;
  latestSubject: string | null;
  category: Category | null;
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
  isRead: boolean;
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
  isRead: boolean;
  rawHeaders: Record<string, string>;
  attachments: AttachmentInfo[];
}

export interface ThreadsResponse {
  data: Thread[];
  total: number;
}

export interface SearchResult {
  id: string;
  messageId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  receivedAt: string;
  textBody: string | null;
  isRead: boolean;
  threadTag: string;
  threadFullAddress: string;
}
