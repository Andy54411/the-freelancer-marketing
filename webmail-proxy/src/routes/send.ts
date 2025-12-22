import { Router } from 'express';
import { EmailService, SendEmailSchema } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const SendRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

export { router as sendRouter };
