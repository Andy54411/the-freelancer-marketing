// Fix Onboarding Status API
import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase not initialized' },
        { status: 503 }
      );
    }

    // Update Onboarding-Status
    await db!.collection('companies').doc(companyId).update({
      onboardingCompleted: true,
      profileComplete: true,
      onboardingCompletionPercentage: 100,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding-Status erfolgreich aktualisiert',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren des Onboarding-Status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
