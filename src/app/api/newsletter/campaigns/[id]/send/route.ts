// Newsletter Campaign Send API - Proxy zu Hetzner
import { NextRequest, NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { data, status } = await proxyToHetzner(`/api/newsletter/campaigns/${id}/send`, { method: 'POST', body });
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ success: false, error: 'Newsletter-Service nicht erreichbar' }, { status: 503 });
  }
}
