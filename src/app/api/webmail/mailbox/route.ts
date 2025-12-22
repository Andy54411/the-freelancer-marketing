import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createEmailService } from '@/services/webmail/WebmailProxyClient';

const CreateMailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().min(1).max(100),
});

const DeleteMailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  path: z.string().min(1),
});

const RenameMailboxSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  oldPath: z.string().min(1),
  newPath: z.string().min(1),
});

// Create a new mailbox/label
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = CreateMailboxSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const result = await emailService.createMailbox(name);

    return NextResponse.json({
      success: true,
      path: result.path,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create mailbox';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Delete a mailbox/label
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, path } = DeleteMailboxSchema.parse(body);

    const emailService = createEmailService({ email, password });
    await emailService.deleteMailbox(path);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete mailbox';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Rename a mailbox/label
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, oldPath, newPath } = RenameMailboxSchema.parse(body);

    const emailService = createEmailService({ email, password });
    const result = await emailService.renameMailbox(oldPath, newPath);

    return NextResponse.json({
      success: true,
      newPath: result.newPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rename mailbox';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
