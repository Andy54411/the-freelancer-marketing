import { NextResponse } from 'next/server';

/**
 * DATEV Credentials Test Endpoint
 * Überprüft ob Client ID und Secret korrekt konfiguriert sind
 */
export async function GET() {
  try {
    const clientId = process.env.DATEV_CLIENT_ID;
    const clientSecret = process.env.DATEV_CLIENT_SECRET;

    // Basic validation
    const validation = {
      clientId: {
        exists: !!clientId,
        value: clientId,
        length: clientId?.length || 0,
        isTestId: clientId === '6111ad8e8cae82d1a805950f2ae4adc4',
      },
      clientSecret: {
        exists: !!clientSecret,
        value: clientSecret ? `${clientSecret.substring(0, 8)}...` : null,
        length: clientSecret?.length || 0,
        isEmpty: !clientSecret || clientSecret.trim() === '',
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    console.log('DATEV Credentials Test:', validation);

    return NextResponse.json({
      success: true,
      validation,
      message: 'Credentials validation completed',
      recommendations: [
        validation.clientSecret.isEmpty && 'Client Secret is missing or empty',
        validation.clientId.isTestId &&
          validation.clientSecret.length < 20 &&
          'Test Client ID needs proper sandbox Client Secret',
        !validation.clientId.isTestId && 'Using custom Client ID - ensure matching Client Secret',
      ].filter(Boolean),
    });
  } catch (error) {
    console.error('Credentials test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
