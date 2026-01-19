import { Router } from 'express';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();

const BaseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
});

// Master User Base Schema - kein Passwort erforderlich
const MasterBaseSchema = z.object({
  email: z.string().email(),
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

const BulkDeleteSchema = BaseSchema.extend({
  action: z.literal('bulkDelete'),
  uids: z.array(z.number()).min(1),
});

const BulkPermanentDeleteSchema = BaseSchema.extend({
  action: z.literal('bulkPermanentDelete'),
  uids: z.array(z.number()).min(1),
});

const PermanentDeleteSchema = BaseSchema.extend({
  action: z.literal('permanentDelete'),
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

const SaveDraftSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.literal('saveDraft'),
  draft: z.object({
    to: z.union([z.string(), z.array(z.string())]).optional(),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
    subject: z.string().default(''),
    text: z.string().optional(),
    html: z.string().optional(),
  }),
});

const DeleteDraftSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  action: z.literal('deleteDraft'),
  uid: z.number(),
});

// Master User Schemas
const MarkReadMasterSchema = MasterBaseSchema.extend({
  action: z.literal('markRead'),
  uid: z.number(),
  read: z.boolean().default(true),
});

const MarkUnreadMasterSchema = MasterBaseSchema.extend({
  action: z.literal('markUnread'),
  uid: z.number(),
});

const FlagMasterSchema = MasterBaseSchema.extend({
  action: z.literal('flag'),
  uid: z.number(),
  flagged: z.boolean().default(true),
});

const DeleteMasterSchema = MasterBaseSchema.extend({
  action: z.literal('delete'),
  uid: z.number(),
});

const MoveMasterSchema = MasterBaseSchema.extend({
  action: z.literal('move'),
  uid: z.number(),
  targetMailbox: z.string(),
});

const ActionSchema = z.discriminatedUnion('action', [
  MarkReadSchema,
  MarkUnreadSchema,
  FlagSchema,
  DeleteSchema,
  BulkDeleteSchema,
  BulkPermanentDeleteSchema,
  PermanentDeleteSchema,
  MoveSchema,
  CreateMailboxSchema,
  DeleteMailboxSchema,
  RenameMailboxSchema,
  SaveDraftSchema,
  DeleteDraftSchema,
]);

const MasterActionSchema = z.discriminatedUnion('action', [
  MarkReadMasterSchema,
  MarkUnreadMasterSchema,
  FlagMasterSchema,
  DeleteMasterSchema,
  MoveMasterSchema,
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
        
      case 'bulkDelete':
        console.log('[ACTIONS] Bulk deleting', data.uids.length, 'messages');
        const bulkResult = await emailService.bulkDeleteMessages(data.mailbox, data.uids);
        return res.json({ success: true, deleted: bulkResult.deleted });
        
      case 'bulkPermanentDelete':
        console.log('[ACTIONS] Bulk permanently deleting', data.uids.length, 'messages');
        const bulkPermResult = await emailService.bulkPermanentlyDeleteMessages(data.mailbox, data.uids);
        return res.json({ success: true, deleted: bulkPermResult.deleted });
        
      case 'permanentDelete':
        console.log('[ACTIONS] Permanently deleting message:', data.uid);
        await emailService.permanentlyDeleteMessage(data.mailbox, data.uid);
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

      case 'saveDraft':
        console.log('[ACTIONS] Saving draft');
        const draftResult = await emailService.saveDraft(data.draft);
        return res.json({ success: true, uid: draftResult.uid });

      case 'deleteDraft':
        console.log('[ACTIONS] Deleting draft:', data.uid);
        await emailService.deleteDraft(data.uid);
        break;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ACTIONS] Error:', error);
    const message = error instanceof Error ? error.message : 'Action failed';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Master User Actions Route - kein Benutzer-Passwort erforderlich.
 * Unterstützt: markRead, markUnread, flag, delete, move
 */
router.post('/master', async (req, res) => {
  try {
    console.log('[ACTIONS/MASTER] Request body:', JSON.stringify(req.body, null, 2));
    const data = MasterActionSchema.parse(req.body);
    
    if (!data.email.endsWith('@taskilo.de')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Master User Zugriff nur für Taskilo E-Mails erlaubt' 
      });
    }
    
    console.log('[ACTIONS/MASTER] Parsed action:', data.action);
    const emailService = EmailService.withMasterUser(data.email);
    
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
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[ACTIONS/MASTER] Error:', error);
    const message = error instanceof Error ? error.message : 'Action failed';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as actionsRouter };
