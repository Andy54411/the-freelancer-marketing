import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { getOnboardingProgress } from '@/lib/onboarding-progress';
import { checkCompanyOnboardingStatus } from '@/lib/legacy-migration';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyUid = searchParams.get('companyUid');

    if (!companyUid) {
      return NextResponse.json({ error: 'companyUid parameter is required' }, { status: 400 });
    }

    console.log('🔍 Debug: Checking onboarding status for company:', companyUid);

    // 1. Check user document
    const userDoc = await getDoc(doc(db, 'users', companyUid));
    const userData = userDoc.exists() ? userDoc.data() : null;

    // 2. Check new onboarding progress system
    const newOnboardingProgress = await getOnboardingProgress(companyUid);

    // 3. Check old onboarding system
    const oldOnboardingDoc = await getDoc(doc(db, 'companies', companyUid, 'onboarding', 'status'));
    const oldOnboardingData = oldOnboardingDoc.exists() ? oldOnboardingDoc.data() : null;

    // 4. Use legacy migration check
    const legacyCheckResult = await checkCompanyOnboardingStatus(companyUid);

    const recommendations: string[] = [];

    const debugInfo = {
      companyUid,
      timestamp: new Date().toISOString(),

      userDocument: {
        exists: userDoc.exists(),
        companyName: userData?.companyName,
        userType: userData?.user_type,
        onboardingCompleted: userData?.onboardingCompleted,
        profileComplete: userData?.profileComplete,
        createdAt: userData?.createdAt?.toDate?.()?.toISOString(),
      },

      newOnboardingSystem: {
        exists: !!newOnboardingProgress,
        status: newOnboardingProgress?.status,
        completionPercentage: newOnboardingProgress?.completionPercentage,
        currentStep: newOnboardingProgress?.currentStep,
        isLegacyCompany: newOnboardingProgress?.isLegacyCompany,
        registrationMethod: newOnboardingProgress?.registrationMethod,
        stepsCompleted: newOnboardingProgress?.stepsCompleted,
      },

      oldOnboardingSystem: {
        exists: oldOnboardingDoc.exists(),
        status: oldOnboardingData?.status,
        completionPercentage: oldOnboardingData?.completionPercentage,
        currentStep: oldOnboardingData?.currentStep,
      },

      legacyMigrationCheck: {
        needsOnboarding: legacyCheckResult.needsOnboarding,
        completionPercentage: legacyCheckResult.completionPercentage,
        currentStep: legacyCheckResult.currentStep,
      },

      recommendations,
    };

    // Add recommendations based on findings
    if (!userDoc.exists()) {
      recommendations.push('❌ User document missing - company does not exist');
    }

    if (!newOnboardingProgress && !oldOnboardingData) {
      recommendations.push('⚠️ No onboarding data found in either system');
    }

    if (newOnboardingProgress?.status === 'grandfathered') {
      recommendations.push('✅ Company is grandfathered - no onboarding required');
    }

    if (legacyCheckResult.needsOnboarding && legacyCheckResult.completionPercentage === 0) {
      recommendations.push('🔄 Company needs onboarding migration - run legacy migration');
    }

    if (newOnboardingProgress && oldOnboardingData) {
      recommendations.push('🧹 Both old and new onboarding data exists - consider cleanup');
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    console.error('❌ Debug API Error:', error);
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
