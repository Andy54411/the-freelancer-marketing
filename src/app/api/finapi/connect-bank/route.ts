// src/app/api/finapi/connect-bank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';

export async function POST(req: NextRequest) {
  try {
    const { userId, bankId, credentialType = 'sandbox' } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    console.log(
      'Connecting bank for user:',
      userId,
      'bank:',
      bankId,
      'credential type:',
      credentialType
    );

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // Test credentials first
    const credentialTest = await finapiService.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'finAPI credentials test failed',
          details: credentialTest.error,
        },
        { status: 500 }
      );
    }

    // WebForm 2.0 Integration - Redirect to import-bank for full WebForm flow
    console.log('🔄 Redirecting to WebForm 2.0 import-bank API for user:', userId, 'bank:', bankId);

    // Call the fully functional import-bank API with WebForm 2.0
    const importResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/finapi/import-bank`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          bankId: bankId,
          credentialType: credentialType,
        }),
      }
    );

    const importData = await importResponse.json();

    if (importResponse.ok && importData.success) {
      console.log('✅ WebForm 2.0 created successfully via import-bank');

      return NextResponse.json({
        success: true,
        message: 'WebForm 2.0 für Bankverbindung erstellt',
        redirectUrl: importData.webForm.url,
        webForm: importData.webForm,
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
        debug_info: {
          environment: credentialType,
          finapiUserId: importData.finapiUserId,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      console.error('❌ WebForm 2.0 creation failed:', importData);

      return NextResponse.json(
        {
          success: false,
          error: 'WebForm 2.0 Erstellung fehlgeschlagen',
          details: importData.error || importData.details || 'Unknown error',
          suggestion: 'Überprüfen Sie die finAPI Konfiguration und Benutzer-Authentifizierung',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Fehler beim Starten der Bankverbindung:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    return NextResponse.json(
      { error: 'Fehler beim Verbinden der Bank.', details: errorMessage },
      { status: 500 }
    );
  }
}
