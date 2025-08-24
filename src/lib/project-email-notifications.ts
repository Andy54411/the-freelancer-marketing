// Project Email Notification Service für Unternehmen
import { ResendEmailService } from './resend-email-service';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.log('Firebase admin already initialized or error:', error);
  }
}

const db = admin.firestore();

export interface ProjectEmailData {
  projectId: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  customerName?: string;
  location?: string;
  budget?: {
    amount?: number;
    type?: string;
    min?: number;
    max?: number;
  };
  timeline?: string;
  startDate?: string;
  endDate?: string;
  urgency?: string;
  createdAt: Date;
}

export class ProjectEmailNotificationService {
  private static instance: ProjectEmailNotificationService;
  private emailService: ResendEmailService;

  private constructor() {
    this.emailService = ResendEmailService.getInstance();
  }

  public static getInstance(): ProjectEmailNotificationService {
    if (!ProjectEmailNotificationService.instance) {
      ProjectEmailNotificationService.instance = new ProjectEmailNotificationService();
    }
    return ProjectEmailNotificationService.instance;
  }

  /**
   * Sendet E-Mail-Benachrichtigungen an alle Unternehmen, die für die Subcategory registriert sind
   */
  async notifyCompaniesAboutNewProject(projectData: ProjectEmailData): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    details: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    try {
      console.log(
        `📧 [ProjectEmailService] Suche Unternehmen für Subcategory: ${projectData.subcategory}`
      );

      // 1. Finde alle Unternehmen in der users Collection (user_type: 'firma') mit der entsprechenden Subcategory
      const firmUsersQuery = await db
        .collection('users')
        .where('user_type', '==', 'firma')
        .where('selectedSubcategory', '==', projectData.subcategory)
        .get();

      // 2. Finde alle Unternehmen in der users Collection mit der entsprechenden Subcategory
      const companiesQuery = await db
        .collection('users')
        .where('selectedSubcategory', '==', projectData.subcategory)
        .get();

      console.log(
        `📊 [ProjectEmailService] Gefunden: ${firmUsersQuery.docs.length} User-Companies + ${companiesQuery.docs.length} Companies`
      );

      if (firmUsersQuery.docs.length === 0 && companiesQuery.docs.length === 0) {
        console.log(
          `⚠️ [ProjectEmailService] Keine Unternehmen für Subcategory ${projectData.subcategory} gefunden`
        );
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          details: [],
        };
      }

      // 3. Sammle alle E-Mail-Adressen und Unternehmensdaten
      const companies: Array<{
        email: string;
        companyName: string;
        id: string;
        source: 'users' | 'companies';
      }> = [];

      // Aus users Collection (user_type: 'firma')
      firmUsersQuery.docs.forEach(doc => {
        const data = doc.data();
        if (data.email && data.companyName) {
          companies.push({
            email: data.email,
            companyName: data.companyName,
            id: doc.id,
            source: 'users',
          });
        }
      });

      // Aus users Collection
      companiesQuery.docs.forEach(doc => {
        const data = doc.data();
        if (data.email && data.companyName) {
          companies.push({
            email: data.email,
            companyName: data.companyName,
            id: doc.id,
            source: 'users',
          });
        }
      });

      // Entferne Duplikate basierend auf E-Mail-Adresse
      const uniqueCompanies = companies.filter(
        (company, index, arr) => arr.findIndex(c => c.email === company.email) === index
      );

      console.log(
        `📧 [ProjectEmailService] Bereite E-Mails vor für ${uniqueCompanies.length} eindeutige Unternehmen`
      );

      if (uniqueCompanies.length === 0) {
        return {
          success: true,
          sentCount: 0,
          failedCount: 0,
          details: [],
        };
      }

      // 4. Erstelle E-Mail-Inhalte
      const emails = uniqueCompanies.map(company => ({
        from: 'hello@send.taskilo.de',
        to: [company.email],
        subject: `🔔 Neue Projektanfrage: ${projectData.subcategory} in ${projectData.location || 'Deutschland'}`,
        htmlContent: this.generateProjectEmailHTML(projectData, company),
        metadata: {
          projectId: projectData.projectId,
          companyId: company.id,
          subcategory: projectData.subcategory,
          source: company.source,
          type: 'new_project_notification',
        },
      }));

      // 5. Sende E-Mails in Batches (max 10 parallel für Resend Rate Limits)
      const batchSize = 10;
      const results: Array<{ email: string; success: boolean; error?: string }> = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        const batchPromises = batch.map(async (email, index) => {
          try {
            const result = await this.emailService.sendEmail(email);
            const company = uniqueCompanies[i + index];

            if (result.success) {
              console.log(
                `✅ [ProjectEmailService] E-Mail gesendet an ${company.companyName} (${company.email})`
              );
              return { email: company.email, success: true };
            } else {
              console.error(
                `❌ [ProjectEmailService] E-Mail fehlgeschlagen an ${company.companyName}: ${result.error}`
              );
              return { email: company.email, success: false, error: result.error };
            }
          } catch (error) {
            const company = uniqueCompanies[i + index];
            const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
            console.error(
              `❌ [ProjectEmailService] Exception beim Senden an ${company.companyName}:`,
              error
            );
            return { email: company.email, success: false, error: errorMsg };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Kurze Pause zwischen Batches für Rate Limiting
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const sentCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log(
        `📊 [ProjectEmailService] E-Mail-Versand abgeschlossen: ${sentCount} erfolgreich, ${failedCount} fehlgeschlagen`
      );

      return {
        success: sentCount > 0,
        sentCount,
        failedCount,
        details: results,
      };
    } catch (error) {
      console.error('❌ [ProjectEmailService] Fehler beim E-Mail-Versand:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        details: [
          {
            email: 'unknown',
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          },
        ],
      };
    }
  }

