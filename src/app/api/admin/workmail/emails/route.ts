// AWS WorkMail Email SSO Integration API
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import Imap from 'imap';

// JWT Secret für Admin-Tokens
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
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
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
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
                  email.textContent = buffer.trim();
                  email.htmlContent = `<div style="white-space: pre-wrap;">${buffer.trim()}</div>`;
                } else if (info.which.includes('HEADER')) {
                  // Parse header manually
                  const headerText = buffer.toString();
                  const headerLines = headerText.split('\n');

                  email.from = headerLines
                    .find(line => line.toLowerCase().startsWith('from:'))
                    ?.split(':')[1]?.trim() || 'Unknown';
                  email.to = headerLines
                    .find(line => line.toLowerCase().startsWith('to:'))
                    ?.split(':')[1]?.trim() || credentials.email;
                  email.subject = headerLines
                    .find(line => line.toLowerCase().startsWith('subject:'))
                    ?.split(':')[1]?.trim() || 'No Subject';

                  const dateLine = headerLines
                    .find(line => line.toLowerCase().startsWith('date:'))
                    ?.split(':')[1]?.trim();
                  email.receivedAt = dateLine ? new Date(dateLine).toISOString() : new Date().toISOString();
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
            emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

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
      }
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

    // JWT Token Verification for Admin Dashboard
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid Bearer token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;
      
      console.log('✅ JWT verified for admin:', { email: adminEmail, method });

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
      return NextResponse.json(
        { error: 'Invalid JWT token' },
        { status: 401 }
      );
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
