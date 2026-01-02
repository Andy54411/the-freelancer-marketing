// Newsletter Track Click API - Proxy zu Hetzner
import { NextRequest, NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const queryString = searchParams.toString();
    const path = queryString ? `/api/newsletter/track/click?${queryString}` : '/api/newsletter/track/click';
    
    await proxyToHetzner(path);
    
    // Redirect zur Ziel-URL
    if (url) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ success: true });
  } catch {
    // Bei Fehler zur Ziel-URL weiterleiten wenn vorhanden
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (url) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ success: false, error: 'Tracking failed' }, { status: 500 });
  }
}
