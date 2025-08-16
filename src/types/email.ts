// Gemeinsame E-Mail Interface Definitionen für das Admin-System

export interface ReceivedEmail {
  id: string;
  from: string;
  to?: string;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  receivedAt?: string;
  isRead: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  priority?: 'low' | 'normal' | 'high';
  category?: 'support' | 'inquiry' | 'feedback' | 'business' | 'notification';
  attachments?: Array<{
    name: string;
    size: number;
    type?: string;
  }>;
  // WorkMail specific fields
  source?: string;
  folder?: string;
  messageId?: string;
  size?: number;
  flags?: string[];
  rawContent?: string; // Für PostalMime Parsing
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: string;
  templateId?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: 'support' | 'inquiry' | 'feedback' | 'business' | 'welcome' | 'notification';
  createdAt: string;
}
