// Google Workspace API Integration für Newsletter
import { google } from 'googleapis';
import { NextRequest } from 'next/server';

// Google Workspace Konfiguration
const GOOGLE_WORKSPACE_CONFIG = {
  CLIENT_ID: process.env.GOOGLE_WORKSPACE_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET,
  REDIRECT_URI:
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  SCOPES: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  NEWSLETTER_FROM_EMAIL: process.env.NEWSLETTER_FROM_EMAIL || 'newsletter@taskilo.de',
  NEWSLETTER_FROM_NAME: process.env.NEWSLETTER_FROM_NAME || 'Taskilo Team',
};

// OAuth2 Client initialisieren
export function getGoogleAuth() {
  return new google.auth.OAuth2(
    GOOGLE_WORKSPACE_CONFIG.CLIENT_ID,
    GOOGLE_WORKSPACE_CONFIG.CLIENT_SECRET,
    GOOGLE_WORKSPACE_CONFIG.REDIRECT_URI
  );
}

// Authentifizierungs-URL generieren
export function getAuthUrl() {
  // Validiere Konfiguration
  if (!GOOGLE_WORKSPACE_CONFIG.CLIENT_ID || !GOOGLE_WORKSPACE_CONFIG.CLIENT_SECRET) {
    throw new Error(
      'Google Workspace OAuth-Credentials sind nicht konfiguriert. Bitte setzen Sie GOOGLE_WORKSPACE_CLIENT_ID und GOOGLE_WORKSPACE_CLIENT_SECRET in der .env.local Datei.'
    );
  }

  const oauth2Client = getGoogleAuth();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_WORKSPACE_CONFIG.SCOPES,
    prompt: 'consent',
  });
}

