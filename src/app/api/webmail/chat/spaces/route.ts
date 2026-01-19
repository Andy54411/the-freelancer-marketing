import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API Route für Chat Spaces - Proxy zu Hetzner Backend
 * 
 * GET  - Alle Spaces abrufen
 * POST - Neuen Space erstellen
 */

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const GetSpacesSchema = z.object({
  email: z.string().email(),
});

const CreateSpaceSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(128),
  emoji: z.string().optional().default('😀'),
  description: z.string().optional().default(''),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail erforderlich' },
        { status: 400 }
      );
    }

    GetSpacesSchema.parse({ email });

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces`, {
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
        { success: false, error: data.error || 'Fehler beim Abrufen der Spaces' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      spaces: data.spaces,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, emoji, description } = CreateSpaceSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces`, {
      method: 'POST',
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
        { success: false, error: data.error || 'Fehler beim Erstellen des Spaces' },
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
