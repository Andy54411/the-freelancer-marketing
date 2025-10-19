import { NextRequest, NextResponse } from 'next/server';
import { storage, auth } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION: Prüfe Authorization Header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    let decodedToken;

    try {
      if (!auth) {
        return NextResponse.json({ error: 'Auth not available' }, { status: 500 });
      }
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // 2. URL VALIDATION: Strenge Validierung
    if (!url.includes('firebasestorage.googleapis.com/v0/b/tilvo-f142f.firebasestorage.app')) {
      return NextResponse.json(
        { error: 'Invalid URL - only our Firebase Storage URLs allowed' },
        { status: 400 }
      );
    }

    // 3. PATH AUTHORIZATION: Extrahiere und validiere Storage-Pfad
    const match = url.match(/\/o\/(.+?)\?/);
    if (!match || !match[1]) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    let storagePath = decodeURIComponent(match[1]);
    if (storagePath.includes('%')) {
      storagePath = decodeURIComponent(storagePath);
    }

    // 4. ACCESS CONTROL: Prüfe ob User Zugriff auf diese Datei hat
    const userId = decodedToken.uid;

    // Erlaubte Pfad-Muster für den User
    const allowedPatterns = [
      `expense-receipts/${userId}/`,
      `companies/${userId}/`,
      `user_uploads/${userId}/`,
    ];

    const hasAccess = allowedPatterns.some(pattern => storagePath.startsWith(pattern));

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this file' }, { status: 403 });
    }

    // Prüfe ob storage verfügbar ist
    if (!storage) {
      return NextResponse.json({ error: 'Firebase Storage not available' }, { status: 500 });
    }

    // Generiere eine neue Download-URL mit Admin-Berechtigung
    try {
      // Extrahiere den Storage-Pfad aus der URL
      const match = url.match(/\/o\/(.+?)\?/);
      if (match && match[1]) {
        // Doppelte URL-Dekodierung für richtige Pfade
        let storagePath = decodeURIComponent(match[1]);
        // Falls der Pfad noch URL-enkodiert ist, nochmal dekodieren
        if (storagePath.includes('%')) {
          storagePath = decodeURIComponent(storagePath);
        }

        console.log('PDF Proxy: Extracted storage path:', storagePath);

        // Verwende Admin Storage API
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);

        // Prüfe ob die Datei existiert
        const [exists] = await file.exists();
        console.log('PDF Proxy: File exists:', exists);

        if (!exists) {
          return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
        }

        // Generiere eine signierte URL für den Download
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        // Fetch die PDF mit der signierten URL
        const response = await fetch(signedUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/pdf,*/*',
          },
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
            { status: response.status }
          );
        }

        const pdfBuffer = await response.arrayBuffer();

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.byteLength.toString(),
            'Content-Disposition': 'inline',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } else {
        // Fallback: direkte URL verwenden
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/pdf,*/*',
          },
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
            { status: response.status }
          );
        }

        const pdfBuffer = await response.arrayBuffer();

        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.byteLength.toString(),
            'Content-Disposition': 'inline',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (storageError) {
      return NextResponse.json({ error: 'Failed to access Firebase Storage' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error while fetching PDF' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
