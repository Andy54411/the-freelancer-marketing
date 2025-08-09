import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { verifyAdminAuth } from '@/lib/admin-auth';

/**
 * Admin API: Get all companies with onboarding status
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const adminAuth = await verifyAdminAuth(request);
  if (!adminAuth.success) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
  }

  try {
    console.log('[Admin API] Loading companies with onboarding status...');

    // Load all companies using Firebase Admin SDK
    const usersSnapshot = await db.collection('users').where('user_type', '==', 'firma').get();

    const companiesData: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Load onboarding status from sub-collection
      let onboardingData: any = null;
      try {
        const onboardingDoc = await db
          .collection('users')
          .doc(userDoc.id)
          .collection('onboarding')
          .doc('progress')
          .get();

        if (onboardingDoc.exists) {
          onboardingData = onboardingDoc.data();
        }
      } catch (error) {
        console.log('No onboarding data for company:', userDoc.id);
      }

      // Calculate legacy status for existing companies
      const isLegacyCompany =
        !onboardingData || onboardingData?.registrationMethod === 'existing_grandfathered';
      const registrationDate = userData.createdAt?.toDate() || new Date();

      // Default onboarding status for legacy companies
      const defaultOnboardingStatus = isLegacyCompany ? 'grandfathered' : 'pending_onboarding';

      companiesData.push({
        uid: userDoc.id,
        companyName: userData.companyName || 'Unbekanntes Unternehmen',
        email: userData.email || '',
        registrationDate,
        onboardingStatus: onboardingData?.status || defaultOnboardingStatus,
        currentStep: onboardingData?.currentStep || 0,
        completionPercentage: onboardingData?.completionPercentage || 0,
        lastActivity: onboardingData?.lastAutoSave?.toDate() || registrationDate,
        stepsCompleted: onboardingData?.stepsCompleted || [],
        requiresApproval: onboardingData?.status === 'completed',
        adminNotes: onboardingData?.adminNotes || '',
        isLegacyCompany,
        registrationMethod: onboardingData?.registrationMethod || 'existing_grandfathered',
      });
    }

    console.log(`[Admin API] Loaded ${companiesData.length} companies`);

    // Calculate statistics
    const stats = {
      totalCompanies: companiesData.length,
      pendingOnboarding: companiesData.filter(c => c.onboardingStatus === 'pending_onboarding')
        .length,
      inProgress: companiesData.filter(c => c.onboardingStatus === 'in_progress').length,
      awaitingApproval: companiesData.filter(c => c.onboardingStatus === 'completed').length,
      approved: companiesData.filter(c => c.onboardingStatus === 'approved').length,
      grandfathered: companiesData.filter(c => c.onboardingStatus === 'grandfathered').length,
      avgCompletionTime: 0, // TODO: Calculate based on timestamps
      completionRate:
        companiesData.length > 0
          ? (companiesData.filter(
              c => c.onboardingStatus === 'approved' || c.onboardingStatus === 'grandfathered'
            ).length /
              companiesData.length) *
            100
          : 0,
    };

    return NextResponse.json({
      success: true,
      companies: companiesData,
      stats,
    });
  } catch (error) {
    console.error('[Admin API] Error loading companies:', error);
    return NextResponse.json(
      {
        error: 'Failed to load companies',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
