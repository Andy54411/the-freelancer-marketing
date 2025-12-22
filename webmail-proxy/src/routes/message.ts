import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const GetMessageSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  uid: z.number(),
});

router.post('/', async (req, res) => {
  try {
    const { email, password, mailbox, uid } = GetMessageSchema.parse(req.body);
    
    const emailService = new EmailService({ email, password });
    const message = await emailService.getMessage(mailbox, uid);
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    res.json({
      success: true,
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch message';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as messageRouter };
