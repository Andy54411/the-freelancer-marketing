// Double-Opt-In System für Newsletter
import { admin } from '../firebase/server';
import { sendSingleEmailViaGmail } from './gmail-smtp-newsletter';
import { generateUnsubscribeToken } from './newsletter-gdpr';
import crypto from 'crypto';

// OAuth2 Gmail Import mit Fallback
let sendNewsletterConfirmationEmail: any = null;
let getGmailService: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gmailOAuthModule = require('./gmail-oauth-newsletter');
  sendNewsletterConfirmationEmail = gmailOAuthModule.sendNewsletterConfirmationEmail;
  getGmailService = gmailOAuthModule.getGmailService;
} catch (error) {
  console.log('OAuth2 Gmail Module nicht verfügbar, verwende SMTP Fallback');
}

// Bestätigungs-Token generieren
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Bestätigungs-E-Mail senden
export async function sendConfirmationEmail(
  email: string,
  name: string | undefined,
  confirmationToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskilo.de'}/newsletter/confirm?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Newsletter-Anmeldung bestätigen</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://taskilo.de/images/logo.png" alt="Taskilo" style="height: 40px;">
        </div>
        
        <h1 style="color: #14ad9f; text-align: center;">Newsletter-Anmeldung bestätigen</h1>
        
        <p>Hallo${name ? ` ${name}` : ''},</p>
        
        <p>vielen Dank für Ihr Interesse an unserem Newsletter! Um Ihre Anmeldung abzuschließen, bestätigen Sie bitte Ihre E-Mail-Adresse.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationUrl}" 
             style="background-color: #14ad9f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Newsletter-Anmeldung bestätigen
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
          <a href="${confirmationUrl}" style="color: #14ad9f; word-break: break-all;">${confirmationUrl}</a>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 12px;">
          <strong>Warum erhalten Sie diese E-Mail?</strong><br>
          Diese E-Mail wurde versendet, weil sich jemand mit Ihrer E-Mail-Adresse für unseren Newsletter angemeldet hat. 
          Falls Sie sich nicht angemeldet haben, können Sie diese E-Mail einfach ignorieren.
        </p>
        
        <p style="color: #666; font-size: 12px;">
          Der Bestätigungslink ist 24 Stunden gültig. Nach der Bestätigung erhalten Sie regelmäßig Updates 
          zu neuen Features und Verbesserungen bei Taskilo.
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Taskilo GmbH<br>
            E-Mail: <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a><br>
            Web: <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
          </p>
        </div>
      </body>
      </html>
    `;

    // OAuth2 Gmail versuchen, fallback zu SMTP
    let emailResult: { success: boolean; error?: string } = { success: false };

    if (sendNewsletterConfirmationEmail) {
      try {
        console.log('📧 Verwende OAuth2 Gmail für Newsletter-Bestätigung');
        console.log('📧 OAuth2 Parameter:', { email, confirmationToken: confirmationToken.substring(0, 8) + '...', name });
        
        const oauthResult = await sendNewsletterConfirmationEmail(email, confirmationToken, name);
        console.log('📧 OAuth2 Ergebnis:', oauthResult);
        
        emailResult = { success: oauthResult.success, error: oauthResult.error };
        
        if (oauthResult.success) {
          console.log('✅ OAuth2 E-Mail erfolgreich gesendet');
        } else {
          console.error('❌ OAuth2 E-Mail fehlgeschlagen:', oauthResult.error);
        }
      } catch (error) {
        console.error('🚨 OAuth2 Gmail Exception, verwende SMTP Fallback:', error);
        
        // Versuche direkten Gmail Service falls verfügbar
        if (getGmailService) {
          try {
            console.log('📧 Versuche direkten Gmail Service');
            const gmailService = getGmailService();
            const directResult = await gmailService.sendEmail(
              email,
              'Newsletter-Anmeldung bestätigen - Taskilo',
              htmlContent,
              {
                from: 'newsletter@taskilo.de',
                replyTo: 'newsletter@taskilo.de'
              }
            );
            emailResult = { success: directResult.success, error: directResult.error };
            console.log('📧 Direkter Gmail Service Ergebnis:', directResult);
          } catch (directError) {
            console.error('🚨 Direkter Gmail Service fehlgeschlagen:', directError);
            // Fallback zu SMTP
            const smtpResult = await sendSingleEmailViaGmail(
              email,
              'Newsletter-Anmeldung bestätigen - Taskilo',
              htmlContent
            );
            emailResult = { success: smtpResult.success };
          }
        } else {
          // Fallback zu SMTP
          const smtpResult = await sendSingleEmailViaGmail(
            email,
            'Newsletter-Anmeldung bestätigen - Taskilo',
            htmlContent
          );
          emailResult = { success: smtpResult.success };
        }
      }
    } else {
      console.log('📧 Verwende SMTP für Newsletter-Bestätigung (OAuth2 nicht verfügbar)');
      
      // Einfache SMTP Funktion mit besserer Fehlerbehandlung
      try {
        const smtpResult = await sendSingleEmailViaGmail(
          email,
          'Newsletter-Anmeldung bestätigen - Taskilo',
          htmlContent
        );
        emailResult = { success: smtpResult.success };
        console.log('📧 SMTP Ergebnis:', smtpResult);
      } catch (smtpError) {
        console.error('🚨 SMTP fehlgeschlagen:', smtpError);
        
        // Als letzten Ausweg - erstelle einen einfachen nodemailer transport
        try {
          console.log('📧 Versuche einfachen Nodemailer Transport');
          const nodemailer = require('nodemailer');
          
          const simpleTransporter = nodemailer.createTransporter({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.GMAIL_USERNAME,
              pass: process.env.GMAIL_APP_PASSWORD,
            },
          });

          const result = await simpleTransporter.sendMail({
            from: `"Taskilo Newsletter" <${process.env.GMAIL_USERNAME}>`,
            to: email,
            subject: 'Newsletter-Anmeldung bestätigen - Taskilo',
            html: htmlContent,
            text: htmlContent.replace(/<[^>]*>/g, ''),
          });

          emailResult = { success: true };
          console.log('✅ Einfacher Transport erfolgreich:', result.messageId);
        } catch (fallbackError) {
          console.error('🚨 Alle E-Mail-Methoden fehlgeschlagen:', fallbackError);
          emailResult = { success: false, error: 'E-Mail-Versand fehlgeschlagen' };
        }
      }
    }

    return { success: emailResult.success };
  } catch (error) {
    console.error('Fehler beim Senden der Bestätigungs-E-Mail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Pending Newsletter-Anmeldung erstellen
export async function createPendingSubscription(
  email: string,
  options: {
    name?: string;
    source: 'manual' | 'website' | 'import' | 'footer';
    preferences?: string[];
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; error?: string; token?: string }> {
  try {
    // Prüfe ob bereits bestätigt
    const existingConfirmed = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .where('subscribed', '==', true)
      .get();

    if (!existingConfirmed.empty) {
      return { success: false, error: 'E-Mail-Adresse bereits bestätigt und angemeldet' };
    }

    // Prüfe ob bereits pending
    const existingPending = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('email', '==', email)
      .get();

    // Lösche alte pending confirmations für diese E-Mail
    if (!existingPending.empty) {
      const batch = admin.firestore().batch();
      existingPending.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Erstelle neuen Bestätigungstoken
    const confirmationToken = generateConfirmationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 Stunden gültig

    // Speichere pending confirmation
    const pendingData = {
      email,
      name: options.name || null,
      source: options.source,
      preferences: options.preferences || [],
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      confirmationToken,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      confirmed: false,
    };

    await admin.firestore().collection('newsletterPendingConfirmations').add(pendingData);

    // Sende Bestätigungs-E-Mail
    const emailResult = await sendConfirmationEmail(email, options.name, confirmationToken);

    if (!emailResult.success) {
      return { success: false, error: 'Fehler beim Senden der Bestätigungs-E-Mail' };
    }

    console.log('Pending Newsletter-Anmeldung erstellt:', {
      email,
      name: options.name || 'Unbekannt',
      source: options.source,
      token: confirmationToken.substring(0, 8) + '...',
      expiresAt: expiresAt.toISOString(),
    });

    return { success: true, token: confirmationToken };
  } catch (error) {
    console.error('Fehler beim Erstellen der pending subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Newsletter-Anmeldung bestätigen
export async function confirmNewsletterSubscription(
  email: string,
  confirmationToken: string
): Promise<{ success: boolean; error?: string; subscriberId?: string }> {
  try {
    // Finde pending confirmation
    const pendingQuery = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('email', '==', email)
      .where('confirmationToken', '==', confirmationToken)
      .where('confirmed', '==', false)
      .limit(1)
      .get();

    if (pendingQuery.empty) {
      return { success: false, error: 'Ungültiger oder abgelaufener Bestätigungslink' };
    }

    const pendingDoc = pendingQuery.docs[0];
    const pendingData = pendingDoc.data();

    // Prüfe Ablaufzeit
    const now = new Date();
    const expiresAt = pendingData.expiresAt.toDate();

    if (now > expiresAt) {
      // Lösche abgelaufene Bestätigung
      await pendingDoc.ref.delete();
      return { success: false, error: 'Bestätigungslink ist abgelaufen' };
    }

    // Prüfe ob bereits bestätigt
    const existingSubscriber = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .get();

    if (!existingSubscriber.empty) {
      // Aktiviere bestehenden Subscriber falls deaktiviert
      const subscriberDoc = existingSubscriber.docs[0];
      const subscriberData = subscriberDoc.data();

      if (!subscriberData.subscribed) {
        await subscriberDoc.ref.update({
          subscribed: true,
          subscribedAt: admin.firestore.Timestamp.now(),
          confirmedAt: admin.firestore.Timestamp.now(),
          unsubscribedAt: admin.firestore.FieldValue.delete(),
          unsubscribeReason: admin.firestore.FieldValue.delete(),
        });
      }

      // Markiere pending als bestätigt und lösche
      await pendingDoc.ref.delete();

      return { success: true, subscriberId: subscriberDoc.id };
    }

    // Erstelle neuen bestätigten Subscriber
    const unsubscribeToken = generateUnsubscribeToken(email);

    const subscriberData = {
      email,
      name: pendingData.name,
      subscribed: true,
      subscribedAt: admin.firestore.Timestamp.now(),
      confirmedAt: admin.firestore.Timestamp.now(),
      source: pendingData.source,
      preferences: pendingData.preferences,
      unsubscribeToken,
      ipAddress: pendingData.ipAddress,
      userAgent: pendingData.userAgent,
      consentGiven: true,
      consentTimestamp: pendingData.createdAt,
      // DSGVO: Daten-Retention (3 Jahre nach Abmeldung)
      dataRetentionUntil: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
      ),
    };

    const subscriberRef = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .add(subscriberData);

    // Lösche pending confirmation
    await pendingDoc.ref.delete();

    console.log('Newsletter-Anmeldung bestätigt:', {
      email,
      subscriberId: subscriberRef.id,
      confirmedAt: new Date().toISOString(),
    });

    return { success: true, subscriberId: subscriberRef.id };
  } catch (error) {
    console.error('Fehler bei Newsletter-Bestätigung:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

// Abgelaufene pending confirmations bereinigen
export async function cleanupExpiredPendingConfirmations(): Promise<{ deletedCount: number }> {
  try {
    const now = admin.firestore.Timestamp.now();

    const expiredQuery = await admin
      .firestore()
      .collection('newsletterPendingConfirmations')
      .where('expiresAt', '<=', now)
      .get();

    if (expiredQuery.empty) {
      return { deletedCount: 0 };
    }

    // Lösche abgelaufene Bestätigungen
    const batch = admin.firestore().batch();
    expiredQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`${expiredQuery.docs.length} abgelaufene Newsletter-Bestätigungen gelöscht`);

    return { deletedCount: expiredQuery.docs.length };
  } catch (error) {
    console.error('Fehler bei Cleanup von abgelaufenen Bestätigungen:', error);
    return { deletedCount: 0 };
  }
}