  /**
   * Generiert HTML-Inhalt für die E-Mail-Benachrichtigung
   */
  private generateProjectEmailHTML(
    projectData: ProjectEmailData,
    company: { companyName: string; id: string }
  ): string {
    const budgetText = projectData.budget
      ? projectData.budget.amount
        ? `${projectData.budget.amount.toLocaleString('de-DE')} €${projectData.budget.type === 'hourly' ? '/h' : ''}`
        : projectData.budget.min && projectData.budget.max
          ? `${projectData.budget.min.toLocaleString('de-DE')} - ${projectData.budget.max.toLocaleString('de-DE')} €`
          : 'Verhandelbar'
      : 'Verhandelbar';

    const urgencyText =
      projectData.urgency === 'high'
        ? 'Dringend'
        : projectData.urgency === 'medium'
          ? 'Normal'
          : 'Niedrig';

    const dateText =
      projectData.startDate && projectData.endDate
        ? `${new Date(projectData.startDate).toLocaleDateString('de-DE')} - ${new Date(projectData.endDate).toLocaleDateString('de-DE')}`
        : projectData.startDate
          ? `Ab ${new Date(projectData.startDate).toLocaleDateString('de-DE')}`
          : projectData.timeline || 'Flexibel';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Neue Projektanfrage - Taskilo</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #14ad9f, #129488); color: white; padding: 30px 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .header-text { font-size: 18px; margin: 0; }
          .content { padding: 30px 20px; }
          .project-title { color: #14ad9f; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .info-grid { display: grid; gap: 15px; margin: 20px 0; }
          .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #14ad9f; }
          .info-label { font-weight: bold; color: #666; font-size: 14px; margin-bottom: 5px; }
          .info-value { color: #333; font-size: 16px; }
          .description { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.6; }
          .cta-button { display: inline-block; background: #14ad9f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .cta-button:hover { background: #129488; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .urgency-high { color: #dc3545; }
          .urgency-medium { color: #ffc107; }
          .urgency-low { color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Taskilo</div>
            <p class="header-text">Neue Projektanfrage verfügbar!</p>
          </div>
          
          <div class="content">
            <h1 class="project-title">${projectData.title}</h1>
            
            <p>Hallo ${company.companyName},</p>
            
            <p>es gibt eine neue Projektanfrage in Ihrer Fachrichtung <strong>${projectData.subcategory}</strong>!</p>
            
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Kategorie</div>
                <div class="info-value">${projectData.category} → ${projectData.subcategory}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Budget</div>
                <div class="info-value">${budgetText}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Standort</div>
                <div class="info-value">${projectData.location || 'Nicht angegeben'}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Zeitrahmen</div>
                <div class="info-value">${dateText}</div>
              </div>
              
              <div class="info-item">
                <div class="info-label">Priorität</div>
                <div class="info-value">${urgencyText}</div>
              </div>
            </div>
            
            <div class="description">
              <div class="info-label">Projektbeschreibung</div>
              <p>${projectData.description}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://taskilo.de/dashboard/company/${company.id}/quotes/incoming/${projectData.projectId}" class="cta-button">
                Angebot abgeben
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              <strong>Schnell sein lohnt sich!</strong> Frühe Angebote haben oft bessere Erfolgschancen.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Tipp:</strong> Erstellen Sie ein detailliertes Angebot mit transparenter Preisgestaltung und realistischen Zeitplänen.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>Bitte antworten Sie nicht auf diese E-Mail</strong> - wir erhalten Ihre Anfrage nicht.</p>
            <p>Benötigen Sie Hilfe? Besuchen Sie unser <a href="https://taskilo.de/dashboard/company/${company.id}/support">Support-Center</a>, dort können Sie ein Ticket erstellen.</p>
            <p><a href="https://taskilo.de/dashboard/company/${company.id}/settings">Präferenzen verwalten</a></p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="font-size: 12px; color: #888; line-height: 1.5;">
              Diese E-Mail wurde automatisch von Taskilo generiert.<br>
              Sie erhalten diese E-Mails, weil Sie sich für die Kategorie "${projectData.subcategory}" registriert haben.
            </p>
            
            <p style="font-size: 11px; color: #888; margin-top: 15px;">
              <strong>The Freelancer Marketing Ltd.</strong><br>
              Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2<br>
              8015, Paphos Cyprus<br>
              Registrierungsnummer: HE 458650 | VAT: CY60058879W<br>
              <a href="https://taskilo.de/impressum">Impressum</a> | 
              <a href="https://taskilo.de/datenschutz">Datenschutz</a> | 
              <a href="mailto:support@taskilo.de">Support</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
