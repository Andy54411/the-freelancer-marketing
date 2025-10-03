// 🎯 MULTI-PLATFORM ADVERTISING API - Connections
// Alle Platform-Verbindungen abrufen

import { NextRequest, NextResponse } from 'next/server';
import { multiPlatformAdvertisingService } from '@/services/multiPlatformAdvertisingService';

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

    const result = await multiPlatformAdvertisingService.getAllPlatformConnections(companyId);

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
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message || 'Failed to fetch platform connections',
        },
      },
      { status: 500 }
    );
  }
}
