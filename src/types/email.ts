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
  attachments?: { name: string; size: number }[];
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
