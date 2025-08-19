import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export async function POST(request: NextRequest) {
  try {
    const { type, providerId, quoteData } = await request.json();

    if (type !== 'quote_request' || !providerId) {
      return NextResponse.json({ error: 'Ungültige Benachrichtigungsparameter' }, { status: 400 });
    }

    // Provider-Daten abrufen
    const providerDoc = await getDoc(doc(db, 'companies', providerId));

    if (!providerDoc.exists()) {
      return NextResponse.json({ error: 'Provider nicht gefunden' }, { status: 404 });
    }

    const providerData = providerDoc.data();
    const providerEmail = providerData.email || providerData.contactEmail;

    if (!providerEmail) {
      return NextResponse.json({ error: 'Provider-E-Mail nicht verfügbar' }, { status: 400 });
    }

    // E-Mail-Template für Quote Request
    const emailTemplate = {
      to: providerEmail,
      subject: `Neue Angebots-Anfrage auf Taskilo - ${quoteData.projectTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #14ad9f; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .project-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .button { background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Neue Angebots-Anfrage auf Taskilo</h1>
            </div>
            
            <div class="content">
              <p>Hallo ${providerData.companyName || providerData.displayName},</p>
              
              <p>Sie haben eine neue Angebots-Anfrage auf Taskilo erhalten!</p>
              
              <div class="project-info">
                <h3>Projektdetails:</h3>
                <p><strong>Titel:</strong> ${quoteData.projectTitle}</p>
                <p><strong>Beschreibung:</strong> ${quoteData.projectDescription}</p>
                <p><strong>Kategorie:</strong> ${quoteData.projectCategory}</p>
                ${quoteData.projectSubcategory ? `<p><strong>Unterkategorie:</strong> ${quoteData.projectSubcategory}</p>` : ''}
                <p><strong>Standort:</strong> ${quoteData.location} (${quoteData.postalCode})</p>
                ${quoteData.preferredStartDate ? `<p><strong>Gewünschter Start:</strong> ${quoteData.preferredStartDate}</p>` : ''}
                ${quoteData.estimatedDuration ? `<p><strong>Geschätzte Dauer:</strong> ${quoteData.estimatedDuration}</p>` : ''}
                ${quoteData.budgetRange ? `<p><strong>Budget:</strong> ${quoteData.budgetRange}</p>` : ''}
                <p><strong>Dringlichkeit:</strong> ${quoteData.urgency}</p>
              </div>
              
              <div class="project-info">
                <h3>Kundenkontakt:</h3>
                <p><strong>Name:</strong> ${quoteData.customerName}</p>
                <p><strong>E-Mail:</strong> ${quoteData.customerEmail}</p>
                ${quoteData.customerPhone ? `<p><strong>Telefon:</strong> ${quoteData.customerPhone}</p>` : ''}
                ${quoteData.additionalNotes ? `<p><strong>Zusätzliche Notizen:</strong><br>${quoteData.additionalNotes}</p>` : ''}
              </div>
              
              <p>
                <a href="https://taskilo.de/dashboard/company/quotes" class="button">
                  Angebot erstellen
                </a>
              </p>
              
              <p>Loggen Sie sich in Ihr Taskilo-Dashboard ein, um die vollständigen Details anzuzeigen und ein Angebot zu erstellen.</p>
            </div>
            
            <div class="footer">
              <p>Diese E-Mail wurde automatisch von Taskilo gesendet.</p>
              <p>Taskilo - Ihre Plattform für professionelle Dienstleistungen</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Neue Angebots-Anfrage auf Taskilo

Hallo ${providerData.companyName || providerData.displayName},

Sie haben eine neue Angebots-Anfrage auf Taskilo erhalten!

Projektdetails:
- Titel: ${quoteData.projectTitle}
- Beschreibung: ${quoteData.projectDescription}
- Kategorie: ${quoteData.projectCategory}
${quoteData.projectSubcategory ? `- Unterkategorie: ${quoteData.projectSubcategory}` : ''}
- Standort: ${quoteData.location} (${quoteData.postalCode})
${quoteData.preferredStartDate ? `- Gewünschter Start: ${quoteData.preferredStartDate}` : ''}
${quoteData.estimatedDuration ? `- Geschätzte Dauer: ${quoteData.estimatedDuration}` : ''}
${quoteData.budgetRange ? `- Budget: ${quoteData.budgetRange}` : ''}
- Dringlichkeit: ${quoteData.urgency}

Kundenkontakt:
- Name: ${quoteData.customerName}
- E-Mail: ${quoteData.customerEmail}
${quoteData.customerPhone ? `- Telefon: ${quoteData.customerPhone}` : ''}
${quoteData.additionalNotes ? `- Zusätzliche Notizen: ${quoteData.additionalNotes}` : ''}

Besuchen Sie https://taskilo.de/dashboard/company/quotes um ein Angebot zu erstellen.

Diese E-Mail wurde automatisch von Taskilo gesendet.
      `,
    };

    // E-Mail über externe Service senden (hier simuliert)
    // In Produktion würde man AWS SES, SendGrid, oder ähnlichen Service verwenden
    console.log('E-Mail würde gesendet werden an:', emailTemplate.to);
    console.log('Betreff:', emailTemplate.subject);

    // Für jetzt simulieren wir eine erfolgreiche E-Mail
    return NextResponse.json({
      success: true,
      message: 'E-Mail-Benachrichtigung gesendet',
      recipient: providerEmail,
    });
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail-Benachrichtigung:', error);
    return NextResponse.json(
      { error: 'Fehler beim Senden der E-Mail-Benachrichtigung' },
      { status: 500 }
    );
  }
}
