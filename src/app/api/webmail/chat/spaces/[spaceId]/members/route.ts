import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API Route für Chat Space Mitglieder - Proxy zu Hetzner Backend
 * 
 * POST   - Mitglieder hinzufügen
 * DELETE - Mitglieder entfernen
 */

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const AddMembersSchema = z.object({
  email: z.string().email(),
  members: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    role: z.enum(['admin', 'member']).optional().default('member'),
  })).min(1),
});

const RemoveMembersSchema = z.object({
  email: z.string().email(),
  memberEmails: z.array(z.string().email()).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const body = await request.json();
    const { email, members } = AddMembersSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ members }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Hinzufügen der Mitglieder' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      memberCount: data.memberCount,
      members: data.members,
      addedCount: data.addedCount,
      message: data.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const body = await request.json();
    const { email, memberEmails } = RemoveMembersSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}/members`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ memberEmails }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Entfernen der Mitglieder' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      memberCount: data.memberCount,
      members: data.members,
      removedCount: data.removedCount,
      message: data.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
