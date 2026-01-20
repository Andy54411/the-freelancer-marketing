import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// POST /api/webmail/drive/shares - Neue Freigabe erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID erforderlich' },
        { status: 400 }
      );
    }

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/shares`, {
      method: 'POST',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetEmail: body.targetEmail,
        fileId: body.fileId,
        folderId: body.folderId,
        permission: body.permission,
        message: body.message,
      }),
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

// GET /api/webmail/drive/shares - Meine Freigaben abrufen
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'my-shares';
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID erforderlich' },
        { status: 400 }
      );
    }

    let endpoint = 'my-shares';
    if (type === 'pending') {
      endpoint = 'pending';
    } else if (type === 'shared-with-me') {
      endpoint = 'shared-with-me';
    }

    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/shares/${endpoint}`, {
      method: 'GET',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userId,
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
