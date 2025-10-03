// 🎯 OUTBRAIN OAUTH - Multi-Platform Auth Route

import { NextRequest, NextResponse } from 'next/server';
import { OutbrainService } from '@/services/platform-services/outbrainService';

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

    const outbrainService = new OutbrainService();
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/multi-platform-advertising/auth/outbrain/callback`;

    const authUrl = outbrainService.generateAuthUrl(companyId, redirectUri);

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
          message: error.message || 'Failed to generate Outbrain OAuth URL',
        },
      },
      { status: 500 }
    );
  }
}
