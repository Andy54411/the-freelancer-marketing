import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
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

export const EmailAttachmentSchema = z.object({
  filename: z.string(),
  content: z.string(), // Base64 encoded content
  encoding: z.literal('base64').optional().default('base64'),
  contentType: z.string().optional().default('application/octet-stream'),
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
  attachments: z.array(EmailAttachmentSchema).optional(),
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
  partId?: string;
  data?: string; // Base64-kodierte Daten für Inline-Attachments
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

export class EmailService {
  private credentials: EmailCredentials;
  private useMasterUser: boolean;

  constructor(credentials: EmailCredentialsInput, useMasterUser = false) {
    this.credentials = EmailCredentialsSchema.parse(credentials);
    this.useMasterUser = useMasterUser;
  }

  /**
   * Erstellt einen EmailService mit Master User Authentifizierung.
   * Erfordert keine Benutzer-Passwörter - nutzt Dovecot Master User.
   */
  static withMasterUser(userEmail: string): EmailService {
    const masterUser = process.env.DOVECOT_MASTER_USER;
    const masterPassword = process.env.DOVECOT_MASTER_PASSWORD;
    
    if (!masterUser || !masterPassword) {
      throw new Error('Dovecot Master User nicht konfiguriert');
    }
    
    // Dovecot Master User Format: user@domain*masteruser
    const authUser = `${userEmail}*${masterUser}`;
    
    return new EmailService({
      email: userEmail,
      password: masterPassword,
      imapHost: 'mail.taskilo.de',
      imapPort: 993,
      smtpHost: 'mail.taskilo.de',
      smtpPort: 587,
    }, true);
  }

  private createImapClient(): ImapFlow {
    // Bei Master User: user@domain*masteruser als Login
    const masterUser = process.env.DOVECOT_MASTER_USER;
    const masterPassword = process.env.DOVECOT_MASTER_PASSWORD;
    
    let authUser = this.credentials.email;
    let authPass = this.credentials.password;
    
    if (this.useMasterUser && masterUser && masterPassword) {
      authUser = `${this.credentials.email}*${masterUser}`;
      authPass = masterPassword;
    }
    
    return new ImapFlow({
      host: this.credentials.imapHost,
      port: this.credentials.imapPort,
      secure: true,
      auth: {
        user: authUser,
        pass: authPass,
      },
      logger: false,
    });
  }

  private createSmtpTransport() {
    // Bei Master User: user@domain*masteruser als Login (wie bei IMAP)
    const masterUser = process.env.DOVECOT_MASTER_USER;
    const masterPassword = process.env.DOVECOT_MASTER_PASSWORD;
    
    let authUser = this.credentials.email;
    let authPass = this.credentials.password;
    
    if (this.useMasterUser && masterUser && masterPassword) {
      authUser = `${this.credentials.email}*${masterUser}`;
      authPass = masterPassword;
    }

    return nodemailer.createTransport({
      host: this.credentials.smtpHost,
      port: this.credentials.smtpPort,
      secure: false,
      auth: {
        user: authUser,
        pass: authPass,
      },
    });
  }

  async testConnection(): Promise<{ imap: boolean; smtp: boolean }> {
    const result = { imap: false, smtp: false };

    const imapClient = this.createImapClient();
    try {
      await imapClient.connect();
      result.imap = true;
      await imapClient.logout();
    } catch {
      result.imap = false;
    }

    const smtpTransport = this.createSmtpTransport();
    try {
      await smtpTransport.verify();
      result.smtp = true;
    } catch {
      result.smtp = false;
    }

    return result;
  }

  async getMailboxes(): Promise<Mailbox[]> {
    const client = this.createImapClient();
    const mailboxes: Mailbox[] = [];

    try {
      await client.connect();
      const list = await client.list();

      for (const mailbox of list) {
        const status = await client.status(mailbox.path, {
          messages: true,
          unseen: true,
        });

        mailboxes.push({
          path: mailbox.path,
          name: mailbox.name,
          delimiter: mailbox.delimiter,
          flags: mailbox.flags ? Array.from(mailbox.flags) : [],
          specialUse: mailbox.specialUse,
          exists: status.messages || 0,
          unseen: status.unseen || 0,
        });
      }

      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }

    return mailboxes;
  }

  async getMessages(
    mailboxPath: string = 'INBOX',
    options: { page?: number; limit?: number } = {}
  ): Promise<{ messages: EmailMessage[]; total: number }> {
    const { page = 1, limit = 50 } = options;
    const client = this.createImapClient();
    const messages: EmailMessage[] = [];

    try {
      await client.connect();
      const mailbox = await client.mailboxOpen(mailboxPath);
      const total = mailbox.exists;

      if (total === 0) {
        await client.logout();
        return { messages: [], total: 0 };
      }

      const start = Math.max(1, total - (page * limit) + 1);
      const end = Math.max(1, total - ((page - 1) * limit));
      const range = `${start}:${end}`;

      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        size: true,
        source: { start: 0, maxLength: 256 },
      })) {
        const envelope = msg.envelope;
        if (!envelope) continue;

        messages.push({
          uid: msg.uid,
          messageId: envelope.messageId || '',
          subject: envelope.subject || '(No Subject)',
          from: this.parseAddresses(envelope.from),
          to: this.parseAddresses(envelope.to),
          cc: envelope.cc ? this.parseAddresses(envelope.cc) : undefined,
          date: envelope.date || new Date(),
          flags: msg.flags ? Array.from(msg.flags) : [],
          preview: msg.source ? this.extractPreview(msg.source.toString()) : '',
          hasAttachments: this.hasAttachments(msg.bodyStructure),
          size: msg.size,
        });
      }

      await client.logout();
      messages.sort((a, b) => b.date.getTime() - a.date.getTime());

      return { messages, total };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async getMessage(mailboxPath: string, uid: number): Promise<EmailContent | null> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);

      const msg = await client.fetchOne(uid.toString(), {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: true,
      }, { uid: true });

      if (!msg) {
        await client.logout();
        return null;
      }

      const envelope = msg.envelope;
      if (!envelope) {
        await client.logout();
        return null;
      }

      const { text, html, attachments } = await this.parseMessageBody(client, uid, msg.bodyStructure);
      
      // Lade Inline-Attachments (mit contentId) für CID-Bilder in E-Mails
      for (const att of attachments) {
        if (att.contentId && att.partId) {
          try {
            const download = await client.download(uid.toString(), att.partId, { uid: true });
            if (download && download.content) {
              const chunks: Buffer[] = [];
              for await (const chunk of download.content) {
                chunks.push(chunk);
              }
              const buffer = Buffer.concat(chunks);
              att.data = buffer.toString('base64');
            }
          } catch {
            // Fehler beim Laden des Inline-Attachments - ignorieren
          }
        }
      }
      
      await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
      await client.logout();

      return {
        uid: msg.uid,
        messageId: envelope.messageId || '',
        subject: envelope.subject || '(No Subject)',
        from: this.parseAddresses(envelope.from),
        to: this.parseAddresses(envelope.to),
        cc: envelope.cc ? this.parseAddresses(envelope.cc) : undefined,
        date: envelope.date || new Date(),
        flags: msg.flags ? Array.from(msg.flags) : [],
        preview: '',
        hasAttachments: attachments.length > 0,
        text,
        html,
        attachments,
      };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async sendEmail(input: SendEmailInput): Promise<{ success: boolean; messageId?: string }> {
    const validated = SendEmailSchema.parse(input);
    const transport = this.createSmtpTransport();

    // Prepare attachments for nodemailer format
    const attachments = validated.attachments?.map(att => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
      contentType: att.contentType,
    }));

    const mailOptions = {
      from: this.credentials.email,
      to: validated.to,
      cc: validated.cc,
      bcc: validated.bcc,
      subject: validated.subject,
      text: validated.text,
      html: validated.html,
      replyTo: validated.replyTo,
      inReplyTo: validated.inReplyTo,
      references: validated.references,
      attachments,
    };

    const result = await transport.sendMail(mailOptions);

    // Copy sent email to Sent folder via IMAP APPEND
    try {
      await this.appendToSentFolder({
        ...mailOptions,
        attachments: validated.attachments,
      });
    } catch (appendError) {
      // Log but don't fail - email was sent successfully
      console.error('Failed to append to Sent folder:', appendError);
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  }

  private async appendToSentFolder(mailOptions: {
    from: string;
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();

      // Build raw email message
      const toAddresses = Array.isArray(mailOptions.to) ? mailOptions.to.join(', ') : mailOptions.to;
      const ccLine = mailOptions.cc?.length ? `Cc: ${mailOptions.cc.join(', ')}\r\n` : '';
      const date = new Date().toUTCString();
      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@taskilo.de>`;
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      let rawMessage = `From: ${mailOptions.from}\r\n`;
      rawMessage += `To: ${toAddresses}\r\n`;
      rawMessage += ccLine;
      rawMessage += `Subject: ${mailOptions.subject}\r\n`;
      rawMessage += `Date: ${date}\r\n`;
      rawMessage += `Message-ID: ${messageId}\r\n`;
      rawMessage += `MIME-Version: 1.0\r\n`;
      
      // Check if we have attachments
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        // Multipart message with attachments
        rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
        rawMessage += `\r\n`;
        rawMessage += `--${boundary}\r\n`;
        
        // Body part
        if (mailOptions.html) {
          rawMessage += `Content-Type: text/html; charset=utf-8\r\n`;
          rawMessage += `Content-Transfer-Encoding: quoted-printable\r\n`;
          rawMessage += `\r\n`;
          rawMessage += mailOptions.html;
        } else {
          rawMessage += `Content-Type: text/plain; charset=utf-8\r\n`;
          rawMessage += `Content-Transfer-Encoding: quoted-printable\r\n`;
          rawMessage += `\r\n`;
          rawMessage += mailOptions.text || '';
        }
        rawMessage += `\r\n`;
        
        // Attachment parts
        for (const att of mailOptions.attachments) {
          rawMessage += `--${boundary}\r\n`;
          rawMessage += `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.filename}"\r\n`;
          rawMessage += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
          rawMessage += `Content-Transfer-Encoding: base64\r\n`;
          rawMessage += `\r\n`;
          
          // Split base64 content into 76-character lines (RFC 2045)
          const base64Content = att.content;
          for (let i = 0; i < base64Content.length; i += 76) {
            rawMessage += base64Content.substring(i, i + 76) + '\r\n';
          }
        }
        
        // End boundary
        rawMessage += `--${boundary}--\r\n`;
      } else {
        // Simple message without attachments
        if (mailOptions.html) {
          rawMessage += `Content-Type: text/html; charset=utf-8\r\n`;
          rawMessage += `\r\n`;
          rawMessage += mailOptions.html;
        } else {
          rawMessage += `Content-Type: text/plain; charset=utf-8\r\n`;
          rawMessage += `\r\n`;
          rawMessage += mailOptions.text || '';
        }
      }

      // Append to Sent folder with \Seen flag
      await client.append('Sent', rawMessage, ['\\Seen']);
      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async markAsRead(mailboxPath: string, uid: number, read: boolean = true): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);

      if (read) {
        await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
      } else {
        await client.messageFlagsRemove(uid.toString(), ['\\Seen'], { uid: true });
      }

      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async markAsFlagged(mailboxPath: string, uid: number, flagged: boolean = true): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);

      if (flagged) {
        await client.messageFlagsAdd(uid.toString(), ['\\Flagged'], { uid: true });
      } else {
        await client.messageFlagsRemove(uid.toString(), ['\\Flagged'], { uid: true });
      }

      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async deleteMessage(mailboxPath: string, uid: number): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);

      try {
        await client.messageMove(uid.toString(), 'Trash', { uid: true });
      } catch {
        await client.messageFlagsAdd(uid.toString(), ['\\Deleted'], { uid: true });
        await client.messageDelete(uid.toString(), { uid: true });
      }

      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  /**
   * Permanently delete a message from the server (EXPUNGE)
   * Use this to permanently delete messages from Trash
   */
  async permanentlyDeleteMessage(mailboxPath: string, uid: number): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);
      
      // Set \Deleted flag and expunge (permanent delete)
      await client.messageFlagsAdd(uid.toString(), ['\\Deleted'], { uid: true });
      await client.messageDelete(uid.toString(), { uid: true });

      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async moveMessage(sourceMailbox: string, uid: number, targetMailbox: string): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(sourceMailbox);
      await client.messageMove(uid.toString(), targetMailbox, { uid: true });
      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  /**
   * Bulk delete multiple messages at once (move to Trash)
   * Much more efficient than deleting one by one
   */
  async bulkDeleteMessages(mailboxPath: string, uids: number[]): Promise<{ deleted: number }> {
    if (uids.length === 0) return { deleted: 0 };
    
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);

      // IMAP unterstützt UID-Ranges: "1,2,3,4,5" oder "1:5"
      const uidRange = uids.join(',');
      
      try {
        // Versuche alle auf einmal in den Papierkorb zu verschieben
        await client.messageMove(uidRange, 'Trash', { uid: true });
      } catch {
        // Fallback: Alle als gelöscht markieren und löschen
        await client.messageFlagsAdd(uidRange, ['\\Deleted'], { uid: true });
        await client.messageDelete(uidRange, { uid: true });
      }

      await client.logout();
      return { deleted: uids.length };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  /**
   * Bulk permanently delete multiple messages (from Trash)
   */
  async bulkPermanentlyDeleteMessages(mailboxPath: string, uids: number[]): Promise<{ deleted: number }> {
    if (uids.length === 0) return { deleted: 0 };
    
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen(mailboxPath);

      const uidRange = uids.join(',');
      await client.messageFlagsAdd(uidRange, ['\\Deleted'], { uid: true });
      await client.messageDelete(uidRange, { uid: true });

      await client.logout();
      return { deleted: uids.length };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async createMailbox(name: string): Promise<{ success: boolean; path: string }> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxCreate(name);
      await client.logout();
      return { success: true, path: name };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async deleteMailbox(path: string): Promise<{ success: boolean }> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxDelete(path);
      await client.logout();
      return { success: true };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  async renameMailbox(oldPath: string, newPath: string): Promise<{ success: boolean; newPath: string }> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxRename(oldPath, newPath);
      await client.logout();
      return { success: true, newPath };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  private parseAddresses(addresses: Array<{ name?: string; address?: string }> | undefined): EmailAddress[] {
    if (!addresses) return [];
    return addresses.map(addr => ({
      name: addr.name,
      address: addr.address || '',
    }));
  }

  private extractPreview(source: string): string {
    const lines = source.split('\n');
    let inBody = false;
    let preview = '';

    for (const line of lines) {
      if (inBody) {
        preview += line + ' ';
        if (preview.length > 200) break;
      }
      if (line.trim() === '') {
        inBody = true;
      }
    }

    return preview.substring(0, 200).trim();
  }

  private hasAttachments(bodyStructure: unknown): boolean {
    if (!bodyStructure) return false;
    const structure = bodyStructure as Record<string, unknown>;

    if (structure.disposition === 'attachment') return true;
    if (Array.isArray(structure.childNodes)) {
      return structure.childNodes.some((child: unknown) => this.hasAttachments(child));
    }
    return false;
  }

  private async parseMessageBody(
    client: ImapFlow,
    uid: number,
    bodyStructure: unknown,
    partPath: string = ''
  ): Promise<{ text?: string; html?: string; attachments: EmailAttachment[] }> {
    let text: string | undefined;
    let html: string | undefined;
    const attachments: EmailAttachment[] = [];

    const structure = bodyStructure as Record<string, unknown>;
    const typeStr = (structure.type as string) || '';
    const [mainType, subType] = typeStr.split('/');

    // Helper function to download and decode content
    const downloadPart = async (partNum: string): Promise<string> => {
      const content = await client.download(uid.toString(), partNum || '1', { uid: true });
      const chunks: Buffer[] = [];
      for await (const chunk of content.content) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString('utf-8');
    };

    // Single part message (text/plain or text/html)
    if (mainType === 'text' && !Array.isArray(structure.childNodes)) {
      const partNum = partPath || '1';
      try {
        const body = await downloadPart(partNum);
        if (subType === 'plain') {
          text = body;
        } else if (subType === 'html') {
          html = body;
        }
      } catch {
        // Ignore download errors
      }
      return { text, html, attachments };
    }

    // Multipart message - recursively process child nodes
    if (Array.isArray(structure.childNodes)) {
      for (let i = 0; i < structure.childNodes.length; i++) {
        const part = structure.childNodes[i] as Record<string, unknown>;
        // Use the part number from imapflow if available, otherwise calculate it
        const partNum = (part.part as string) || (partPath ? `${partPath}.${i + 1}` : `${i + 1}`);
        const partTypeStr = (part.type as string) || '';
        const [partMainType, partSubType] = partTypeStr.split('/');

        // Check for attachment disposition
        if (part.disposition === 'attachment' || part.disposition === 'inline') {
          const filename = (part.dispositionParameters as Record<string, string>)?.filename ||
                          (part.parameters as Record<string, string>)?.name ||
                          'attachment';
          attachments.push({
            filename,
            contentType: partTypeStr,
            size: (part.size as number) || 0,
            contentId: part.id as string | undefined,
            partId: partNum,
          });
          continue;
        }

        // Recursively handle nested multipart structures
        if (Array.isArray(part.childNodes)) {
          const nested = await this.parseMessageBody(client, uid, part, partNum);
          if (!text && nested.text) text = nested.text;
          if (!html && nested.html) html = nested.html;
          attachments.push(...nested.attachments);
          continue;
        }

        // Handle text parts
        if (partMainType === 'text') {
          try {
            const body = await downloadPart(partNum);
            if (partSubType === 'plain' && !text) {
              text = body;
            } else if (partSubType === 'html' && !html) {
              html = body;
            }
          } catch {
            // Ignore download errors for individual parts
          }
        }
      }
    }

    return { text, html, attachments };
  }

  // Save email to Drafts folder
  async saveDraft(draft: {
    to?: string | string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
  }): Promise<{ success: boolean; uid?: number }> {
    const client = this.createImapClient();

    try {
      await client.connect();

      // Build raw email message
      const fromAddress = this.credentials.email;
      const toAddresses = draft.to 
        ? (Array.isArray(draft.to) ? draft.to.join(', ') : draft.to) 
        : '';
      const ccLine = draft.cc?.length ? `Cc: ${draft.cc.join(', ')}\r\n` : '';
      const bccLine = draft.bcc?.length ? `Bcc: ${draft.bcc.join(', ')}\r\n` : '';
      const date = new Date().toUTCString();
      const messageId = `<draft.${Date.now()}.${Math.random().toString(36).substring(2)}@taskilo.de>`;
      
      let rawMessage = `From: ${fromAddress}\r\n`;
      if (toAddresses) {
        rawMessage += `To: ${toAddresses}\r\n`;
      }
      rawMessage += ccLine;
      rawMessage += bccLine;
      rawMessage += `Subject: ${draft.subject || '(kein Betreff)'}\r\n`;
      rawMessage += `Date: ${date}\r\n`;
      rawMessage += `Message-ID: ${messageId}\r\n`;
      rawMessage += `MIME-Version: 1.0\r\n`;
      rawMessage += `X-Mailer: Taskilo Webmail\r\n`;
      
      if (draft.html) {
        rawMessage += `Content-Type: text/html; charset=utf-8\r\n`;
        rawMessage += `\r\n`;
        rawMessage += draft.html;
      } else {
        rawMessage += `Content-Type: text/plain; charset=utf-8\r\n`;
        rawMessage += `\r\n`;
        rawMessage += draft.text || '';
      }

      // Append to Drafts folder with \Draft flag (not \Seen - so it shows as "unread")
      const appendResult = await client.append('Drafts', rawMessage, ['\\Draft']);
      await client.logout();

      return { 
        success: true, 
        uid: appendResult && typeof appendResult === 'object' ? appendResult.uid : undefined 
      };
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }

  // Delete a specific draft by UID
  async deleteDraft(uid: number): Promise<void> {
    const client = this.createImapClient();

    try {
      await client.connect();
      await client.mailboxOpen('Drafts');
      await client.messageDelete(uid.toString(), { uid: true });
      await client.logout();
    } catch (error) {
      await client.logout().catch(() => {});
      throw error;
    }
  }
}
