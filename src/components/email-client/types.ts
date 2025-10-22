export interface EmailMessage {
  id: string;
  from: {
    email: string;
    name?: string;
  };
  to: {
    email: string;
    name?: string;
  }[];
  cc?: {
    email: string;
    name?: string;
  }[];
  bcc?: {
    email: string;
    name?: string;
  }[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  timestamp: string;
  read: boolean;
  starred: boolean;
  folder: EmailFolder;
  threadId?: string;
  labels?: string[];
  priority: 'low' | 'normal' | 'high';
}

export interface EmailAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url?: string;
}

export interface EmailFolder {
  id: string;
  name: string;
  type: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'starred' | 'archived' | 'custom';
  count: number;
  unreadCount: number;
}

export interface EmailCompose {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments?: File[];
  priority: 'low' | 'normal' | 'high';
  sendLater?: string; // ISO date string
}

export interface EmailFilter {
  folder?: string;
  read?: boolean;
  starred?: boolean;
  from?: string;
  subject?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
}

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  participants: {
    email: string;
    name?: string;
  }[];
  lastMessage: string;
  unreadCount: number;
}
