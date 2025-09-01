import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/revolut/sandbox-info
 * Provide sandbox test account information
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Revolut Sandbox Test Account Information',
      testAccounts: {
        business: {
          phoneNumber: '+447240354142',
          passcode: '0000',
          instructions: [
            '1. Use the phone number +447240354142',
            '2. Enter passcode 0000 when prompted',
            '3. Complete the OAuth authorization',
            '4. You will be redirected back to Taskilo',
          ],
        },
        personal: {
          phoneNumber: '+447240354142',
          passcode: '0000',
          note: 'Same credentials for personal account testing',
        },
      },
      environment: 'sandbox',
      clientId: process.env.REVOLUT_CLIENT_ID,
      oauthFlow: {
        authorizeUrl: 'https://sandbox-business.revolut.com/oauth/authorize',
        tokenUrl: 'https://sandbox-business.revolut.com/oauth/token',
        apiBaseUrl: 'https://sandbox-b2b.revolut.com/api',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sandbox info',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
