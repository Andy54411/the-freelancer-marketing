import { NextRequest, NextResponse } from 'next/server';
import { ResendEmailService } from '@/lib/resend-email-service';
import { db as adminDb } from '@/firebase/server';

export const runtime = 'nodejs';

interface InviteEmailRequest {
  employeeEmail: string;
  employeeName: string;
  companyId: string;
  registrationUrl: string;
  companyCode?: string; // NEU: Firmencode für die App
}

export async function POST(req: NextRequest) {
  try {
    const body: InviteEmailRequest = await req.json();
    const { employeeEmail, employeeName, companyId, registrationUrl: _registrationUrl, companyCode } = body;

    console.log('[send-invite] Request received:', { employeeEmail, employeeName, companyId, companyCode });

    if (!employeeEmail || !companyId) {
      console.log('[send-invite] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'E-Mail-Adresse und Firmen-ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Lade Firmennamen aus Firestore
    let companyName = 'Ihr Unternehmen';
    try {
      if (adminDb) {
        const companyDoc = await adminDb.collection('companies').doc(companyId).get();
        if (companyDoc.exists) {
          const companyData = companyDoc.data();
          companyName = companyData?.companyName || companyData?.name || companyData?.step1?.firmenname || 'Ihr Unternehmen';
        }
      }
    } catch {
      // Fallback auf Standard-Firmennamen
    }

    const service = ResendEmailService.getInstance();
    
    // App-Login URL
    const appLoginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de'}/employee/login`;

    const htmlMessage = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Willkommen bei Taskilo</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hallo ${employeeName || 'Mitarbeiter'},</p>
    
    <p style="font-size: 16px;">
      Sie wurden von <strong>${companyName}</strong> eingeladen, 
      die Taskilo Mitarbeiter-App zu nutzen.
    </p>
    
    <p style="font-size: 16px;">
      Mit der App haben Sie Zugriff auf:
    </p>
    
    <ul style="font-size: 16px; padding-left: 20px;">
      <li>Zeiterfassung</li>
      <li>Ihren Dienstplan</li>
      <li>Urlaubsantr&auml;ge</li>
      <li>Wichtige Dokumente</li>
    </ul>
    
    <div style="background: #f0fdfa; border: 2px solid #14b8a6; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #0d9488; margin: 0 0 10px 0; font-weight: 600;">Ihr Firmencode f&uuml;r die Anmeldung:</p>
      <p style="font-size: 24px; font-weight: bold; color: #0d9488; margin: 0; font-family: monospace; letter-spacing: 2px;">${companyCode || companyId}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 15px;">
        <strong>So geht's:</strong>
      </p>
      <ol style="text-align: left; font-size: 14px; color: #4b5563; padding-left: 20px; margin-bottom: 20px;">
        <li style="margin-bottom: 8px;">Klicken Sie auf den Button unten oder &ouml;ffnen Sie die Taskilo-App</li>
        <li style="margin-bottom: 8px;">Melden Sie sich mit Ihrem Taskilo-Konto an (oder registrieren Sie sich kostenlos)</li>
        <li style="margin-bottom: 8px;">Geben Sie den Firmencode ein</li>
        <li>Fertig! Sie sind jetzt mit Ihrem Unternehmen verbunden.</li>
      </ol>
      <a href="${appLoginUrl}?code=${companyCode || companyId}" 
         style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); 
                color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                font-weight: 600; font-size: 16px;">
        Zur Mitarbeiter-Anmeldung
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      <strong>Noch kein Taskilo-Konto?</strong> Kein Problem! Bei der Anmeldung k&ouml;nnen Sie sich kostenlos registrieren.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
      Diese E-Mail wurde automatisch von Taskilo versandt.
    </p>
  </div>
</body>
</html>
    `.trim();

    const textMessage = `
Hallo ${employeeName || 'Mitarbeiter'},

Sie wurden von ${companyName} eingeladen, die Taskilo Mitarbeiter-App zu nutzen.

Mit der App haben Sie Zugriff auf:
- Zeiterfassung
- Ihren Dienstplan
- Urlaubsanträge
- Wichtige Dokumente

IHR FIRMENCODE: ${companyCode || companyId}

So geht's:
1. Öffnen Sie: ${appLoginUrl}
2. Melden Sie sich mit Ihrem Taskilo-Konto an (oder registrieren Sie sich kostenlos)
3. Geben Sie den Firmencode ein
4. Fertig! Sie sind jetzt mit Ihrem Unternehmen verbunden.

Mit freundlichen Grüßen,
Ihr Taskilo Team
    `.trim();

    const result = await service.sendEmail({
      from: 'Taskilo <noreply@taskilo.de>',
      to: [employeeEmail],
      subject: `Einladung zur Taskilo Mitarbeiter-App - ${companyName || 'Ihr Unternehmen'}`,
      htmlContent: htmlMessage,
      textContent: textMessage,
      metadata: {
        type: 'employee-invite',
        companyName,
        employeeEmail,
      },
    });

    console.log('[send-invite] Resend result:', JSON.stringify(result));

    if (!result.success) {
      console.log('[send-invite] Email failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'E-Mail konnte nicht gesendet werden' },
        { status: 500 }
      );
    }

    console.log('[send-invite] Email sent successfully to:', employeeEmail, 'messageId:', result.messageId);
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
