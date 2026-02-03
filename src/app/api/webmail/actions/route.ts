import { NextRequest, NextResponse } from 'next/server';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';
import { z } from 'zod';

const HETZNER_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';

const ActionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  uid: z.number().optional(),
  uids: z.array(z.number()).optional(),
  action: z.enum(['markRead', 'markUnread', 'delete', 'permanentDelete', 'move', 'flag', 'saveDraft', 'bulkDelete', 'bulkPermanentDelete']),
  targetMailbox: z.string().optional(),
  flagged: z.boolean().optional(),
  draft: z.object({
    to: z.union([z.string(), z.array(z.string())]).optional(),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),
    subject: z.string().default(''),
    text: z.string().optional(),
    html: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = ActionSchema.parse(body);
    const { email, password, mailbox, uid, action, targetMailbox, flagged, draft } = data;
    const uids = data.uids;

    // saveDraft direkt an Hetzner-Proxy weiterleiten
    if (action === 'saveDraft') {
      if (!draft) {
        return NextResponse.json(
          { success: false, error: 'Draft data required for saveDraft action' },
          { status: 400 }
        );
      }

      const response = await fetch(`${HETZNER_API_URL}/api/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.WEBMAIL_API_KEY || 'taskilo-webmail-secret-key-change-in-production',
        },
        body: JSON.stringify({
          email,
          password,
          action: 'saveDraft',
          draft,
        }),
      });

      const result = await response.json();
      return NextResponse.json(result, { status: response.ok ? 200 : 500 });
    }

    // bulkDelete, bulkPermanentDelete und permanentDelete direkt an Hetzner-Proxy weiterleiten
    if (action === 'bulkDelete' || action === 'bulkPermanentDelete') {
      if (!uids || uids.length === 0) {
        return NextResponse.json(
          { success: false, error: 'UIDs array required for bulk actions' },
          { status: 400 }
        );
      }

      const response = await fetch(`${HETZNER_API_URL}/api/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.WEBMAIL_API_KEY || 'taskilo-webmail-secret-key-change-in-production',
        },
        body: JSON.stringify({
          email,
          password,
          mailbox,
          action,
          uids,
        }),
      });

      const result = await response.json();
      return NextResponse.json(result, { status: response.ok ? 200 : 500 });
    }

    // permanentDelete direkt an Hetzner-Proxy weiterleiten
    if (action === 'permanentDelete') {
      if (uid === undefined) {
        return NextResponse.json(
          { success: false, error: 'UID required for permanentDelete action' },
          { status: 400 }
        );
      }

      const response = await fetch(`${HETZNER_API_URL}/api/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.WEBMAIL_API_KEY || 'taskilo-webmail-secret-key-change-in-production',
        },
        body: JSON.stringify({
          email,
          password,
          mailbox,
          action: 'permanentDelete',
          uid,
        }),
      });

      const result = await response.json();
      return NextResponse.json(result, { status: response.ok ? 200 : 500 });
    }

    // Andere Aktionen erfordern uid
    if (uid === undefined) {
      return NextResponse.json(
        { success: false, error: 'UID required for this action' },
        { status: 400 }
      );
    }

    const emailService = createEmailService({ email, password });

    switch (action) {
      case 'markRead':
        await emailService.markAsRead(mailbox, uid, true);
        break;
      case 'markUnread':
        await emailService.markAsRead(mailbox, uid, false);
        break;
      case 'flag':
        await emailService.markAsFlagged(mailbox, uid, flagged ?? true);
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
