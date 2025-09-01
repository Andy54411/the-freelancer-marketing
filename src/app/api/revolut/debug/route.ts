import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debugging Revolut JWT setup...');

    // Check environment variables
    const clientId = process.env.REVOLUT_CLIENT_ID;
    const environment = process.env.REVOLUT_ENVIRONMENT;
    const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH;

    console.log('Environment variables:', {
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'NOT_SET',
      environment,
      privateKeyPath,
    });

    if (!clientId) {
      throw new Error('REVOLUT_CLIENT_ID not set');
    }

    if (!privateKeyPath) {
      throw new Error('REVOLUT_PRIVATE_KEY_PATH not set');
    }

    // Check if private key file exists
    const keyExists = fs.existsSync(privateKeyPath);
    console.log('Private key file exists:', keyExists);

    if (!keyExists) {
      throw new Error(`Private key file not found: ${privateKeyPath}`);
    }

    // Read private key
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    console.log('Private key loaded, length:', privateKey.length);

    // Generate JWT token
    const payload = {
      iss: clientId, // Issuer (Client ID)
      sub: clientId, // Subject (Client ID)
      aud:
        environment === 'production'
          ? 'https://b2b.revolut.com'
          : 'https://sandbox-b2b.revolut.com',
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + 300, // Expires in 5 minutes
      jti: Math.random().toString(36), // Unique token ID
    };

    console.log('JWT payload:', payload);

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: clientId,
    });

    console.log('JWT token generated, length:', token.length);

    // Test API call to business profile endpoint
    const baseUrl =
      environment === 'production'
        ? 'https://b2b.revolut.com/api'
        : 'https://sandbox-b2b.revolut.com/api';

    console.log('Testing API call to:', `${baseUrl}/1.0/businesses/me`);

    const response = await fetch(`${baseUrl}/1.0/businesses/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('API Response status:', response.status);
    console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('API Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Revolut API Error: ${response.status} - ${responseText}`);
    }

    const businessProfile = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      debug: {
        clientId: clientId.substring(0, 8) + '...',
        environment,
        keyPath: privateKeyPath,
        keyExists,
        keyLength: privateKey.length,
        tokenLength: token.length,
        apiUrl: baseUrl,
        responseStatus: response.status,
      },
      businessProfile,
    });
  } catch (error: any) {
    console.error('❌ Revolut Debug Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
        debug: {
          clientId: process.env.REVOLUT_CLIENT_ID ? 'SET' : 'NOT_SET',
          environment: process.env.REVOLUT_ENVIRONMENT,
          privateKeyPath: process.env.REVOLUT_PRIVATE_KEY_PATH,
        },
      },
      { status: 500 }
    );
  }
}
