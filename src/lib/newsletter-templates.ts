// Newsletter Default Templates - Vorgefertigte E-Mail-Vorlagen
export const defaultNewsletterTemplates = {
  // Welcome Email Template
  welcome: {
    name: 'Willkommens-E-Mail',
    description: 'Wird nach erfolgreicher Newsletter-Bestätigung gesendet',
    category: 'welcome' as const,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Willkommen bei Taskilo</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); padding: 50px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Willkommen bei Taskilo!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hallo {{firstName}}!</h2>
                    <p style="color: #4b5563; line-height: 1.7;">
                      Vielen Dank für Ihre Anmeldung zu unserem Newsletter. 
                      Sie sind jetzt Teil unserer Community!
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="{{baseUrl}}" style="display: inline-block; background: #14ad9f; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600;">
                        Jetzt Taskilo entdecken
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    variables: ['firstName', 'baseUrl'],
  },

  // Newsletter Standard Template
  newsletter: {
    name: 'Standard Newsletter',
    description: 'Basis-Vorlage für regelmäßige Newsletter',
    category: 'newsletter' as const,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #14ad9f 0%, #0d8a7f 100%); padding: 30px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Taskilo Newsletter</h1>
                  </td>
                </tr>
                
                <!-- Preheader -->
                <tr>
                  <td style="padding: 30px 40px 0 40px;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">{{previewText}}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0;">{{headline}}</h2>
                    <div style="color: #4b5563; line-height: 1.7;">
                      {{content}}
                    </div>
                  </td>
                </tr>
                
                <!-- CTA -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; text-align: center;">
                    <a href="{{ctaUrl}}" style="display: inline-block; background: #14ad9f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
                      {{ctaText}}
                    </a>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      Taskilo - Die Plattform für Dienstleister<br>
                      <a href="{{unsubscribeUrl}}" style="color: #9ca3af;">Abmelden</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    variables: ['subject', 'previewText', 'headline', 'content', 'ctaUrl', 'ctaText', 'unsubscribeUrl'],
  },

  // Promotion Template
  promotion: {
    name: 'Promotion / Angebot',
    description: 'Für Sonderaktionen und Rabattangebote',
    category: 'promotion' as const,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exklusives Angebot</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Badge -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px; text-align: center;">
                    <div style="display: inline-block; background: #ffffff; color: #ea580c; padding: 8px 20px; border-radius: 20px; font-weight: 700; margin-bottom: 15px;">
                      EXKLUSIV
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">{{discountPercent}}% Rabatt</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Nur für Newsletter-Abonnenten</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hallo {{firstName}}!</h2>
                    <p style="color: #4b5563; line-height: 1.7;">
                      {{content}}
                    </p>
                    
                    <!-- Promo Code Box -->
                    <div style="background: #fef3c7; border: 2px dashed #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                      <p style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">Ihr exklusiver Code:</p>
                      <p style="color: #92400e; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">{{promoCode}}</p>
                    </div>
                    
                    <div style="text-align: center;">
                      <a href="{{ctaUrl}}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Jetzt einlösen
                      </a>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                      Gültig bis: {{expiryDate}}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      Taskilo - Die Plattform für Dienstleister<br>
                      <a href="{{unsubscribeUrl}}" style="color: #9ca3af;">Abmelden</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    variables: ['firstName', 'discountPercent', 'content', 'promoCode', 'ctaUrl', 'expiryDate', 'unsubscribeUrl'],
  },

  // Announcement Template
  announcement: {
    name: 'Ankündigung',
    description: 'Für wichtige Neuigkeiten und Produktankündigungen',
    category: 'announcement' as const,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wichtige Neuigkeiten</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 50px 40px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 15px;">{{emoji}}</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">{{headline}}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #4b5563; line-height: 1.7; font-size: 16px;">
                      {{content}}
                    </p>
                    
                    <!-- Feature List -->
                    <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 30px 0;">
                      {{featureList}}
                    </div>
                    
                    <div style="text-align: center;">
                      <a href="{{ctaUrl}}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600;">
                        {{ctaText}}
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      Taskilo - Die Plattform für Dienstleister<br>
                      <a href="{{unsubscribeUrl}}" style="color: #9ca3af;">Abmelden</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    variables: ['emoji', 'headline', 'content', 'featureList', 'ctaUrl', 'ctaText', 'unsubscribeUrl'],
  },

  // Minimal Template
  minimal: {
    name: 'Minimal / Text',
    description: 'Einfache Text-E-Mail ohne viel Design',
    category: 'custom' as const,
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Georgia, serif; background-color: #ffffff;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 580px; width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 20px 0; border-bottom: 1px solid #e5e5e5;">
                    <p style="color: #14ad9f; font-size: 14px; margin: 0; letter-spacing: 1px;">TASKILO</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 0;">
                    <h1 style="color: #1a1a1a; font-size: 28px; font-weight: normal; margin: 0 0 30px 0;">{{headline}}</h1>
                    <div style="color: #4a4a4a; font-size: 17px; line-height: 1.8;">
                      {{content}}
                    </div>
                    <p style="margin-top: 40px;">
                      <a href="{{ctaUrl}}" style="color: #14ad9f; text-decoration: underline;">{{ctaText}} →</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 0; border-top: 1px solid #e5e5e5;">
                    <p style="color: #999; font-size: 13px; margin: 0;">
                      Taskilo - Die Plattform für Dienstleister<br>
                      <a href="{{unsubscribeUrl}}" style="color: #999;">Abmelden</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    variables: ['headline', 'content', 'ctaUrl', 'ctaText', 'unsubscribeUrl'],
  },
};

export type TemplateKey = keyof typeof defaultNewsletterTemplates;
