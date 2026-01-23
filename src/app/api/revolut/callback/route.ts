/**
 * Revolut OAuth Callback
 * 
 * Empfängt den Authorization Code von Revolut nach der Autorisierung
 * und tauscht ihn gegen Access Token über Hetzner.
 */

import { NextRequest, NextResponse } from 'next/server';

const HETZNER_API_URL = 'https://mail.taskilo.de/webmail-api/api/revolut-proxy';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(`
        <html>
          <head><title>Revolut Authorization Fehler</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: red;">❌ Authorization fehlgeschlagen</h1>
            <p>Fehler: ${error}</p>
            <p>Beschreibung: ${searchParams.get('error_description') || 'Keine Details'}</p>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (!code) {
      return new NextResponse(`
        <html>
          <head><title>Revolut Callback</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: red;">❌ Kein Authorization Code</h1>
            <p>Der Authorization Code fehlt in der Anfrage.</p>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Token-Exchange über Hetzner
    const tokenResponse = await fetch(`${HETZNER_API_URL}/token-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBMAIL_API_KEY,
      },
      body: JSON.stringify({
        code,
        redirect_uri: 'https://taskilo.de/api/revolut/callback',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.success) {
      return new NextResponse(`
        <html>
          <head><title>Revolut Token Exchange Fehler</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: red;">❌ Token Exchange fehlgeschlagen</h1>
            <p>Fehler: ${tokenData.error || 'Unbekannter Fehler'}</p>
            <pre style="text-align: left; background: #f5f5f5; padding: 20px; border-radius: 8px; overflow: auto;">
${JSON.stringify(tokenData, null, 2)}
            </pre>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Erfolg!
    return new NextResponse(`
      <html>
        <head><title>Revolut Authorization Erfolgreich</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #14ad9f;">✅ Revolut Authorization Erfolgreich!</h1>
          <p>Der Access Token wurde erfolgreich generiert und auf Hetzner gespeichert.</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 500px;">
            <p><strong>State:</strong> ${state || 'N/A'}</p>
            <p><strong>Token Typ:</strong> ${tokenData.token_type || 'Bearer'}</p>
            <p><strong>Gültig für:</strong> ${tokenData.expires_in ? Math.round(tokenData.expires_in / 60) + ' Minuten' : 'N/A'}</p>
            <p><strong>Refresh Token:</strong> ${tokenData.refresh_token ? '✓ Erhalten' : '✗ Nicht erhalten'}</p>
          </div>
          <p style="color: #666;">Du kannst dieses Fenster jetzt schließen.</p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[Revolut Callback] Error:', error);
    return new NextResponse(`
      <html>
        <head><title>Revolut Callback Fehler</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: red;">❌ Server Fehler</h1>
          <p>${error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
