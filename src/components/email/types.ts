// Gemeinsame E-Mail-Typen für alle E-Mail-Komponenten

export interface AdminEmail {
  emailId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isImportant: boolean;
  labels: string[];
  attachments?: any[];
  rawHeaders?: any;
}

export interface EmailTemplate {
  templateId: string;
  name: string;
  subject: string;
  htmlContent: string;
  variables?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailMessage {
  emailId: string;
  to: string | string[];
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
}

export interface Contact {
  contactId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  status: 'active' | 'inactive' | 'bounced';
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}
