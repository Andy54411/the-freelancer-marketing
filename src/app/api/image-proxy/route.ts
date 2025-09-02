import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');

    if (!imagePath) {
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
    }

    // Dekodiere den Pfad falls nötig
    const decodedPath = decodeURIComponent(imagePath);

    // Entferne das Storage-Bucket-Prefix falls vorhanden
    const cleanPath = decodedPath
      .replace('https://storage.googleapis.com/tilvo-f142f-storage/', '')
      .replace('gs://tilvo-f142f-storage/', '');

    console.log('🖼️ Image Proxy - Loading:', { originalPath: imagePath, cleanPath });

    // Verwende direkte Google Cloud Storage URL anstatt Firebase Admin
    const directUrl = `https://storage.googleapis.com/tilvo-f142f-storage/${cleanPath}`;

    console.log('🖼️ Image Proxy - Direct URL:', directUrl);

    // Lade das Bild direkt von der Google Cloud Storage URL
    const response = await fetch(directUrl);

    if (!response.ok) {
      console.error('🖼️ Image Proxy - HTTP Error:', response.status, response.statusText);
      return NextResponse.json(
        {
          error: 'Image not found',
          status: response.status,
          statusText: response.statusText,
          url: directUrl,
        },
        { status: response.status }
      );
    }

    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log('🖼️ Image Proxy - Success:', {
      cleanPath,
      contentType,
      size: imageData.byteLength,
    });

    // Gebe das Bild zurück
    return new NextResponse(new Uint8Array(imageData), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('🖼️ Image Proxy - Error:', error, {
      errorInfo:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    });

    return NextResponse.json(
      {
        error: 'Failed to load image',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
