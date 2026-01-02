// Newsletter Analytics API - Proxy zu Hetzner
import { NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

export async function GET() {
  try {
    const { data, status } = await proxyToHetzner('/api/newsletter/analytics');
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Newsletter-Service nicht erreichbar' },
      { status: 503 }
    );
  }
}
