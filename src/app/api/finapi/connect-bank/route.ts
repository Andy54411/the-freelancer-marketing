// src/app/api/finapi/connect-bank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';

export async function POST(req: NextRequest) {
  try {
    const { userId, bankId, credentialType = 'sandbox' } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    console.log(
      'Connecting bank for user:',
      userId,
      'bank:',
      bankId,
      'credential type:',
      credentialType
    );

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // Test credentials first
    const credentialTest = await finapiService.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'finAPI credentials test failed',
          details: credentialTest.error,
        },
        { status: 500 }
      );
    }

    // Define redirect URL for after finAPI Web Form
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/dashboard/company/${userId}/finance/banking/callback`;

    // For now, return not implemented due to user authentication requirements
    // TODO: Implement bank connection when user authentication system is ready
    return NextResponse.json(
      {
        success: false,
        error: 'Bank connection not implemented',
        message: 'User authentication system required for bank connections',
        needsImplementation: {
          userToken: 'Requires getUserToken method for user authentication',
          webFormIntegration: 'Requires WebForm 2.0 integration for bank connection',
          bankConnectionAPI: 'Requires bank connection creation via SDK service',
        },
        redirectUrl: redirectUrl, // Return for reference
        bankId: bankId,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Fehler beim Starten der Bankverbindung:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    return NextResponse.json(
      { error: 'Fehler beim Verbinden der Bank.', details: errorMessage },
      { status: 500 }
    );
  }
}
