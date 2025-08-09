import { NextRequest, NextResponse } from 'next/server';
import { initializeOnboardingProgress } from '@/lib/onboarding-progress';

export async function POST(request: NextRequest) {
  try {
    const { companyUid, markAsGrandfathered } = await request.json();

    if (!companyUid) {
      return NextResponse.json({ error: 'companyUid is required' }, { status: 400 });
    }

    console.log('🔧 Fixing onboarding status for company:', companyUid);

    if (markAsGrandfathered) {
      // Mark existing company as grandfathered (no onboarding needed)
      await initializeOnboardingProgress(companyUid, 'existing_grandfathered');

      return NextResponse.json({
        success: true,
        message: 'Company marked as grandfathered - no onboarding required',
        companyUid,
        status: 'grandfathered',
      });
    } else {
      // Initialize normal onboarding
      await initializeOnboardingProgress(companyUid, 'new_registration');

      return NextResponse.json({
        success: true,
        message: 'Onboarding initialized for company',
        companyUid,
        status: 'pending_onboarding',
      });
    }
  } catch (error) {
    console.error('❌ Fix onboarding error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
