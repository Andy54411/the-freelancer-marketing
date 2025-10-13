/**
 * Gmail Server Service für Firebase Functions
 * Server-side Version des Gmail Services
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export interface GmailEmail {
  id: string;
  userEmail: string;
  gmailId: string;
  threadId: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  // KRITISCH: internalDate ist Gmail's ORIGINAL unveränderlicher Timestamp
  // String format: Millisekunden seit Unix Epoch (z.B. "1697123456789")
  // Wird verwendet für die Sortierung (NIEMALS ändern nach dem Speichern!)
  internalDate: string;
  receivedAt: Date;
  read: boolean;
  starred: boolean;
  labels: string[];
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
  priority: 'high' | 'normal' | 'low';
}

export class GmailServerService {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private userEmail: string;

  constructor(accessToken: string, refreshToken: string, userEmail?: string) {
    // Environment Variables für Google OAuth2 Credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set as environment variables');
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret);
    this.userEmail = userEmail || '';

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Token-Refresh Event Listener
    this.oauth2Client.on('tokens', async (tokens) => {
      console.log('🔄 OAuth2 Tokens aktualisiert:', {
        hasNewAccessToken: !!tokens.access_token,
        hasNewRefreshToken: !!tokens.refresh_token,
        userEmail: this.userEmail
      });

      // Speichere neue Tokens in Firestore
      if (tokens.access_token && this.userEmail) {
        await this.saveUpdatedTokens(tokens.access_token, tokens.refresh_token || undefined);
      }
    });

    this.gmail = google.gmail({
      version: 'v1',
      auth: this.oauth2Client as any
    });
  }

  /**
   * Speichere aktualisierte Tokens in Firestore
   */
  private async saveUpdatedTokens(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      console.log(`💾 Speichere aktualisierte Tokens für: ${this.userEmail}`);

      // Suche Company ID für diese E-Mail
      const companiesSnapshot = await db.collection('companies').get();
      
      for (const companyDoc of companiesSnapshot.docs) {
        const emailConfigsSnapshot = await companyDoc.ref.collection('emailConfigs')
          .where('email', '==', this.userEmail)
          .limit(1)
          .get();
        
        if (!emailConfigsSnapshot.empty) {
          const emailConfigDoc = emailConfigsSnapshot.docs[0];
          const updateData: any = {
            'tokens.access_token': accessToken,
            'lastTokenRefresh': new Date()
          };

          if (refreshToken) {
            updateData['tokens.refresh_token'] = refreshToken;
          }

          await emailConfigDoc.ref.update(updateData);
          console.log('✅ Tokens erfolgreich aktualisiert in emailConfigs');
          return;
        }
      }

      console.warn(`⚠️ Keine emailConfig gefunden für: ${this.userEmail}`);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der aktualisierten Tokens:', error);
    }
  }

  /**
   * Wrapper für Gmail API Calls mit automatischem Token-Refresh
   */
  private async executeWithTokenRefresh<T>(apiCall: () => Promise<T>, maxRetries: number = 2): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        console.log(`🔍 API Call Fehler (Versuch ${attempt}/${maxRetries}):`, {
          error: error.message,
          code: error.code,
          status: error.status
        });

        // Prüfe auf Token-bezogene Fehler
        const isTokenError = error.message?.includes('invalid_grant') ||
                            error.message?.includes('invalid_token') ||
                            error.message?.includes('unauthorized') ||
                            error.code === 401;

        if (isTokenError && attempt < maxRetries) {
          console.log('🔄 Token-Fehler erkannt, versuche Token-Refresh...');
          
          try {
            // Force Token Refresh
            await this.oauth2Client.refreshAccessToken();
            console.log('✅ Access Token erfolgreich refreshed');
            
            // Kurz warten vor erneutem Versuch
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } catch (refreshError) {
            console.error('❌ Token-Refresh fehlgeschlagen:', refreshError);
            
            if (attempt === maxRetries) {
              throw new Error(`Token-Refresh fehlgeschlagen nach ${maxRetries} Versuchen: ${refreshError}`);
            }
          }
        }

        // Bei anderen Fehlern oder letztem Versuch: Error weiterwerfen
        if (attempt === maxRetries) {
          throw error;
        }

        // Kurz warten vor erneutem Versuch
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    throw new Error('API Call fehlgeschlagen nach allen Versuchen');
  }

  /**
   * Neue E-Mails seit letzter History ID abrufen
   */
  async fetchNewEmails(userEmail: string, startHistoryId: string): Promise<any[]> {
    try {
      console.log(`🔍 Hole neue E-Mails für ${userEmail} seit History ID: ${startHistoryId}`);

      const historyResponse = await this.executeWithTokenRefresh(async () => {
        return this.gmail.users.history.list({
          userId: 'me',
          startHistoryId: startHistoryId,
          historyTypes: ['messageAdded'],
          maxResults: 500 // Erhöht von 100 auf 500
        });
      });

      const newEmails: any[] = [];

      if (historyResponse.data.history) {
        console.log(`📧 ${historyResponse.data.history.length} History Items gefunden`);
        
        for (const historyItem of historyResponse.data.history) {
          if (historyItem.messagesAdded) {
            console.log(`➕ ${historyItem.messagesAdded.length} neue Messages in History Item`);
            
            for (const messageAdded of historyItem.messagesAdded) {
              if (messageAdded.message?.id) {
                try {
                  // Hole vollständige Message Details von Gmail API
                  const messageResponse = await this.executeWithTokenRefresh(async () => {
                    return this.gmail.users.messages.get({
                      userId: 'me',
                      id: messageAdded.message.id,
                      format: 'full'
                    });
                  });

                  if (messageResponse.data) {
                    const email = this.parseGmailMessage(messageResponse.data, userEmail);
                    newEmails.push(email);
                    console.log(`✅ E-Mail Details geholt: ${email.subject}`);
                  }
                } catch (emailError) {
                  console.error(`❌ Fehler beim Holen der E-Mail Details für ID ${messageAdded.message.id}:`, emailError);
                }
              }
            }
          }
        }
      }

      console.log(`✅ ${newEmails.length} neue E-Mails erfolgreich verarbeitet für ${userEmail}`);
      return newEmails;

    } catch (error: any) {
      console.error('❌ Fehler beim Abrufen neuer E-Mails via History API:', error);
      
      // Fallback: Hole die letzten E-Mails mit optimierter Suche
      console.log('🔄 Fallback: Hole recent emails mit erweiterten Parametern...');
      try {
        // Fallback mit erweiterten Parametern für neueste E-Mails
        const fallbackEmails = await this.fetchRecentEmails(userEmail);
        console.log(`🔄 Fallback erfolgreich: ${fallbackEmails.length} E-Mails geholt`);
        return fallbackEmails;
      } catch (fallbackError) {
        console.error('❌ Auch Fallback fehlgeschlagen:', fallbackError);
        return [];
      }
    }
  }



  /**
   * Hole ALLE E-Mails ohne Datum-Filter (für Force Sync) - BEGRENZT für Performance
   */
  async fetchAllEmails(userEmail: string): Promise<GmailEmail[]> {
    try {
      console.log(`🎯 Force Sync: Hole mehr E-Mails für ${userEmail} (begrenzt auf 500 für Performance)`);
      
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 500, // Begrenzt für bessere Performance
        // Kein q-Parameter = alle verfügbaren E-Mails (aber maxResults begrenzt)
      });

      if (!messagesResponse.data.messages) {
        console.log('❌ Keine Messages gefunden');
        return [];
      }

      console.log(`📧 Found ${messagesResponse.data.messages.length} total messages`);

      // Verarbeite nur erste 100 für bessere Performance bei Force Sync
      const limitedMessages = messagesResponse.data.messages.slice(0, 100);
      console.log(`🎯 Processing only first ${limitedMessages.length} messages for Force Sync`);

      const emailPromises = limitedMessages.map(async (message: any) => {
        try {
          const messageResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full'  // FULL format um Body und HTML zu bekommen!
          });

          return this.parseGmailMessage(messageResponse.data, userEmail);
        } catch (error) {
          console.error(`Fehler beim Laden der Message ${message.id}:`, error);
          return null;
        }
      });

      const emails = await Promise.all(emailPromises);
      const validEmails = emails.filter(email => email !== null) as GmailEmail[];

      console.log(`✅ Force Sync abgeschlossen: ${validEmails.length} E-Mails verarbeitet`);
      return validEmails;

    } catch (error) {
      console.error('❌ Fehler beim Force Sync:', error);
      return [];
    }
  }

  /**
   * Hole aktuelle E-Mails als Fallback
   */
  async fetchRecentEmails(userEmail: string): Promise<GmailEmail[]> {
    try {
      // Hole die letzten 500 Messages aus den letzten 30 Tagen
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const searchQuery = `after:${thirtyDaysAgo.getFullYear()}/${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getDate().toString().padStart(2, '0')}`;
      
      console.log(`🔍 Searching Gmail with query: ${searchQuery}`);
      
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: 500, // Deutlich mehr E-Mails
        q: searchQuery // E-Mails der letzten 30 Tage
      });

      if (!messagesResponse.data.messages) {
        return [];
      }

      // Hole Details für jede Message
      const emailPromises = messagesResponse.data.messages.map(async (message: any) => {
        try {
          const messageResponse = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          return this.parseGmailMessage(messageResponse.data, userEmail);
        } catch (error) {
          console.error(`Fehler beim Laden der Message ${message.id}:`, error);
          return null;
        }
      });

      const emails = await Promise.all(emailPromises);
      return emails.filter(email => email !== null) as GmailEmail[];
    } catch (error) {
      console.error('Fehler beim Laden aktueller E-Mails:', error);
      return [];
    }
  }

  /**
   * Parse Gmail Message zu unserem Format
   */
  private parseGmailMessage(message: any, userEmail: string): GmailEmail {
    const headers = message.payload.headers;
    const getHeader = (name: string) => {
      const header = headers.find((h: any) => h.name === name);
      return header ? header.value : '';
    };

    let body = '';
    let htmlBody = '';

    // Rekursive Funktion zum Durchsuchen aller Parts
    const extractBodyFromParts = (parts: any[]): void => {
      for (const part of parts) {
        // Direkte Body-Daten im Part
        if (part.mimeType === 'text/plain' && part.body?.data && !body) {
          body = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/html' && part.body?.data && !htmlBody) {
          htmlBody = Buffer.from(part.body.data, 'base64').toString();
        }
        
        // Rekursiv durch verschachtelte Parts (multipart/alternative, multipart/mixed, etc.)
        if (part.parts && Array.isArray(part.parts)) {
          extractBodyFromParts(part.parts);
        }
      }
    };

    // Extraktiere Body Content
    if (message.payload.body?.data) {
      // Body direkt im Payload (einfache E-Mails)
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload.parts) {
      // Multipart E-Mail - durchsuche rekursiv alle Parts
      extractBodyFromParts(message.payload.parts);
    }
    
    // Fallback: Verwende snippet wenn kein Body gefunden wurde
    if (!body && !htmlBody && message.snippet) {
      body = message.snippet;
    }

    return {
      id: `${userEmail}_${message.id}`,
      userEmail,
      gmailId: message.id,
      threadId: message.threadId,
      from: getHeader('From'),
      to: getHeader('To').split(',').map((email: string) => email.trim()).filter(Boolean),
      cc: getHeader('Cc').split(',').map((email: string) => email.trim()).filter(Boolean),
      bcc: getHeader('Bcc').split(',').map((email: string) => email.trim()).filter(Boolean),
      subject: getHeader('Subject'),
      body,
      htmlBody: htmlBody || undefined,
      // KRITISCH: internalDate ist Gmail's ORIGINAL unveränderlicher Timestamp (als String)
      internalDate: message.internalDate, // String mit Millisekunden seit Epoch
      receivedAt: new Date(parseInt(message.internalDate)),
      read: !message.labelIds?.includes('UNREAD'),
      starred: message.labelIds?.includes('STARRED') || false,
      labels: message.labelIds || [],
      attachments: this.extractAttachments(message.payload),
      priority: this.determinePriority(headers)
    };
  }

  /**
   * Extraktiere Attachments (rekursiv)
   */
  private extractAttachments(payload: any): Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const attachments: Array<{
      id: string;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];

    const extractFromParts = (parts: any[]): void => {
      for (const part of parts) {
        // Part ist ein Attachment
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0
          });
        }
        
        // Rekursiv durch verschachtelte Parts
        if (part.parts && Array.isArray(part.parts)) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractFromParts(payload.parts);
    }

    return attachments;
  }

  /**
   * Bestimme E-Mail Priorität
   */
  private determinePriority(headers: any[]): 'high' | 'normal' | 'low' {
    const priority = headers.find(h => h.name.toLowerCase() === 'x-priority')?.value;
    const importance = headers.find(h => h.name.toLowerCase() === 'importance')?.value;

    if (priority === '1' || importance === 'high') {
      return 'high';
    } else if (priority === '5' || importance === 'low') {
      return 'low';
    }

    return 'normal';
  }

  /**
   * Setup Gmail Watch für Push Notifications
   */
  async setupGmailWatch(userEmail: string): Promise<void> {
    try {
      const watchResponse = await this.gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: 'projects/tilvo-f142f/topics/gmail-notifications',
          labelIds: ['INBOX'],
          labelFilterAction: 'include'
        }
      });

      // Speichere Watch Details in Firestore
      await db.collection('gmail_sync_status').doc(userEmail).set({
        userEmail,
        pushNotificationsEnabled: true,
        lastHistoryId: watchResponse.data.historyId,
        watchExpiration: new Date(parseInt(watchResponse.data.expiration!)),
        lastSync: new Date(),
        createdAt: new Date()
      }, { merge: true });

      console.log(`Gmail Watch setup für ${userEmail}, expiry:`, new Date(parseInt(watchResponse.data.expiration!)));

    } catch (error: any) {
      console.error('Gmail Watch Setup Fehler:', error);
      throw new Error(`Gmail Push Setup fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Erneuere Gmail Watch falls nötig
   */
  async renewWatchIfNeeded(userEmail: string): Promise<void> {
    try {
      const syncStatus = await db.collection('gmail_sync_status').doc(userEmail).get();
      
      if (!syncStatus.exists) {
        console.log(`Kein Sync Status gefunden für ${userEmail}`);
        return;
      }

      const data = syncStatus.data()!;
      const watchExpiration = data.watchExpiration?.toDate();

      if (watchExpiration && watchExpiration.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
        console.log(`Erneuere Gmail Watch für ${userEmail}`);
        await this.setupGmailWatch(userEmail);
      }

    } catch (error) {
      console.error(`Fehler beim Erneuern des Gmail Watch für ${userEmail}:`, error);
      throw error;
    }
  }
}

/**
 * Factory Function für Gmail Server Service
 */
export function createGmailServerService(accessToken: string, refreshToken: string, userEmail?: string): GmailServerService {
  return new GmailServerService(accessToken, refreshToken, userEmail);
}