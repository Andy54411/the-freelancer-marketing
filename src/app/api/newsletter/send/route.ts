// API Route für Newsletter-Versendung über Gmail
import { NextRequest, NextResponse } from 'next/server';
import {
  GmailNewsletterSender,
  NEWSLETTER_TEMPLATES,
  replaceTemplateVariables,
} from '@/lib/google-workspace';

export async function POST(request: NextRequest) {
  try {
    const { templateId, recipients, subject, variables, customContent, accessToken, refreshToken } =
      await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access Token erforderlich' }, { status: 401 });
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Empfänger erforderlich' }, { status: 400 });
    }

    const gmailSender = new GmailNewsletterSender(accessToken, refreshToken);

    let htmlContent = '';
    let finalSubject = subject || 'Newsletter von Taskilo';

    // Template verwenden oder benutzerdefinierten Inhalt
    if (templateId) {
      const template = NEWSLETTER_TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        return NextResponse.json({ error: 'Template nicht gefunden' }, { status: 404 });
      }

      htmlContent = replaceTemplateVariables(template.htmlContent, variables || {});
      finalSubject = subject || replaceTemplateVariables(template.subject, variables || {});
    } else if (customContent) {
      htmlContent = customContent;
    } else {
      return NextResponse.json({ error: 'Template oder Inhalt erforderlich' }, { status: 400 });
    }

    // Newsletter versenden
    const result = await gmailSender.sendNewsletter(recipients, finalSubject, htmlContent);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Newsletter Send API Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

// Newsletter-Templates abrufen
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      templates: NEWSLETTER_TEMPLATES.map(template => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        variables: template.variables,
      })),
    });
  } catch (error) {
    console.error('Newsletter Templates API Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
