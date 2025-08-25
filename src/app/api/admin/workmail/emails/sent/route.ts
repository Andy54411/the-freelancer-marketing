import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import Imap from 'imap';

// Email-Typ-Definitionen
interface EmailResult {
  emails: any[];
  totalCount: number;
  unreadCount: number;
  source: string;
  folder: string;
  lastSync: string;
}

// JWT Secret für Admin-Tokens
const JWT_SECRET =
  process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

// Cache-Funktion für schnelle Antworten
async function getCachedEmails(
  adminEmail: string,
  folder: string,
  limit: number
): Promise<EmailResult | null> {
  try {

    const cacheResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/workmail/emails/cache?folder=${folder}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Cookie: `taskilo-admin-token=${adminEmail}`, // Simplified for internal call
        },
      }
    );

    if (cacheResponse.ok) {
      const cacheResult = await cacheResponse.json();
      if (cacheResult.success && cacheResult.data?.emails?.length > 0) {

        return {
          emails: cacheResult.data.emails,
          totalCount: cacheResult.data.totalCount,
          unreadCount: 0,
          source: 'dynamodb_cache',
          folder: folder,
          lastSync: cacheResult.data.lastSync,
        };
      }
    }

    return null;
  } catch (error) {

    return null;
  }
}

// Cache-Sync-Funktion um neue E-Mails zu speichern
async function syncEmailsToCache(emails: any[], folder: string, adminEmail: string): Promise<void> {
  try {

    const syncResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/workmail/emails/cache`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `taskilo-admin-token=${adminEmail}`, // Simplified for internal call
        },
        body: JSON.stringify({
          emails: emails,
          folder: folder,
          forceSync: false,
        }),
      }
    );

    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();

    } else {

    }
  } catch (error) {

  }
}

// WorkMail Admin User Mapping mit IMAP-Zugangsdaten
const WORKMAIL_ADMIN_MAPPING = {
  'andy.staudinger@taskilo.de': {
    email: 'andy.staudinger@taskilo.de',
    password: process.env.WORKMAIL_ANDY_PASSWORD || 'temp_password',
    role: 'master_admin',
  },
  'admin@taskilo.de': {
    email: 'support@taskilo.de',
    password: process.env.WORKMAIL_SUPPORT_PASSWORD || 'temp_password',
    role: 'admin',
  },
  'support@taskilo.de': {
    email: 'support@taskilo.de',
    password: process.env.WORKMAIL_SUPPORT_PASSWORD || 'temp_password',
    role: 'admin',
  },
};

// IMAP-Funktion für gesendete E-Mails mit bewährter, einfacher Logik
async function fetchSentEmailsViaIMAP(credentials: any, limit = 50): Promise<EmailResult> {
  return new Promise((resolve, reject) => {
    const imapConfig = {
      host: 'imap.mail.us-east-1.awsapps.com',
      port: 993,
      secure: true,
      user: credentials.email,
      password: credentials.password,
      tls: true,
      tlsOptions: {
        servername: 'imap.mail.us-east-1.awsapps.com',
        rejectUnauthorized: false,
      },
    };

    const imap = new Imap(imapConfig);

    imap.once('ready', () => {

      // Versuche verschiedene Sent-Folder Namen
      const sentFolders = ['Sent', 'SENT', 'Sent Items', 'Gesendet', 'Sent Messages'];

      let folderIndex = 0;
      const tryFolder = () => {
        if (folderIndex >= sentFolders.length) {

          imap.end();
          return reject(new Error('Sent folder not found'));
        }

        const currentFolder = sentFolders[folderIndex];

        imap.openBox(currentFolder, true, (err: any, box: any) => {
          if (err) {

            folderIndex++;
            tryFolder();
            return;
          }

          if (box.messages.total === 0) {

            imap.end();
            return resolve({
              emails: [],
              totalCount: 0,
              unreadCount: 0,
              source: 'workmail_imap_sent_new',
              folder: currentFolder,
              lastSync: new Date().toISOString(),
            });
          }

          // Bewährte, einfache Logik wie in der normalen Email API
          const total = box.messages.total;
          const actualLimit = Math.min(limit, total);

          // Hole die neuesten E-Mails (wie in der funktionierenden Email API)
          const range = Math.max(1, total - actualLimit + 1) + ':' + total;

          const emails: any[] = [];

          const fetch = imap.seq.fetch(range, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT', ''],
            struct: true,
          });
          fetch.on('message', (msg: any, seqno: number) => {
            const email: any = {
              id: `sent_${Date.now()}_${seqno}`,
              seqno: seqno,
              folder: currentFolder,
              source: 'workmail_imap_sent_new',
              isRead: true, // Sent emails sind immer "gelesen"
              category: 'sent',
            };

            msg.on('body', (stream: any, info: any) => {
              let buffer = '';
              stream.on('data', (chunk: any) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', () => {
                if (info.which.includes('HEADER')) {
                  // Parse header manually (genau wie in der funktionierenden API)
                  const headerText = buffer.toString();
                  const headerLines = headerText.split('\n');

                  email.from =
                    headerLines
                      .find(line => line.toLowerCase().startsWith('from:'))
                      ?.split(':')[1]
                      ?.trim() || credentials.email;

                  email.to =
                    headerLines
                      .find(line => line.toLowerCase().startsWith('to:'))
                      ?.split(':')[1]
                      ?.trim() || 'Unbekannt';

                  email.subject =
                    headerLines
                      .find(line => line.toLowerCase().startsWith('subject:'))
                      ?.split(':')[1]
                      ?.trim() || 'Kein Betreff';

                  email.messageId = headerLines
                    .find(line => line.toLowerCase().startsWith('message-id:'))
                    ?.split(':')[1]
                    ?.trim();

                  const dateLine = headerLines
                    .find(line => line.toLowerCase().startsWith('date:'))
                    ?.substring(5) // Entferne "Date:" prefix
                    ?.trim();

                  email.timestamp = dateLine
                    ? new Date(dateLine).toISOString()
                    : new Date().toISOString();

                  email.receivedAt = email.timestamp; // Für Kompatibilität

                } else if (info.which === 'TEXT') {
                  // Vollständige Text-Extraktion für Sent Emails

                  // Direkte TEXT-Extraktion
                  email.textContent = buffer.toString();
                  email.body = email.textContent;

                  // Versuche HTML-Extraktion falls verfügbar
                  if (buffer.includes('<html') || buffer.includes('<HTML')) {
                    const htmlMatch = buffer.match(/<html[\s\S]*?<\/html>/i);
                    if (htmlMatch) {
                      email.htmlContent = htmlMatch[0];

                    }
                  }

                } else if (info.which === '') {
                  // Vollständiger E-Mail-Body (falls TEXT nicht funktioniert)

                  if (buffer.length > email.textContent?.length || 0) {
                    // Nutze vollständigen Body falls länger als TEXT
                    email.rawContent = buffer.toString();

                    // Erweiterte HTML-Extraktion
                    const htmlMatch = buffer.match(/<html[\s\S]*?<\/html>/i);
                    if (htmlMatch) {
                      email.htmlContent = htmlMatch[0];

                    }

                    // Erweiterte Text-Extraktion
                    if (!email.textContent || email.textContent.trim().length < 50) {
                      // Einfache Text-Extraktion aus dem Body
                      let textContent = buffer.toString();

                      // Entferne Headers und E-Mail-Routing-Information
                      textContent = textContent.replace(/^[\s\S]*?\n\n/, ''); // Entferne Headers bis erste Leerzeile
                      textContent = textContent.replace(/Content-Type:[\s\S]*?\n\n/gi, ''); // Entferne Content-Type Blöcke
                      textContent = textContent.replace(/--[a-zA-Z0-9_-]+[\s\S]*?$/g, ''); // Entferne MIME boundaries

                      // HTML-Tags entfernen falls vorhanden
                      textContent = textContent.replace(/<[^>]*>/g, '');
                      textContent = textContent.replace(/&[a-zA-Z0-9#]+;/g, ' '); // HTML entities

                      // Mehrfache Leerzeichen und Zeilenumbrüche bereinigen
                      textContent = textContent.replace(/\s+/g, ' ').trim();

                      if (textContent.length > 10) {
                        email.textContent = textContent;
                        email.body = textContent;

                      }
                    }
                  }
                }
              });
            });

            msg.once('attributes', (attrs: any) => {
              email.uid = attrs.uid;
              email.flags = attrs.flags || [];
              email.isRead = email.flags.includes('\\Seen');
              email.messageId = attrs.uid || `sent_msg_${seqno}`;
              email.size = attrs.size || 0;
            });

            msg.once('end', () => {
              // Email hinzufügen wenn mindestens Subject vorhanden
              if (email.subject) {
                emails.push(email);

              }
            });
          });

          fetch.once('error', (err: any) => {

            imap.end();
            reject(err);
          });

          fetch.once('end', () => {

            imap.end();

            // Sortiere E-Mails nach Datum (neueste zuerst)
            emails.sort(
              (a, b) =>
                new Date(b.timestamp || b.receivedAt).getTime() -
                new Date(a.timestamp || a.receivedAt).getTime()
            );

            resolve({
              emails: emails,
              totalCount: total,
              unreadCount: 0,
              source: 'workmail_imap_sent_new',
              folder: currentFolder,
              lastSync: new Date().toISOString(),
            });
          });
        });
      };

      tryFolder();
    });

    imap.once('error', (err: any) => {

      reject(err);
    });

    imap.connect();
  });
}

// GET - Gesendete E-Mails abrufen
export async function GET(request: NextRequest) {
  try {

    // URL-Parameter
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const method = searchParams.get('method') || 'imap';

    // JWT Token Verification for Admin Dashboard (Cookie-based)
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {

      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      // Find admin credentials
      const adminConfig = WORKMAIL_ADMIN_MAPPING[adminEmail];
      if (!adminConfig) {

        return NextResponse.json(
          { error: 'Admin not configured for WorkMail access' },
          { status: 403 }
        );
      }

      if (!adminConfig.password) {

        return NextResponse.json(
          { error: 'IMAP credentials not configured for this admin' },
          { status: 403 }
        );
      }

      let result: EmailResult;

      // 1. Versuche zuerst Cache abzurufen (schnell)
      const cachedResult = await getCachedEmails(adminEmail, 'sent', limit);

      if (cachedResult && method !== 'force-imap') {

        result = cachedResult;
      } else {
        // 2. Falls kein Cache oder force-imap: IMAP verwenden

        result = await fetchSentEmailsViaIMAP(adminConfig, limit);

        // 3. Nach IMAP-Abruf: E-Mails im Cache speichern (async, blockiert Response nicht)
        if (result.emails.length > 0) {
          syncEmailsToCache(result.emails, 'sent', adminEmail).catch(err =>
            console.error('Cache sync error:', err)
          );
        }
      }

      return NextResponse.json({
        success: true,
        data: result,
        metadata: {
          requestMethod: method,
          actualMethod: result.source,
          adminEmail: adminEmail,
          requestTime: new Date().toISOString(),
          hasCredentials: !!adminConfig.password,
        },
      });
    } catch (jwtError) {

      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE - E-Mail endgültig aus Cache löschen
export async function DELETE(request: NextRequest) {
  try {

    // URL-Parameter
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const folder = searchParams.get('folder') || 'sent';

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    // JWT Token Verification
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {

      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      // Cache-Delete API aufrufen
      const deleteResponse = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/workmail/emails/cache?emailId=${emailId}&folder=${folder}`,
        {
          method: 'DELETE',
          headers: {
            Cookie: `taskilo-admin-token=${token}`,
          },
        }
      );

      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();

        return NextResponse.json({
          success: true,
          message: 'Email successfully deleted',
          emailId: emailId,
          folder: folder,
          deletedAt: new Date().toISOString(),
        });
      } else {
        throw new Error('Failed to delete email from cache');
      }
    } catch (jwtError) {

      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
