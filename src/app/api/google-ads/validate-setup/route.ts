// ✅ Google Ads Setup Validation API Route
// Server-side validation der Environment-Variablen

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsSetupValidator } from '@/utils/googleAdsSetupValidator';

export async function GET(request: NextRequest) {
  try {
    // Environment-Variablen direkt auslesen für Debugging
    const envVars = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    };

    console.log('Environment Variables:', {
      hasClientId: !!envVars.clientId,
      hasClientSecret: !!envVars.clientSecret,
      hasDeveloperToken: !!envVars.developerToken,
      hasBaseUrl: !!envVars.baseUrl,
      clientIdLength: envVars.clientId?.length,
      clientSecretPrefix: envVars.clientSecret?.substring(0, 8),
    });

    // Setup validation durchführen
    const validation = GoogleAdsSetupValidator.validateSetup();

    // Erweiterte Systemdiagnose
    const systemCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasClientId: !!envVars.clientId,
      hasClientSecret: !!envVars.clientSecret,
      hasDeveloperToken: !!envVars.developerToken,
      hasBaseUrl: !!envVars.baseUrl,
      configuredCount: Object.values(envVars).filter(Boolean).length,
      totalRequired: 4,
      envVarsDebug: {
        clientIdFormat: envVars.clientId
          ? /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/.test(envVars.clientId)
          : false,
        clientSecretFormat: envVars.clientSecret
          ? envVars.clientSecret.startsWith('GOCSPX-')
          : false,
      },
    };

    return NextResponse.json({
      success: true,
      validation,
      systemCheck,
      setupComplete: validation.valid,
      readyForProduction: validation.valid && validation.errors.length === 0,
    });
  } catch (error) {
    console.error('Setup validation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate setup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
