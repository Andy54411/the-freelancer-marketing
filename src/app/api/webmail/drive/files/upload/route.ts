import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// POST /api/webmail/drive/files/upload - Datei hochladen
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    // FormData weiterleiten
    const formData = await request.formData();
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/files/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userId || '',
      },
      body: formData,
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
