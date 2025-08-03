import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import { AuthorizationApi, createConfiguration, ServerConfiguration } from 'finapi-client';

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
          missing_env_vars:
            credentialType === 'sandbox'
              ? ['FINAPI_SANDBOX_CLIENT_ID', 'FINAPI_SANDBOX_CLIENT_SECRET']
              : ['FINAPI_ADMIN_CLIENT_ID', 'FINAPI_ADMIN_CLIENT_SECRET'],
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
      // Test 1: Get client configuration
      const clientConfigResponse = await fetch(`${baseUrl}/api/v2/clientConfiguration`, {
        headers: {
          Authorization: `Bearer ${clientToken.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!clientConfigResponse.ok) {
        const errorText = await clientConfigResponse.text();
        return NextResponse.json({
          success: false,
          environment: credentialType,
          authenticated: true,
          client_config_failed: true,
          error: `HTTP ${clientConfigResponse.status}: ${errorText}`,
          explanation: 'Client credentials funktionieren, aber Client-Config nicht abrufbar',
          capabilities: {
            note: 'Grundlegende API-Tests nicht möglich da Client-Config fehlschlägt',
          },
        });
      }

      const clientConfig = await clientConfigResponse.json();

      // Test 2: Try to list banks (basic functionality)
      const banksResponse = await fetch(`${baseUrl}/api/v2/banks?page=1&perPage=10`, {
        headers: {
          Authorization: `Bearer ${clientToken.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Test 3: Try to access users endpoint (service provider feature)
      const usersResponse = await fetch(`${baseUrl}/api/v2/users?page=1&perPage=1`, {
        headers: {
          Authorization: `Bearer ${clientToken.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Test 4: Try to access mandator admin endpoints
      const mandatorResponse = await fetch(`${baseUrl}/api/v2/mandatorAdmin/getIbanRuleList`, {
        headers: {
          Authorization: `Bearer ${clientToken.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Test 5: Try WebForm endpoint availability
      const webFormTestResponse = await fetch(`${baseUrl}/api/webForms/bankConnectionImport`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientToken.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: 277672, // Test bank
          callbacks: {
            successCallback: 'https://test.com/success',
            errorCallback: 'https://test.com/error',
          },
        }),
      });

      const capabilities = {
        client_configuration: {
          accessible: clientConfigResponse.ok,
          status: clientConfigResponse.status,
          isServiceProvider: clientConfig?.isServiceProvider || false,
          applicationName: clientConfig?.applicationName || 'Unknown',
        },
        banks_api: {
          accessible: banksResponse.ok,
          status: banksResponse.status,
          description: banksResponse.ok
            ? 'Kann Bankenliste abrufen ✅'
            : 'Keine Berechtigung für Bankenliste ❌',
        },
        users_api: {
          accessible: usersResponse.ok,
          status: usersResponse.status,
          description: usersResponse.ok
            ? 'Service Provider - kann User verwalten ✅'
            : usersResponse.status === 403
              ? 'Keine Service Provider Berechtigung ❌'
              : 'Users API nicht verfügbar ❌',
        },
        mandator_admin: {
          accessible: mandatorResponse.ok,
          status: mandatorResponse.status,
          description: mandatorResponse.ok
            ? 'Mandator Admin Zugriff ✅'
            : 'Kein Mandator Admin Zugriff ❌',
        },
        web_forms: {
          accessible: webFormTestResponse.ok,
          status: webFormTestResponse.status,
          description: webFormTestResponse.ok
            ? 'Web Forms verfügbar ✅'
            : webFormTestResponse.status === 401
              ? 'Web Forms benötigen User-Token ⚠️'
              : webFormTestResponse.status === 403
                ? 'Keine Web Form Berechtigung ❌'
                : 'Web Forms nicht verfügbar ❌',
        },
      };

      return NextResponse.json({
        success: true,
        environment: credentialType,
        base_url: baseUrl,
        client_info: {
          clientId: taskiloCredentials.clientId,
          hasServiceProviderPermissions: clientConfig?.isServiceProvider || false,
          applicationName: clientConfig?.applicationName || 'Unknown',
        },
        capabilities,
        summary: {
          account_type: clientConfig?.isServiceProvider
            ? 'Service Provider ✅'
            : 'Standard Client ❌',
          can_manage_users: usersResponse.ok,
          can_access_banks: banksResponse.ok,
          can_use_webforms: webFormTestResponse.ok || webFormTestResponse.status === 401,
          recommended_approach: !clientConfig?.isServiceProvider
            ? 'Account auf Service Provider upgraden oder Alternative nutzen'
            : 'Web Form 2.0 Integration möglich',
        },
        permissions: {
          canImportBankConnections: clientConfig?.isServiceProvider || false,
          explanation: clientConfig?.isServiceProvider
            ? 'Service Provider permissions available - kann Bank-Verbindungen für User importieren'
            : 'Standard Client permissions - kann KEINE Bank-Verbindungen für andere User importieren',
          solution: !clientConfig?.isServiceProvider
            ? 'finAPI Account muss auf Service Provider Berechtigung upgraded werden'
            : 'Account has correct permissions',
        },
        timestamp: new Date().toISOString(),
      });
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
