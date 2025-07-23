// Gmail SMTP Newsletter System für Google Workspace - OHNE OAuth
import nodemailer from 'nodemailer';
import { addUnsubscribeLinkToHtml } from './newsletter-gdpr';
import { admin } from '@/firebase/server';

// Google Workspace SMTP Konfiguration
const gmailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true für 465, false für andere Ports
  auth: {
    user: process.env.GMAIL_USERNAME, // newsletter@taskilo.de (Google Workspace)
    pass: process.env.GMAIL_APP_PASSWORD, // 16-stelliges App-Passwort von Google Workspace
  },
  tls: {
    ciphers: 'SSLv3',
  },
});

// Einzelne E-Mail senden (für Double-Opt-In Bestätigungen)
export async function sendSingleEmailViaGmail(
  to: string,
  subject: string,
  htmlContent: string,
  options?: {
    from?: string;
    replyTo?: string;
  }
) {
  try {
    const mailOptions = {
      from: options?.from || `"Taskilo Newsletter" <${process.env.GMAIL_USERNAME}>`,
      to,
      subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, ''), // HTML zu Text
      replyTo: options?.replyTo || process.env.GMAIL_USERNAME
    };

    const result = await gmailTransporter.sendMail(mailOptions);
    console.log(`E-Mail erfolgreich gesendet an ${to}:`, result.messageId);

    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    console.error(`Fehler beim Senden der E-Mail an ${to}:`, error);
    throw error;
  }
}

// Newsletter mit DSGVO-konformen Abmelde-Links versenden
export async function sendNewsletterViaGmail(
  recipients: string[],
  subject: string,
  htmlContent: string
) {
  try {
    console.log('📧 Sende Newsletter über Gmail SMTP...');

    const results = [];

    for (const email of recipients) {
      // Für jeden Empfänger individuellen Abmelde-Link hinzufügen
      const subscriberData = await getSubscriberByEmail(email);
      const htmlWithUnsubscribe = subscriberData?.unsubscribeToken 
        ? addUnsubscribeLinkToHtml(htmlContent, email, subscriberData.unsubscribeToken)
        : htmlContent;

      // Headers für E-Mail-Clients (DSGVO-konform)
      const headers: Record<string, string> = {
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };

      // Nur hinzufügen wenn Token verfügbar
      if (subscriberData?.unsubscribeToken) {
        headers['List-Unsubscribe'] = `<https://taskilo.de/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${subscriberData.unsubscribeToken}>`;
      }

      const mailOptions = {
        from: `"Taskilo Newsletter" <${process.env.GMAIL_USERNAME}>`,
        to: email,
        subject: subject,
        html: htmlWithUnsubscribe,
        text: htmlWithUnsubscribe.replace(/<[^>]*>/g, ''), // HTML zu Text
        headers
      };

      try {
        const result = await gmailTransporter.sendMail(mailOptions);
        results.push({
          email,
          success: true,
          messageId: result.messageId
        });
      } catch (emailError) {
        console.error(`❌ Fehler beim Senden an ${email}:`, emailError);
        results.push({
          email,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unbekannter Fehler'
        });
      }
    }

    console.log('✅ Newsletter-Batch versendet!');
    console.log(`Erfolgreich: ${results.filter(r => r.success).length}/${results.length}`);

    return {
      success: true,
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };

  } catch (error) {
    console.error('❌ Gmail SMTP Fehler:', error);
    throw error;
  }
}

// Hilfsfunktion: Subscriber-Daten aus Firestore abrufen
async function getSubscriberByEmail(email: string) {
  try {
    const query = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .where('subscribed', '==', true)
      .limit(1)
      .get();

    if (!query.empty) {
      return query.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error('Fehler beim Abrufen der Subscriber-Daten:', error);
    return null;
  }
}

// Bulk Newsletter (für viele Empfänger)
export async function sendBulkNewsletterViaGmail(
  recipients: string[],
  subject: string,
  htmlContent: string
) {
  const results = [];
  const batchSize = 50; // Gmail Limit: 500/Tag für normale Accounts

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    try {
      const result = await sendNewsletterViaGmail(batch, subject, htmlContent);
      results.push(result);

      // Pause zwischen Batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Batch ${i / batchSize + 1} fehlgeschlagen:`, error);
      results.push({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler', 
        batch: i / batchSize + 1 
      });
    }
  }

  return results;
}
