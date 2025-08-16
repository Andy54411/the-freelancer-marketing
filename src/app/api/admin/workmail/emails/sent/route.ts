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

    console.log('📧 [Sent Emails NEW] Connecting to AWS WorkMail IMAP...', {
      email: credentials.email,
      host: imapConfig.host,
      port: imapConfig.port,
    });

    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
      console.log('✅ [Sent Emails NEW] IMAP connected successfully');

      // Versuche verschiedene Sent-Folder Namen
      const sentFolders = ['Sent', 'SENT', 'Sent Items', 'Gesendet', 'Sent Messages'];

      let folderIndex = 0;
      const tryFolder = () => {
        if (folderIndex >= sentFolders.length) {
          console.error('❌ [Sent Emails NEW] No sent folder found');
          imap.end();
          return reject(new Error('Sent folder not found'));
        }

        const currentFolder = sentFolders[folderIndex];
        console.log(`🔍 [Sent Emails NEW] Trying folder: ${currentFolder}`);

        imap.openBox(currentFolder, true, (err: any, box: any) => {
          if (err) {
            console.warn(
              `⚠️ [Sent Emails NEW] Folder ${currentFolder} not accessible:`,
              err.message
            );
            folderIndex++;
            tryFolder();
            return;
          }

          console.log(
            `📬 [Sent Emails NEW] Mailbox opened: ${box.name}, Messages: ${box.messages.total}`
          );

          if (box.messages.total === 0) {
            console.log('📭 [Sent Emails NEW] No messages found');
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
          const range = `1:${actualLimit}`;

          console.log(`📧 [Sent Emails NEW] Fetching messages ${range} from ${currentFolder}`);

          const emails: any[] = [];

          const fetch = imap.fetch(range, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)',
            struct: true,
          });

          fetch.on('message', (msg: any, seqno: number) => {
            const email: any = {
              id: `sent_${Date.now()}_${seqno}`,
              seqno: seqno,
              folder: currentFolder,
            };

            msg.on('body', (stream: any, info: any) => {
              let buffer = '';
              stream.on('data', (chunk: any) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', () => {
                try {
                  const headers = (Imap as any).parseHeader(buffer);

                  email.from = headers.from?.[0] || credentials.email;
                  email.to = headers.to?.[0] || 'Unbekannt';
                  email.subject = headers.subject?.[0] || 'Kein Betreff';
                  email.messageId = headers['message-id']?.[0];

                  // Datum parsen
                  if (headers.date?.[0]) {
                    try {
                      email.timestamp = new Date(headers.date[0]).toISOString();
                    } catch (dateError) {
                      console.warn('⚠️ [Sent Emails NEW] Date parse error:', dateError);
                      email.timestamp = new Date().toISOString();
                    }
                  } else {
                    email.timestamp = new Date().toISOString();
                  }

                  // Für Sent Emails verwenden wir vereinfachte Text-Extraktion
                  email.body = `Sent to: ${email.to}`;

                  console.log(`📧 [Sent Emails NEW] Processed: ${email.subject} to ${email.to}`);

                  // Email direkt hinzufügen wenn Header verfügbar sind
                  if (email.from && email.to && email.subject) {
                    emails.push(email);
                    console.log(`✅ [Sent Emails NEW] Email added to list: ${emails.length}`);
                  }
                } catch (error) {
                  console.error('❌ [Sent Emails NEW] Header parsing error:', error);
                }
              });
            });

            msg.once('attributes', (attrs: any) => {
              email.uid = attrs.uid;
              email.flags = attrs.flags || [];
              email.isRead = email.flags.includes('\\Seen');
            });
          });

          fetch.once('error', (err: any) => {
            console.error('❌ [Sent Emails NEW] IMAP fetch error:', err);
            imap.end();
            reject(err);
          });

          fetch.once('end', () => {
            console.log(
              `✅ [Sent Emails NEW] IMAP fetch completed, emails found: ${emails.length}`
            );

            // Sortiere nach Datum (neueste zuerst)
            emails.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            imap.end();

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
      console.error('❌ [Sent Emails NEW] IMAP connection error:', err);
      reject(err);
    });

    imap.connect();
  });
}

// GET - Gesendete E-Mails abrufen
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [Sent Emails NEW API] Starting request...');

    // URL-Parameter
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const method = searchParams.get('method') || 'imap';

    console.log('📋 [Sent Emails NEW API] Request parameters:', { limit, method });

    // JWT Token Verification for Admin Dashboard (Cookie-based)
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {
      console.error('❌ [Sent Emails NEW API] Missing admin token cookie');
      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      console.log('✅ [Sent Emails NEW API] JWT Cookie verified for admin:', {
        email: adminEmail,
        method,
      });

      // Find admin credentials
      const adminConfig = WORKMAIL_ADMIN_MAPPING[adminEmail];
      if (!adminConfig) {
        console.error('❌ [Sent Emails NEW API] Admin not found in WorkMail mapping:', adminEmail);
        return NextResponse.json(
          { error: 'Admin not configured for WorkMail access' },
          { status: 403 }
        );
      }

      if (!adminConfig.password) {
        console.error('❌ [Sent Emails NEW API] No password configured for admin:', adminEmail);
        return NextResponse.json(
          { error: 'IMAP credentials not configured for this admin' },
          { status: 403 }
        );
      }

      console.log('📧 [Sent Emails NEW API] Using IMAP method for sent email retrieval');

      const result = await fetchSentEmailsViaIMAP(adminConfig, limit);

      console.log('📊 [Sent Emails NEW API] Response summary:', {
        emailCount: result.emails?.length || 0,
        totalCount: result.totalCount,
        source: result.source,
        folder: result.folder,
      });

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
      console.error('❌ [Sent Emails NEW API] JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ [Sent Emails NEW API] Unexpected error:', error);
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
