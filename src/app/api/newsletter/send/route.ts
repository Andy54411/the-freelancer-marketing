// API Route für Newsletter-Versendung über Resend
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Resend-Client lazy initialisieren
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist nicht gesetzt');
  }
  return new Resend(apiKey);
}

// Einfache Newsletter-Templates
const NEWSLETTER_TEMPLATES = {
  welcome: {
    id: 'welcome',
    subject: 'Willkommen bei Taskilo!',
    htmlContent: `
      <h1>Willkommen bei Taskilo!</h1>
      <p>Vielen Dank für Ihre Anmeldung zu unserem Newsletter.</p>
      <p>Wir freuen uns, Sie als Teil unserer Community begrüßen zu dürfen!</p>
    `,
  },
  update: {
    id: 'update',
    subject: 'Taskilo Updates',
    htmlContent: `
      <h1>Neuigkeiten von Taskilo</h1>
      <p>Hier sind die neuesten Updates und Verbesserungen:</p>
      {{content}}
    `,
  },
};

export async function POST(request: NextRequest) {
  try {
    const { templateId, recipients, subject, variables, customContent } = await request.json();

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Empfänger erforderlich' }, { status: 400 });
    }

    let htmlContent = '';
    let finalSubject = subject || 'Newsletter von Taskilo';

    // Template verwenden oder benutzerdefinierten Inhalt
    if (templateId && NEWSLETTER_TEMPLATES[templateId as keyof typeof NEWSLETTER_TEMPLATES]) {
      const template = NEWSLETTER_TEMPLATES[templateId as keyof typeof NEWSLETTER_TEMPLATES];
      htmlContent = template.htmlContent;
      finalSubject = subject || template.subject;

      // Einfache Variable-Ersetzung
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
          finalSubject = finalSubject.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
      }
    } else if (customContent) {
      htmlContent = customContent;
    } else {
      return NextResponse.json({ error: 'Template oder Inhalt erforderlich' }, { status: 400 });
    }

    console.log(`📧 Newsletter-Versand an ${recipients.length} Empfänger über Resend`);

    const resend = getResendClient();

    // Newsletter über Resend versenden
    const results = [];
    for (const recipient of recipients) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'Taskilo Newsletter <newsletter@taskilo.de>',
          to: [recipient],
          subject: finalSubject,
          html: htmlContent,
        });

        if (error) {
          results.push({ recipient, success: false, error: error.message });
        } else {
          results.push({ recipient, success: true, messageId: data?.id });
        }
      } catch (emailError) {
        results.push({
          recipient,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unbekannter Fehler',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Newsletter versendet: ${successCount}/${recipients.length} erfolgreich`);

    return NextResponse.json({
      success: true,
      message: `Newsletter versendet: ${successCount}/${recipients.length} erfolgreich`,
      results,
      service: 'Resend',
    });
  } catch (error) {
    console.error('Newsletter Send API Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interner Server-Fehler',
      },
      { status: 500 }
    );
  }
}

// Newsletter-Templates abrufen
export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      templates: Object.values(NEWSLETTER_TEMPLATES).map(template => ({
        id: template.id,
        subject: template.subject,
      })),
      service: 'Resend',
    });
  } catch (error) {
    console.error('Newsletter Templates API Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}
