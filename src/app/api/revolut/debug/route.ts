import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const clientId = process.env.REVOLUT_CLIENT_ID;
    const environment = process.env.REVOLUT_ENVIRONMENT;
    const privateKeyPath = process.env.REVOLUT_PRIVATE_KEY_PATH;

    if (!clientId) {
      throw new Error('REVOLUT_CLIENT_ID not set');
    }

    if (!privateKeyPath) {
      throw new Error('REVOLUT_PRIVATE_KEY_PATH not set');
    }

    // Check if private key file exists
    const keyExists = fs.existsSync(privateKeyPath);

    if (!keyExists) {
      throw new Error(`Private key file not found: ${privateKeyPath}`);
    }

    // Read private key
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    // Generate JWT token
    // WICHTIG: iss muss 'taskilo.de' sein (wie in Revolut Dashboard konfiguriert)
    // aud muss 'https://revolut.com' sein
    const payload = {
      iss: 'taskilo.de', // Issuer (wie in Revolut Dashboard)
      sub: clientId, // Subject (Client ID)
      aud: 'https://revolut.com',
      iat: Math.floor(Date.now() / 1000), // Issued at
      exp: Math.floor(Date.now() / 1000) + 300, // Expires in 5 minutes
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
    });

    // Test API call to business profile endpoint
    const baseUrl =
      environment === 'production'
        ? 'https://b2b.revolut.com/api'
        : 'https://sandbox-b2b.revolut.com/api';

    const response = await fetch(`${baseUrl}/1.0/businesses/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const responseText = await response.text();

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
