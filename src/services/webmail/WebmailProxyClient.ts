/**
 * Webmail Proxy Client
 * 
 * Connects to the Hetzner-hosted webmail proxy instead of doing
 * IMAP/SMTP operations directly from Vercel serverless functions.
 */

import { 
  EmailMessage, 
  EmailContent, 
  Mailbox, 
  SendEmailInput 
} from './types';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

interface ProxyCredentials {
  email: string;
  password: string;
  [key: string]: unknown;
}

interface MasterUserCredentials {
  email: string;
  useMasterUser: true;
}

async function proxyRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${WEBMAIL_PROXY_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': WEBMAIL_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Proxy request failed');
  }

  return data;
}

export class WebmailProxyClient {
  private credentials: ProxyCredentials;

  constructor(credentials: ProxyCredentials) {
    this.credentials = credentials;
  }

  async testConnection(): Promise<{ imap: boolean; smtp: boolean }> {
    const result = await proxyRequest<{ success: boolean; imap: boolean; smtp: boolean }>(
      '/api/test',
      this.credentials
    );
    return { imap: result.imap, smtp: result.smtp };
  }

  async getMailboxes(): Promise<Mailbox[]> {
    const result = await proxyRequest<{ success: boolean; mailboxes: Mailbox[] }>(
      '/api/mailboxes',
      this.credentials
    );
    return result.mailboxes;
  }

  async getMessages(
    mailbox: string = 'INBOX',
    options: { page?: number; limit?: number } = {}
  ): Promise<{ messages: EmailMessage[]; total: number }> {
    const result = await proxyRequest<{ 
      success: boolean; 
      messages: EmailMessage[]; 
      total: number;
    }>(
      '/api/messages',
      {
        ...this.credentials,
        mailbox,
        page: options.page || 1,
        limit: options.limit || 50,
      }
    );
    
    // Parse dates back to Date objects
    const messages = result.messages.map(msg => ({
      ...msg,
      date: new Date(msg.date),
    }));
    
    return { messages, total: result.total };
  }

  async getMessage(mailbox: string, uid: number): Promise<EmailContent | null> {
    try {
      const result = await proxyRequest<{ success: boolean; message: EmailContent }>(
        '/api/message',
        {
          ...this.credentials,
          mailbox,
          uid,
        }
      );
      
      return {
        ...result.message,
        date: new Date(result.message.date),
      };
    } catch {
      return null;
    }
  }

  async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
    const result = await proxyRequest<{ success: boolean; messageId?: string }>(
      '/api/send',
      {
        ...this.credentials,
        ...input,
      }
    );
    return { success: true, messageId: result.messageId };
  }

  async markAsRead(mailbox: string, uid: number, read: boolean = true): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions',
      {
        ...this.credentials,
        mailbox,
        action: read ? 'markRead' : 'markUnread',
        uid,
        read,
      }
    );
  }

  async markAsFlagged(mailbox: string, uid: number, flagged: boolean = true): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions',
      {
        ...this.credentials,
        mailbox,
        action: 'flag',
        uid,
        flagged,
      }
    );
  }

  async deleteMessage(mailbox: string, uid: number): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions',
      {
        ...this.credentials,
        mailbox,
        action: 'delete',
        uid,
      }
    );
  }

  async moveMessage(sourceMailbox: string, uid: number, targetMailbox: string): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions',
      {
        ...this.credentials,
        mailbox: sourceMailbox,
        action: 'move',
        uid,
        targetMailbox,
      }
    );
  }

  async createMailbox(name: string): Promise<{ success: boolean; path: string }> {
    const result = await proxyRequest<{ success: boolean; path: string }>(
      '/api/actions',
      {
        ...this.credentials,
        action: 'createMailbox',
        name,
      }
    );
    return { success: true, path: result.path };
  }

  async deleteMailbox(path: string): Promise<{ success: boolean }> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions',
      {
        ...this.credentials,
        action: 'deleteMailbox',
        path,
      }
    );
    return { success: true };
  }

  async renameMailbox(oldPath: string, newPath: string): Promise<{ success: boolean; newPath: string }> {
    const result = await proxyRequest<{ success: boolean; newPath: string }>(
      '/api/actions',
      {
        ...this.credentials,
        action: 'renameMailbox',
        oldPath,
        newPath,
      }
    );
    return { success: true, newPath: result.newPath };
  }

  async getContacts(limit: number = 500): Promise<{ 
    contacts: Array<{
      id: string;
      email: string;
      name: string;
      lastContacted: string;
      contactCount: number;
      source: 'sent' | 'received' | 'both';
    }>;
    total: number;
  }> {
    const result = await proxyRequest<{ 
      success: boolean; 
      contacts: Array<{
        id: string;
        email: string;
        name: string;
        lastContacted: string;
        contactCount: number;
        source: 'sent' | 'received' | 'both';
      }>;
      total: number;
    }>(
      '/api/contacts',
      {
        ...this.credentials,
        limit,
      }
    );
    return { contacts: result.contacts, total: result.total };
  }
}

