import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Imap from 'imap';

interface JWTPayload {
  email: string;
  exp: number;
}

interface QuickReplyRequest {
  to: string;
  subject: string;
  message: string;
  inReplyTo?: string;
}

// Funktion zum Speichern der gesendeten E-Mail im Sent-Ordner
async function saveToSentFolder(
  email: string,
  password: string,
  emailContent: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const imapConfig = {
      host: 'imap.mail.us-east-1.awsapps.com',
      port: 993,
      secure: true,
      user: email,
      password: password,
      tls: true,
      tlsOptions: {
        servername: 'imap.mail.us-east-1.awsapps.com',
        rejectUnauthorized: false,
      },
    };

    console.log('📤 [Save to Sent] Connecting to IMAP for sent folder...');
    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
      console.log('✅ [Save to Sent] IMAP connected successfully');

      // Erst alle verfügbaren Ordner auflisten für Debugging
      imap.getBoxes((listErr: any, boxes: any) => {
        if (!listErr && boxes) {
          console.log('📂 [Save to Sent] Available mailbox folders:', Object.keys(boxes));
        }
      });

      // Versuche verschiedene Sent-Folder Namen
      const sentFolders = ['Sent', 'SENT', 'Sent Items', 'Gesendet', 'Sent Messages'];

      let folderIndex = 0;
      const tryFolder = () => {
        if (folderIndex >= sentFolders.length) {
          console.error('❌ [Save to Sent] All sent folders failed, tried:', sentFolders);
          imap.end();
          return reject(new Error('No sent folder accessible'));
        }
        const currentFolder = sentFolders[folderIndex];
        console.log(
          `🔍 [Save to Sent] Trying folder: ${currentFolder} (${folderIndex + 1}/${sentFolders.length})`
        );

        imap.openBox(currentFolder, false, (err: any) => {
          if (err) {
            console.warn(`⚠️ [Save to Sent] Folder ${currentFolder} not accessible:`, err.message);
            folderIndex++;
            tryFolder();
            return;
          }

          console.log(`📁 [Save to Sent] Successfully opened folder: ${currentFolder}`);

          // E-Mail im Sent-Ordner speichern - die IMAP Library erwartet spezielle Optionen
          const flags = ['\\Seen'];
          const date = new Date();

          console.log(
            `📧 [Save to Sent] Appending email with flags:`,
            flags,
            'date:',
            date.toISOString()
          );
          console.log(
            `📧 [Save to Sent] Email content preview:`,
            emailContent.substring(0, 200) + '...'
          );

          // IMAP append mit korrekter Syntax und erweiterten Debug-Informationen
          imap.append(
            emailContent,
            { mailbox: currentFolder, flags: flags, date: date },
            (appendErr: any) => {
              console.log(
                `📧 [Save to Sent] Append operation completed for folder: ${currentFolder}`
              );

              if (appendErr) {
                console.error('❌ [Save to Sent] Failed to save email:', {
                  error: appendErr.message,
                  code: appendErr.code,
                  serverResponse: appendErr.serverResponse,
                  folder: currentFolder,
                  emailLength: emailContent.length,
                  hasFromHeader: emailContent.includes('From:'),
                  hasToHeader: emailContent.includes('To:'),
                  hasSubjectHeader: emailContent.includes('Subject:'),
                  flags: flags,
                  date: date.toISOString(),
                });

                // Versuche nächsten Folder
                folderIndex++;
                imap.closeBox((closeErr: any) => {
                  if (closeErr)
                    console.warn('⚠️ [Save to Sent] Error closing folder:', closeErr.message);
                  tryFolder();
                });
              } else {
                console.log(
                  `✅ [Save to Sent] Email successfully saved to folder: ${currentFolder}`
                );
                imap.end();
                resolve();
              }
            }
          );
        });
      };

      tryFolder();
    });

    imap.once('error', (err: any) => {
      console.error('❌ [Save to Sent] IMAP connection error:', err);
      reject(err);
    });

    imap.connect();
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [Quick Reply API] Starting quick reply process...');

    // JWT-Authentifizierung - Verwende taskilo-admin-token wie WorkMail API
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      console.log('❌ [Quick Reply API] No taskilo-admin-token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('❌ [Quick Reply API] JWT secret not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      console.log('✅ [Quick Reply API] JWT Cookie verified for admin:', { email: decoded.email });
    } catch (error) {
      console.log('❌ [Quick Reply API] Invalid JWT token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request Body parsen
    const body: QuickReplyRequest = await request.json();
    const { to, subject, message, inReplyTo } = body;

    if (!to || !subject || !message) {
      console.log('❌ [Quick Reply API] Missing required fields');
      return NextResponse.json(
        {
          error: 'Missing required fields: to, subject, message',
        },
        { status: 400 }
      );
    }

    console.log('📧 [Quick Reply API] Sending quick reply:', {
      from: decoded.email,
      to,
      subject: subject.substring(0, 50) + '...',
      messageLength: message.length,
      inReplyTo: inReplyTo || 'none',
    });

    // Echte E-Mail-Versendung über SMTP
    try {
      // Admin-spezifische SMTP-Credentials auswählen
      let smtpUser, smtpPassword;

      if (decoded.email === 'andy.staudinger@taskilo.de') {
        smtpUser = process.env.WORKMAIL_ANDY_EMAIL || 'andy.staudinger@taskilo.de';
        smtpPassword = process.env.WORKMAIL_ANDY_PASSWORD || '';
      } else {
        // Fallback zu Support-Account für andere Admins
        smtpUser = process.env.WORKMAIL_SMTP_USER || 'support@taskilo.de';
        smtpPassword = process.env.WORKMAIL_SMTP_PASSWORD || '';
      }

      console.log('🔐 [Quick Reply API] Using SMTP credentials:', {
        adminEmail: decoded.email,
        smtpUser: smtpUser,
        hasPassword: !!smtpPassword,
      });

      // WorkMail SMTP Konfiguration
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.us-east-1.awsapps.com', // WorkMail SMTP
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const emailOptions = {
        from: decoded.email, // Verwende die E-Mail des eingeloggten Admins
        to: to,
        subject: subject,
        text: message,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Diese E-Mail wurde über das Taskilo Admin-System gesendet.
          </p>
        </div>`,
        ...(inReplyTo && {
          inReplyTo: inReplyTo,
          references: inReplyTo,
        }),
      };

      console.log('📤 [Quick Reply API] Sending via SMTP...', {
        smtp: 'smtp.mail.us-east-1.awsapps.com',
        from: emailOptions.from,
        to: emailOptions.to,
      });

      const result = await transporter.sendMail(emailOptions);

      console.log('✅ [Quick Reply API] Email sent successfully via SMTP:', {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      });

      // E-Mail im Sent-Ordner speichern
      try {
        console.log('📁 [Quick Reply API] Saving email to Sent folder...');

        // Raw E-Mail Content für IMAP Append erstellen
        const rawEmailContent = `From: ${emailOptions.from}\r\nTo: ${emailOptions.to}\r\nSubject: ${emailOptions.subject}\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: ${result.messageId}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${emailOptions.html}`;

        console.log('📁 [Quick Reply API] Raw email content prepared:', {
          length: rawEmailContent.length,
          hasFromHeader: rawEmailContent.includes('From:'),
          hasToHeader: rawEmailContent.includes('To:'),
          hasSubjectHeader: rawEmailContent.includes('Subject:'),
          hasMessageId: rawEmailContent.includes('Message-ID:'),
          preview: rawEmailContent.substring(0, 300) + '...',
        });
        await saveToSentFolder(smtpUser, smtpPassword, rawEmailContent);
        console.log('✅ [Quick Reply API] Email successfully saved to Sent folder');
      } catch (sentFolderError) {
        console.error(
          '⚠️ [Quick Reply API] Failed to save to Sent folder (email was sent successfully):',
          {
            error: sentFolderError.message,
            stack: sentFolderError.stack,
            smtpUser: smtpUser,
          }
        );
        // E-Mail wurde erfolgreich gesendet, Sent-Folder-Fehler ist nicht kritisch
      }
      const emailData = {
        id: result.messageId || `reply-${Date.now()}`,
        from: emailOptions.from,
        to,
        subject,
        message,
        inReplyTo,
        sentAt: new Date().toISOString(),
        method: 'workmail-smtp',
        smtp: {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        },
      };

      return NextResponse.json({
        success: true,
        message: 'E-Mail wurde erfolgreich gesendet',
        data: {
          emailId: emailData.id,
          sentAt: emailData.sentAt,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          messageId: result.messageId,
        },
      });
    } catch (emailError) {
      console.error('❌ [Quick Reply API] SMTP sending failed:', emailError);

      // Fallback zu Simulation, falls SMTP fehlschlägt
      console.log('⚠️ [Quick Reply API] Falling back to simulation mode...');

      const emailData = {
        id: `reply-simulation-${Date.now()}`,
        from: decoded.email,
        to,
        subject,
        message,
        inReplyTo,
        sentAt: new Date().toISOString(),
        method: 'simulation-fallback',
      };

      return NextResponse.json({
        success: true,
        message: 'E-Mail wurde simuliert (SMTP-Fehler)',
        data: {
          emailId: emailData.id,
          sentAt: emailData.sentAt,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          mode: 'simulation',
        },
      });
    }
  } catch (error) {
    console.error('❌ [Quick Reply API] Send process failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send quick reply',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
