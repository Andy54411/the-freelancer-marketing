import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyUid = searchParams.get('companyUid');

    if (!companyUid) {
      return NextResponse.json({ error: 'companyUid parameter is required' }, { status: 400 });
    }

    // 🔧 SAUBERE TRENNUNG: Check companies collection only
    const companyDoc = await getDoc(doc(db, 'companies', companyUid));
    const companyData = companyDoc.exists() ? companyDoc.data() : null;

    const recommendations: string[] = [];

    // Add recommendations based on findings
    if (!companyDoc.exists()) {
      recommendations.push('❌ Company document missing - company does not exist');
    } else {
      if (companyData?.onboardingCompleted) {
        recommendations.push('✅ Onboarding completed successfully');
      } else {
        const currentStep = companyData?.onboardingCurrentStep || '1';
        const percentage = companyData?.onboardingCompletionPercentage || 0;
        recommendations.push(
          `⏳ Onboarding in progress - Step ${currentStep} (${percentage}% complete)`
        );
      }

      if (companyData?.profileStatus === 'approved') {
        recommendations.push('✅ Profile approved and ready');
      } else if (companyData?.profileStatus === 'pending_review') {
        recommendations.push('⏳ Profile pending admin review');
      } else if (companyData?.profileStatus === 'rejected') {
        recommendations.push('❌ Profile rejected - needs attention');
      }
    }

    const debugInfo = {
      companyUid,
      timestamp: new Date().toISOString(),

      // Companies Collection (Main Document)
      companiesSystem: {
        exists: companyDoc.exists(),
        companyName: companyData?.companyName,
        userType: companyData?.user_type,
        onboardingCompleted: companyData?.onboardingCompleted,
        onboardingCurrentStep: companyData?.onboardingCurrentStep,
        onboardingCompletionPercentage: companyData?.onboardingCompletionPercentage,
        profileComplete: companyData?.profileComplete,
        profileStatus: companyData?.profileStatus,
        createdAt: companyData?.createdAt?.toDate?.()?.toISOString(),
        onboardingStartedAt: companyData?.onboardingStartedAt?.toDate?.()?.toISOString(),
        onboardingCompletedAt: companyData?.onboardingCompletedAt?.toDate?.()?.toISOString(),
      },

      recommendations,
    };

    return NextResponse.json({
      status: 'success',
      data: debugInfo,
      message: 'Harmonized onboarding system status retrieved successfully',
    });
  } catch (error) {
    console.error('Debug onboarding status error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        companyUid: request.nextUrl.searchParams.get('companyUid'),
      },
      { status: 500 }
    );
  }
}
