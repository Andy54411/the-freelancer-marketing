import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validiere dass es eine Firebase Storage URL ist
    if (
      !url.includes('firebasestorage.googleapis.com') &&
      !url.includes('firebase.googleapis.com')
    ) {
      return NextResponse.json(
        { error: 'Invalid URL - only Firebase Storage URLs allowed' },
        { status: 400 }
      );
    }

    console.log('Fetching PDF from:', url);

    // Fetch die PDF von Firebase Storage
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf,*/*',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch PDF:', response.status, response.statusText);
      return NextResponse.json(
        {
          error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    // Return die PDF mit korrekten CORS-Headern
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
    });
  } catch (error) {
    console.error('PDF Proxy Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error while fetching PDF',
      },
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