// Access Token aus Authorization Code erhalten
export async function getAccessToken(code: string) {
  const oauth2Client = getGoogleAuth();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Google Sheets API - Newsletter-Abonnenten verwalten
export class GoogleSheetsNewsletterManager {
  private auth: any;
  private sheets: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.auth = getGoogleAuth();
    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  // Newsletter-Abonnent hinzufügen
  async addSubscriber(spreadsheetId: string, email: string, name?: string, preferences?: string[]) {
    try {
      const values = [
        [
          new Date().toISOString(),
          email,
          name || '',
          preferences ? preferences.join(', ') : '',
          'Aktiv',
          'Website',
        ],
      ];

      const request = {
        spreadsheetId,
        range: 'Newsletter-Abonnenten!A:F',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      };

      const response = await this.sheets.spreadsheets.values.append(request);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Abonnenten:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Alle Newsletter-Abonnenten abrufen
  async getSubscribers(spreadsheetId: string) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Newsletter-Abonnenten!A:F',
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      // Erste Zeile sind die Kopfzeilen
      const headers = rows[0];
      const subscribers = rows.slice(1).map((row: any[]) => ({
        timestamp: row[0] || '',
        email: row[1] || '',
        name: row[2] || '',
        preferences: row[3] ? row[3].split(', ') : [],
        status: row[4] || '',
        source: row[5] || '',
      }));

      return subscribers;
    } catch (error) {
      console.error('Fehler beim Abrufen der Abonnenten:', error);
      return [];
    }
  }

  // Newsletter-Spreadsheet initialisieren
  async createNewsletterSpreadsheet(title: string = 'Taskilo Newsletter Abonnenten') {
    try {
      const request = {
        resource: {
          properties: {
            title,
          },
          sheets: [
            {
              properties: {
                title: 'Newsletter-Abonnenten',
              },
            },
          ],
        },
      };

      const response = await this.sheets.spreadsheets.create(request);
      const spreadsheetId = response.data.spreadsheetId;

      // Kopfzeilen hinzufügen
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Newsletter-Abonnenten!A1:F1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['Timestamp', 'E-Mail', 'Name', 'Präferenzen', 'Status', 'Quelle']],
        },
      });

      return { success: true, spreadsheetId };
    } catch (error) {
      console.error('Fehler beim Erstellen des Spreadsheets:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// Gmail API - Newsletter versenden
export class GmailNewsletterSender {
  private auth: any;
  private gmail: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.auth = getGoogleAuth();
    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  // E-Mail erstellen und versenden
  async sendNewsletter(to: string[], subject: string, htmlContent: string, textContent?: string) {
    try {
      const results = [];

      for (const email of to) {
        const emailContent = this.createEmailMessage(email, subject, htmlContent, textContent);

        const response = await this.gmail.users.messages.send({
          userId: 'me',
          resource: {
            raw: emailContent,
          },
        });

        results.push({ email, success: true, messageId: response.data.id });
      }

      return { success: true, results };
    } catch (error) {
      console.error('Fehler beim Versenden des Newsletters:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // E-Mail-Nachricht erstellen
  private createEmailMessage(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): string {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="newsletter_boundary"',
      '',
      '--newsletter_boundary',
      'Content-Type: text/plain; charset=utf-8',
      '',
      textContent || this.htmlToText(htmlContent),
      '',
      '--newsletter_boundary',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent,
      '',
      '--newsletter_boundary--',
    ];

    return Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  // HTML zu Text konvertieren (einfache Version)
  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

// Google Docs API - Newsletter-Templates
export class GoogleDocsTemplateManager {
  private auth: any;
  private docs: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.auth = getGoogleAuth();
    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.docs = google.docs({ version: 'v1', auth: this.auth });
  }

  // Google Doc als Newsletter-Template laden
  async getTemplate(documentId: string) {
    try {
      const response = await this.docs.documents.get({
        documentId,
      });

      const content = this.extractTextFromDoc(response.data);
      return { success: true, content };
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Text aus Google Doc extrahieren
  private extractTextFromDoc(doc: any): string {
    let text = '';

    if (doc.body && doc.body.content) {
      for (const element of doc.body.content) {
        if (element.paragraph) {
          for (const textElement of element.paragraph.elements || []) {
            if (textElement.textRun) {
              text += textElement.textRun.content;
            }
          }
        }
      }
    }

    return text;
  }
}

// Newsletter-Template Interface
export interface NewsletterTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

// Vordefinierte Newsletter-Templates
export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'welcome',
    name: 'Willkommen bei Taskilo',
    subject: 'Willkommen bei Taskilo - Ihre Plattform für professionelle Dienstleistungen',
    htmlContent: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #14ad9f, #0891b2); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Willkommen bei Taskilo!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2>Hallo {{NAME}},</h2>
          <p>vielen Dank für Ihre Anmeldung bei Taskilo! Wir freuen uns, Sie in unserer Community begrüßen zu dürfen.</p>
          <p>Taskilo ist Ihre Plattform für professionelle Dienstleistungen - von Handwerk bis IT-Services.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Was Sie als nächstes tun können:</h3>
            <ul>
              <li>Durchstöbern Sie unsere Dienstleistungskategorien</li>
              <li>Erstellen Sie Ihre erste Projektanfrage</li>
              <li>Bewerten Sie unsere qualifizierten Anbieter</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{WEBSITE_URL}}" style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Jetzt loslegen</a>
          </div>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung!</p>
          <p>Ihr Taskilo-Team</p>
        </div>
      </div>
    `,
    variables: ['NAME', 'WEBSITE_URL'],
  },
  {
    id: 'monthly_update',
    name: 'Monatlicher Newsletter',
    subject: 'Taskilo Update - Neue Features und Top-Anbieter',
    htmlContent: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #14ad9f, #0891b2); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Taskilo Monthly Update</h1>
          <p style="color: white; margin: 10px 0 0 0;">{{MONTH}} {{YEAR}}</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2>Hallo {{NAME}},</h2>
          <p>hier sind die neuesten Updates von Taskilo:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚀 Neue Features</h3>
            <p>{{NEW_FEATURES}}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>⭐ Anbieter des Monats</h3>
            <p>{{PROVIDER_OF_MONTH}}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📊 Statistiken</h3>
            <p>{{MONTHLY_STATS}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{WEBSITE_URL}}" style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Zur Plattform</a>
          </div>
          
          <p>Ihr Taskilo-Team</p>
        </div>
      </div>
    `,
    variables: [
      'NAME',
      'MONTH',
      'YEAR',
      'NEW_FEATURES',
      'PROVIDER_OF_MONTH',
      'MONTHLY_STATS',
      'WEBSITE_URL',
    ],
  },
];

// Template-Variablen ersetzen
export function replaceTemplateVariables(
  template: string,
  variables: { [key: string]: string }
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}
