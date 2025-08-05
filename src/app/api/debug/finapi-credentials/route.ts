// src/app/api/debug/finapi-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const credentials = {
      sandbox: {
        clientId: process.env.FINAPI_SANDBOX_CLIENT_ID ? '✅ SET' : '❌ MISSING',
        clientSecret: process.env.FINAPI_SANDBOX_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
        dataDecryptionKey: process.env.FINAPI_SANDBOX_DATA_DECRYPTION_KEY ? '✅ SET' : '❌ MISSING',
      },
      production: {
        clientId: process.env.FINAPI_PRODUCTION_CLIENT_ID ? '✅ SET' : '❌ MISSING',
        clientSecret: process.env.FINAPI_PRODUCTION_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
        dataDecryptionKey: process.env.FINAPI_PRODUCTION_DATA_DECRYPTION_KEY
          ? '✅ SET'
          : '❌ MISSING',
      },
      admin: {
        clientId: process.env.FINAPI_ADMIN_CLIENT_ID ? '✅ SET' : '❌ MISSING',
        clientSecret: process.env.FINAPI_ADMIN_CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
        dataDecryptionKey: process.env.FINAPI_ADMIN_DATA_DECRYPTION_KEY ? '✅ SET' : '❌ MISSING',
      },
      // Show available FINAPI_ variables (masked)
      availableVars: Object.keys(process.env)
        .filter(key => key.startsWith('FINAPI_'))
        .map(key => ({
          name: key,
          hasValue: process.env[key] ? '✅' : '❌',
          length: process.env[key]?.length || 0,
        })),
    };

    return NextResponse.json({
      success: true,
      credentials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error checking finAPI credentials:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check credentials',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
