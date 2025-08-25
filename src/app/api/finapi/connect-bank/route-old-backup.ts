// src/app/api/finapi/connect-bank/route-fixed.ts
import { NextRequest, NextResponse } from 'next/server';
import { finapiServiceFixed } from '@/lib/finapi-sdk-service-fixed';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { userId, bankId } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    const credentialTest = await finapiServiceFixed.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          error: 'finAPI Credentials ungültig.',
          details: credentialTest.error,
        },
        { status: 500 }
      );
    }

    // LÖSUNG für Sandbox-Verschmutzung: Echte UUIDs verwenden
    function generateUniqueUserId(): string {
      // Verwende echte UUIDs statt vorhersagbare IDs
      const uuid = randomUUID().replace(/-/g, '').substring(0, 16);
      return `taskilo_uuid_${uuid}`;
    }

    let userResult: { user: any; userToken: string } | null = null;
    let attempts = 0;
    const maxAttempts = 5;

    // Mehrfach-Versuch mit verschiedenen UUIDs
    while (!userResult && attempts < maxAttempts) {
      attempts++;
      const uniqueUserId = generateUniqueUserId();
      const securePassword = `secure_${uniqueUserId}_${Date.now()}`;

      try {
        userResult = await finapiServiceFixed.getOrCreateUser(uniqueUserId, securePassword);

        break;
      } catch (error: any) {

        // If user creation succeeded but token failed, continue with WebForm using client token
        if (error.message.includes('User was created successfully but token retrieval failed')) {

          userResult = {
            user: { id: uniqueUserId },
            userToken: '', // Empty string instead of null for TypeScript
          };
          break;
        }

        // Wenn selbst UUID-User existieren, ist die Sandbox sehr verschmutzt
        if (error.message.includes('exists but authentication failed')) {

          // Bei letztem Versuch detaillierten Error geben
          if (attempts === maxAttempts) {

            return NextResponse.json(
              {
                error: 'finAPI Sandbox ist überlastet mit Test-Benutzern.',
                solution: 'Bitte versuchen Sie es in einigen Minuten erneut.',
                technical: {
                  issue: 'UUID collision after multiple attempts',
                  attempts: attempts,
                  recommendation: 'Contact finAPI support for sandbox cleanup',
                },
              },
              { status: 503 }
            );
          }
          continue;
        }

        // Andere Fehler sofort weiterwerfen
        throw error;
      }
    }

    if (!userResult) {
      return NextResponse.json(
        {
          error: 'Technischer Fehler bei finAPI User-Erstellung.',
          technical: 'Max UUID attempts exceeded',
        },
        { status: 500 }
      );
    }

    // WebForm 2.0 für Bankverbindung erstellen

    const webFormToken =
      userResult && userResult.userToken && userResult.userToken.trim() ? userResult.userToken : '';

    const webForm = await finapiServiceFixed.createBankImportWebForm(webFormToken || 'fallback', {
      bankId: parseInt(bankId),
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/company/${userId}/finance/banking/success`,
      callbacks: {
        successCallback: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/finapi/callback/success`,
        errorCallback: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/finapi/callback/error`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bankverbindung erfolgreich initialisiert',
      redirectUrl: webForm.url,
      webForm: webForm,
      finapiUserId: userResult.user.id,
      mode: 'production',
      instructions: {
        step: 'webform_redirect',
        description:
          'Sie werden zu Ihrer Bank weitergeleitet, um die Kontodaten sicher zu verbinden',
        next_steps: [
          '1. Weiterleitung zu finAPI WebForm 2.0',
          '2. Auswahl und Anmeldung bei Ihrer Bank',
          '3. Sichere Übertragung der Kontodaten',
          '4. Rückkehr zu Taskilo mit verbundenem Konto',
        ],
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Starten der Bankverbindung',
        message: error.message,
        technical: {
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack?.substring(0, 500), // Truncated stack trace
        },
      },
      { status: 500 }
    );
  }
}
