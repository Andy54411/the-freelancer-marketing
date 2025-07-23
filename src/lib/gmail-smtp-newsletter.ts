// Gmail SMTP Newsletter System für Google Workspace - OHNE OAuth
import nodemailer from 'nodemailer';

// Google Workspace SMTP Konfiguration
const gmailTransporter = nodemailer.createTransporter({
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

// Newsletter versenden
export async function sendNewsletterViaGmail(
  recipients: string[],
  subject: string,
  htmlContent: string
) {
  try {
    console.log('📧 Sende Newsletter über Gmail SMTP...');

    const mailOptions = {
      from: `"Taskilo Newsletter" <${process.env.GMAIL_USERNAME}>`,
      to: recipients.join(', '),
      subject: subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, ''), // HTML zu Text
    };

    const result = await gmailTransporter.sendMail(mailOptions);

    console.log('✅ Newsletter erfolgreich versendet!');
    console.log('Message ID:', result.messageId);

    return {
      success: true,
      messageId: result.messageId,
      recipients: recipients.length,
    };
  } catch (error) {
    console.error('❌ Gmail SMTP Fehler:', error);
    throw error;
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
      results.push({ success: false, error: error.message, batch: i / batchSize + 1 });
    }
  }

  return results;
}
