// src/app/api/debug/finapi-comprehensive/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SANDBOX_URL = 'https://sandbox.finapi.io';
const PRODUCTION_URL = 'https://finapi.io';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 finAPI Comprehensive Debug - Teste alle Kombinationen...');

    // Environment Variables
    const adminClientId = process.env.FINAPI_ADMIN_CLIENT_ID;
    const adminClientSecret = process.env.FINAPI_ADMIN_CLIENT_SECRET;
    const sandboxClientId = process.env.FINAPI_SANDBOX_CLIENT_ID;
    const sandboxClientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    console.log('📋 Environment Status:');
    console.log(
      '- FINAPI_ADMIN_CLIENT_ID:',
      adminClientId ? `${adminClientId.substring(0, 8)}...` : 'NICHT GESETZT'
    );
    console.log(
      '- FINAPI_ADMIN_CLIENT_SECRET:',
      adminClientSecret ? `${adminClientSecret.substring(0, 8)}...` : 'NICHT GESETZT'
    );
    console.log(
      '- FINAPI_SANDBOX_CLIENT_ID:',
      sandboxClientId ? `${sandboxClientId.substring(0, 8)}...` : 'NICHT GESETZT'
    );
    console.log(
      '- FINAPI_SANDBOX_CLIENT_SECRET:',
      sandboxClientSecret ? `${sandboxClientSecret.substring(0, 8)}...` : 'NICHT GESETZT'
    );

    const results: any = {
      timestamp: new Date().toISOString(),
      environment: {
        adminClientId: adminClientId ? `${adminClientId.substring(0, 8)}...` : null,
        adminClientSecret: adminClientSecret ? `${adminClientSecret.substring(0, 8)}...` : null,
        sandboxClientId: sandboxClientId ? `${sandboxClientId.substring(0, 8)}...` : null,
        sandboxClientSecret: sandboxClientSecret
          ? `${sandboxClientSecret.substring(0, 8)}...`
          : null,
      },
      tests: {},
      recommendation: null as string | null,
    };

    // Teste alle Kombinationen
    const testCombinations = [
      {
        name: 'Admin Credentials → Sandbox Server',
        url: SANDBOX_URL,
        clientId: adminClientId,
        clientSecret: adminClientSecret,
      },
      {
        name: 'Admin Credentials → Production Server',
        url: PRODUCTION_URL,
        clientId: adminClientId,
        clientSecret: adminClientSecret,
      },
      {
        name: 'Sandbox Credentials → Sandbox Server',
        url: SANDBOX_URL,
        clientId: sandboxClientId,
        clientSecret: sandboxClientSecret,
      },
      {
        name: 'Sandbox Credentials → Production Server',
        url: PRODUCTION_URL,
        clientId: sandboxClientId,
        clientSecret: sandboxClientSecret,
      },
    ];

    for (const combination of testCombinations) {
      if (!combination.clientId || !combination.clientSecret) {
        results.tests[combination.name] = {
          success: false,
          error: 'Missing credentials',
          status: null,
        };
        continue;
      }

      console.log(`🔑 Teste: ${combination.name}...`);

      try {
        const response = await fetch(`${combination.url}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: combination.clientId,
            client_secret: combination.clientSecret,
          }),
        });

        console.log(`📡 ${combination.name} Status:`, response.status);
        console.log(
          `📡 ${combination.name} Headers:`,
          Object.fromEntries(response.headers.entries())
        );

        const responseText = await response.text();
        console.log(`📡 ${combination.name} Body:`, responseText);

        if (response.ok) {
          const data = JSON.parse(responseText);
          results.tests[combination.name] = {
            success: true,
            data: {
              access_token: data.access_token ? `${data.access_token.substring(0, 20)}...` : null,
              token_type: data.token_type,
              expires_in: data.expires_in,
            },
            status: response.status,
          };
        } else {
          results.tests[combination.name] = {
            success: false,
            error: responseText,
            status: response.status,
          };
        }
      } catch (error) {
        console.error(`❌ ${combination.name} Fehler:`, error);
        results.tests[combination.name] = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          status: null,
        };
      }
    }

    // Empfehlung basierend auf Ergebnissen
    const successfulTests = Object.entries(results.tests).filter(
      ([_, result]: [string, any]) => result.success
    );

    if (successfulTests.length > 0) {
      const successfulTest = successfulTests[0];
      results.recommendation = `✅ ERFOLG: "${successfulTest[0]}" funktioniert! Verwende diese Konfiguration.`;
    } else {
      // Analyse der Fehler
      const errorAnalysis = Object.entries(results.tests).map(([name, result]: [string, any]) => {
        if (result.error) {
          try {
            const errorObj = JSON.parse(result.error);
            return `${name}: ${errorObj.error} - ${errorObj.error_description}`;
          } catch {
            return `${name}: ${result.error}`;
          }
        }
        return `${name}: Unknown error`;
      });

      results.recommendation = `❌ Alle Tests fehlgeschlagen. Fehler-Analyse:\n${errorAnalysis.join('\n')}\n\n🔧 Nächste Schritte:\n1. finAPI Account-Status überprüfen\n2. Client Credentials erneuern\n3. finAPI Support kontaktieren`;
    }

    console.log('✅ finAPI Comprehensive Debug abgeschlossen');
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('❌ finAPI Comprehensive Debug Fehler:', error);
    return NextResponse.json(
      {
        error: 'Debug fehlgeschlagen',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
