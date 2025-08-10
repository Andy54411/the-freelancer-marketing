// 🎯 MULTI-PLATFORM ADVERTISING API - Analytics
// Unified Analytics von allen Plattformen

import { NextRequest, NextResponse } from 'next/server';
import { multiPlatformAdvertisingService } from '@/services/multiPlatformAdvertisingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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

    console.log('📊 Getting unified analytics for company:', companyId);

    const dateRange = startDate && endDate ? { startDate, endDate } : undefined;

    const result = await multiPlatformAdvertisingService.getUnifiedAnalytics(companyId, dateRange);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Multi-platform analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch unified analytics',
        },
      },
      { status: 500 }
    );
  }
}
