import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const GetMessagesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  page: z.number().default(1),
  limit: z.number().default(50),
});

const GetMessagesMasterSchema = z.object({
  email: z.string().email(),
  mailbox: z.string().default('INBOX'),
  page: z.number().default(1),
  limit: z.number().default(50),
});

router.post('/', async (req, res) => {
  try {
    const { email, password, mailbox, page, limit } = GetMessagesSchema.parse(req.body);
    
    const emailService = new EmailService({ email, password });
    const result = await emailService.getMessages(mailbox, { page, limit });
    
    res.json({
      success: true,
      messages: result.messages,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Master User Route - kein Benutzer-Passwort erforderlich.
 * Nutzt Dovecot Master User für sichere Server-seitige Authentifizierung.
 */
router.post('/master', async (req, res) => {
  try {
    const { email, mailbox, page, limit } = GetMessagesMasterSchema.parse(req.body);
    
    // Nur @taskilo.de E-Mails erlaubt
    if (!email.endsWith('@taskilo.de')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Master User Zugriff nur für Taskilo E-Mails erlaubt' 
      });
    }
    
    const emailService = EmailService.withMasterUser(email);
    const result = await emailService.getMessages(mailbox, { page, limit });
    
    res.json({
      success: true,
      messages: result.messages,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as messagesRouter };
