import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const BaseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
});

const MarkReadSchema = BaseSchema.extend({
  action: z.literal('markRead'),
  uid: z.number(),
  read: z.boolean().default(true),
});

const MarkUnreadSchema = BaseSchema.extend({
  action: z.literal('markUnread'),
  uid: z.number(),
});

const DeleteSchema = BaseSchema.extend({
  action: z.literal('delete'),
  uid: z.number(),
});

const MoveSchema = BaseSchema.extend({
  action: z.literal('move'),
  uid: z.number(),
  targetMailbox: z.string(),
});

const CreateMailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.literal('createMailbox'),
  name: z.string(),
});

const DeleteMailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.literal('deleteMailbox'),
  path: z.string(),
});

const RenameMailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.literal('renameMailbox'),
  oldPath: z.string(),
  newPath: z.string(),
});

const ActionSchema = z.discriminatedUnion('action', [
  MarkReadSchema,
  MarkUnreadSchema,
  DeleteSchema,
  MoveSchema,
  CreateMailboxSchema,
  DeleteMailboxSchema,
  RenameMailboxSchema,
]);

router.post('/', async (req, res) => {
  try {
    const data = ActionSchema.parse(req.body);
    const emailService = new EmailService({ email: data.email, password: data.password });
    
    switch (data.action) {
      case 'markRead':
        await emailService.markAsRead(data.mailbox, data.uid, data.read);
        break;
        
      case 'markUnread':
        await emailService.markAsRead(data.mailbox, data.uid, false);
        break;
        
      case 'delete':
        await emailService.deleteMessage(data.mailbox, data.uid);
        break;
        
      case 'move':
        await emailService.moveMessage(data.mailbox, data.uid, data.targetMailbox);
        break;
        
      case 'createMailbox':
        const createResult = await emailService.createMailbox(data.name);
        return res.json({ success: true, path: createResult.path });
        
      case 'deleteMailbox':
        await emailService.deleteMailbox(data.path);
        break;
        
      case 'renameMailbox':
        const renameResult = await emailService.renameMailbox(data.oldPath, data.newPath);
        return res.json({ success: true, newPath: renameResult.newPath });
    }
    
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as actionsRouter };
