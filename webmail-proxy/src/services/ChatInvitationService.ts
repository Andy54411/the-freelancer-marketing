/**
 * ChatInvitationService - E-Mail-Einladungen für Chat-Gruppenbereiche
 * ====================================================================
 * 
 * Versendet Einladungs-E-Mails wenn Mitglieder zu einem Chat-Space eingeladen werden.
 */

import * as nodemailer from 'nodemailer';

// SMTP Konfiguration 
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'mail.taskilo.de',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'support@taskilo.de',
    pass: process.env.SMTP_PASS || '',
  },
};

const FROM_EMAIL = 'support@taskilo.de';

interface InvitationData {
  recipientEmail: string;
  recipientName?: string;
  spaceName: string;
  spaceEmoji: string;
  inviterEmail: string;
  inviterName?: string;
  spaceId: string;
}

class ChatInvitationService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    if (SMTP_CONFIG.auth.pass) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        secure: SMTP_CONFIG.secure,
        auth: SMTP_CONFIG.auth,
      });
      console.log('[ChatInvitationService] SMTP Transporter initialisiert');
    } else {
      console.warn('[ChatInvitationService] SMTP_PASS nicht gesetzt - E-Mail-Versand deaktiviert');
    }
  }

  /**
   * Generiert das HTML-Template für die Einladungs-E-Mail
   */
  private generateInvitationHtml(data: InvitationData): string {
    const inviterDisplayName = data.inviterName || data.inviterEmail.split('@')[0];
    const recipientDisplayName = data.recipientName || '';
    const chatUrl = `https://taskilo.de/webmail/chat?space=${data.spaceId}`;
    
    // Taskilo Assets URLs
    const logoUrl = 'https://taskilo.de/images/taskilo-logo-transparent.png';
    const appStoreBadge = 'https://taskilo.de/app_svg/app-store-badge.3b027f0f.svg';
    const playStoreBadge = 'https://taskilo.de/app_svg/google-play-badge.63c04d3e.svg';

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung zu ${data.spaceName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  
  <!-- Wrapper -->
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        
        <!-- Main Card -->
        <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 0 0 32px; text-align: center;">
              <a href="https://taskilo.de" style="text-decoration: none;">
                <img src="${logoUrl}" alt="Taskilo" style="height: 36px;" />
              </a>
            </td>
          </tr>
          
          <!-- Card -->
          <tr>
            <td style="background: #ffffff; border-radius: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06);">
              
              <!-- Hero Section -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 48px 40px 32px; text-align: center;">
                    
                    <!-- Avatar Circle -->
                    <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #14ad9f 0%, #0d9488 100%); border-radius: 50%; margin: 0 auto 24px; display: inline-block;">
                      <table role="presentation" style="width: 100%; height: 72px; border-collapse: collapse;">
                        <tr>
                          <td align="center" valign="middle" style="color: #ffffff; font-size: 28px; font-weight: 600;">
                            ${inviterDisplayName.charAt(0).toUpperCase()}
                          </td>
                        </tr>
                      </table>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      Du wurdest eingeladen
                    </h1>
                    
                    <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.5;">
                      <strong style="color: #0f172a;">${inviterDisplayName}</strong> möchte mit dir zusammenarbeiten
                    </p>
                    
                  </td>
                </tr>
              </table>
              
              <!-- Space Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 40px 32px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
                      <tr>
                        <td style="padding: 24px; text-align: center;">
                          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                            Gruppenbereich
                          </p>
                          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                            ${data.spaceName}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 40px 40px; text-align: center;">
                    <a href="${chatUrl}" style="display: inline-block; background: linear-gradient(135deg, #14ad9f 0%, #0d9488 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px rgba(20, 173, 159, 0.35);">
                      Einladung annehmen
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 40px;">
                    <div style="height: 1px; background: #e2e8f0;"></div>
                  </td>
                </tr>
              </table>
              
              <!-- Features -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 32px 40px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 33%; text-align: center; vertical-align: top; padding: 0 8px;">
                          <div style="font-size: 24px; margin-bottom: 8px;">💬</div>
                          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">Chat in<br>Echtzeit</p>
                        </td>
                        <td style="width: 33%; text-align: center; vertical-align: top; padding: 0 8px;">
                          <div style="font-size: 24px; margin-bottom: 8px;">📁</div>
                          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">Dateien<br>teilen</p>
                        </td>
                        <td style="width: 33%; text-align: center; vertical-align: top; padding: 0 8px;">
                          <div style="font-size: 24px; margin-bottom: 8px;">🔒</div>
                          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">Ende-zu-Ende<br>verschlüsselt</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- App Download Section -->
          <tr>
            <td style="padding: 32px 0; text-align: center;">
              <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">
                Taskilo auch unterwegs nutzen
              </p>
              <table role="presentation" style="margin: 0 auto; border-collapse: collapse;">
                <tr>
                  <td style="padding: 0 6px;">
                    <a href="https://apps.apple.com/app/taskilo" style="text-decoration: none;">
                      <img src="${appStoreBadge}" alt="App Store" style="height: 36px; border-radius: 6px;" />
                    </a>
                  </td>
                  <td style="padding: 0 6px;">
                    <a href="https://play.google.com/store/apps/details?id=de.taskilo" style="text-decoration: none;">
                      <img src="${playStoreBadge}" alt="Google Play" style="height: 36px; border-radius: 6px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 0 0 24px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Taskilo · <a href="https://taskilo.de/datenschutz" style="color: #94a3b8; text-decoration: none;">Datenschutz</a> · <a href="https://taskilo.de/impressum" style="color: #94a3b8; text-decoration: none;">Impressum</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                Du erhältst diese E-Mail, weil ${inviterDisplayName} dich eingeladen hat.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
    `.trim();
  }

  /**
   * Generiert den Plain-Text für die Einladungs-E-Mail
   */
  private generateInvitationText(data: InvitationData): string {
    const inviterDisplayName = data.inviterName || data.inviterEmail.split('@')[0];
    const recipientDisplayName = data.recipientName || 'Hallo';
    const chatUrl = `https://taskilo.de/webmail/chat?space=${data.spaceId}`;

    return `
${recipientDisplayName},

${inviterDisplayName} hat dich zum Gruppenbereich "${data.spaceName}" eingeladen.

Im Gruppenbereich kannst du mit anderen Mitgliedern chatten, Dateien teilen und gemeinsam an Projekten arbeiten.

Öffne den Gruppenbereich hier:
${chatUrl}

---
Diese E-Mail wurde von Taskilo Chat gesendet.
© ${new Date().getFullYear()} Taskilo. Alle Rechte vorbehalten.
    `.trim();
  }

  /**
   * Versendet eine Einladungs-E-Mail
   */
  async sendInvitation(data: InvitationData): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      console.warn('[ChatInvitationService] Kein Transporter verfügbar - E-Mail wird nicht gesendet');
      return { success: false, error: 'E-Mail-Versand nicht konfiguriert' };
    }

    try {
      const inviterDisplayName = data.inviterName || data.inviterEmail.split('@')[0];

      await this.transporter.sendMail({
        from: `"Taskilo Chat" <${SMTP_CONFIG.auth.user}>`,
        to: data.recipientEmail,
        subject: `${inviterDisplayName} hat dich zu "${data.spaceName}" eingeladen`,
        text: this.generateInvitationText(data),
        html: this.generateInvitationHtml(data),
      });

      console.log(`[ChatInvitationService] Einladung gesendet an ${data.recipientEmail} für Space "${data.spaceName}"`);
      return { success: true };
    } catch (error) {
      console.error('[ChatInvitationService] Fehler beim Senden der Einladung:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      };
    }
  }

  /**
   * Versendet Einladungen an mehrere Empfänger
   */
  async sendBulkInvitations(
    invitations: InvitationData[]
  ): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    const results = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const invitation of invitations) {
      const result = await this.sendInvitation(invitation);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`${invitation.recipientEmail}: ${result.error}`);
        }
      }
    }

    results.success = results.failed === 0;
    return results;
  }
}

// Singleton-Instanz
const chatInvitationService = new ChatInvitationService();
export default chatInvitationService;
