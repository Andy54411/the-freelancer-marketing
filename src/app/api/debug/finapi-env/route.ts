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
    message: 'Environment variables status shown above',
    note: 'Hardcoded credentials removed for security',
    instructions: [
      '1. Set FINAPI_SANDBOX_CLIENT_ID in Vercel environment variables',
      '2. Set FINAPI_SANDBOX_CLIENT_SECRET in Vercel environment variables',
      '3. Set FINAPI_ADMIN_CLIENT_ID in Vercel environment variables',
      '4. Set FINAPI_ADMIN_CLIENT_SECRET in Vercel environment variables',
      '5. Restart the application',
    ],
  });
}
