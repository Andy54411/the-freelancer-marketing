// Newsletter Campaigns API - Proxy zu Hetzner
import { NextRequest, NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

// GET - Liste aller Kampagnen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const path = queryString ? `/api/newsletter/campaigns?${queryString}` : '/api/newsletter/campaigns';
    
    const { data, status } = await proxyToHetzner(path);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Newsletter-Service nicht erreichbar' },
      { status: 503 }
    );
  }
}

// POST - Neue Kampagne erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, status } = await proxyToHetzner('/api/newsletter/campaigns', {
      method: 'POST',
      body,
    });
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Newsletter-Service nicht erreichbar' },
      { status: 503 }
    );
  }
}
