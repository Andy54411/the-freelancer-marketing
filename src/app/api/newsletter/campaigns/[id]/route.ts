// Newsletter Campaign by ID API - Proxy zu Hetzner
import { NextRequest, NextResponse } from 'next/server';
import { proxyToHetzner } from '@/lib/newsletter-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, status } = await proxyToHetzner(`/api/newsletter/campaigns/${id}`);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ success: false, error: 'Newsletter-Service nicht erreichbar' }, { status: 503 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, status } = await proxyToHetzner(`/api/newsletter/campaigns/${id}`, { method: 'PUT', body });
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ success: false, error: 'Newsletter-Service nicht erreichbar' }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, status } = await proxyToHetzner(`/api/newsletter/campaigns/${id}`, { method: 'DELETE' });
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ success: false, error: 'Newsletter-Service nicht erreichbar' }, { status: 503 });
  }
}
