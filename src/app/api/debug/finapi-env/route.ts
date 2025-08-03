import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug Environment Variables für finAPI
 */
export async function GET(req: NextRequest) {
  // Nur in Development verfügbar
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    FINAPI_SANDBOX_CLIENT_ID: process.env.FINAPI_SANDBOX_CLIENT_ID ? 'SET' : 'MISSING',
    FINAPI_SANDBOX_CLIENT_SECRET: process.env.FINAPI_SANDBOX_CLIENT_SECRET ? 'SET' : 'MISSING',
    FINAPI_ADMIN_CLIENT_ID: process.env.FINAPI_ADMIN_CLIENT_ID ? 'SET' : 'MISSING',
    FINAPI_ADMIN_CLIENT_SECRET: process.env.FINAPI_ADMIN_CLIENT_SECRET ? 'SET' : 'MISSING',

    // Zeige erste 4 Zeichen für Debugging
    SANDBOX_CLIENT_ID_PREFIX: process.env.FINAPI_SANDBOX_CLIENT_ID?.substring(0, 8) + '...',
    SANDBOX_CLIENT_SECRET_PREFIX: process.env.FINAPI_SANDBOX_CLIENT_SECRET?.substring(0, 8) + '...',
  };

  return NextResponse.json({
    environment_variables: envVars,
    expected_credentials: {
      sandbox: {
        client_id: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29',
        client_secret: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
      },
      admin: {
        client_id: 'a2d8cf0e-c68c-45fa-b4ad-4184a355094e',
        client_secret: '478a0e66-8c9a-49ee-84cd-e49d87d077c9',
      },
    },
    instructions: [
      '1. Set FINAPI_SANDBOX_CLIENT_ID=ac54e888-8ccf-40ef-9b92-b27c9dc02f29',
      '2. Set FINAPI_SANDBOX_CLIENT_SECRET=73689ad2-95e5-4180-93a2-7209ba6e10aa',
      '3. Set FINAPI_ADMIN_CLIENT_ID=a2d8cf0e-c68c-45fa-b4ad-4184a355094e',
      '4. Set FINAPI_ADMIN_CLIENT_SECRET=478a0e66-8c9a-49ee-84cd-e49d87d077c9',
      '5. Restart the application',
    ],
  });
}
