// Newsletter Track Open API - Proxy zu Hetzner
import { NextRequest, NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const path = queryString ? `/api/newsletter/track/open?${queryString}` : '/api/newsletter/track/open';
    const { data, status } = await proxyToHetzner(path);
    
    // Für Tracking-Pixel: Transparentes 1x1 GIF zurückgeben
    if (status === 200) {
      const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new NextResponse(gif, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }
    return NextResponse.json(data, { status });
  } catch {
    // Immer ein Bild zurückgeben, auch bei Fehlern
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return new NextResponse(gif, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    });
  }
}
