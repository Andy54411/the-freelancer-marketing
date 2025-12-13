import { NextRequest, NextResponse } from 'next/server';
import { ResendEmailService } from '@/lib/resend-email-service';
import { db as adminDb, auth as adminAuth } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface ChangeEmailRequest {
  userId: string;
  currentEmail: string;
  newEmail: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChangeEmailRequest = await req.json();
    const { userId, currentEmail, newEmail } = body;

    if (!userId || !currentEmail || !newEmail) {
      return NextResponse.json(
        { success: false, error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      );
    }

    // Validiere E-Mail-Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { success: false, error: 'Ungültiges E-Mail-Format' },
        { status: 400 }
      );
    }

    if (currentEmail === newEmail) {
      return NextResponse.json(
        { success: false, error: 'Die neue E-Mail-Adresse ist identisch mit der aktuellen' },
        { status: 400 }
      );
    }

    // Prüfe ob die neue E-Mail bereits in Firebase Auth verwendet wird
    if (adminAuth) {
      try {
        await adminAuth.getUserByEmail(newEmail);
        // Wenn kein Fehler, existiert der User bereits
        return NextResponse.json(
          { success: false, error: 'Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet' },
          { status: 400 }
        );
      } catch (authError: unknown) {
        // auth/user-not-found ist OK - E-Mail ist verfügbar
        const error = authError as { code?: string };
        if (error.code !== 'auth/user-not-found') {
          throw authError;
        }
      }
    }

    // Prüfe auch in Firestore (für Konsistenz)
    if (adminDb) {
      const existingUser = await adminDb
        .collection('users')
        .where('email', '==', newEmail)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        return NextResponse.json(
          { success: false, error: 'Diese E-Mail-Adresse wird bereits verwendet' },
          { status: 400 }
        );
      }
    }

    // Generiere Verifizierungs-Token
    const verificationToken = crypto.randomUUID();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden

    // Speichere Token in Firestore
    if (adminDb) {
      await adminDb.collection('users').doc(userId).update({
        emailChangeRequest: {
          newEmail,
          token: verificationToken,
          expiresAt: tokenExpiry.toISOString(),
          createdAt: FieldValue.serverTimestamp(),
        },
      });
    }

    // Erstelle Verifizierungs-URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de';
    const verificationUrl = `${baseUrl}/verify-email-change?token=${verificationToken}&userId=${userId}`;

    // Sende Verifizierungs-E-Mail
    const service = ResendEmailService.getInstance();

    const htmlMessage = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">E-Mail-Adresse best&auml;tigen</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px;">Hallo,</p>
    
    <p style="font-size: 16px;">
      Sie haben angefordert, Ihre E-Mail-Adresse bei Taskilo zu &auml;ndern.
    </p>
    
    <p style="font-size: 16px;">
      <strong>Neue E-Mail-Adresse:</strong> ${newEmail}
    </p>
    
    <p style="font-size: 16px;">
      Bitte klicken Sie auf den Button unten, um diese E-Mail-Adresse zu best&auml;tigen:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); 
                color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                font-weight: 600; font-size: 16px;">
        E-Mail-Adresse best&auml;tigen
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">
      Dieser Link ist 24 Stunden g&uuml;ltig. Falls Sie diese &Auml;nderung nicht angefordert haben, 
      k&ouml;nnen Sie diese E-Mail ignorieren.
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
Hallo,

Sie haben angefordert, Ihre E-Mail-Adresse bei Taskilo zu ändern.

Neue E-Mail-Adresse: ${newEmail}

Bestätigen Sie diese E-Mail-Adresse: ${verificationUrl}

Dieser Link ist 24 Stunden gültig.

Falls Sie diese Änderung nicht angefordert haben, können Sie diese E-Mail ignorieren.

Mit freundlichen Grüßen,
Ihr Taskilo Team
    `.trim();

    const result = await service.sendEmail({
      from: 'Taskilo <noreply@taskilo.de>',
      to: [newEmail],
      subject: 'Taskilo - E-Mail-Adresse bestätigen',
      htmlContent: htmlMessage,
      textContent: textMessage,
      metadata: {
        type: 'email-change-verification',
        userId,
        newEmail,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'E-Mail konnte nicht gesendet werden' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bestätigungs-E-Mail wurde gesendet',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
