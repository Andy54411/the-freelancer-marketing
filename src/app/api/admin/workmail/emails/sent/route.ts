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

          // Hole die neuesten E-Mails (wie in der funktionierenden Email API)
          const range = Math.max(1, total - actualLimit + 1) + ':' + total;

          console.log(`📧 [Sent Emails NEW] Fetching messages ${range} from ${currentFolder}`);

          const emails: any[] = [];

          const fetch = imap.seq.fetch(range, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'TEXT'],
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

                  console.log('📅 [Sent Emails NEW] Date parsing:', dateLine);

                  email.timestamp = dateLine
                    ? new Date(dateLine).toISOString()
                    : new Date().toISOString();

                  email.receivedAt = email.timestamp; // Für Kompatibilität

                  console.log(
                    `📧 [Sent Emails NEW] Header processed: ${email.subject} to ${email.to}`
                  );
                } else if (info.which === 'TEXT') {
                  // Für Sent Emails vereinfachte Text-Extraktion
                  email.textContent = `Sent to: ${email.to}`;
                  email.body = email.textContent;
                  console.log(`📝 [Sent Emails NEW] Text processed for: ${email.subject}`);
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
                console.log(
                  `✅ [Sent Emails NEW] Email added to list: ${emails.length} - ${email.subject}`
                );
              }
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
