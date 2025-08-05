// src/app/api/finapi/connect-bank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

export async function POST(req: NextRequest) {
  try {
    const { userId, bankId } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    console.log('🏦 Creating bank connection for user:', userId, 'bank:', bankId);

    // Step 1: Create or get finAPI user
    const password = `taskilo_${userId}_${Date.now()}`; // Generate secure password
    const userResult = await finapiService.getOrCreateUser(userId, password);

    if (!userResult.user) {
      throw new Error('Failed to create finAPI user');
    }

    console.log('✅ finAPI user ready:', userResult.user.id);

    // Step 2: Create WebForm 2.0 for bank import
    const webForm = await finapiService.createBankImportWebForm(userResult.userToken, {
      bankId: parseInt(bankId),
      callbacks: {
        successCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/finapi/webform/success`,
        errorCallback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/finapi/webform/error`,
      },
      redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${userId}/finance/banking`,
    });

    console.log('✅ WebForm 2.0 created:', webForm.url);

    return NextResponse.json({
      success: true,
      message: 'WebForm 2.0 für Bankverbindung erstellt',
      redirectUrl: webForm.url,
      webForm: {
        id: webForm.id,
        url: webForm.url,
        expiresAt: webForm.expiresAt,
      },
      finapiUserId: userResult.user.id,
      instructions: {
        step: 'redirect_to_webform',
        description: 'User wird zur sicheren finAPI WebForm weitergeleitet',
        next_steps: [
          '1. Automatische Weiterleitung zur WebForm URL',
          '2. User authentifiziert sich sicher bei seiner Bank',
          '3. Bankverbindung wird automatisch erstellt',
          '4. Callback erfolgt nach Abschluss',
        ],
      },
    });
  } catch (error) {
    console.error('❌ Fehler beim Starten der Bankverbindung:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Verbinden der Bank.',
        details: errorMessage,
        suggestion: 'Bitte überprüfen Sie die finAPI Sandbox-Konfiguration.',
      },
      { status: 500 }
    );
  }
}
