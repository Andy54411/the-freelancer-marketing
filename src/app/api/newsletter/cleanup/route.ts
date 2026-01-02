// Newsletter Cleanup API - Proxy zu Hetzner
import { NextRequest, NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { data, status } = await proxyToHetzner('/api/newsletter/cleanup', { method: 'POST', body });
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ success: false, error: 'Newsletter-Service nicht erreichbar' }, { status: 503 });
  }
}
