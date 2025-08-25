import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export async function POST(request: NextRequest) {
  try {
    const { companyUid, markAsGrandfathered } = await request.json();

    if (!companyUid) {
      return NextResponse.json({ error: 'companyUid is required' }, { status: 400 });
    }

    if (markAsGrandfathered) {
      // Mark existing company as grandfathered (no onboarding needed) - HARMONIZED SYSTEM
      await updateDoc(doc(db, 'users', companyUid), {
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        profileComplete: true,
        profileStatus: 'approved',
      });

      return NextResponse.json({
        success: true,
        message: 'Company marked as grandfathered - no onboarding required',
        companyUid,
        status: 'grandfathered',
      });
    } else {
      // Initialize normal onboarding - HARMONIZED SYSTEM
      await updateDoc(doc(db, 'users', companyUid), {
        onboardingCompleted: false,
        onboardingCurrentStep: '1',
        onboardingCompletionPercentage: 0,
        onboardingStartedAt: serverTimestamp(),
        profileComplete: false,
        profileStatus: 'pending_review',
      });

      return NextResponse.json({
        success: true,
        message: 'Onboarding initialized for company',
        companyUid,
        status: 'pending_onboarding',
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
