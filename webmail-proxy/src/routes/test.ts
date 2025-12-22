import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const TestConnectionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/', async (req, res) => {
  try {
    const { email, password } = TestConnectionSchema.parse(req.body);
    
    const emailService = new EmailService({ email, password });
    const result = await emailService.testConnection();
    
    res.json({
      success: true,
      imap: result.imap,
      smtp: result.smtp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection test failed';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as testRouter };
