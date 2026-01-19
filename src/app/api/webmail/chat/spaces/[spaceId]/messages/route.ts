import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * API Route für Chat Nachrichten - Proxy zu Hetzner Backend
 * 
 * GET  - Nachrichten abrufen
 * POST - Nachricht senden
 */

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const EncryptedMessageSchema = z.object({
  ciphertext: z.string(),
  iv: z.string(),
  salt: z.string(),
  senderPublicKey: z.string(),
}).optional();

const SendMessageSchema = z.object({
  senderEmail: z.string().email(),
  senderName: z.string().optional(),
  content: z.string().min(1),
  encrypted: EncryptedMessageSchema,
  isEncrypted: z.boolean().optional().default(false),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
    size: z.number(),
    url: z.string(),
  })).optional().default([]),
  threadId: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const limit = searchParams.get('limit') || '50';
    const before = searchParams.get('before');
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail erforderlich' },
        { status: 400 }
      );
    }

    const queryParams = new URLSearchParams({ limit });
    if (before) queryParams.append('before', before);

    const response = await fetch(
      `${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}/messages?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
          'X-User-Email': email,
        },
      }
    );

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Abrufen der Nachrichten' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      messages: data.messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const body = await request.json();
    const { senderEmail, senderName, content, encrypted, isEncrypted, attachments, threadId } = SendMessageSchema.parse(body);

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/chat/spaces/${spaceId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
        'X-User-Email': senderEmail,
      },
      body: JSON.stringify({ 
        content, 
        senderName,
        encrypted,
        isEncrypted,
        attachments, 
        threadId 
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Fehler beim Senden der Nachricht' },
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
