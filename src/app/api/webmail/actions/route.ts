import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const ActionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  uid: z.number(),
  action: z.enum(['markRead', 'markUnread', 'delete', 'move']),
  targetMailbox: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, mailbox, uid, action, targetMailbox } = ActionSchema.parse(body);

    const emailService = createEmailService({ email, password });

    switch (action) {
      case 'markRead':
        await emailService.markAsRead(mailbox, uid, true);
        break;
      case 'markUnread':
        await emailService.markAsRead(mailbox, uid, false);
        break;
      case 'delete':
        await emailService.deleteMessage(mailbox, uid);
        break;
      case 'move':
        if (!targetMailbox) {
          return NextResponse.json(
            { success: false, error: 'Target mailbox required for move action' },
            { status: 400 }
          );
        }
        await emailService.moveMessage(mailbox, uid, targetMailbox);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to perform action';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
