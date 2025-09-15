import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // IP aus verschiedenen Headers extrahieren
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const cfConnecting = request.headers.get('cf-connecting-ip');
    
    let ip = forwarded?.split(',')[0]?.trim() || 
             real || 
             cfConnecting || 
             'unknown';

    // Fallback für Development (localhost)
    if (ip === '::1' || ip === '127.0.0.1') {
      ip = 'localhost';
    }

    return NextResponse.json({ ip });
  } catch (error) {
    console.error('IP detection error:', error);
    return NextResponse.json({ ip: 'unknown' });
  }
}