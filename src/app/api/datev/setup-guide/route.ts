import { NextResponse } from 'next/server';

/**
 * DATEV Sandbox Setup Guide
 * Hilft bei der korrekten Konfiguration der DATEV Sandbox Credentials
 */
export async function GET() {
  const setupGuide = {
    problem: 'Token signature did not match',
    diagnosis: 'Client ID und Client Secret passen nicht zusammen',

    currentConfig: {
      clientId: 'CONFIGURED_BUT_INVALID',
      clientSecret: 'CONFIGURED_BUT_INVALID',
      baseUrl: 'https://sandbox-api.datev.de',
      status: '❌ FEHLSCHLAG - Invalid Token',
    },

    solutions: [
      {
        title: '1. DATEV Developer Portal prüfen',
        description: 'Logge dich in https://developer.datev.de ein',
        steps: [
          "Gehe zu 'Meine Anwendungen'",
          'Überprüfe die Client ID und Client Secret',
          'Stelle sicher, dass es Sandbox-Credentials sind',
          'Kopiere die exakten Werte',
        ],
      },
      {
        title: '2. Neue Sandbox App erstellen',
        description: 'Falls die Credentials veraltet sind',
        steps: [
          'Erstelle eine neue Sandbox-Anwendung',
          "Wähle 'Sandbox Environment'",
          'Generiere neue Client ID und Secret',
          'Update die Vercel Environment Variables',
        ],
      },
      {
        title: '3. Alternative Sandbox URLs testen',
        description: 'Möglicherweise andere Sandbox-Endpunkte',
        alternatives: [
          'https://api-sandbox.datev.de',
          'https://sandbox.datev.de/api',
          'https://dev-api.datev.de',
        ],
      },
    ],

    nextSteps: [
      '1. Überprüfe DATEV Developer Portal',
      '2. Update Vercel Environment Variables mit korrekten Credentials',
      '3. Teste erneut mit /api/datev/oauth-test',
      '4. Falls weiterhin Fehler: Neuen DATEV Sandbox Account erstellen',
    ],

    vercelConfig: {
      DATEV_CLIENT_ID: '[ENTER_YOUR_DATEV_CLIENT_ID]',
      DATEV_CLIENT_SECRET: '[ENTER_YOUR_DATEV_CLIENT_SECRET]',
    },
  };

  return NextResponse.json(setupGuide, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
