// ✅ Google Ads Setup Validation API Route
// Server-side validation der Environment-Variablen

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsSetupValidator } from '@/utils/googleAdsSetupValidator';

export async function GET(request: NextRequest) {
  try {
    // Setup validation durchführen
    const validation = GoogleAdsSetupValidator.validateSetup();

    // Erweiterte Systemdiagnose
    const systemCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasClientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
      hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
      configuredCount: [
        process.env.GOOGLE_ADS_CLIENT_ID,
        process.env.GOOGLE_ADS_CLIENT_SECRET,
        process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        process.env.NEXT_PUBLIC_BASE_URL,
      ].filter(Boolean).length,
      totalRequired: 4,
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
