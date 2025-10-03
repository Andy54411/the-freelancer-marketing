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

    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
      // Erst alle verfügbaren Ordner auflisten für Debugging
      imap.getBoxes((listErr: any, boxes: any) => {
        if (!listErr && boxes) {
        }
      });

      // Versuche verschiedene Sent-Folder Namen
      const sentFolders = ['Sent', 'SENT', 'Sent Items', 'Gesendet', 'Sent Messages'];

      let folderIndex = 0;
      const tryFolder = () => {
        if (folderIndex >= sentFolders.length) {
          imap.end();
          return reject(new Error('No sent folder accessible'));
        }
        const currentFolder = sentFolders[folderIndex];

        imap.openBox(currentFolder, false, (err: any) => {
          if (err) {
            folderIndex++;
            tryFolder();
            return;
          }

          // E-Mail im Sent-Ordner speichern - die IMAP Library erwartet spezielle Optionen
          const flags = ['\\Seen'];
          const date = new Date();

          // IMAP append mit korrekter Syntax und erweiterten Debug-Informationen
          imap.append(
            emailContent,
            { mailbox: currentFolder, flags: flags, date: date },
            (appendErr: any) => {
              if (appendErr) {
                // Versuche nächsten Folder
                folderIndex++;
                imap.closeBox((closeErr: any) => {
                  if (closeErr) tryFolder();
                });
              } else {
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
      reject(err);
    });

    imap.connect();
  });
}

export async function POST(request: NextRequest) {
  try {
    // JWT-Authentifizierung - Verwende taskilo-admin-token wie WorkMail API
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request Body parsen
    const body: QuickReplyRequest = await request.json();
    const { to, subject, message, inReplyTo } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        {
          error: 'Missing required fields: to, subject, message',
        },
        { status: 400 }
      );
    }

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

      const result = await transporter.sendMail(emailOptions);

      // E-Mail im Sent-Ordner speichern
      try {
        // Raw E-Mail Content für IMAP Append erstellen
        const rawEmailContent = `From: ${emailOptions.from}\r\nTo: ${emailOptions.to}\r\nSubject: ${emailOptions.subject}\r\nDate: ${new Date().toUTCString()}\r\nMessage-ID: ${result.messageId}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${emailOptions.html}`;

        await saveToSentFolder(smtpUser, smtpPassword, rawEmailContent);
      } catch (sentFolderError) {
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
      // Fallback zu Simulation, falls SMTP fehlschlägt

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
