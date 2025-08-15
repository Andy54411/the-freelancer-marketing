// AWS WorkMail Email SSO Integration API
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import Imap from 'imap';

// Quoted-Printable Decoder für E-Mail-Inhalte
function decodeQuotedPrintable(encoded: string): string {
  console.log('🚀 [WorkMail API] Decoding quoted-printable content...');

  if (!encoded || typeof encoded !== 'string') {
    return encoded || '';
  }

  // Soft line breaks (=\r\n or =\n) entfernen
  let decoded = encoded.replace(/=\r?\n/g, '');

  // Spezifische UTF-8 Umlaute und deutsche Zeichen
  const germanChars: { [key: string]: string } = {
    '=C3=A4': 'ä',
    '=C3=84': 'Ä', // ä, Ä
    '=C3=B6': 'ö',
    '=C3=96': 'Ö', // ö, Ö
    '=C3=BC': 'ü',
    '=C3=9C': 'Ü', // ü, Ü
    '=C3=9F': 'ß', // ß
    '=E2=80=93': '–', // En dash
    '=E2=80=94': '—', // Em dash
    '=E2=80=99': "'", // Right single quotation mark
    '=E2=80=9C': '"', // Left double quotation mark
    '=E2=80=9D': '"', // Right double quotation mark
    '=C2=A0': ' ', // Non-breaking space
    // KRITISCH: Emoji UTF-8 Codes für finAPI
    '=E2=9A=A0=EF=B8=8F': '⚠️', // Warning emoji ⚠️
    '=E2=9C=85': '✅', // Check mark emoji ✅
    '=E2=9D=8C': '❌', // Cross mark emoji ❌
    '=E2=9A=A0': '⚠️', // Warning sign (ohne variation selector)
  };

  // HTML-Entities und falsche Unicode-Zeichen
  const htmlEntities: { [key: string]: string } = {
    // finAPI spezifische Probleme (EXAKTE Matches zuerst!)
    'â ï¸ Close Match': '⚠️ Close Match', // MUSS vor anderen â-Regeln stehen
    'â No Match': '❌ No Match', // MUSS vor anderen â-Regeln stehen
    'â Match': '✅ Match', // MUSS vor anderen â-Regeln stehen
    'âMatch"': '"Match"', // Entfernt â komplett
    âMatch: '"Match', // Entfernt â komplett
    // KRITISCH: Weitere â-Kombinationen für finAPI
    'â€œ': '"', // Left double quote
    'â€': '"', // Right double quote
    'â€™': "'", // Right single quote
    'â€"': '–', // En dash
    'â ï¸': '⚠️', // Warning sign (Fallback)
    'â "': '"', // â mit Anführungszeichen
    'â"': '"', // â direkt mit Anführungszeichen
    'â ': '"', // â mit Leerzeichen
    â: '"', // KRITISCH: Entferne â komplett (finAPI Problem)
    // KRITISCH: € Encoding-Probleme
    '€œ': '"', // €œ -> " (Left double quote)
    '€': '"', // € -> " (Right double quote)
    '€™': "'", // €™ -> ' (Right single quote)
    '€"': '–', // €" -> – (En dash)
    'Â­': '', // Soft hyphen (remove)
    'Â ': ' ', // Non-breaking space
    // Standard entities
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#8216;': "'",
    '&#8217;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
  };

  // Deutsche Zeichen ersetzen
  for (const [encoded_char, decoded_char] of Object.entries(germanChars)) {
    decoded = decoded.replace(new RegExp(encoded_char, 'g'), decoded_char);
  }

  // HTML-Entities und Unicode-Zeichen ersetzen
  for (const [entity, replacement] of Object.entries(htmlEntities)) {
    decoded = decoded.replace(
      new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      replacement
    );
  }

  // Generische Hex-Dekodierung für alle anderen =XX Codes
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  console.log('✅ [WorkMail API] Quoted-printable decoding completed');
  return decoded;
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

// WorkMail SSO Configuration (als Fallback)
const WORKMAIL_CONFIG = {
  organization: 'taskilo-org',
  region: 'us-east-1',
  webInterface: 'https://taskilo-org.awsapps.com/mail',
  ssoEnabled: true,
  apiEndpoint: 'https://workmail.us-east-1.amazonaws.com',
};

async function verifyAdminAuth(): Promise<any> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    return payload;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

async function fetchWorkmailEmailsViaIMAP(credentials: any, folder = 'INBOX', limit = 50) {
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

      console.log('🔄 Connecting to AWS WorkMail IMAP...', {
        email: credentials.email,
        host: imapConfig.host,
        port: imapConfig.port,
      });

      const imap = new Imap(imapConfig);
      const emails: any[] = [];

      imap.once('ready', () => {
        console.log('✅ IMAP connected successfully');

        imap.openBox(folder, true, (err: any, box: any) => {
          if (err) {
            console.error('❌ Error opening mailbox:', err);
            return reject(err);
          }

          console.log(`📬 Mailbox opened: ${box.name}, Messages: ${box.messages.total}`);

          if (box.messages.total === 0) {
            console.log('📭 No messages found in mailbox');
            imap.end();
            return resolve({
              emails: [],
              totalCount: 0,
              unreadCount: 0,
              source: 'workmail_imap',
              folder: folder,
              lastSync: new Date().toISOString(),
            });
          }

          // Hole die neuesten E-Mails
          const range = Math.max(1, box.messages.total - limit + 1) + ':' + box.messages.total;
          console.log(`📧 Fetching messages ${range} from ${folder}`);

          const fetch = imap.seq.fetch(range, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT', '1.2'],
            struct: true,
          });

          fetch.on('message', (msg: any, seqno: number) => {
            const email: any = {
              id: `workmail_${Date.now()}_${seqno}`,
              source: 'workmail_imap',
              folder,
              seqno,
              isRead: false,
              priority: 'normal',
              category: 'support',
              attachments: [],
            };

            msg.on('body', (stream: any, info: any) => {
              let buffer = '';
              stream.on('data', (chunk: any) => {
                buffer += chunk.toString('utf8');
              });

              stream.once('end', () => {
                if (info.which === 'TEXT') {
                  // Original-Content für Debug-Zwecke
                  const originalBuffer = buffer.trim();

                  // Quoted-Printable Dekodierung anwenden
                  let decodedContent = decodeQuotedPrintable(originalBuffer);

                  console.log('📧 [WorkMail API] TEXT Content processing:');
                  console.log('🔍 Original length:', originalBuffer.length);
                  console.log('🔧 Decoded length:', decodedContent.length);

                  // KRITISCH: Euro-Symbol-Bereinigung auch für TEXT-Content!
                  console.log('🔧 [API] Applying Euro symbol fixes to decodedContent...');

                  // DEBUG: Vorher-Analyse
                  const beforeClean = decodedContent.substring(0, 500);
                  console.log(
                    '🎯 [API DEBUG] Content before cleaning (first 500 chars):',
                    beforeClean
                  );

                  // Suche nach Euro-Symbolen vor der Bereinigung
                  const euroBefore = [];
                  for (let i = 0; i < Math.min(decodedContent.length, 1000); i++) {
                    const char = decodedContent[i];
                    if (char === '€') {
                      euroBefore.push({
                        index: i,
                        char: char,
                        charCode: char.charCodeAt(0),
                        context: decodedContent.substring(Math.max(0, i - 10), i + 15),
                      });
                    }
                  }
                  console.log(
                    '🎯 [API DEBUG] Found',
                    euroBefore.length,
                    'Euro symbols before cleaning:',
                    euroBefore
                  );

                  decodedContent = decodedContent
                    .replace(/â ï¸ Close Match/g, '⚠️ Close Match')
                    .replace(/â No Match/g, '❌ No Match')
                    .replace(/â Match/g, '✅ Match')
                    .replace(/€œ/g, '"') // €œ -> "
                    .replace(/€/g, '"') // € -> "
                    .replace(/€™/g, "'") // €™ -> '
                    .replace(/€"/g, '–') // €" -> –
                    .replace(/â "/g, '"')
                    .replace(/â"/g, '"')
                    .replace(/â /g, '"')
                    .replace(/â(?=\s)/g, '"') // â gefolgt von Leerzeichen
                    .replace(/â/g, '"') // alle anderen â
                    // KRITISCH: Smart-Quote-Bereinigung auch in API!
                    .replace(/"/g, '"') // Unicode 201C/201D -> normale Anführungszeichen
                    .replace(/"/g, '"')
                    .replace(/'/g, "'") // Unicode 2018/2019 -> normaler Apostroph
                    .replace(/'/g, "'")
                    .replace(/–/g, '-') // Unicode 2013 -> normaler Bindestrich
                    .replace(/—/g, '-') // Unicode 2014 -> normaler Bindestrich
                    // ULTIMATIV: Alle nicht-ASCII Anführungszeichen ersetzen
                    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // Alle Arten von Anführungszeichen
                    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'") // Alle Arten von Apostrophen
                    .replace(/[\u2013\u2014\u2015]/g, '-') // Alle Arten von Strichen
                    .replace(/[\u2026]/g, '...'); // Ellipsis

                  // DEBUG: Nachher-Analyse
                  const afterClean = decodedContent.substring(0, 500);
                  console.log(
                    '🎯 [API DEBUG] Content after cleaning (first 500 chars):',
                    afterClean
                  );

                  // Suche nach verbleibenden Euro-Symbolen
                  const euroAfter = [];
                  for (let i = 0; i < Math.min(decodedContent.length, 1000); i++) {
                    const char = decodedContent[i];
                    if (char === '€') {
                      euroAfter.push({
                        index: i,
                        char: char,
                        charCode: char.charCodeAt(0),
                        context: decodedContent.substring(Math.max(0, i - 10), i + 15),
                      });
                    }
                  }
                  console.log(
                    '🎯 [API DEBUG] Remaining Euro symbols after cleaning:',
                    euroAfter.length,
                    euroAfter
                  );

                  console.log('✅ [API] Euro symbol fixes applied to TEXT content');

                  // KRITISCH: HTML-Section aus Raw-Content extrahieren!
                  const htmlSectionMatch = decodedContent.match(
                    /Content-Type:\s*text\/html[^]*?(?=\r?\n---------|\r?\nContent-Type:|\r?\n$)/i
                  );

                  if (htmlSectionMatch) {
                    // HTML-Content aus der Section extrahieren (ohne Headers)
                    const htmlSection = htmlSectionMatch[0];
                    const htmlBodyMatch = htmlSection.match(/(?:\r?\n\r?\n)([\s\S]+)$/);

                    if (htmlBodyMatch) {
                      let extractedHtml = decodeQuotedPrintable(htmlBodyMatch[1].trim());

                      // DEBUG: HTML Content vor Bereinigung
                      console.log(
                        '🎯 [API DEBUG] HTML before cleaning (first 300 chars):',
                        extractedHtml.substring(0, 300)
                      );

                      // KRITISCH: Sofortige â-Reparatur direkt nach HTML-Extraktion!
                      extractedHtml = extractedHtml
                        .replace(/â ï¸ Close Match/g, '⚠️ Close Match')
                        .replace(/â No Match/g, '❌ No Match')
                        .replace(/â Match/g, '✅ Match')
                        .replace(/€œ/g, '"') // €œ -> "
                        .replace(/€/g, '"') // € -> "
                        .replace(/€™/g, "'") // €™ -> '
                        .replace(/€"/g, '–') // €" -> –
                        .replace(/â "/g, '"')
                        .replace(/â"/g, '"')
                        .replace(/â /g, '"')
                        .replace(/â(?=\s)/g, '"') // â gefolgt von Leerzeichen
                        .replace(/â/g, '"') // alle anderen â
                        // KRITISCH: Smart-Quote-Bereinigung auch für HTML!
                        .replace(/"/g, '"') // Unicode 201C/201D -> normale Anführungszeichen
                        .replace(/"/g, '"')
                        .replace(/'/g, "'") // Unicode 2018/2019 -> normaler Apostroph
                        .replace(/'/g, "'")
                        .replace(/–/g, '-') // Unicode 2013 -> normaler Bindestrich
                        .replace(/—/g, '-') // Unicode 2014 -> normaler Bindestrich
                        // ULTIMATIV: Alle nicht-ASCII Anführungszeichen ersetzen
                        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // Alle Arten von Anführungszeichen
                        .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'") // Alle Arten von Apostrophen
                        .replace(/[\u2013\u2014\u2015]/g, '-') // Alle Arten von Strichen
                        .replace(/[\u2026]/g, '...'); // Ellipsis

                      // DEBUG: HTML Content nach Bereinigung
                      console.log(
                        '🎯 [API DEBUG] HTML after cleaning (first 300 chars):',
                        extractedHtml.substring(0, 300)
                      );

                      console.log(
                        '✅ [API] HTML extracted and â-characters fixed:',
                        extractedHtml.substring(0, 200)
                      );

                      // NUR den extrahierten und reparierten HTML-Content verwenden
                      email.htmlContent = extractedHtml;
                      email.textContent = extractedHtml.replace(/<[^>]*>/g, '').substring(0, 500);
                      return; // Früher Return - keine weitere Verarbeitung!
                    }
                  }

                  // Fallback: Nur wenn KEIN HTML gefunden wurde
                  email.textContent = decodedContent;
                } else if (info.which === 'HTML' || info.which.includes('HTML')) {
                  // HTML-Content verarbeiten
                  const originalBuffer = buffer.trim();
                  const decodedHtmlContent = decodeQuotedPrintable(originalBuffer);

                  console.log('🌐 [WorkMail API] HTML Content processing:');
                  console.log('🔍 HTML Original length:', originalBuffer.length);
                  console.log('🔧 HTML Decoded length:', decodedHtmlContent.length);

                  email.htmlContent = decodedHtmlContent;
                  // Wenn kein textContent vorhanden, HTML als Fallback verwenden
                  if (!email.textContent) {
                    email.textContent = decodedHtmlContent
                      .replace(/<[^>]*>/g, '')
                      .substring(0, 500);
                  }
                } else if (info.which.includes('HEADER')) {
                  // Parse header manually
                  const headerText = buffer.toString();
                  const headerLines = headerText.split('\n');

                  email.from =
                    headerLines
                      .find(line => line.toLowerCase().startsWith('from:'))
                      ?.split(':')[1]
                      ?.trim() || 'Unknown';
                  email.to =
                    headerLines
                      .find(line => line.toLowerCase().startsWith('to:'))
                      ?.split(':')[1]
                      ?.trim() || credentials.email;
                  email.subject =
                    headerLines
                      .find(line => line.toLowerCase().startsWith('subject:'))
                      ?.split(':')[1]
                      ?.trim() || 'No Subject';

                  const dateLine = headerLines
                    .find(line => line.toLowerCase().startsWith('date:'))
                    ?.split(':')[1]
                    ?.trim();
                  email.receivedAt = dateLine
                    ? new Date(dateLine).toISOString()
                    : new Date().toISOString();
                }
              });
            });

            msg.once('attributes', (attrs: any) => {
              email.messageId = attrs.uid || `msg_${seqno}`;
              email.size = attrs.size || 0;
              email.flags = attrs.flags || [];
              email.isRead = attrs.flags && attrs.flags.includes('\\Seen');
            });

            msg.once('end', () => {
              emails.push(email);
            });
          });

          fetch.once('error', (err: any) => {
            console.error('❌ Fetch error:', err);
            reject(err);
          });

          fetch.once('end', () => {
            console.log(`✅ IMAP fetch completed, emails found: ${emails.length}`);
            imap.end();

            // Sortiere E-Mails nach Datum (neueste zuerst)
            emails.sort(
              (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
            );

            resolve({
              emails: emails,
              totalCount: emails.length,
              unreadCount: emails.filter(e => !e.isRead).length,
              source: 'workmail_imap',
              folder: folder,
              lastSync: new Date().toISOString(),
            });
          });
        });
      });

      imap.once('error', (err: any) => {
        console.error('❌ IMAP connection error:', err);
        reject(err);
      });

      imap.once('end', () => {
        console.log('🔚 IMAP connection ended');
      });

      // Timeout für IMAP-Verbindung
      setTimeout(() => {
        console.log('⏰ IMAP connection timeout');
        imap.end();
        reject(new Error('IMAP connection timeout'));
      }, 15000); // 15 Sekunden Timeout

      imap.connect();
    } catch (error) {
      console.error('❌ fetchWorkmailEmailsViaIMAP error:', error);
      reject(error);
    }
  });
}

async function getWorkmailEmailsViaSSO(adminEmail: string, folder = 'INBOX', limit = 50) {
  try {
    console.log('🔄 Generating WorkMail SSO integration for:', adminEmail);

    // Generate SSO URL for WorkMail access
    const ssoUrl = `${WORKMAIL_CONFIG.webInterface}?organization=${WORKMAIL_CONFIG.organization}&user=${encodeURIComponent(adminEmail)}`;

    // Create SSO integration email with link to real WorkMail
    const ssoEmails = [
      {
        id: `workmail_sso_${Date.now()}_1`,
        from: 'system@taskilo.de',
        to: adminEmail,
        subject: '📧 WorkMail SSO - Zugriff auf echte E-Mails',
        textContent: `WorkMail SSO ist aktiv für ${adminEmail}. Klicken Sie auf den SSO-Link um auf Ihre echten E-Mails zuzugreifen: ${ssoUrl}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #14ad9f; border-radius: 8px;">
            <h2 style="color: #14ad9f;">🔐 WorkMail SSO Integration</h2>
            <p>WorkMail SSO ist aktiv für <strong>${adminEmail}</strong></p>
            <p>Für den Zugriff auf Ihre <strong>echten E-Mails</strong> nutzen Sie bitte den WorkMail SSO-Link:</p>
            <div style="margin: 20px 0;">
              <a href="${ssoUrl}" target="_blank" style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                📧 WorkMail Posteingang öffnen
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              <strong>SSO URL:</strong><br>
              <a href="${ssoUrl}" target="_blank">${ssoUrl}</a>
            </p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px;">
              Diese Integration verwendet AWS WorkMail SSO anstelle von IMAP-Passwörtern für erhöhte Sicherheit.
            </p>
          </div>
        `,
        receivedAt: new Date().toISOString(),
        isRead: false,
        priority: 'high',
        category: 'system',
        source: 'workmail_sso',
        folder: folder,
        messageId: `sso_integration_${Date.now()}`,
        size: 1024,
        flags: ['\\Recent'],
        attachments: [],
        ssoUrl: ssoUrl,
        ssoEnabled: true,
      },
    ];

    console.log('✅ WorkMail SSO integration ready');
    return {
      emails: ssoEmails,
      totalCount: ssoEmails.length,
      unreadCount: ssoEmails.filter(e => !e.isRead).length,
      source: 'workmail_sso',
      folder: folder,
      lastSync: new Date().toISOString(),
      ssoUrl: ssoUrl,
      ssoEnabled: true,
      workmailWebInterface: WORKMAIL_CONFIG.webInterface,
    };
  } catch (error) {
    console.error('❌ WorkMail SSO error:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'INBOX';
    const limit = parseInt(searchParams.get('limit') || '50');
    const method = searchParams.get('method') || 'imap'; // 'imap' oder 'sso'

    console.log('🔄 Starting WorkMail integration...', {
      folder,
      limit,
      method,
      timestamp: new Date().toISOString(),
    });

    // JWT Token Verification for Admin Dashboard (Cookie-based)
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {
      console.error('❌ Missing admin token cookie');
      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      console.log('✅ JWT Cookie verified for admin:', { email: adminEmail, method });

      // Find admin credentials
      const adminConfig = WORKMAIL_ADMIN_MAPPING[adminEmail];
      if (!adminConfig) {
        console.error('❌ Admin not found in WorkMail mapping:', adminEmail);
        return NextResponse.json(
          { error: 'Admin not configured for WorkMail access' },
          { status: 403 }
        );
      }

      let result;

      if (method === 'imap' && adminConfig.password) {
        console.log('📧 Using IMAP method for real email retrieval');
        try {
          result = await fetchWorkmailEmailsViaIMAP(adminConfig, folder, limit);
          console.log('✅ IMAP emails retrieved successfully');
        } catch (imapError) {
          console.warn('⚠️ IMAP failed, falling back to SSO:', imapError);
          result = await getWorkmailEmailsViaSSO(adminEmail, folder, limit);
        }
      } else {
        console.log('🔐 Using SSO method for WorkMail access');
        result = await getWorkmailEmailsViaSSO(adminEmail, folder, limit);
      }

      console.log('📊 WorkMail response summary:', {
        emailCount: result.emails?.length || 0,
        totalCount: result.totalCount,
        unreadCount: result.unreadCount,
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
      console.error('❌ JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ WorkMail API error:', error);
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
