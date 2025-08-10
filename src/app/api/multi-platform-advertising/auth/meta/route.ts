// 🎯 META ADS OAUTH - Multi-Platform Auth Route

import { NextRequest, NextResponse } from 'next/server';
import { MetaAdsService } from '@/services/platform-services/metaAdsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_COMPANY_ID',
            message: 'Company ID is required',
          },
        },
        { status: 400 }
      );
    }

    console.log('🔗 Generating Meta OAuth URL for company:', companyId);

    const metaService = new MetaAdsService();
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/multi-platform-advertising/auth/meta/callback`;

    const authUrl = metaService.generateAuthUrl(companyId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl: authUrl,
    });
  } catch (error: any) {
    console.error('❌ Meta OAuth URL generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_URL_ERROR',
          message: error.message || 'Failed to generate Meta OAuth URL',
        },
      },
      { status: 500 }
    );
  }
}
