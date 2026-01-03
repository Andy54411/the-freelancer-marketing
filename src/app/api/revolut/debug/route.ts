/**
 * GET /api/revolut/debug
 * 
 * Debug-Info fuer Revolut Integration via Hetzner Proxy.
 */

import { NextResponse } from 'next/server';
import { getHealthViaProxy } from '@/lib/revolut-hetzner-proxy';

export async function GET() {
  try {
    const result = await getHealthViaProxy();
    
    return NextResponse.json({
      success: true,
      hetznerProxy: result.data,
      vercelConfig: {
        hasWebmailApiKey: !!process.env.WEBMAIL_API_KEY,
        environment: process.env.NODE_ENV,
      },
      info: 'Alle Revolut-Aufrufe laufen ueber Hetzner wegen IP-Whitelist',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
