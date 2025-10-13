import { gmail_v1, google } from 'googleapis';
import { db } from '@/firebase/server';

interface GmailConfig {
  email: string;
  provider: 'gmail';
  tokens: {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date?: number;
  };
}

interface EmailMessage {
  id: string;
  from: { name?: string; email: string };
  to: { name?: string; email: string }[];
  subject: string;
  body: string;
  htmlBody?: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  folder: {
    id: string;
    name: string;
  };
  attachments: any[];
  labels: string[];
  threadId: string;
}

export class NewGmailService {
  private gmail: gmail_v1.Gmail;
  private userId: string;
  private config: GmailConfig;

  constructor(config: GmailConfig, userId: string) {
    this.config = config;
    this.userId = userId;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/oauth/callback/gmail`
    );

    oauth2Client.setCredentials(config.tokens);
    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Get emails from Gmail API
   */
  async getEmails(folder: string = 'INBOX', limit: number = 50): Promise<EmailMessage[]> {
    try {
      // Map folder names to Gmail labels
      const gmailLabel = this.mapFolderToGmailLabel(folder);

      // Get message IDs
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        labelIds: [gmailLabel],
        maxResults: limit,
      });

      if (!listResponse.data.messages?.length) {
        return [];
      }

      // Get full message details in batches
      const emails: EmailMessage[] = [];
      const batchSize = 10;

      for (let i = 0; i < listResponse.data.messages.length; i += batchSize) {
        const batch = listResponse.data.messages.slice(i, i + batchSize);

        const batchPromises = batch.map(async message => {
          try {
            const emailResponse = await this.gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'full',
            });

            return this.parseGmailMessage(emailResponse.data, folder);
          } catch (error) {
            console.error(`Error fetching message ${message.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...(batchResults.filter(email => email !== null) as EmailMessage[]));
      }

      return emails.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Fetch emails with Gmail search query
   */
  async fetchEmailsWithQuery(
    query: string,
    folder: string = 'INBOX',
    limit: number = 50
  ): Promise<EmailMessage[]> {
    try {
      const gmailLabel = this.mapFolderToGmailLabel(folder);

      // Build Gmail search query with folder filter
      const fullQuery = `in:${gmailLabel.toLowerCase()} ${query}`;

      // Get message IDs with search query
      const listResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: fullQuery,
        maxResults: limit,
      });

      if (!listResponse.data.messages?.length) {
        return [];
      }

      // Get full message details in batches
      const emails: EmailMessage[] = [];
      const batchSize = 10;

