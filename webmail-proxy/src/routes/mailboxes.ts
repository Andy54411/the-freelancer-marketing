import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const GetMailboxesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/', async (req, res) => {
  try {
    const { email, password } = GetMailboxesSchema.parse(req.body);
    
    const emailService = new EmailService({ email, password });
    const mailboxes = await emailService.getMailboxes();
    
    res.json({
      success: true,
      mailboxes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mailboxes';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as mailboxesRouter };
