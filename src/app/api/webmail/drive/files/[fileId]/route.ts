import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// GET /api/webmail/drive/files/[fileId] - Datei herunterladen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // User ID aus Header oder Cookie holen
    let userId = request.headers.get('x-user-id');
    if (!userId) {
      const sessionCookie = request.cookies.get('webmail_session')?.value;
      if (sessionCookie) {
        try {
          const parsed = JSON.parse(atob(sessionCookie));
          userId = parsed.email;
        } catch {
          // Ignore parse error
        }
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/files/${fileId}`, {
      method: 'GET',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userId,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Binary Response weiterleiten
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PATCH /api/webmail/drive/files/[fileId] - Datei umbenennen/verschieben
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/files/${fileId}`, {
      method: 'PATCH',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userId || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

// DELETE /api/webmail/drive/files/[fileId] - Datei loeschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const userId = request.headers.get('x-user-id');
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userId || '',
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
