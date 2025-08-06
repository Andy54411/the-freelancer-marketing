// src/app/api/finapi/connect-bank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { finapiServiceFixed } from '@/lib/finapi-sdk-service-fixed';

export async function POST(req: NextRequest) {
  try {
    const { userId, bankId } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    console.log('🏦 Creating bank connection for user:', userId, 'bank:', bankId);

    // Step 1: Test client credentials first
    console.log('🔑 Testing finAPI client credentials...');
    const credentialTest = await finapiServiceFixed.testCredentials();

    if (!credentialTest.success) {
      console.warn('⚠️ FinAPI credentials not working, using mock mode');

      // Fallback: Mock WebForm for development
      const mockWebFormUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/finapi/webform/success?bankId=${bankId}&userId=${userId}&mock=true`;

      return NextResponse.json({
        success: true,
        message: 'Mock WebForm für Bankverbindung erstellt (FinAPI Sandbox nicht verfügbar)',
        redirectUrl: mockWebFormUrl,
        webForm: {
          id: `mock_${Date.now()}`,
          url: mockWebFormUrl,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        },
        finapiUserId: `mock_${userId}`,
        mode: 'mock',
        reason: 'finapi_credentials_invalid',
        instructions: {
          step: 'mock_redirect',
          description: 'Mock-Modus aktiviert - FinAPI Sandbox Credentials nicht verfügbar',
          next_steps: [
            '1. Weiterleitung zu Mock Success Callback',
            '2. Simulation einer erfolgreichen Bankverbindung',
            '3. Rückkehr zum Banking Dashboard',
            '4. Mock-Bankverbindung wird angezeigt',
          ],
        },
      });
    }

    console.log('✅ finAPI credentials valid, creating user...');

    // Step 2: Create or get finAPI user (only if credentials work)
    // Try multiple password patterns to handle existing users
    const finapiUserId = `taskilo_${userId}`;

    console.log('ℹ️ About to create/authenticate finAPI technical user');
    console.log('ℹ️ Remember: Your user only needs to login to their BANK, not to finAPI!');

    // If user already exists with wrong password, suggest using a new user ID
    let userResult;
    const passwordPatterns = [
      `taskilo_secure_${userId}`, // Current pattern
      `password_${userId}`, // Legacy pattern 1
      `taskilo_${userId}`, // Legacy pattern 2
      userId, // Simple user ID
      `${userId}_secure`, // Alternative pattern
    ];

    let lastError;
    for (const passwordPattern of passwordPatterns) {
      try {
        console.log('🔄 Trying password pattern for user:', finapiUserId);
        userResult = await finapiServiceFixed.getOrCreateUser(finapiUserId, passwordPattern);
        console.log('✅ Authentication successful with pattern');
        break;
      } catch (error: any) {
        lastError = error;
        console.log('❌ Password pattern failed, trying next...');
        if (passwordPattern === passwordPatterns[passwordPatterns.length - 1]) {
          // All patterns failed - if user exists but password wrong, try with timestamp suffix
          if (
            error.message?.includes('Bad credentials') ||
            error.message?.includes('authentication failed')
          ) {
            console.log(
              '🔄 All passwords failed for existing user, trying with timestamp suffix...'
            );
            const timestampSuffix = Date.now().toString().slice(-6);
            const newUserId = `${finapiUserId}_${timestampSuffix}`;
            const newPassword = `taskilo_secure_${userId}_${timestampSuffix}`;

            try {
              console.log('👤 Creating new user with timestamp suffix:', newUserId);
              userResult = await finapiServiceFixed.getOrCreateUser(newUserId, newPassword);
              console.log('✅ Successfully created user with new ID');
              break;
            } catch (newUserError) {
              console.error('❌ Even timestamp suffix failed:', newUserError);
              throw new Error(
                `Unable to create or authenticate finAPI user. The user '${finapiUserId}' exists but ` +
                  `authentication failed with all known password patterns, and creating a new user also failed. ` +
                  `This is a technical issue that requires manual intervention.`
              );
            }
          } else {
            // Different error - re-throw
            throw lastError;
          }
        }
      }
    }

    if (!userResult?.user) {
      throw new Error(
        'Failed to create finAPI user after trying all strategies - this is a technical error, not a user error'
      );
    }

    console.log('✅ finAPI user ready:', userResult.user.id);

    // Step 3: Create WebForm 2.0 for bank import
    const webForm = await finapiServiceFixed.createBankImportWebForm(userResult.userToken, {
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
      mode: 'live',
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
