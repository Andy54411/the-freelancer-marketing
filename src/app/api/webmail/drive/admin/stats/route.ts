import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// GET /api/webmail/drive/admin/stats - Admin Statistiken
export async function GET(_request: NextRequest) {
  try {
    // TODO: Admin-Authentifizierung pruefen
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/admin/stats`, {
      method: 'GET',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
