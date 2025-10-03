// API Route für gesendete E-Mails - AWS WorkMail Integration
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import Imap from 'imap';

// Quoted-Printable Decoder (gleiche Logik wie in der Haupt-API)
function decodeQuotedPrintable(encoded: string): string {
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

      const imap = new Imap(imapConfig);
      const emails: any[] = [];

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
                source: 'workmail_imap_sent',
                folder: currentFolder,
                lastSync: new Date().toISOString(),
              });
            }

            // Neueste E-Mails zuerst (von hinten nach vorne)
            const total = box.messages.total;

            if (total === 0) {
              imap.end();
              resolve({
                emails: [],
                totalCount: 0,
                unreadCount: 0,
                source: 'workmail_imap_sent',
                folder: currentFolder,
                lastSync: new Date().toISOString(),
              });
              return;
            }

            // Fetch latest messages
            const start = Math.max(1, total - limit + 1);
            const end = total;
            const range = `${start}:${end}`;

            const fetch = imap.fetch(range, {
              bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
              struct: true,
              markSeen: false,
            });

            const expectedMessages = end - start + 1;
            let processedMessages = 0;
            const messageData = new Map();

            fetch.on('message', (msg: any, seqno: number) => {
              // Initialize message data
              if (!messageData.has(seqno)) {
                messageData.set(seqno, {
                  id: `sent_${seqno}_${Date.now()}`,
                  seqno,
                  folder: currentFolder,
                  hasHeader: false,
                  hasBody: false,
                  subject: '',
                  from: '',
                  to: '',
                  date: '',
                  body: '',
                  timestamp: '',
                  flags: [],
                  uid: null,
                  isRead: false,
                });
              }

              const email = messageData.get(seqno);

              // Handle message attributes
              msg.once('attributes', (attrs: any) => {
                email.flags = attrs.flags || [];
                email.uid = attrs.uid;
                email.isRead = email.flags.includes('\\Seen');
              });

              // Handle message body parts
              msg.on('body', (stream: any, info: any) => {
                let buffer = '';

                stream.on('data', (chunk: any) => {
                  buffer += chunk.toString('utf8');
                });

                stream.once('end', () => {
                  if (info.which === 'TEXT') {
                    email.body = decodeQuotedPrintable(buffer.trim());
                    email.hasBody = true;
                  } else if (info.which.includes('HEADER')) {
                    try {
                      const header = Imap.parseHeader(buffer);
                      email.subject = header.subject?.[0] || 'Kein Betreff';
                      email.from = header.from?.[0] || credentials.email;
                      email.to = header.to?.[0] || '';
                      email.date = header.date?.[0] || new Date().toISOString();

                      // Parse date
                      try {
                        email.timestamp = new Date(email.date).toISOString();
                      } catch {
                        email.timestamp = new Date().toISOString();
                      }

                      email.hasHeader = true;
                    } catch (parseError) {
                      email.hasHeader = true; // Mark as processed even if failed
                    }
                  }

                  // Check if message is complete
                  if (email.hasHeader && email.hasBody) {
                    if (email.subject && email.timestamp) {
                      emails.push({
                        id: email.id,
                        subject: email.subject,
                        from: email.from,
                        to: email.to,
                        body: email.body,
                        timestamp: email.timestamp,
                        isRead: email.isRead,
                        flags: email.flags,
                        uid: email.uid,
                      });
                      processedMessages++;

                      // Check if all messages are processed
                      if (processedMessages >= expectedMessages) {
                        // Sort by date (newest first)
                        emails.sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                        );

                        imap.end();
                        resolve({
                          emails: emails,
                          totalCount: total,
                          unreadCount: 0,
                          source: 'workmail_imap_sent',
                          folder: currentFolder,
                          lastSync: new Date().toISOString(),
                        });
                      }
                    } else {
                      processedMessages++;

                      if (processedMessages >= expectedMessages) {
                        emails.sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                        );

                        imap.end();
                        resolve({
                          emails: emails,
                          totalCount: total,
                          unreadCount: 0,
                          source: 'workmail_imap_sent',
                          folder: currentFolder,
                          lastSync: new Date().toISOString(),
                        });
                      }
                    }
                  }
                });
              });
            });

            fetch.once('error', (err: any) => {
              imap.end();
              reject(err);
            });

            fetch.once('end', () => {
              // Set timeout in case some messages don't complete
              setTimeout(() => {
                if (processedMessages < expectedMessages) {
                  imap.end();

                  emails.sort(
                    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                  );

                  resolve({
                    emails: emails,
                    totalCount: total,
                    unreadCount: 0,
                    source: 'workmail_imap_sent',
                    folder: currentFolder,
                    lastSync: new Date().toISOString(),
                  });
                }
              }, 5000); // 5 second timeout
            });
          });
        };

        tryFolder();
      });

      imap.once('error', (err: any) => {
        reject(err);
      });

      imap.connect();
    } catch (error) {
      reject(error);
    }
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

      const result = await fetchSentEmailsViaIMAP(adminConfig, limit);

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
