import { NextRequest, NextResponse } from 'next/server';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

// GET /api/webmail/drive/files/[fileId]/thumbnail - Bild-Thumbnail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // Get user from cookie
    const sessionCookie = request.cookies.get('webmail_session')?.value;
    let userEmail = '';
    
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(atob(sessionCookie));
        userEmail = parsed.email;
      } catch {
        // Ignore parse error
      }
    }
    
    // Also check header
    const headerUserId = request.headers.get('x-user-id');
    if (headerUserId && !userEmail) {
      userEmail = headerUserId;
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get thumbnail from Hetzner server
    const response = await fetch(`${WEBMAIL_PROXY_URL}/api/drive/files/${fileId}/thumbnail`, {
      method: 'GET',
      headers: {
        'x-api-key': WEBMAIL_API_KEY,
        'x-user-id': userEmail,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Thumbnail not found' },
        { status: response.status }
      );
    }

    // Get content type
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Stream the thumbnail back
    const blob = await response.blob();
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
