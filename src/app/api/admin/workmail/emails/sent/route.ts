// API Route für gesendete E-Mails - AWS WorkMail Integration
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import Imap from 'imap';

// Quoted-Printable Decoder (gleiche Logik wie in der Haupt-API)
function decodeQuotedPrintable(encoded: string): string {
  console.log('🚀 [Sent Emails API] Decoding quoted-printable content...');

  if (!encoded || typeof encoded !== 'string') {
    return encoded || '';
  }

  // Soft line breaks (=\r\n or =\n) entfernen
  let decoded = encoded.replace(/=\r?\n/g, '');

  // Spezifische UTF-8 Umlaute und deutsche Zeichen
  const germanChars: { [key: string]: string } = {
    '=C3=A4': 'ä',
    '=C3=84': 'Ä',
    '=C3=B6': 'ö',
    '=C3=96': 'Ö',
    '=C3=BC': 'ü',
    '=C3=9C': 'Ü',
    '=C3=9F': 'ß',
    '=E2=80=93': '–',
    '=E2=80=94': '—',
    '=E2=80=99': "'",
    '=E2=80=9C': '"',
    '=E2=80=9D': '"',
    '=C2=A0': ' ',
    '=E2=9A=A0=EF=B8=8F': '⚠️',
    '=E2=9C=85': '✅',
    '=E2=9D=8C': '❌',
    '=E2=9A=A0': '⚠️',
  };

  // HTML-Entities und falsche Unicode-Zeichen
  const htmlEntities: { [key: string]: string } = {
    'â ï¸ Close Match': '⚠️ Close Match',
    'â No Match': '❌ No Match',
    'â Match': '✅ Match',
    'âMatch"': '"Match"',
    âMatch: '"Match',
    'â€œ': '"',
    'â€': '"',
    'â€™': "'",
    'â€"': '–',
    'Ã¤': 'ä',
    'Ã¶': 'ö',
    'Ã¼': 'ü',
    ÃŸ: 'ß',
    'Ã„': 'Ä',
    'Ã–': 'Ö',
    Ãœ: 'Ü',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  // Deutsche Zeichen dekodieren
  for (const [encoded_char, decoded_char] of Object.entries(germanChars)) {
    decoded = decoded.replace(new RegExp(encoded_char, 'g'), decoded_char);
  }

  // HTML-Entities dekodieren
  for (const [entity, char] of Object.entries(htmlEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  // Standard hex-codes (=XX)
  decoded = decoded.replace(/=([0-9A-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return decoded;
}

// Interface für E-Mail Ergebnis
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

// IMAP-Funktion für gesendete E-Mails
async function fetchSentEmailsViaIMAP(credentials: any, limit = 50): Promise<EmailResult> {
  return new Promise((resolve, reject) => {
    try {
      // IMAP Configuration für AWS WorkMail
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

      console.log('� [Sent Emails] Connecting to AWS WorkMail IMAP...', {
        email: credentials.email,
        host: imapConfig.host,
        port: imapConfig.port,
      });

      const imap = new Imap(imapConfig);
      const emails: any[] = [];

      imap.once('ready', () => {
        console.log('✅ [Sent Emails] IMAP connected successfully');

        // Versuche verschiedene Sent-Folder Namen
        const sentFolders = ['Sent', 'SENT', 'Sent Items', 'Gesendet', 'Sent Messages'];

        let folderIndex = 0;
        const tryFolder = () => {
          if (folderIndex >= sentFolders.length) {
            console.error('❌ [Sent Emails] No sent folder found');
            imap.end();
            return reject(new Error('Sent folder not found'));
          }

          const currentFolder = sentFolders[folderIndex];
          console.log(`🔍 [Sent Emails] Trying folder: ${currentFolder}`);

          imap.openBox(currentFolder, true, (err: any, box: any) => {
            if (err) {
              console.warn(`⚠️ [Sent Emails] Folder ${currentFolder} not accessible:`, err.message);
              folderIndex++;
              tryFolder();
              return;
            }

            console.log(
              `📬 [Sent Emails] Sent folder opened: ${box.name}, Messages: ${box.messages.total}`
            );

            if (box.messages.total === 0) {
              console.log('📭 [Sent Emails] No sent messages found');
              imap.end();
              return resolve({
                emails: [],
                totalCount: 0,
                unreadCount: 0,
                source: 'workmail_imap_sent',
                folder: currentFolder,
                lastSync: new Date().toISOString(),
              });
            }

            // Neueste E-Mails zuerst (von hinten nach vorne)
            const total = box.messages.total;
            const start = Math.max(1, total - limit + 1);
            const end = total;
            const range = `${start}:${end}`;

            console.log(`📧 [Sent Emails] Fetching messages ${range} from ${currentFolder}`);

            const fetch = imap.fetch(range, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
              struct: true,
              markSeen: false,
            });

            fetch.on('message', (msg: any, seqno: number) => {
              console.log(`📩 [Sent Emails] Processing message #${seqno}`);

              const email: any = {
                id: `sent_${seqno}_${Date.now()}`,
                seqno,
                folder: currentFolder,
              };

              msg.on('body', (stream: any, info: any) => {
                let buffer = '';
                stream.on('data', (chunk: any) => {
                  buffer += chunk.toString('utf8');
                });

                stream.once('end', () => {
                  if (info.which === 'TEXT') {
                    email.body = decodeQuotedPrintable(buffer);
                  } else {
                    const header = Imap.parseHeader(buffer);
                    email.subject = header.subject?.[0] || 'Kein Betreff';
                    email.from = header.from?.[0] || credentials.email;
                    email.to = header.to?.[0] || '';
                    email.date = header.date?.[0] || new Date().toISOString();

                    // Datum parsen
                    try {
                      email.timestamp = new Date(email.date).toISOString();
                    } catch {
                      email.timestamp = new Date().toISOString();
                    }
                  }
                });
              });

              msg.once('attributes', (attrs: any) => {
                email.flags = attrs.flags || [];
                email.uid = attrs.uid;
                email.isRead = email.flags.includes('\\Seen');
              });

              msg.once('end', () => {
                emails.push(email);
                console.log(`✅ [Sent Emails] Email #${seqno} processed: ${email.subject}`);
              });
            });

            fetch.once('error', (err: any) => {
              console.error('❌ [Sent Emails] Fetch error:', err);
              imap.end();
              reject(err);
            });

            fetch.once('end', () => {
              console.log(
                `📊 [Sent Emails] Fetch completed: ${emails.length} sent emails processed`
              );
              imap.end();

              // Sortiere nach Datum (neueste zuerst)
              emails.sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );

              resolve({
                emails: emails,
                totalCount: total,
                unreadCount: 0, // Sent emails haben normalerweise keine "unread" flags
                source: 'workmail_imap_sent',
                folder: currentFolder,
                lastSync: new Date().toISOString(),
              });
            });
          });
        };

        tryFolder();
      });

      imap.once('error', (err: any) => {
        console.error('❌ [Sent Emails] IMAP connection error:', err);
        reject(err);
      });

      imap.connect();
    } catch (error) {
      console.error('❌ [Sent Emails] IMAP setup error:', error);
      reject(error);
    }
  });
}

// GET - Gesendete E-Mails abrufen
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [Sent Emails API] Starting request...');

    // URL-Parameter
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const method = searchParams.get('method') || 'imap';

    console.log('� [Sent Emails API] Request parameters:', { limit, method });

    // JWT Token Verification for Admin Dashboard (Cookie-based)
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {
      console.error('❌ [Sent Emails API] Missing admin token cookie');
      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      console.log('✅ [Sent Emails API] JWT Cookie verified for admin:', {
        email: adminEmail,
        method,
      });

      // Find admin credentials
      const adminConfig = WORKMAIL_ADMIN_MAPPING[adminEmail];
      if (!adminConfig) {
        console.error('❌ [Sent Emails API] Admin not found in WorkMail mapping:', adminEmail);
        return NextResponse.json(
          { error: 'Admin not configured for WorkMail access' },
          { status: 403 }
        );
      }

      if (!adminConfig.password) {
        console.error('❌ [Sent Emails API] No password configured for admin:', adminEmail);
        return NextResponse.json(
          { error: 'IMAP credentials not configured for this admin' },
          { status: 403 }
        );
      }

      console.log('📧 [Sent Emails API] Using IMAP method for sent email retrieval');

      const result = await fetchSentEmailsViaIMAP(adminConfig, limit);

      console.log('📊 [Sent Emails API] Response summary:', {
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
      console.error('❌ [Sent Emails API] JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ [Sent Emails API] Unexpected error:', error);
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
