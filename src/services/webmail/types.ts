/**
 * Webmail Types and Schemas
 * 
 * Shared types for webmail functionality.
 * The actual IMAP/SMTP logic runs on the Hetzner server (webmail-proxy).
 */

import { z } from 'zod';

// Validation schemas
export const EmailCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  imapHost: z.string().default('mail.taskilo.de'),
  imapPort: z.number().default(993),
  smtpHost: z.string().default('mail.taskilo.de'),
  smtpPort: z.number().default(587),
});

export const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  replyTo: z.string().email().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
});

export type EmailCredentials = z.infer<typeof EmailCredentialsSchema>;

export type EmailCredentialsInput = {
  email: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
};

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

export interface EmailMessage {
  uid: number;
  messageId: string;
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  flags: string[];
  preview: string;
  hasAttachments: boolean;
  size?: number;
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailContent extends EmailMessage {
  text?: string;
  html?: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  data?: string; // Base64 encoded for download
}

export interface Mailbox {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
  specialUse?: string;
  exists: number;
  unseen: number;
}

// Search query interface
export interface SearchQuery {
  text?: string;
  from?: string;
  to?: string;
  subject?: string;
  since?: Date;
  before?: Date;
  hasAttachments?: boolean;
  unread?: boolean;
}

// WebSocket notification types
export interface EmailNotification {
  type: 'new_email' | 'email_read' | 'email_deleted' | 'folder_update';
  mailbox: string;
  uid?: number;
  message?: Partial<EmailMessage>;
  timestamp: Date;
}
