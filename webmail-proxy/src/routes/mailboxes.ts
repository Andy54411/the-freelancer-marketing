import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const GetMailboxesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GetMailboxesMasterSchema = z.object({
  email: z.string().email(),
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

/**
 * Master User Route - kein Benutzer-Passwort erforderlich.
 */
router.post('/master', async (req, res) => {
  try {
    const { email } = GetMailboxesMasterSchema.parse(req.body);
    
    if (!email.endsWith('@taskilo.de')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Master User Zugriff nur für Taskilo E-Mails erlaubt' 
      });
    }
    
    const emailService = EmailService.withMasterUser(email);
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
