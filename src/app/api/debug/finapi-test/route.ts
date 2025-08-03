import { NextRequest, NextResponse } from 'next/server';

interface CredentialTest {
  name: string;
  clientId: { exists: boolean; length?: number; format?: string };
  clientSecret: { exists: boolean; length?: number; format?: string };
}

interface ConnectivityTest {
  name: string;
  status?: number;
  reachable: boolean;
  error?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Test verschiedene finAPI Auth-Szenarien
    const tests: (CredentialTest | ConnectivityTest)[] = [];

    // 1. Test Sandbox Credentials Format
    const sandboxClientId = process.env.FINAPI_SANDBOX_CLIENT_ID;
    const sandboxClientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    tests.push({
      name: 'Sandbox Credentials',
      clientId: sandboxClientId
        ? {
            exists: true,
            length: sandboxClientId.length,
            format: /^[a-f0-9-]{36}$/i.test(sandboxClientId) ? 'UUID' : 'OTHER',
          }
        : { exists: false },
      clientSecret: sandboxClientSecret
        ? {
            exists: true,
            length: sandboxClientSecret.length,
            format: /^[a-f0-9-]{36}$/i.test(sandboxClientSecret) ? 'UUID' : 'OTHER',
          }
        : { exists: false },
    });

    // 2. Test Admin Credentials Format
    const adminClientId = process.env.FINAPI_ADMIN_CLIENT_ID;
    const adminClientSecret = process.env.FINAPI_ADMIN_CLIENT_SECRET;

    tests.push({
      name: 'Admin Credentials',
      clientId: adminClientId
        ? {
            exists: true,
            length: adminClientId.length,
            format: /^[a-f0-9-]{36}$/i.test(adminClientId) ? 'UUID' : 'OTHER',
          }
        : { exists: false },
      clientSecret: adminClientSecret
        ? {
            exists: true,
            length: adminClientSecret.length,
            format: /^[a-f0-9-]{36}$/i.test(adminClientSecret) ? 'UUID' : 'OTHER',
          }
        : { exists: false },
    });

    // 3. Test finAPI Sandbox Connectivity
    try {
      const connectivityTest = await fetch('https://sandbox.finapi.io/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic dGVzdDp0ZXN0', // test:test in base64
        },
        body: 'grant_type=client_credentials',
      });

      tests.push({
        name: 'Sandbox Connectivity',
        status: connectivityTest.status,
        reachable: true,
      });
    } catch (error) {
      tests.push({
        name: 'Sandbox Connectivity',
        reachable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests,
      expectedCredentialFormat: 'UUID (36 characters with dashes)',
      note: 'This endpoint helps diagnose finAPI credential issues without exposing sensitive data',
    });
  } catch (error) {
    console.error('Credential test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
