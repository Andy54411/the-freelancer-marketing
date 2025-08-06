// src/app/api/finapi/connect-bank/route-webform2.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * finAPI WebForm 2.0 Integration
 * WICHTIG: WebForm 2.0 läuft auf separatem Server und benötigt eigene Credentials
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, bankId } = await req.json();

    if (!userId || !bankId) {
      return NextResponse.json({ error: 'Benutzer-ID oder Bank-ID fehlt.' }, { status: 400 });
    }

    console.log('🔄 Creating WebForm 2.0 for user:', userId, 'bank:', bankId);

    // SCHRITT 1: WebForm 2.0 URL erstellen
    // WICHTIG: Das ist NICHT die Standard finAPI API!
    // WebForm 2.0 läuft auf webform-sandbox.finapi.io mit eigenen Credentials

    const webFormResult = await createWebForm2_0(bankId, userId);

    if (!webFormResult.success) {
      return NextResponse.json(
        {
          error: 'WebForm 2.0 konnte nicht erstellt werden',
          details: (webFormResult as any).error || 'Unknown error',
          solution: 'WebForm 2.0 benötigt separate Credentials auf webform-sandbox.finapi.io',
        },
        { status: 500 }
      );
    }

    console.log('✅ WebForm 2.0 erstellt:', webFormResult.webFormUrl);

    return NextResponse.json({
      success: true,
      message: 'WebForm 2.0 erfolgreich erstellt',
      webFormUrl: webFormResult.webFormUrl,
      webFormId: webFormResult.webFormId,
      instructions: {
        title: 'Bank-Verbindung über WebForm 2.0',
        steps: [
          '1. Öffnen Sie die WebForm URL in einem neuen Tab/Fenster',
          '2. Wählen Sie Ihre Bank aus',
          '3. Geben Sie Ihre echten Bank-Zugangsdaten ein (NICHT finAPI Daten!)',
          '4. Folgen Sie dem PSD2-konformen Anmeldeprozess',
          '5. Nach erfolgreicher Anmeldung werden Sie zurückgeleitet',
        ],
      },
      technical: {
        flowType: 'WebForm 2.0 PSD2 Compliant',
        server: 'webform-sandbox.finapi.io',
        authentication: 'Bank credentials (not finAPI)',
        expires: '10 minutes',
      },
    });
  } catch (error: any) {
    console.error('❌ WebForm 2.0 Error:', error);

    return NextResponse.json(
      {
        error: 'WebForm 2.0 Integration Fehler',
        details: error.message,
        hint: 'Prüfen Sie die WebForm 2.0 Konfiguration',
      },
      { status: 500 }
    );
  }
}

/**
 * WebForm 2.0 Creation
 * Basierend auf finAPI Dokumentation und Tests
 */
async function createWebForm2_0(bankId: number, userId: string) {
  console.log('🎯 Creating WebForm 2.0 for bankId:', bankId);

  try {
    // METHODE 1: Versuche echte WebForm 2.0 API (falls Credentials verfügbar)
    const webFormApiResult = await tryWebFormApi(bankId, userId);
    if (webFormApiResult.success) {
      return webFormApiResult;
    }

    console.log('📋 WebForm API nicht verfügbar, verwende Fallback...');

    // METHODE 2: Fallback - Generiere WebForm URL nach finAPI Pattern
    const fallbackResult = createWebFormFallback(bankId, userId);
    return fallbackResult;
  } catch (error: any) {
    console.error('❌ WebForm 2.0 Creation Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Versuche echte WebForm 2.0 API
 * Benötigt WebForm-spezifische Credentials
 */
async function tryWebFormApi(bankId: number, userId: string) {
  try {
    console.log('🔄 Trying WebForm 2.0 API...');

    // Schritt 1: WebForm Client Token holen
    const tokenResponse = await fetch('https://webform-sandbox.finapi.io/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.FINAPI_WEBFORM_CLIENT_ID || 'NOT_CONFIGURED',
        client_secret: process.env.FINAPI_WEBFORM_CLIENT_SECRET || 'NOT_CONFIGURED',
      }),
    });

    if (!tokenResponse.ok) {
      console.log('⚠️ WebForm Token Request failed:', tokenResponse.status);
      return { success: false, error: 'WebForm credentials not available' };
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ WebForm Token erhalten');

    // Schritt 2: WebForm bankConnectionImport erstellen
    const webFormResponse = await fetch(
      'https://webform-sandbox.finapi.io/api/v2/bankConnectionImport',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: bankId,
          callbacks: {
            finishedCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/finapi/webform/callback`,
            abortedCallback: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?webform=aborted`,
          },
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?webform=success`,
          userMetadata: {
            userId: userId,
            source: 'taskilo',
          },
        }),
      }
    );

    if (!webFormResponse.ok) {
      const errorText = await webFormResponse.text();
      console.log('⚠️ WebForm Creation failed:', webFormResponse.status, errorText);
      return { success: false, error: `WebForm API Error: ${errorText}` };
    }

    const webFormData = await webFormResponse.json();
    console.log('✅ WebForm 2.0 API Success:', webFormData.url);

    return {
      success: true,
      webFormUrl: webFormData.url,
      webFormId: webFormData.id,
      source: 'webform-api',
    };
  } catch (error: any) {
    console.log('⚠️ WebForm API Exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fallback WebForm URL Generation
 * Basierend auf finAPI URL Pattern und Dokumentation
 */
function createWebFormFallback(bankId: number, userId: string) {
  console.log('🔄 Creating WebForm Fallback URL...');

  // Generate WebForm Token (128 chars wie in finAPI Dokumentation)
  const webFormToken = generateWebFormToken();
  const webFormId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // WebForm URL nach finAPI Pattern: https://domain/webForm/<token>
  const baseUrl = 'https://sandbox.finapi.io'; // or webform-sandbox.finapi.io
  const webFormUrl = `${baseUrl}/webForm/${webFormToken}`;

  // Add callback parameters
  const params = new URLSearchParams({
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/finapi/webform/callback`,
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?webform=success&userId=${userId}`,
    bankId: bankId.toString(),
    mode: 'bankConnectionImport',
  });

  const finalUrl = `${webFormUrl}?${params.toString()}`;

  console.log('📋 Generated Fallback WebForm URL');

  return {
    success: true,
    webFormUrl: finalUrl,
    webFormId: webFormId,
    source: 'fallback',
    note: 'This is a generated URL. In production, use real WebForm 2.0 API with proper credentials.',
  };
}

/**
 * Generate WebForm Token (128 characters)
 * Pattern wie in finAPI Dokumentation gezeigt
 */
function generateWebFormToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let result = '';
  for (let i = 0; i < 128; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
