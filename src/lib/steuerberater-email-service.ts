// Steuerberater E-Mail Service
import { ResendEmailService } from './resend-email-service';

export class SteuerberaterEmailService {
  private static instance: SteuerberaterEmailService;
  private emailService: ResendEmailService;

  private constructor() {
    this.emailService = ResendEmailService.getInstance();
  }

  public static getInstance(): SteuerberaterEmailService {
    if (!SteuerberaterEmailService.instance) {
      SteuerberaterEmailService.instance = new SteuerberaterEmailService();
    }
    return SteuerberaterEmailService.instance;
  }

  /**
   * Sendet Einladung an Steuerberater
   */
  async sendInviteEmail(
    steuerberaterEmail: string,
    mandantData: {
      name: string;
      companyName: string;
      message?: string;
      inviteId: string;
      accessLevel: string;
      permissions: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    const subject = `Einladung zur Zusammenarbeit - ${mandantData.companyName}`;

    const emailContent = `
      <h2>Einladung zur Steuerberater-Kollaboration</h2>
      <p>Hallo,</p>
      <p>${mandantData.name} von ${mandantData.companyName} lädt Sie zur sicheren Zusammenarbeit über das Taskilo Steuerportal ein.</p>
      
      ${mandantData.message ? `<p><strong>Nachricht:</strong> ${mandantData.message}</p>` : ''}
      
      <p><strong>Zugriffslevel:</strong> ${mandantData.accessLevel}</p>
      <p><strong>Berechtigungen:</strong> ${mandantData.permissions.join(', ')}</p>
      
      <div style="margin: 20px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/steuerberater/invite/${mandantData.inviteId}" 
           style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Einladung annehmen
        </a>
      </div>
      
      <p>Diese Einladung läuft in 7 Tagen ab.</p>
      <p>Mit freundlichen Grüßen,<br>Das Taskilo Team</p>
    `;

    return await this.emailService.sendEmail({
      from: 'steuerportal@taskilo.de',
      to: [steuerberaterEmail],
      subject,
      htmlContent: emailContent,
      textContent: this.htmlToText(emailContent),
    });
  }

  /**
   * Sendet Benachrichtigung über geteiltes Dokument
   */
  async sendDocumentSharedEmail(
    steuerberaterEmail: string,
    documentData: {
      name: string;
      type: string;
      companyName: string;
      sharedBy: string;
      documentId: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const subject = `Neues Dokument geteilt - ${documentData.companyName}`;

    const emailContent = `
      <h2>Neues Dokument verfügbar</h2>
      <p>Ein neues Dokument wurde mit Ihnen geteilt:</p>
      
      <p><strong>Dokument:</strong> ${documentData.name}</p>
      <p><strong>Typ:</strong> ${documentData.type}</p>
      <p><strong>Von:</strong> ${documentData.companyName} (${documentData.sharedBy})</p>
      
      <div style="margin: 20px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/steuerberater/documents/${documentData.documentId}" 
           style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Dokument anzeigen
        </a>
      </div>
      
      <p>Mit freundlichen Grüßen,<br>Das Taskilo Team</p>
    `;

    return await this.emailService.sendEmail({
      from: 'steuerportal@taskilo.de',
      to: [steuerberaterEmail],
      subject,
      htmlContent: emailContent,
      textContent: this.htmlToText(emailContent),
    });
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
