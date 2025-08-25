// 🎯 TABOOLA OAUTH - Multi-Platform Auth Route

import { NextRequest, NextResponse } from 'next/server';
import { TaboolaService } from '@/services/platform-services/taboolaService';

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

    const taboolaService = new TaboolaService();
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/multi-platform-advertising/auth/taboola/callback`;

    const authUrl = taboolaService.generateAuthUrl(companyId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl: authUrl,
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_URL_ERROR',
          message: error.message || 'Failed to generate Taboola OAuth URL',
        },
      },
      { status: 500 }
    );
  }
}
