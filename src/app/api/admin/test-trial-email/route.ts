import { NextResponse } from 'next/server';
import { TrialService } from '@/services/subscription/TrialService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, companyName, daysRemaining } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-Adresse erforderlich' },
        { status: 400 }
      );
    }

    const days = daysRemaining ?? 3;
    const name = companyName || 'Test-Unternehmen';
    
    // Berechne das Test-Enddatum basierend auf daysRemaining
    const testEndDate = new Date();
    testEndDate.setDate(testEndDate.getDate() + days);

    const result = await TrialService.sendSingleReminderEmail(
      email,
      name,
      days,
      testEndDate
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Fehler beim Senden der E-Mail',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test-E-Mail erfolgreich an ${email} gesendet`,
      details: {
        recipient: email,
        companyName: name,
        daysRemaining: days,
        trialEndDate: testEndDate.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Senden der Test-E-Mail',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
