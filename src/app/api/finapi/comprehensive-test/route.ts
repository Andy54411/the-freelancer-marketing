import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import { AuthorizationApi, createConfiguration, ServerConfiguration } from 'finapi-client';

/**
 * Comprehensive finAPI API Test
 * Test ALL possible endpoints to understand exact capabilities
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
        },
        { status: 500 }
      );
    }

    // Step 1: Get client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const authConfig = createConfiguration({ baseServer: server });
    const authApi = new AuthorizationApi(authConfig);

    const clientToken = await authApi.getToken(
      'client_credentials',
      taskiloCredentials.clientId,
      taskiloCredentials.clientSecret
    );

    console.log('✅ Client credentials token obtained');

    // Comprehensive API Tests
    const testResults = {
      authentication: { success: true, message: 'Client credentials funktionieren' },
      tested_endpoints: [] as any[],
      working_endpoints: [] as any[],
      forbidden_endpoints: [] as any[],
      not_found_endpoints: [] as any[],
      error_endpoints: [] as any[],
    };

    // Define all finAPI endpoints to test
    const endpointsToTest = [
      // Basic Info
      { path: '/api/v2/clientConfiguration', method: 'GET', description: 'Client Configuration' },

      // Banks & Connections
      { path: '/api/v2/banks', method: 'GET', description: 'Bankenliste abrufen' },
      { path: '/api/v2/bankConnections', method: 'GET', description: 'Bank-Verbindungen anzeigen' },

      // Users (Service Provider Feature)
      { path: '/api/v2/users', method: 'GET', description: 'User-Liste (Service Provider)' },
      { path: '/api/v2/users', method: 'POST', description: 'User erstellen (Service Provider)' },

      // Accounts & Transactions
      { path: '/api/v2/accounts', method: 'GET', description: 'Konten abrufen' },
      { path: '/api/v2/transactions', method: 'GET', description: 'Transaktionen abrufen' },

      // Categories & Labels
      { path: '/api/v2/categories', method: 'GET', description: 'Kategorien verwalten' },
      { path: '/api/v2/labels', method: 'GET', description: 'Labels verwalten' },

      // Payments
      { path: '/api/v2/payments', method: 'GET', description: 'Zahlungen anzeigen' },
      { path: '/api/v2/standingOrders', method: 'GET', description: 'Daueraufträge' },

      // Web Forms (Service Provider Feature)
      { path: '/api/webForms/bankConnectionImport', method: 'GET', description: 'Web Form Info' },
      { path: '/api/webForms/bankConnectionUpdate', method: 'GET', description: 'Web Form Update' },

      // Mandator Admin (Admin Feature)
      {
        path: '/api/v2/mandatorAdmin/getIbanRuleList',
        method: 'GET',
        description: 'IBAN Rules (Admin)',
      },
      {
        path: '/api/v2/mandatorAdmin/getUserList',
        method: 'GET',
        description: 'User List (Admin)',
      },

      // Notifications
      { path: '/api/v2/notificationRules', method: 'GET', description: 'Benachrichtigungsregeln' },

      // Securities
      { path: '/api/v2/securities', method: 'GET', description: 'Wertpapiere' },

      // Mock Data (Test Environment)
      { path: '/api/v2/tests/mockBatchUpdate', method: 'GET', description: 'Mock Batch Updates' },

      // TPP (Third Party Provider)
      { path: '/api/v2/tppCertificates', method: 'GET', description: 'TPP Zertifikate' },
    ];

    // Test each endpoint
    for (const endpoint of endpointsToTest) {
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${clientToken.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          status: response.status,
          status_text: response.statusText,
          accessible: response.ok,
        };

        testResults.tested_endpoints.push(result);

        if (response.ok) {
          testResults.working_endpoints.push(result);
        } else if (response.status === 403) {
          testResults.forbidden_endpoints.push(result);
        } else if (response.status === 404) {
          testResults.not_found_endpoints.push(result);
        } else {
          testResults.error_endpoints.push(result);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          description: endpoint.description,
          status: 'ERROR',
          status_text: error.message,
          accessible: false,
        };

        testResults.tested_endpoints.push(result);
        testResults.error_endpoints.push(result);
      }
    }

    // Analysis Summary
    const summary = {
      total_tested: testResults.tested_endpoints.length,
      working_count: testResults.working_endpoints.length,
      forbidden_count: testResults.forbidden_endpoints.length,
      not_found_count: testResults.not_found_endpoints.length,
      error_count: testResults.error_endpoints.length,

      account_capabilities: {
        basic_info: testResults.working_endpoints.some(e =>
          e.endpoint.includes('clientConfiguration')
        ),
        banks_access: testResults.working_endpoints.some(e => e.endpoint.includes('banks')),
        user_management: testResults.working_endpoints.some(e => e.endpoint.includes('users')),
        account_access: testResults.working_endpoints.some(e => e.endpoint.includes('accounts')),
        transaction_access: testResults.working_endpoints.some(e =>
          e.endpoint.includes('transactions')
        ),
        payment_management: testResults.working_endpoints.some(e =>
          e.endpoint.includes('payments')
        ),
        web_forms: testResults.working_endpoints.some(e => e.endpoint.includes('webForms')),
        admin_functions: testResults.working_endpoints.some(e =>
          e.endpoint.includes('mandatorAdmin')
        ),
        categories_labels: testResults.working_endpoints.some(
          e => e.endpoint.includes('categories') || e.endpoint.includes('labels')
        ),
      },

      account_type_analysis: {
        is_service_provider: testResults.working_endpoints.some(
          e => e.endpoint.includes('users') && e.method === 'GET'
        ),
        is_admin: testResults.working_endpoints.some(e => e.endpoint.includes('mandatorAdmin')),
        is_standard_client: !testResults.working_endpoints.some(e => e.endpoint.includes('users')),
      },

      recommended_use_cases: [] as string[],
    };

    // Generate recommendations based on capabilities
    if (summary.account_capabilities.basic_info && summary.account_capabilities.banks_access) {
      summary.recommended_use_cases.push('Bank-Informationen und Listen abrufen');
    }

    if (summary.account_capabilities.user_management) {
      summary.recommended_use_cases.push(
        'Service Provider: User für Kunden erstellen und verwalten'
      );
      summary.recommended_use_cases.push('Web Form 2.0 Integration für Bank-Verbindungen');
    } else {
      summary.recommended_use_cases.push('Nur eigene Account-Daten verwalten (Standard Client)');
      summary.recommended_use_cases.push(
        'Alternative: Individual User Web Forms ohne Service Provider'
      );
    }

    if (summary.account_capabilities.admin_functions) {
      summary.recommended_use_cases.push('Mandator Admin: Platform-weite Verwaltung');
    }

    return NextResponse.json({
      success: true,
      environment: credentialType,
      base_url: baseUrl,
      client_id: taskiloCredentials.clientId,
      test_results: testResults,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Comprehensive test error:', error);

    return NextResponse.json(
      {
        error: 'Comprehensive test failed',
        details: error.message || 'Unknown error',
        environment: credentialType,
      },
      { status: 500 }
    );
  }
}
