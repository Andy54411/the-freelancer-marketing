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

const FlagSchema = BaseSchema.extend({
  action: z.literal('flag'),
  uid: z.number(),
  flagged: z.boolean().default(true),
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
  FlagSchema,
  DeleteSchema,
  MoveSchema,
  CreateMailboxSchema,
  DeleteMailboxSchema,
  RenameMailboxSchema,
]);

router.post('/', async (req, res) => {
  try {
    console.log('[ACTIONS] Request body:', JSON.stringify(req.body, null, 2));
    const data = ActionSchema.parse(req.body);
    console.log('[ACTIONS] Parsed action:', data.action);
    const emailService = new EmailService({ email: data.email, password: data.password });
    
    switch (data.action) {
      case 'markRead':
        await emailService.markAsRead(data.mailbox, data.uid, data.read);
        break;
        
      case 'markUnread':
        await emailService.markAsRead(data.mailbox, data.uid, false);
        break;
        
      case 'flag':
        await emailService.markAsFlagged(data.mailbox, data.uid, data.flagged);
        break;
        
      case 'delete':
        await emailService.deleteMessage(data.mailbox, data.uid);
        break;
        
      case 'move':
        await emailService.moveMessage(data.mailbox, data.uid, data.targetMailbox);
        break;
        
      case 'createMailbox':
        console.log('[ACTIONS] Creating mailbox:', data.name);
        const createResult = await emailService.createMailbox(data.name);
        console.log('[ACTIONS] Mailbox created:', createResult);
        return res.json({ success: true, path: createResult.path });
        
      case 'deleteMailbox':
        console.log('[ACTIONS] Deleting mailbox:', data.path);
        await emailService.deleteMailbox(data.path);
        console.log('[ACTIONS] Mailbox deleted');
        break;
        
      case 'renameMailbox':
        console.log('[ACTIONS] Renaming mailbox:', data.oldPath, '->', data.newPath);
        const renameResult = await emailService.renameMailbox(data.oldPath, data.newPath);
        return res.json({ success: true, newPath: renameResult.newPath });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ACTIONS] Error:', error);
    const message = error instanceof Error ? error.message : 'Action failed';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as actionsRouter };
