import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${WEBMAIL_API_URL}/api/drive/shares/token/${token}`, {
      headers: {
        'X-API-Key': WEBMAIL_API_KEY || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Serverfehler', details: (error as Error).message },
      { status: 500 }
    );
  }
}
