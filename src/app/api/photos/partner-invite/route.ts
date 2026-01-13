import { NextRequest, NextResponse } from 'next/server';
import { ResendEmailService } from '@/lib/resend-email-service';
import { db } from '@/firebase/server';
import { randomBytes } from 'crypto';

// Partner-Einladungs-E-Mail für Fotos-Sharing senden
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      senderEmail, 
      senderName,
      partnerEmail, 
      partnerName,
      startDate,
      includeAllPhotos 
    } = body;

    // Validierung
    if (!senderEmail || !partnerEmail) {
      return NextResponse.json(
        { success: false, error: 'Sender und Partner E-Mail erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbankverbindung nicht verfügbar' },
        { status: 500 }
      );
    }

    // Einladungs-Token generieren (gültig für 30 Tage)
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Einladung in Firestore speichern
    const inviteRef = await db.collection('photo_partner_invites').add({
      senderEmail,
      senderName: senderName || senderEmail.split('@')[0],
      partnerEmail,
      partnerName: partnerName || partnerEmail.split('@')[0],
      token: inviteToken,
      startDate: startDate || null,
      includeAllPhotos: includeAllPhotos ?? true,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
    });

    // Einladungs-Link erstellen
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';
    const inviteLink = `${baseUrl}/webmail/photos/invite/${inviteToken}`;

    // E-Mail HTML Template im Google Fotos Stil
    const displaySenderName = senderName || senderEmail.split('@')[0];
    const senderInitial = displaySenderName.charAt(0).toUpperCase();
    
    // Taskilo Logo URL (immer von Produktion laden für E-Mail-Kompatibilität)
    const logoUrl = 'https://taskilo.de/images/taskilo-logo-transparent.png';
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung zum Fotos teilen</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Google Sans', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header mit Logo -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center;">
              <img src="${logoUrl}" alt="Taskilo" style="height: 40px; width: auto;" />
              <span style="display: block; margin-top: 8px; font-size: 18px; font-weight: 500; color: #202124;">Fotos</span>
            </td>
          </tr>
          
          <!-- Begrüßung -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; font-size: 16px; color: #202124;">
                Hallo ${partnerName || partnerEmail.split('@')[0]},
              </p>
            </td>
          </tr>
          
          <!-- Einladungs-Box -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%; border: 1px solid #e0e0e0; border-radius: 8px;">
                <tr>
                  <td style="text-align: center; padding: 24px 16px 16px;">
                    <!-- Avatar -->
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="width: 64px; height: 64px; background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: white; font-size: 28px; font-weight: 500; line-height: 64px;">${senderInitial}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 12px 0 0; font-size: 14px; color: #5f6368;">${senderEmail}</p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding: 16px;">
                    <p style="margin: 0; font-size: 16px; font-weight: 500; color: #202124;">
                      ${displaySenderName} möchte über „Mit Partner teilen" Inhalte mit dir teilen
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding: 0 16px 16px;">
                    <p style="margin: 0; font-size: 14px; color: #5f6368; line-height: 1.6;">
                      Über „Mit Partner teilen" kannst du ganz einfach wichtige Erinnerungen von deinem Partner erhalten.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding: 0 16px 16px;">
                    <p style="margin: 0; font-size: 14px; color: #5f6368; line-height: 1.6;">
                      Die Fotos und Videos, die du über die Funktion „Mit Partner teilen" speicherst, werden nicht auf deinen Speicherplatz angerechnet, sofern dein*e Partner*in sie weiterhin über „Mit Partner teilen" mit dir teilt.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding: 0 16px 24px;">
                    <p style="margin: 0; font-size: 14px; color: #ea4335;">
                      Diese Einladung läuft nach 30 Tagen ab.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #14ad9f; color: #ffffff; text-decoration: none; border-radius: 24px; font-size: 14px; font-weight: 500;">
                Einladung ansehen
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 12px; font-size: 12px; color: #5f6368; text-align: center;">
                Diese E-Mail wurde an ${partnerEmail} gesendet, weil ${senderEmail} eine Einladung für Taskilo Fotos gesendet hat.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9aa0a6; text-align: center; line-height: 1.5;">
                The Freelancer Marketing Ltd.<br>
                Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2<br>
                8015 Paphos, Cyprus<br>
                Reg.-Nr.: HE 458650 | VAT: CY60058879W
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

    // Text-Version für E-Mail-Clients ohne HTML
    const textContent = `
Hallo ${partnerName || partnerEmail.split('@')[0]},

${displaySenderName} (${senderEmail}) möchte über „Mit Partner teilen" Inhalte mit dir teilen.

Über „Mit Partner teilen" kannst du ganz einfach wichtige Erinnerungen von deinem Partner erhalten.

Die Fotos und Videos, die du über die Funktion „Mit Partner teilen" speicherst, werden nicht auf deinen Speicherplatz angerechnet, sofern dein*e Partner*in sie weiterhin über „Mit Partner teilen" mit dir teilt.

Diese Einladung läuft nach 30 Tagen ab.

Einladung ansehen: ${inviteLink}

---
Diese E-Mail wurde an ${partnerEmail} gesendet, weil ${senderEmail} eine Einladung für Taskilo Fotos gesendet hat.

The Freelancer Marketing Ltd.
Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2
8015 Paphos, Cyprus
Reg.-Nr.: HE 458650 | VAT: CY60058879W
    `.trim();

    // E-Mail senden
    const emailService = ResendEmailService.getInstance();
    const result = await emailService.sendEmail({
      from: 'Taskilo Fotos <noreply@taskilo.de>',
      to: partnerEmail,
      subject: `${displaySenderName} möchte über „Mit Partner teilen" Inhalte mit dir teilen`,
      htmlContent,
      textContent,
      metadata: {
        type: 'photo_partner_invite',
        inviteId: inviteRef.id,
        senderEmail,
        partnerEmail,
      },
    });

    if (!result.success) {
      // Einladung als fehlgeschlagen markieren
      await db.collection('photo_partner_invites').doc(inviteRef.id).update({
        status: 'email_failed',
        emailError: result.error,
      });

      return NextResponse.json(
        { success: false, error: `E-Mail konnte nicht gesendet werden: ${result.error}` },
        { status: 500 }
      );
    }

    // Einladung als gesendet markieren
    await db.collection('photo_partner_invites').doc(inviteRef.id).update({
      status: 'sent',
      emailMessageId: result.messageId,
      sentAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      inviteId: inviteRef.id,
      messageId: result.messageId,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