      for (let i = 0; i < listResponse.data.messages.length; i += batchSize) {
        const batch = listResponse.data.messages.slice(i, i + batchSize);

        const batchPromises = batch.map(async message => {
          try {
            const fullMessage = await this.gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'full',
            });

            return this.parseGmailMessage(fullMessage.data, folder);
          } catch (error) {
            console.error(`Error fetching message ${message.id}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        emails.push(...(batchResults.filter(email => email !== null) as EmailMessage[]));
      }

      return emails.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching emails with query:', error);
      throw error;
    }
  }

  /**
   * Parse Gmail message to our format
   */
  private parseGmailMessage(message: any, folder: string): EmailMessage {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract email body with improved multi-part parsing
    let body = '';
    let htmlBody = '';

    if (message.payload?.body?.data) {
      // Simple single-part message
      const content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      if (message.payload.mimeType === 'text/html') {
        htmlBody = content;
      } else {
        body = content;
      }
    } else if (message.payload?.parts) {
      // Multi-part message

      const textPart = this.findPart(message.payload.parts, 'text/plain');
      const htmlPart = this.findPart(message.payload.parts, 'text/html');

      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
      if (htmlPart?.body?.data) {
        htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      }

      // Debug: Log all parts
      message.payload.parts.forEach((part: any, index: number) => {});
    }

    // Parse addresses - ohne undefined Werte
    const parseAddress = (addressString: string) => {
      if (!addressString) return [];
      return addressString.split(',').map(addr => {
        const match = addr.trim().match(/^(.*?)\s*<(.+?)>$/) || addr.trim().match(/^(.+)$/);
        if (match) {
          const result: any = {
            email: match[2] || match[1].trim(),
          };
          // Nur name hinzufügen wenn es wirklich existiert
          if (match[2] && match[1]) {
            const name = match[1].replace(/"/g, '').trim();
            if (name) {
              result.name = name;
            }
          }
          return result;
        }
        return { email: addr.trim() };
      });
    };

    return {
      id: message.id,
      from: parseAddress(getHeader('From'))[0] || { email: 'unknown' },
      to: parseAddress(getHeader('To')),
      subject: getHeader('Subject') || '(kein Betreff)',
      body: body, // NUR der echte Plain Text Body, NICHT kaputt gemachtes HTML!
      htmlBody,
      timestamp: new Date(parseInt(message.internalDate)).toISOString(),
      read: !message.labelIds?.includes('UNREAD'),
      starred: message.labelIds?.includes('STARRED') || false,
      folder: {
        id: folder,
        name: this.getFolderName(folder),
      },
      attachments: this.extractAttachments(message.payload),
      labels: message.labelIds || [],
      threadId: message.threadId,
    };
  }

  private findPart(parts: any[], mimeType: string): any {
    for (const part of parts) {
      if (part.mimeType === mimeType) return part;
      if (part.parts) {
        const found = this.findPart(part.parts, mimeType);
        if (found) return found;
      }
    }
    return null;
  }

  private extractAttachments(payload: any): any[] {
    const attachments: any[] = [];

    const extractFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            size: part.body.size || 0,
            mimeType: part.mimeType,
          });
        }
        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload?.parts) {
      extractFromParts(payload.parts);
    }

    return attachments;
  }

  private mapFolderToGmailLabel(folder: string): string {
    const folderToLabel: { [key: string]: string } = {
      inbox: 'INBOX',
      sent: 'SENT',
      draft: 'DRAFT',
      drafts: 'DRAFT',
      trash: 'TRASH',
      spam: 'SPAM',
      INBOX: 'INBOX',
      SENT: 'SENT',
      DRAFT: 'DRAFT',
      TRASH: 'TRASH',
      SPAM: 'SPAM',
    };
    return folderToLabel[folder] || folder.toUpperCase();
  }

  private getFolderName(folderId: string): string {
    const folderNames: { [key: string]: string } = {
      INBOX: 'Posteingang',
      SENT: 'Gesendet',
      DRAFT: 'Entwürfe',
      TRASH: 'Papierkorb',
      SPAM: 'Spam',
    };
    return folderNames[folderId] || folderId;
  }

  /**
   * Get Gmail configuration from Firestore
   */
  static async getGmailConfig(userId: string): Promise<GmailConfig | null> {
    try {
      if (!db) return null;

      const companyDoc = await db.collection('companies').doc(userId).get();
      if (!companyDoc.exists) return null;

      const data = companyDoc.data();
      const gmailConfig = data?.gmailConfig;

      if (!gmailConfig?.tokens?.refresh_token || gmailConfig.tokens.refresh_token === 'invalid') {
        return null;
      }

      return gmailConfig;
    } catch (error) {
      console.error('Error getting Gmail config:', error);
      return null;
    }
  }

  /**
   * Mark Gmail token as invalid
   */
  static async markTokenAsInvalid(userId: string): Promise<void> {
    try {
      if (!db) return;

      await db.collection('companies').doc(userId).update({
        'gmailConfig.tokens.refresh_token': 'invalid',
        'gmailConfig.tokens.access_token': 'invalid',
      });
    } catch (error) {
      console.error('Error marking token as invalid:', error);
    }
  }

  /**
   * Send email via Gmail API
   *
   * @param to - Recipient email addresses
   * @param subject - Email subject
   * @param body - Plain text body
   * @param htmlBody - HTML body (optional)
   * @param cc - CC recipients (optional)
   * @param bcc - BCC recipients (optional)
   * @param attachments - File attachments (optional)
   */
  async sendEmail(options: {
    to: string[];
    subject: string;
    body: string;
    htmlBody?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
      filename: string;
      content: Buffer | string; // Buffer or base64 string
      mimeType: string;
    }>;
  }): Promise<{ messageId: string; success: boolean }> {
    try {
      const { to, subject, body, htmlBody, cc, bcc, attachments } = options;

      // Build email message in RFC 2822 format
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36)}`;

      const emailLines: string[] = [];

      // Headers
      emailLines.push(`To: ${to.join(', ')}`);
      if (cc && cc.length > 0) {
        emailLines.push(`Cc: ${cc.join(', ')}`);
      }
      if (bcc && bcc.length > 0) {
        emailLines.push(`Bcc: ${bcc.join(', ')}`);
      }
      emailLines.push(`Subject: ${subject}`);
      emailLines.push('MIME-Version: 1.0');
      emailLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      emailLines.push('');

      // Plain text body
      emailLines.push(`--${boundary}`);
      emailLines.push('Content-Type: text/plain; charset=UTF-8');
      emailLines.push('Content-Transfer-Encoding: 7bit');
      emailLines.push('');
      emailLines.push(body);
      emailLines.push('');

      // HTML body (if provided)
      if (htmlBody) {
        emailLines.push(`--${boundary}`);
        emailLines.push('Content-Type: text/html; charset=UTF-8');
        emailLines.push('Content-Transfer-Encoding: 7bit');
        emailLines.push('');
        emailLines.push(htmlBody);
        emailLines.push('');
      }

      // Attachments
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          emailLines.push(`--${boundary}`);
          emailLines.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
          emailLines.push('Content-Transfer-Encoding: base64');
          emailLines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
          emailLines.push('');

          // Convert Buffer to base64 if needed
          const base64Content = Buffer.isBuffer(attachment.content)
            ? attachment.content.toString('base64')
            : attachment.content;

          // Split base64 into 76-character lines (RFC 2045)
          const lines = base64Content.match(/.{1,76}/g) || [];
          emailLines.push(...lines);
          emailLines.push('');
        }
      }

      // End boundary
      emailLines.push(`--${boundary}--`);

      // Join all lines
      const rawMessage = emailLines.join('\r\n');

      // Encode to base64url
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        messageId: response.data.id || '',
        success: true,
      };
    } catch (error) {
      console.error('Error sending email via Gmail:', error);
      throw error;
    }
  }
}
