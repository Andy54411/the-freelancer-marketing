import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/revolut/token
 * 
 * Holt einen Revolut Access Token über Vercel (Cloudflare blockiert Hetzner).
 * Das Hetzner Payment-Backend ruft diesen Endpoint auf, um Tokens zu bekommen.
 */
export async function POST(request: NextRequest) {
  try {
    // API Key Validierung - prüfe gegen beide möglichen Keys
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.WEBMAIL_API_KEY;
    const internalKey = process.env.INTERNAL_API_KEY || 'taskilo-internal-2024';
    
    // Erlaube auch internen Key für Hetzner-Server
    const hetznerKey = '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076';
    
    if (!apiKey || (apiKey !== expectedKey && apiKey !== internalKey && apiKey !== hetznerKey)) {
      console.error('[Revolut Token] Unauthorized - API Key mismatch');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const scope = body.scope || 'READ';

    const clientId = process.env.REVOLUT_CLIENT_ID;
    const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH || './certs/revolut/private.key';
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'REVOLUT_CLIENT_ID not configured' },
        { status: 500 }
      );
    }

    // Load private key
    let privateKey: string;
    try {
      // Try reading from file path first
      const fullPath = privateKeyPath.startsWith('./') 
        ? join(process.cwd(), privateKeyPath)
        : privateKeyPath;
      privateKey = readFileSync(fullPath, 'utf8');
    } catch {
      // Fallback to environment variable
      const envKey = process.env.REVOLUT_PRIVATE_KEY;
      if (!envKey) {
        return NextResponse.json(
          { success: false, error: 'Private key not found' },
          { status: 500 }
        );
      }
      privateKey = envKey.replace(/\\n/g, '\n');
    }

    // Create JWT for client assertion
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'taskilo.de', // Issuer as configured in Revolut
      sub: clientId,
      aud: 'https://revolut.com',
      iat: now,
      exp: now + 300, // 5 minutes
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        kid: clientId,
      },
    });

    // Request access token
    const isProduction = process.env.REVOLUT_ENVIRONMENT === 'production';
    const authUrl = isProduction
      ? 'https://business.revolut.com/oauth/token'
      : 'https://sandbox-business.revolut.com/oauth/token';

    const formData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: token,
      scope: scope,
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
      console.error('[Revolut Token] Error:', response.status, responseText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Token request failed: ${response.status}`,
          details: responseText.substring(0, 500),
        },
        { status: response.status }
      );
    }

    const tokenData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
    });

  } catch (error) {
    console.error('[Revolut Token] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revolut/token
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'revolut-token-proxy',
    clientId: process.env.REVOLUT_CLIENT_ID ? 'configured' : 'missing',
    environment: process.env.REVOLUT_ENVIRONMENT || 'sandbox',
  });
}
