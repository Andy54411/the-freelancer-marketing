/**
 * Webmail Attachment Download API
 * 
 * Leitet Attachment-Anfragen an den Hetzner-Proxy weiter
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const DownloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  uid: z.number().int().positive(),
  partId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = DownloadSchema.parse(body);

    // Anfrage an Hetzner-Proxy weiterleiten
    const proxyResponse = await fetch(`${WEBMAIL_PROXY_URL}/api/attachments/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WEBMAIL_API_KEY,
      },
      body: JSON.stringify(validated),
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.error || 'Download fehlgeschlagen',
      }, { status: proxyResponse.status });
    }

    // Prüfen ob es ein JSON-Fehler ist
    const contentType = proxyResponse.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await proxyResponse.json();
      return NextResponse.json({
        success: false,
        error: errorData.error || 'Download fehlgeschlagen',
      }, { status: 400 });
    }

    // Binary-Daten zurückgeben
    const data = await proxyResponse.arrayBuffer();
    const filename = proxyResponse.headers.get('content-disposition')
      ?.match(/filename="([^"]+)"/)?.[1] || 'attachment';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': proxyResponse.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(decodeURIComponent(filename))}"`,
        'Content-Length': data.byteLength.toString(),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: error.errors,
      }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Download fehlgeschlagen';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
