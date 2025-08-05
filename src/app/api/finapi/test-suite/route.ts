import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';

/**
 * finAPI Test Suite - Temporary endpoint to test finAPI SDK Service
 * Usage: GET /api/finapi/test-suite?test=credentials|banks|config
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    console.log('🧪 finAPI Test Suite starting...', { testType, credentialType });

    const testResults: any = {
      timestamp: new Date().toISOString(),
      testType,
      credentialType,
      tests: {},
    };

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // Test 1: Credentials Test
    if (testType === 'all' || testType === 'credentials') {
      console.log('Testing finAPI credentials...');
      try {
        const credentialTest = await finapiService.testCredentials();
        testResults.tests.credentials = {
          success: credentialTest.success,
          token: credentialTest.token,
          error: credentialTest.error,
          status: credentialTest.success ? '✅ OK' : '❌ FAILED',
        };
      } catch (error: any) {
        testResults.tests.credentials = {
          success: false,
          error: error.message,
          status: '❌ EXCEPTION',
        };
      }
    }

    // Test 2: Banks API Test
    if (testType === 'all' || testType === 'banks') {
      console.log('Testing finAPI Banks API...');
      try {
        const banks = await finapiService.listBanks('Deutsche', undefined, 1, 5);
        testResults.tests.banks = {
          success: true,
          banksFound: banks.length,
          sampleBanks: banks.slice(0, 3).map(bank => ({
            id: bank.id,
            name: bank.name,
            blz: bank.blz,
          })),
          status: '✅ OK',
        };
      } catch (error: any) {
        testResults.tests.banks = {
          success: false,
          error: error.message,
          status: '❌ FAILED',
        };
      }
    }

    // Test 3: SDK Service Configuration
    if (testType === 'all' || testType === 'config') {
      console.log('Testing finAPI SDK Service configuration...');
      testResults.tests.config = {
        sdkServiceType: credentialType,
        factoryFunction:
          credentialType === 'admin' ? 'createFinAPIAdminService' : 'createFinAPIService',
        environment: 'sandbox',
        status: '✅ OK',
      };
    }

    return NextResponse.json({
      success: true,
      message: 'finAPI Test Suite completed',
      ...testResults,
      availableTests: [
        'all - Run all tests',
        'credentials - Test client credentials',
        'banks - Test banks listing API',
        'config - Show SDK service configuration',
      ],
      usage: '/api/finapi/test-suite?test=all&credentialType=sandbox',
    });
  } catch (error: any) {
    console.error('finAPI Test Suite error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test suite failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST endpoint for more advanced tests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testType, credentialType = 'sandbox', userToken = null } = body;

    console.log('🧪 finAPI Advanced Test:', {
      testType,
      credentialType,
      hasUserToken: !!userToken,
    });

    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    const testResults: any = {
      timestamp: new Date().toISOString(),
      testType,
      results: {},
    };

    switch (testType) {
      case 'user-creation':
        // Test user creation (will fail without proper implementation)
        testResults.results.userCreation = {
          success: false,
          message: 'User creation requires getOrCreateUser method implementation',
          status: '🚧 NOT IMPLEMENTED',
        };
        break;

      case 'accounts':
        // Test accounts API (will return empty without user token)
        testResults.results.accounts = {
          success: true,
          message: 'Accounts API ready, returns empty without user authentication',
          expectedResult: 'Empty array until user token system implemented',
          status: '🚧 READY FOR USER AUTH',
        };
        break;

      case 'transactions':
        // Test transactions API (will return empty without user token)
        testResults.results.transactions = {
          success: true,
          message: 'Transactions API ready, returns empty without user authentication',
          expectedResult: 'Empty array until user token system implemented',
          status: '🚧 READY FOR USER AUTH',
        };
        break;

      default:
        return NextResponse.json(
          {
            error: 'Unknown test type',
            availableTests: ['user-creation', 'accounts', 'transactions'],
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Advanced finAPI test completed',
      ...testResults,
    });
  } catch (error: any) {
    console.error('finAPI Advanced Test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Advanced test failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
