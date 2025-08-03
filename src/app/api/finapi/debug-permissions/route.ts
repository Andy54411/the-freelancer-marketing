import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';

/**
 * Debug finAPI Account Permissions
 * Check what permissions Taskilo's finAPI account has
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

  try {
    // Get Taskilo's finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const taskiloCredentials = getFinApiCredentials(credentialType);

    if (!taskiloCredentials.clientId || !taskiloCredentials.clientSecret) {
      return NextResponse.json(
        { 
          error: 'finAPI credentials not configured',
          environment: credentialType,
          missing_env_vars: credentialType === 'sandbox' 
            ? ['FINAPI_SANDBOX_CLIENT_ID', 'FINAPI_SANDBOX_CLIENT_SECRET']
            : ['FINAPI_ADMIN_CLIENT_ID', 'FINAPI_ADMIN_CLIENT_SECRET']
        },
        { status: 500 }
      );
    }

    // Step 1: Get client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const authConfig = createConfiguration({ baseServer: server });
    const authApi = new AuthorizationApi(authConfig);

    let clientToken;
    try {
      clientToken = await authApi.getToken(
        'client_credentials',
        taskiloCredentials.clientId,
        taskiloCredentials.clientSecret
      );
      console.log('✅ Client credentials token obtained');
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError?.body || authError.message);
      return NextResponse.json(
        {
          error: 'finAPI authentication failed',
          details: authError?.body?.errors?.[0]?.message || authError.message,
          environment: credentialType,
          base_url: baseUrl,
        },
        { status: 401 }
      );
    }

    // Step 2: Try to make a simple API call to test permissions
    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    try {
      // Test with a simple request to see what we can do
      const testResponse = await fetch(`${baseUrl}/api/v2/clientConfiguration`, {
        headers: {
          'Authorization': `Bearer ${clientToken.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.ok) {
        const clientConfig = await testResponse.json();
        
        return NextResponse.json({
          success: true,
          environment: credentialType,
          base_url: baseUrl,
          client_info: {
            clientId: taskiloCredentials.clientId,
            hasServiceProviderPermissions: clientConfig.isServiceProvider || false,
            applicationName: clientConfig.applicationName || 'Unknown',
          },
          permissions: {
            canImportBankConnections: clientConfig.isServiceProvider || false,
            explanation: clientConfig.isServiceProvider 
              ? 'Service Provider permissions available - kann Bank-Verbindungen für User importieren'
              : 'Standard Client permissions - kann KEINE Bank-Verbindungen für andere User importieren',
            solution: !clientConfig.isServiceProvider 
              ? 'finAPI Account muss auf Service Provider Berechtigung upgraded werden'
              : 'Account has correct permissions',
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        const errorText = await testResponse.text();
        return NextResponse.json({
          success: false,
          environment: credentialType,
          authenticated: true,
          permissions_check_failed: true,
          error: `HTTP ${testResponse.status}: ${errorText}`,
          explanation: 'Client credentials funktionieren, aber Permissions-Check fehlgeschlagen',
        });
      }
    } catch (permissionError: any) {
      console.error('❌ Permission check failed:', permissionError);
      return NextResponse.json(
        {
          success: false,
          environment: credentialType,
          authenticated: true,
          permissions_unknown: true,
          error: 'Could not determine permissions',
          details: permissionError.message,
          suggestion: 'finAPI Account permissions unclear - contact finAPI support',
        },
        { status: 200 }
      );
    }

  } catch (error: any) {
    console.error('Debug permissions error:', error);

    return NextResponse.json(
      {
        error: 'Debug check failed',
        details: error.message || 'Unknown error',
        environment: credentialType,
      },
      { status: 500 }
    );
  }
}
