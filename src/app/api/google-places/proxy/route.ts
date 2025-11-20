import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Places API Proxy
 * CRITICAL: Google Places API kann nicht direkt vom Client aufgerufen werden (CORS)
 * Dieser Proxy ermöglicht sichere Server-Side API-Aufrufe
 */
export async function POST(request: NextRequest) {
  try {
    const { endpoint, params } = await request.json();

    // CRITICAL: Use server-side API key (with IP restrictions, NOT referer restrictions)
    // Client-side keys with referer restrictions are NOT supported by Places Text Search API
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_Maps_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API Key nicht konfiguriert' },
        { status: 500 }
      );
    }

    // Build URL with params
    const url = new URL(endpoint);
    Object.entries(params || {}).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return NextResponse.json(
        { error: `Google Places API Error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Google Places Proxy Error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Google Places Daten',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
