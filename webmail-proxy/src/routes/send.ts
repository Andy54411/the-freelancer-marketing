import { Router } from 'express';
import { EmailService, SendEmailSchema } from '../services/EmailService';
import { z } from 'zod';

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

export { router as sendRouter };
