import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    // CORS Headers setzen
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers });
    }

    // Verify token
    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403, headers });
    }

    // Get providerId from query params
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId parameter' }, { status: 400, headers });
    }

    // Authorization check - user can only access their own orders
    if (decodedToken.uid !== providerId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403, headers });
    }

    // Make request to Firebase Function with proper headers
    const functionUrl = `https://europe-west1-tilvo-f142f.cloudfunctions.net/getProviderOrders?providerId=${providerId}`;

    const response = await fetch(functionUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Origin: 'https://taskilo.de',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Firebase Function error: ${response.status}`,
          details: errorText,
        },
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers });
  } catch (error: any) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new NextResponse(null, { status: 200, headers });
}
