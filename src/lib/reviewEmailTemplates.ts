/**
 * E-Mail Templates für das Bewertungssystem
 */

interface OrderReviewEmailData {
  customerName: string;
  providerName: string;
  orderTitle: string;
  reviewLink: string;
}

interface CompanyReviewEmailData {
  customerName: string;
  providerName: string;
  reviewLink: string;
}

/**
 * E-Mail 1: Auftragsbewertung (sofort nach Abschluss)
 */
export function getOrderReviewEmailHtml(data: OrderReviewEmailData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bewerten Sie Ihren Auftrag</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); border-radius: 12px 12px 0 0;">
              <img src="https://taskilo.de/images/taskilo-logo-white.png" alt="Taskilo" style="height: 40px; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">
                Wie war Ihr Auftrag?
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hallo ${data.customerName},
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Ihr Auftrag <strong>"${data.orderTitle}"</strong> bei <strong>${data.providerName}</strong> wurde erfolgreich abgeschlossen.
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Wir würden uns freuen, wenn Sie sich einen Moment Zeit nehmen, um Ihre Erfahrung zu bewerten. Ihre Bewertung hilft anderen Kunden bei der Auswahl des richtigen Dienstleisters.
              </p>
              
              <!-- Star Rating Preview -->
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #666666; font-size: 14px; margin-bottom: 15px;">Wie zufrieden waren Sie?</p>
                <div style="font-size: 36px;">
                  <span style="color: #ffc107;">&#9733;</span>
                  <span style="color: #ffc107;">&#9733;</span>
                  <span style="color: #ffc107;">&#9733;</span>
                  <span style="color: #ffc107;">&#9733;</span>
                  <span style="color: #ffc107;">&#9733;</span>
                </div>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.reviewLink}" style="display: inline-block; background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(20, 173, 159, 0.3);">
                      Jetzt bewerten
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Der Link ist 14 Tage gültig.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                Sie erhalten diese E-Mail, weil Sie einen Auftrag über Taskilo abgeschlossen haben.
                <br /><br />
                The Freelancer Marketing Ltd. | Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2 | 8015 Paphos, Cyprus
                <br />
                <a href="https://taskilo.de/datenschutz" style="color: #14ad9f;">Datenschutz</a> | 
                <a href="https://taskilo.de/impressum" style="color: #14ad9f;">Impressum</a>
                <br /><br />
                <span style="font-size: 11px;">&reg;Taskilo</span>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * E-Mail 2: Firmenbewertung (2 Tage später)
 */
export function getCompanyReviewEmailHtml(data: CompanyReviewEmailData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bewerten Sie ${data.providerName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); border-radius: 12px 12px 0 0;">
              <img src="https://taskilo.de/images/taskilo-logo-white.png" alt="Taskilo" style="height: 40px; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">
                Wie war Ihre Erfahrung?
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hallo ${data.customerName},
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Vielen Dank für Ihre Auftragsbewertung! Jetzt möchten wir mehr über Ihre <strong>Gesamterfahrung</strong> mit <strong>${data.providerName}</strong> erfahren.
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Diese detaillierte Bewertung hilft uns, die Qualität der Dienstleister auf Taskilo zu überwachen und sicherzustellen, dass Sie immer den besten Service erhalten.
              </p>
              
              <!-- Rating Categories Preview -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #333333; font-size: 14px; font-weight: 600; margin: 0 0 15px 0;">Bewerten Sie in 10 Kategorien:</p>
                <table style="width: 100%; font-size: 13px; color: #666666;">
                  <tr>
                    <td style="padding: 4px 0;">Qualität der Arbeit</td>
                    <td style="padding: 4px 0;">Kommunikation</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Pünktlichkeit</td>
                    <td style="padding: 4px 0;">Professionalität</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Preis-Leistung</td>
                    <td style="padding: 4px 0;">Zuverlässigkeit</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Freundlichkeit</td>
                    <td style="padding: 4px 0;">Fachkompetenz</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">Sauberkeit</td>
                    <td style="padding: 4px 0;">Weiterempfehlung</td>
                  </tr>
                </table>
              </div>
              
              <!-- Scale Info -->
              <div style="text-align: center; margin: 20px 0;">
                <p style="color: #666666; font-size: 14px; margin: 0;">
                  Bewertungsskala: <strong>1</strong> (sehr schlecht) bis <strong>10</strong> (ausgezeichnet)
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.reviewLink}" style="display: inline-block; background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(20, 173, 159, 0.3);">
                      Detaillierte Bewertung abgeben
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Dauert nur 2 Minuten. Der Link ist 14 Tage gültig.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
              <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                Diese Bewertung ist anonym und wird nur intern verwendet.
                <br /><br />
                The Freelancer Marketing Ltd. | Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2 | 8015 Paphos, Cyprus
                <br />
                <a href="https://taskilo.de/datenschutz" style="color: #14ad9f;">Datenschutz</a> | 
                <a href="https://taskilo.de/impressum" style="color: #14ad9f;">Impressum</a>
                <br /><br />
                <span style="font-size: 11px;">&reg;Taskilo</span>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Plain Text Version für Order Review
 */
export function getOrderReviewEmailText(data: OrderReviewEmailData): string {
  return `
Hallo ${data.customerName},

Ihr Auftrag "${data.orderTitle}" bei ${data.providerName} wurde erfolgreich abgeschlossen.

Wir würden uns freuen, wenn Sie sich einen Moment Zeit nehmen, um Ihre Erfahrung zu bewerten.

Jetzt bewerten: ${data.reviewLink}

Der Link ist 14 Tage gültig.

Mit freundlichen Grüßen,
Ihr Taskilo Team

---
The Freelancer Marketing Ltd. | Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2 | 8015 Paphos, Cyprus
®Taskilo
`;
}

/**
 * Plain Text Version für Company Review
 */
export function getCompanyReviewEmailText(data: CompanyReviewEmailData): string {
  return `
Hallo ${data.customerName},

Vielen Dank für Ihre Auftragsbewertung! Jetzt möchten wir mehr über Ihre Gesamterfahrung mit ${data.providerName} erfahren.

Bewerten Sie in 10 Kategorien (Skala 1-10):
- Qualität der Arbeit
- Kommunikation
- Pünktlichkeit
- Professionalität
- Preis-Leistungs-Verhältnis
- Zuverlässigkeit
- Freundlichkeit
- Fachkompetenz
- Sauberkeit/Ordnung
- Weiterempfehlung

Detaillierte Bewertung abgeben: ${data.reviewLink}

Dauert nur 2 Minuten. Der Link ist 14 Tage gültig.

Mit freundlichen Grüßen,
Ihr Taskilo Team

---
The Freelancer Marketing Ltd. | Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2 | 8015 Paphos, Cyprus
®Taskilo
`;
}
