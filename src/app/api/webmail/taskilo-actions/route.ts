import { NextRequest, NextResponse } from 'next/server';
import { createMasterUserEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

/**
 * API Route für Taskilo E-Mail Actions - nutzt Master User Authentifizierung.
 * Unterstützt: markRead, markUnread, flag, delete, move
 */

const BaseSchema = z.object({
  email: z.string().email().refine(
    (email) => email.endsWith('@taskilo.de'),
    { message: 'Nur Taskilo E-Mail-Adressen erlaubt' }
  ),
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

const ActionSchema = z.discriminatedUnion('action', [
  MarkReadSchema,
  MarkUnreadSchema,
  FlagSchema,
  DeleteSchema,
  MoveSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = ActionSchema.parse(body);

    const emailService = createMasterUserEmailService(data.email);

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

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
