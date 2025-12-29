/**
 * Revolut Token Proxy
 * 
 * Dieser Endpoint wird vom Hetzner Payment-Backend aufgerufen,
 * um Access Tokens von Revolut zu holen. Vercel-IPs werden von
 * Cloudflare nicht blockiert (im Gegensatz zu Datacenter-IPs).
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import https from 'https';
import fs from 'fs';

// API Key für Hetzner Backend
const HETZNER_API_KEY = process.env.WEBMAIL_API_KEY || '';

// Revolut Configuration
const REVOLUT_CLIENT_ID = process.env.REVOLUT_CLIENT_ID || '';
const REVOLUT_ENVIRONMENT = process.env.REVOLUT_ENVIRONMENT || 'sandbox';

function loadPrivateKey(): string {
  const keyPath = process.env.REVOLUT_PRIVATE_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  // Fallback: Inline key from environment
  return process.env.REVOLUT_PRIVATE_KEY || '';
}

async function getAccessTokenFromRevolut(scope: string): Promise<{ access_token: string; expires_in: number }> {
  return new Promise((resolve, reject) => {
    const privateKey = loadPrivateKey();
    
    if (!REVOLUT_CLIENT_ID || !privateKey) {
      reject(new Error('Revolut configuration incomplete'));
      return;
    }

    const isProduction = REVOLUT_ENVIRONMENT === 'production';
    const authUrl = isProduction
      ? 'https://business.revolut.com'
      : 'https://sandbox-business.revolut.com';

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'taskilo.de',
      sub: REVOLUT_CLIENT_ID,
      aud: 'https://revolut.com',
      iat: now,
      exp: now + 300,
    };

    let token: string;
    try {
      token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: {
          alg: 'RS256',
          typ: 'JWT',
        },
      });
    } catch (err) {
      reject(new Error(`JWT signing failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
      return;
    }

    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: token,
      scope: scope,
    }).toString();

    const url = new URL(`${authUrl}/oauth/token`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Revolut Auth Error: ${res.statusCode} - ${data.substring(0, 200)}`));
          return;
        }
        try {
          const tokenData = JSON.parse(data);
          resolve({
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in || 2400,
          });
        } catch {
          reject(new Error(`Failed to parse token response`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verify API Key from Hetzner
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
    
    if (!apiKey || apiKey !== HETZNER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const scope = body.scope || 'READ';

    const tokenData = await getAccessTokenFromRevolut(scope);

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      environment: REVOLUT_ENVIRONMENT,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Token Proxy Error]', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'revolut-token-proxy',
    environment: REVOLUT_ENVIRONMENT,
    configured: !!REVOLUT_CLIENT_ID,
  });
}
