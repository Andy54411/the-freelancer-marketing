/**
 * GET /api/revolut/accounts
 * 
 * Holt Revolut Konten via Hetzner Proxy.
 * Alle Revolut API-Aufrufe laufen ueber Hetzner (IP-Whitelist).
 */

import { NextResponse } from 'next/server';
import { getAccountsViaProxy } from '@/lib/revolut-hetzner-proxy';

export async function GET() {
  try {
    const result = await getAccountsViaProxy();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Konten-Abfrage fehlgeschlagen',
        accounts: [],
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      accounts: result.data,
      count: result.count,
      source: 'hetzner-proxy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
      accounts: [],
    }, { status: 500 });
  }
}
