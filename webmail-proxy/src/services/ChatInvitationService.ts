/**
 * ChatInvitationService - E-Mail-Einladungen für Chat-Gruppenbereiche
 * ====================================================================
 * 
 * Versendet Einladungs-E-Mails wenn Mitglieder zu einem Chat-Space eingeladen werden.
 */

import * as nodemailer from 'nodemailer';

// SMTP Konfiguration (gleiche wie Newsletter)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'mail.taskilo.de',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'support@taskilo.de',
    pass: process.env.SMTP_PASS || '',
  },
};

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
    const recipientDisplayName = data.recipientName || 'Hallo';
    const chatUrl = `https://taskilo.de/webmail/chat?space=${data.spaceId}`;

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung zu ${data.spaceName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); border-radius: 16px 16px 0 0;">
              <div style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">${data.spaceEmoji}</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Einladung zum Gruppenbereich
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${recipientDisplayName},
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                <strong>${inviterDisplayName}</strong> hat dich zum Gruppenbereich 
                <strong>"${data.spaceName}"</strong> eingeladen.
              </p>

              <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">${data.spaceEmoji}</div>
                <div style="color: #333333; font-size: 20px; font-weight: 600;">${data.spaceName}</div>
              </div>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
                Im Gruppenbereich kannst du mit anderen Mitgliedern chatten, Dateien teilen 
                und gemeinsam an Projekten arbeiten.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${chatUrl}" 
                       style="display: inline-block; background-color: #14ad9f; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; transition: background-color 0.2s;">
                      Gruppenbereich öffnen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
                Oder kopiere diesen Link in deinen Browser:<br>
                <a href="${chatUrl}" style="color: #14ad9f; text-decoration: none; word-break: break-all;">
                  ${chatUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #999999; font-size: 12px; margin: 0 0 8px;">
                Diese E-Mail wurde von Taskilo Chat gesendet.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Taskilo. Alle Rechte vorbehalten.
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
