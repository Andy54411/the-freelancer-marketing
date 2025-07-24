// Gmail OAuth2 Newsletter System mit Google Cloud SDK
import { google } from 'googleapis';

// Google OAuth2 Client für Gmail API
class GmailOAuthService {
  private oauth2Client: any;
  private gmail: any;

  constructor() {
    try {
      // Service Account Credentials aus Environment
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
        : null;

      if (!serviceAccountKey) {
        console.error('🚨 GOOGLE_SERVICE_ACCOUNT_KEY fehlt in Umgebungsvariablen');
        throw new Error('Google Service Account Key nicht gefunden');
      }

      // OAuth2 Client mit Service Account
      this.oauth2Client = new google.auth.JWT({
        email: serviceAccountKey.client_email,
        key: serviceAccountKey.private_key,
        scopes: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.compose',
        ],
        subject: process.env.GMAIL_IMPERSONATE_EMAIL || 'newsletter@taskilo.de', // Domain-wide delegation
      });

      // Gmail API Instance
      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      console.log('✅ Gmail OAuth Service erfolgreich initialisiert');
    } catch (error) {
      console.error('🚨 Gmail OAuth Service Initialisierung fehlgeschlagen:', error);
      throw error;
    }
  }

  // E-Mail via Gmail API senden
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    options?: {
      from?: string;
      replyTo?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const fromEmail =
        options?.from || process.env.GMAIL_IMPERSONATE_EMAIL || 'newsletter@taskilo.de';
      const replyToEmail = options?.replyTo || 'support@taskilo.de';

      // E-Mail zusammenstellen (RFC 2822 Format)
      const email = [
        `From: "Taskilo Newsletter" <${fromEmail}>`,
        `To: ${to}`,
        `Reply-To: ${replyToEmail}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlContent,
      ].join('\n');

      // Base64 encode der E-Mail
      const encodedEmail = Buffer.from(email).toString('base64url');

      console.log('📧 Gmail API - Sende E-Mail:', {
        to,
        subject,
        from: fromEmail,
        replyTo: replyToEmail,
      });

      // E-Mail via Gmail API senden
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      });

      console.log('✅ Gmail API - E-Mail erfolgreich gesendet:', {
        messageId: response.data.id,
        to,
        subject,
      });

      return {
        success: true,
        messageId: response.data.id,
      };
    } catch (error) {
      console.error('🚨 Gmail API - Fehler beim E-Mail-Versand:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  // Newsletter-Bestätigungs-E-Mail senden
  async sendNewsletterConfirmation(
    email: string,
    confirmationToken: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

      const subject = 'Newsletter-Anmeldung bestätigen - Taskilo';
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Newsletter-Anmeldung bestätigen</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://taskilo.de/images/logo.png" alt="Taskilo" style="height: 40px;">
            </div>
            
            <h1 style="color: #14ad9f; text-align: center; margin-bottom: 30px;">Newsletter-Anmeldung bestätigen</h1>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hallo${name ? ` ${name}` : ''},</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              vielen Dank für Ihr Interesse an unserem Newsletter! Um Ihre Anmeldung abzuschließen, 
              bestätigen Sie bitte Ihre E-Mail-Adresse, indem Sie auf den Button unten klicken.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${confirmationUrl}" 
                 style="background-color: #14ad9f; color: white; padding: 16px 32px; text-decoration: none; 
                        border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                Newsletter-Anmeldung bestätigen
              </a>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 30px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong>Funktioniert der Button nicht?</strong><br>
                Kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${confirmationUrl}" style="color: #14ad9f; word-break: break-all;">${confirmationUrl}</a>
              </p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <div style="text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                <strong>Warum erhalten Sie diese E-Mail?</strong><br>
                Diese E-Mail wurde versendet, weil sich jemand mit Ihrer E-Mail-Adresse für unseren Newsletter angemeldet hat.
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                Falls Sie sich nicht angemeldet haben, können Sie diese E-Mail einfach ignorieren.
                Der Bestätigungslink ist 24 Stunden gültig.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  <strong>Taskilo GmbH</strong><br>
                  E-Mail: <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a><br>
                  Web: <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await this.sendEmail(email, subject, htmlContent);

      if (result.success) {
        console.log('✅ Newsletter-Bestätigungs-E-Mail gesendet:', {
          email,
          messageId: result.messageId,
          confirmationToken: confirmationToken.substring(0, 8) + '...',
        });
      }

      return result;
    } catch (error) {
      console.error('🚨 Fehler beim Senden der Newsletter-Bestätigung:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  // Teste die Gmail-Verbindung
  async testConnection(): Promise<{ success: boolean; error?: string; profile?: any }> {
    try {
      const profile = await this.gmail.users.getProfile({ userId: 'me' });

      return {
        success: true,
        profile: {
          emailAddress: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal,
        },
      };
    } catch (error) {
      console.error('🚨 Gmail API Verbindungstest fehlgeschlagen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verbindungstest fehlgeschlagen',
      };
    }
  }
}

// Singleton Instance
let gmailService: GmailOAuthService | null = null;

export function getGmailService(): GmailOAuthService {
  if (!gmailService) {
    gmailService = new GmailOAuthService();
  }
  return gmailService;
}

// Convenience-Funktionen für Newsletter
export async function sendNewsletterConfirmationEmail(
  email: string,
  confirmationToken: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  const service = getGmailService();
  return service.sendNewsletterConfirmation(email, confirmationToken, name);
}

export async function testGmailConnection(): Promise<{
  success: boolean;
  error?: string;
  profile?: any;
}> {
  const service = getGmailService();
  return service.testConnection();
}
