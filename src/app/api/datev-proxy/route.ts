import { NextRequest, NextResponse } from 'next/server';

/**
 * DATEV OAuth Proxy Handler
 * Proxies callbacks from http://localhost to our cookie callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Forward all query parameters to our cookie callback
    const callbackUrl = new URL('/api/datev/callback-cookie', request.url);
    searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });

    return NextResponse.redirect(callbackUrl.toString());
  } catch (error) {
    const fallbackUrl = new URL('/dashboard', request.url);
    fallbackUrl.searchParams.set('error', 'proxy_error');
    fallbackUrl.searchParams.set('message', 'Failed to proxy DATEV callback');

    return NextResponse.redirect(fallbackUrl.toString());
  }
}