/**
 * Factory function to create the email service
 */
export function createEmailService(credentials: ProxyCredentials) {
  return new WebmailProxyClient(credentials);
}

/**
 * Master User Webmail Proxy Client
 * 
 * Nutzt Dovecot Master User für Zugriff ohne Benutzerpasswörter.
 * Nur für @taskilo.de E-Mail-Adressen erlaubt.
 */
export class MasterUserWebmailClient {
  private email: string;

  constructor(email: string) {
    if (!email.endsWith('@taskilo.de')) {
      throw new Error('Master User Zugriff nur für Taskilo E-Mails erlaubt');
    }
    this.email = email;
  }

  async getMailboxes(): Promise<Mailbox[]> {
    const result = await proxyRequest<{ success: boolean; mailboxes: Mailbox[] }>(
      '/api/mailboxes/master',
      { email: this.email }
    );
    return result.mailboxes;
  }

  async getMessages(
    mailbox: string = 'INBOX',
    options: { page?: number; limit?: number } = {}
  ): Promise<{ messages: EmailMessage[]; total: number }> {
    const result = await proxyRequest<{ 
      success: boolean; 
      messages: EmailMessage[]; 
      total: number;
    }>(
      '/api/messages/master',
      {
        email: this.email,
        mailbox,
        page: options.page || 1,
        limit: options.limit || 50,
      }
    );
    
    const messages = result.messages.map(msg => ({
      ...msg,
      date: new Date(msg.date),
    }));
    
    return { messages, total: result.total };
  }

  async getMessage(mailbox: string, uid: number): Promise<EmailContent | null> {
    try {
      const result = await proxyRequest<{ success: boolean; message: EmailContent }>(
        '/api/message/master',
        {
          email: this.email,
          mailbox,
          uid,
        }
      );
      
      return {
        ...result.message,
        date: new Date(result.message.date),
      };
    } catch {
      return null;
    }
  }

  async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
    const result = await proxyRequest<{ success: boolean; messageId?: string }>(
      '/api/send/master',
      {
        email: this.email,
        ...input,
      }
    );
    return { success: true, messageId: result.messageId };
  }

  async markAsRead(mailbox: string, uid: number, read: boolean = true): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions/master',
      {
        email: this.email,
        mailbox,
        action: read ? 'markRead' : 'markUnread',
        uid,
        read,
      }
    );
  }

  async markAsFlagged(mailbox: string, uid: number, flagged: boolean = true): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions/master',
      {
        email: this.email,
        mailbox,
        action: 'flag',
        uid,
        flagged,
      }
    );
  }

  async deleteMessage(mailbox: string, uid: number): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions/master',
      {
        email: this.email,
        mailbox,
        action: 'delete',
        uid,
      }
    );
  }

  async moveMessage(sourceMailbox: string, uid: number, targetMailbox: string): Promise<void> {
    await proxyRequest<{ success: boolean }>(
      '/api/actions/master',
      {
        email: this.email,
        mailbox: sourceMailbox,
        action: 'move',
        uid,
        targetMailbox,
      }
    );
  }
}

/**
 * Factory function für Master User E-Mail Service
 * Kein Passwort erforderlich - nutzt Dovecot Master User
 */
export function createMasterUserEmailService(email: string) {
  return new MasterUserWebmailClient(email);
}
