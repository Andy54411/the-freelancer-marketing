// src/app/api/debug/finapi-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';

const FINAPI_API_URL = 'https://sandbox.finapi.io';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 finAPI Debug - Starte Authentifizierungs-Test...');

    // 1. Prüfe verfügbare Umgebungsvariablen
    const adminClientId = process.env.FINAPI_ADMIN_CLIENT_ID;
    const adminClientSecret = process.env.FINAPI_ADMIN_CLIENT_SECRET;
    const sandboxClientId = process.env.FINAPI_SANDBOX_CLIENT_ID;
    const sandboxClientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    console.log('📋 Verfügbare Umgebungsvariablen:');
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

    // 2. Teste Admin-Anmeldeinformationen
    let adminAuthResult: any = null;
    if (adminClientId && adminClientSecret) {
      console.log('🔑 Teste Admin-Client-Authentifizierung...');
      try {
        const adminResponse = await fetch(`${FINAPI_API_URL}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: adminClientId,
            client_secret: adminClientSecret,
          }),
        });

        console.log('📡 Admin-Response Status:', adminResponse.status);
        console.log(
          '📡 Admin-Response Headers:',
          Object.fromEntries(adminResponse.headers.entries())
        );

        const adminResponseText = await adminResponse.text();
        console.log('📡 Admin-Response Body:', adminResponseText);

        if (adminResponse.ok) {
          adminAuthResult = { success: true, data: JSON.parse(adminResponseText) };
        } else {
          adminAuthResult = {
            success: false,
            error: adminResponseText,
            status: adminResponse.status,
          };
        }
      } catch (error) {
        console.error('❌ Admin-Auth Fehler:', error);
        adminAuthResult = { success: false, error: error.message };
      }
    }

    // 3. Teste Sandbox-Anmeldeinformationen
    let sandboxAuthResult: any = null;
    if (sandboxClientId && sandboxClientSecret) {
      console.log('🔑 Teste Sandbox-Client-Authentifizierung...');
      try {
        const sandboxResponse = await fetch(`${FINAPI_API_URL}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: sandboxClientId,
            client_secret: sandboxClientSecret,
          }),
        });

        console.log('📡 Sandbox-Response Status:', sandboxResponse.status);
        console.log(
          '📡 Sandbox-Response Headers:',
          Object.fromEntries(sandboxResponse.headers.entries())
        );

        const sandboxResponseText = await sandboxResponse.text();
        console.log('📡 Sandbox-Response Body:', sandboxResponseText);

        if (sandboxResponse.ok) {
          sandboxAuthResult = { success: true, data: JSON.parse(sandboxResponseText) };
        } else {
          sandboxAuthResult = {
            success: false,
            error: sandboxResponseText,
            status: sandboxResponse.status,
          };
        }
      } catch (error) {
        console.error('❌ Sandbox-Auth Fehler:', error);
        sandboxAuthResult = { success: false, error: error.message };
      }
    }

    // 4. Ergebnis zusammenfassen
    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        adminClientId: adminClientId ? `${adminClientId.substring(0, 8)}...` : null,
        adminClientSecret: adminClientSecret ? `${adminClientSecret.substring(0, 8)}...` : null,
        sandboxClientId: sandboxClientId ? `${sandboxClientId.substring(0, 8)}...` : null,
        sandboxClientSecret: sandboxClientSecret
          ? `${sandboxClientSecret.substring(0, 8)}...`
          : null,
      },
      tests: {
        adminAuth: adminAuthResult,
        sandboxAuth: sandboxAuthResult,
      },
      recommendation: null,
    };

    // 5. Empfehlung basierend auf Ergebnissen
    if (adminAuthResult?.success) {
      result.recommendation =
        'Admin-Anmeldeinformationen funktionieren - verwende diese für die Integration.';
    } else if (sandboxAuthResult?.success) {
      result.recommendation =
        'Sandbox-Anmeldeinformationen funktionieren - verwende diese für die Integration.';
    } else {
      result.recommendation =
        'Beide Anmeldeinformationen schlagen fehl - überprüfe die finAPI-Konfiguration.';
    }

    console.log('📊 Debug-Ergebnis:', result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('❌ finAPI Debug Fehler:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim finAPI-Authentifizierungs-Test',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
