import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { createPublicKey } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Load private key and convert to public key for JWK
    const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH || './certs/revolut/private.key';
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    // Create public key from private key
    const publicKey = createPublicKey(privateKey);

    // Convert to JWK format
    const jwk = publicKey.export({ format: 'jwk' });

    // Add required JWK fields
    const jwks = {
      keys: [
        {
          ...jwk,
          kid: process.env.REVOLUT_CLIENT_ID, // Key ID = Client ID
          alg: 'RS256', // Algorithm
          use: 'sig', // Usage: signature
          kty: 'RSA', // Key type
        },
      ],
    };

    console.log('✅ Generated JWKs for Revolut:', jwks);

    return NextResponse.json(jwks, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error('❌ JWKs Generation Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate JWKs',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
