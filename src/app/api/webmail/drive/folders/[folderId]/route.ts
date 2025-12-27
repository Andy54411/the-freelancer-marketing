import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// GET /api/webmail/drive/folders/[folderId] - Ordner-Details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const userId = request.headers.get('x-user-id');
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/folders/${folderId}/contents`, {
      method: 'GET',
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

// PATCH /api/webmail/drive/folders/[folderId] - Ordner umbenennen/verschieben
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/folders/${folderId}`, {
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

// DELETE /api/webmail/drive/folders/[folderId] - Ordner loeschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const userId = request.headers.get('x-user-id');
    
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/folders/${folderId}`, {
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
