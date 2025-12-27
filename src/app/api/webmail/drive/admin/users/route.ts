import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// GET /api/webmail/drive/admin/users - Alle Drive-Nutzer
export async function GET(request: NextRequest) {
  try {
    // TODO: Admin-Authentifizierung pruefen
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/admin/users?limit=${limit}&offset=${offset}`, {
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
