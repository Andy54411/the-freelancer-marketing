// 🎯 MULTI-PLATFORM ADVERTISING API - Campaigns
// Alle Kampagnen von allen Plattformen abrufen

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

    const result = await multiPlatformAdvertisingService.getAllCampaigns(companyId);

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
          message: error.message || 'Failed to fetch campaigns from all platforms',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, platform, campaignData } = body;

    if (!companyId || !platform || !campaignData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Company ID, platform, and campaign data are required',
          },
        },
        { status: 400 }
      );
    }

    const result = await multiPlatformAdvertisingService.createCampaign(
      companyId,
      platform,
      campaignData
    );

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
          message: error.message || 'Failed to create campaign',
        },
      },
      { status: 500 }
    );
  }
}
