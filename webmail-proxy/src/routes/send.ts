import { Router } from 'express';
import { EmailService, SendEmailSchema } from '../services/EmailService';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const router: Router = Router();

const SendRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).merge(SendEmailSchema);

const SendMasterRequestSchema = z.object({
  email: z.string().email(),
}).merge(SendEmailSchema);

router.post('/', async (req, res) => {
  try {
    const { email, password, ...emailData } = SendRequestSchema.parse(req.body);
    
    const emailService = new EmailService({ email, password });
    const result = await emailService.sendEmail(emailData);
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Master User Send Route - kein Benutzer-Passwort erforderlich.
 */
router.post('/master', async (req, res) => {
  try {
    const { email, ...emailData } = SendMasterRequestSchema.parse(req.body);
    
    if (!email.endsWith('@taskilo.de')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Master User Zugriff nur für Taskilo E-Mails erlaubt' 
      });
    }
    
    const emailService = EmailService.withMasterUser(email);
    const result = await emailService.sendEmail(emailData);
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Send with Attachment Route - für E-Mails mit PDF-Anhängen
 * Unterstützt größere Payloads (bis 25MB)
 */
router.post('/with-attachment', async (req, res) => {
  try {
    const { email, password, ...emailData } = SendRequestSchema.parse(req.body);
    
    // Validate that attachments are provided
    if (!emailData.attachments || emailData.attachments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No attachments provided. Use /api/send for emails without attachments.',
      });
    }
    
    const emailService = new EmailService({ email, password });
    const result = await emailService.sendEmail(emailData);
    
    res.json({
      success: true,
      messageId: result.messageId,
      attachmentCount: emailData.attachments.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send email with attachment';
    console.error('[Send With Attachment] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * System Email Route - für automatische System-E-Mails (Rechnungen, Benachrichtigungen)
 * Nutzt direkt SMTP mit support@taskilo.de
 */
const SystemEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // Base64 encoded
    contentType: z.string().optional(),
  })).optional(),
});

router.post('/system', async (req, res) => {
  try {
    const emailData = SystemEmailSchema.parse(req.body);
    
    const smtpHost = process.env.SMTP_HOST || 'mail.taskilo.de';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || 'support@taskilo.de';
    const smtpPass = process.env.SMTP_PASS;
    
    if (!smtpPass) {
      return res.status(500).json({
        success: false,
        error: 'SMTP nicht konfiguriert',
      });
    }
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Taskilo" <${smtpUser}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    };
    
    // Anhänge konvertieren (Base64 → Buffer)
    if (emailData.attachments && emailData.attachments.length > 0) {
      mailOptions.attachments = emailData.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      }));
    }
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('[System Email] Sent to:', emailData.to, 'MessageId:', result.messageId);
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send system email';
    console.error('[System Email] Error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export { router as sendRouter };
