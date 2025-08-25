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

    // SIMPLIFIED: Check harmonized user document only
    const userDoc = await getDoc(doc(db, 'users', companyUid));
    const userData = userDoc.exists() ? userDoc.data() : null;

    const recommendations: string[] = [];

    // Add recommendations based on findings
    if (!userDoc.exists()) {
      recommendations.push('❌ User document missing - company does not exist');
    } else {
      if (userData?.onboardingCompleted) {
        recommendations.push('✅ Onboarding completed successfully');
      } else {
        const currentStep = userData?.onboardingCurrentStep || '1';
        const percentage = userData?.onboardingCompletionPercentage || 0;
        recommendations.push(
          `⏳ Onboarding in progress - Step ${currentStep} (${percentage}% complete)`
        );
      }

      if (userData?.profileStatus === 'approved') {
        recommendations.push('✅ Profile approved and ready');
      } else if (userData?.profileStatus === 'pending_review') {
        recommendations.push('⏳ Profile pending admin review');
      } else if (userData?.profileStatus === 'rejected') {
        recommendations.push('❌ Profile rejected - needs attention');
      }
    }

    const debugInfo = {
      companyUid,
      timestamp: new Date().toISOString(),

      // Harmonized System (Main Document)
      harmonizedSystem: {
        exists: userDoc.exists(),
        companyName: userData?.companyName,
        userType: userData?.user_type,
        onboardingCompleted: userData?.onboardingCompleted,
        onboardingCurrentStep: userData?.onboardingCurrentStep,
        onboardingCompletionPercentage: userData?.onboardingCompletionPercentage,
        profileComplete: userData?.profileComplete,
        profileStatus: userData?.profileStatus,
        createdAt: userData?.createdAt?.toDate?.()?.toISOString(),
        onboardingStartedAt: userData?.onboardingStartedAt?.toDate?.()?.toISOString(),
        onboardingCompletedAt: userData?.onboardingCompletedAt?.toDate?.()?.toISOString(),
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
