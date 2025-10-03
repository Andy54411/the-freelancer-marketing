import { NextRequest, NextResponse } from 'next/server';
import { createDatevApiClient } from '@/lib/datev-api-client';
import { getDatevConfig } from '@/lib/datev-config';

/**
 * DATEV API Test Suite
 * Tests all available DATEV sandbox APIs with real credentials
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const testType = searchParams.get('test') || 'all';

    if (!accessToken) {
      return NextResponse.json({
        error: 'access_token_required',
        message: 'Access token is required to test DATEV APIs',
        usage: '/api/datev/test-apis?access_token=YOUR_TOKEN&test=all',
        available_tests: [
          'all',
          'userinfo',
          'cashregister',
          'master-clients',
          'extf-files',
          'dxso-jobs',
          'documents',
        ],
      });
    }

    const client = createDatevApiClient(accessToken);
    const config = getDatevConfig();
    const testResults: any = {
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: config.baseUrl,
        environment: config.baseUrl.includes('sandbox') ? 'sandbox' : 'production',
      },
      tests: {},
    };

    // Test UserInfo API (always included)
    if (testType === 'all' || testType === 'userinfo') {
      const userInfoResult = await client.getUserInfo();
      testResults.tests.userinfo = {
        endpoint: '/userinfo',
        ...userInfoResult,
        tested_at: new Date().toISOString(),
      };
    }

    // Test Cashregister Import API
    if (testType === 'all' || testType === 'cashregister') {
      // Test getting formats
      const formatsResult = await client.getCashRegisterFormats();
      testResults.tests.cashregister_formats = {
        endpoint: '/cashregister/import/formats',
        ...formatsResult,
        tested_at: new Date().toISOString(),
      };

      // Test sample import (with minimal data)
      const sampleData = {
        format: 'csv',
        data: 'sample test data',
        metadata: {
          description: 'Test import from Taskilo',
          source: 'api_test',
        },
      };

      const importResult = await client.importCashRegisterData(sampleData);
      testResults.tests.cashregister_import = {
        endpoint: '/cashregister/import',
        ...importResult,
        tested_at: new Date().toISOString(),
      };
    }

    // Test Master Data: Master Clients API
    if (testType === 'all' || testType === 'master-clients') {
      // Get master clients
      const clientsResult = await client.getMasterClients({ limit: 10 });
      testResults.tests.master_clients_list = {
        endpoint: '/master-data/master-clients',
        ...clientsResult,
        tested_at: new Date().toISOString(),
      };

      // Test creating a sample client
      const sampleClient = {
        name: 'Test Client - Taskilo',
        clientNumber: 'TEST_' + Date.now(),
        address: {
          street: 'Teststraße 1',
          city: 'Berlin',
          postalCode: '10115',
          country: 'DE',
        },
        contactInfo: {
          email: 'test@taskilo.de',
          phone: '+49 30 12345678',
        },
        metadata: {
          source: 'taskilo_api_test',
          created_by: 'api_test',
        },
      };

      const createClientResult = await client.createMasterClient(sampleClient);
      testResults.tests.master_clients_create = {
        endpoint: '/master-data/master-clients',
        method: 'POST',
        ...createClientResult,
        tested_at: new Date().toISOString(),
      };
    }

    // Test Accounting: EXTF Files API
    if (testType === 'all' || testType === 'extf-files') {
      const extfResult = await client.getExtfFiles({ limit: 10 });
      testResults.tests.extf_files = {
        endpoint: '/accounting/extf-files',
        ...extfResult,
        tested_at: new Date().toISOString(),
      };
    }

    // Test Accounting: DXSO Jobs API
    if (testType === 'all' || testType === 'dxso-jobs') {
      const jobsResult = await client.getDxsoJobs({ limit: 10 });
      testResults.tests.dxso_jobs_list = {
        endpoint: '/accounting/dxso-jobs',
        ...jobsResult,
        tested_at: new Date().toISOString(),
      };

      // Test creating a sample job
      const sampleJob = {
        type: 'export',
        format: 'csv',
        parameters: {
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31',
          includeMetadata: true,
        },
        metadata: {
          description: 'Test export job from Taskilo',
          source: 'api_test',
        },
      };

      const createJobResult = await client.createDxsoJob(sampleJob);
      testResults.tests.dxso_jobs_create = {
        endpoint: '/accounting/dxso-jobs',
        method: 'POST',
        ...createJobResult,
        tested_at: new Date().toISOString(),
      };
    }

    // Test Accounting: Documents API
    if (testType === 'all' || testType === 'documents') {
      const documentsResult = await client.getDocuments({ limit: 10 });
      testResults.tests.documents = {
        endpoint: '/accounting/documents',
        ...documentsResult,
        tested_at: new Date().toISOString(),
      };
    }

    // Summary
    const totalTests = Object.keys(testResults.tests).length;
    const successfulTests = Object.values(testResults.tests).filter(
      (test: any) => test.success
    ).length;

    testResults.summary = {
      total_tests: totalTests,
      successful_tests: successfulTests,
      failed_tests: totalTests - successfulTests,
      success_rate: totalTests > 0 ? (successfulTests / totalTests) * 100 : 0,
    };

    return NextResponse.json(testResults);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'test_error',
        message: `Failed to run DATEV API tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Run specific API test with custom data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, api, method = 'GET', endpoint, data } = body;

    if (!access_token) {
      return NextResponse.json(
        { error: 'access_token_required', message: 'Access token is required' },
        { status: 400 }
      );
    }

    if (!api || !endpoint) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'API and endpoint are required' },
        { status: 400 }
      );
    }

    const client = createDatevApiClient(access_token);
    const config = getDatevConfig();

    // Make custom API request
    let result;
    const fullEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (method === 'GET') {
      result = await (client as any).makeRequest(fullEndpoint);
    } else if (method === 'POST') {
      result = await (client as any).makeRequest(fullEndpoint, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      });
    } else if (method === 'PUT') {
      result = await (client as any).makeRequest(fullEndpoint, {
        method: 'PUT',
        body: JSON.stringify(data || {}),
      });
    } else if (method === 'DELETE') {
      result = await (client as any).makeRequest(fullEndpoint, {
        method: 'DELETE',
      });
    } else {
      return NextResponse.json(
        { error: 'unsupported_method', message: 'Unsupported HTTP method' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      test: {
        api,
        method,
        endpoint: fullEndpoint,
        base_url: config.baseUrl,
        ...result,
        tested_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'test_error',
        message: `Failed to run custom API test: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle preflight OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
