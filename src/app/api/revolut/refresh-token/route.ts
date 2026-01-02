/**
 * POST /api/revolut/refresh-token
 * 
 * Erneuert den Revolut Access Token mit dem Refresh Token.
 * Der Refresh Token wird gegen einen neuen Access Token getauscht.
 */

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function POST() {
  try {
    const refreshToken = process.env.REVOLUT_REFRESH_TOKEN;
    const clientId = process.env.REVOLUT_CLIENT_ID;
    
    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'REVOLUT_REFRESH_TOKEN nicht konfiguriert',
      }, { status: 500 });
    }
    
    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'REVOLUT_CLIENT_ID nicht konfiguriert',
      }, { status: 500 });
    }

    // Load private key for JWT signing
    let privateKey: string;
    try {
      const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH || './certs/revolut/private.key';
      const fullPath = privateKeyPath.startsWith('./') 
        ? join(process.cwd(), privateKeyPath)
        : privateKeyPath;
      privateKey = readFileSync(fullPath, 'utf8');
    } catch {
      const envKey = process.env.REVOLUT_PRIVATE_KEY;
      if (!envKey) {
        return NextResponse.json({
          success: false,
          error: 'Private Key nicht gefunden',
        }, { status: 500 });
      }
      privateKey = envKey.replace(/\\n/g, '\n');
    }

    // Create JWT for client assertion
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'taskilo.de',
      sub: clientId,
      aud: 'https://revolut.com',
      iat: now,
      exp: now + 300,
    };

    const clientAssertion = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        kid: clientId,
      },
    });

    // Request new access token using refresh token
    const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
    const authUrl = isProduction
      ? 'https://business.revolut.com/oauth/token'
      : 'https://sandbox-business.revolut.com/oauth/token';

    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    });

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Token-Refresh fehlgeschlagen',
        status: response.status,
        details: responseText.substring(0, 500),
        hint: responseText.includes('cloudflare') 
          ? 'Cloudflare blockiert die Anfrage - Token muss manuell erneuert werden'
          : undefined,
      }, { status: response.status });
    }

    try {
      const tokenData = JSON.parse(responseText);
      
      return NextResponse.json({
        success: true,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        message: 'Token erfolgreich erneuert - bitte in .env.local und Vercel aktualisieren!',
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Ungültige Antwort von Revolut',
        details: responseText.substring(0, 500),
      }, { status: 500 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Revolut Token Refresh API',
    usage: 'POST /api/revolut/refresh-token',
    currentToken: process.env.REVOLUT_ACCESS_TOKEN ? 'vorhanden' : 'fehlt',
    refreshToken: process.env.REVOLUT_REFRESH_TOKEN ? 'vorhanden' : 'fehlt',
  });
}
