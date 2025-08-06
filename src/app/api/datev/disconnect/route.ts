/**
 * DATEV Disconnect API Route
 * Clears HTTP-only token cookies for DATEV disconnection
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatevCookieName } from '@/lib/datev-server-utils';

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'missing_company_id', message: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('[DATEV Disconnect] Clearing tokens for company:', companyId);

    // Clear the HTTP-only token cookie
    const cookieStore = await cookies();
    const cookieName = getDatevCookieName(companyId);

    const response = NextResponse.json({
      success: true,
      message: 'DATEV-Verbindung getrennt',
      timestamp: Date.now(),
    });

    // Clear the DATEV token cookie by setting it to expire
    response.cookies.set(cookieName, '', {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    console.log('✅ [DATEV Disconnect] Token cookie cleared for company:', companyId);

    return response;
  } catch (error) {
    console.error('❌ [DATEV Disconnect] Error:', error);
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'Serverfehler beim Trennen der Verbindung',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
