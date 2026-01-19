import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API Route für einzelne Chat Spaces - Proxy zu Hetzner Backend
 * 
 * GET    - Space abrufen
 * PUT    - Space aktualisieren
 * DELETE - Space löschen
 */

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const UpdateSpaceSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(128).optional(),
  emoji: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Abrufen des Spaces' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      space: data.space,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const body = await request.json();
    const { email, name, emoji, description } = UpdateSpaceSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
      body: JSON.stringify({ name, emoji, description }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Aktualisieren des Spaces' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      space: data.space,
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
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': email,
      },
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Löschen des Spaces' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
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
