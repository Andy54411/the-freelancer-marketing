import { NextResponse } from 'next/server';

/**
 * DATEV Debug Credentials Endpoint
 * Überprüft die DATEV Credentials in Production
 */
export async function GET() {
  try {
    const credentials = {
      clientId: process.env.DATEV_CLIENT_ID,
      clientSecret: process.env.DATEV_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    console.log('DATEV Credentials Debug:', credentials);

    return NextResponse.json({
      success: true,
      credentials,
      message: 'Debug info logged to console',
    });
  } catch (error) {
    console.error('Debug credentials error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
