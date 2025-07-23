// API Route: Newsletter über Gmail SMTP versenden
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { sendBulkNewsletterViaGmail } from '@/lib/gmail-smtp-newsletter';

export async function POST(request: NextRequest) {
  try {
    // Admin Authentication prüfen
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { recipients, subject, htmlContent } = await request.json();

    // Validierung
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Empfänger-Liste erforderlich' }, { status: 400 });
    }

    if (!subject || !htmlContent) {
      return NextResponse.json({ error: 'Betreff und Inhalt erforderlich' }, { status: 400 });
    }

    // Google Workspace SMTP Konfiguration prüfen
    if (!process.env.GMAIL_USERNAME || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          error: 'Google Workspace SMTP nicht konfiguriert',
          setup_required: true,
          message:
            'GMAIL_USERNAME (Google Workspace E-Mail) und GMAIL_APP_PASSWORD (App-Passwort) müssen in Environment Variables gesetzt werden',
          instructions:
            'Erstellen Sie ein App-Passwort in Google Workspace Admin Console → Sicherheit → Zweistufige Bestätigung → App-Passwörter',
        },
        { status: 503 }
      );
    }

    console.log(`📧 Starte Newsletter-Versand an ${recipients.length} Empfänger...`);

    // Newsletter versenden
    const results = await sendBulkNewsletterViaGmail(recipients, subject, htmlContent);

    // Statistiken berechnen
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalRecipients = recipients.length;

    return NextResponse.json({
      success: true,
      message: 'Newsletter-Versand abgeschlossen',
      statistics: {
        total_batches: results.length,
        successful_batches: successful,
        failed_batches: failed,
        total_recipients: totalRecipients,
        email_service: 'Gmail SMTP',
      },
      results: results,
    });
  } catch (error) {
    console.error('Newsletter-Versand Fehler:', error);
    return NextResponse.json(
      {
        error: 'Newsletter-Versand fehlgeschlagen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
