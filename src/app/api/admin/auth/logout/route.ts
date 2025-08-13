// Admin Logout API
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // In einer echten Implementierung würden Sie hier Session/Token invalidieren

    return NextResponse.json({
      success: true,
      message: 'Erfolgreich abgemeldet',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout-Fehler' }, { status: 500 });
  }
}
