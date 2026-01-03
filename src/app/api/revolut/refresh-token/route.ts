/**
 * POST /api/revolut/refresh-token
 * 
 * Erneuert den Revolut Access Token via Hetzner Proxy.
 * Alle Revolut API-Aufrufe laufen ueber Hetzner (IP-Whitelist).
 */

import { NextResponse } from 'next/server';
import { refreshTokenViaProxy } from '@/lib/revolut-hetzner-proxy';

export async function POST() {
  try {
    const result = await refreshTokenViaProxy();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Token-Refresh fehlgeschlagen',
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      access_token: result.access_token,
      expires_in: result.expires_in,
      message: 'Token erfolgreich erneuert via Hetzner Proxy',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Revolut Token Refresh API (via Hetzner Proxy)',
    usage: 'POST /api/revolut/refresh-token',
    note: 'Alle Revolut-Aufrufe laufen ueber Hetzner wegen IP-Whitelist',
  });
}
