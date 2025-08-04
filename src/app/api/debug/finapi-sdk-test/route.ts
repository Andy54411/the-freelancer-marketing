// src/app/api/debug/finapi-sdk-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * Test the new finAPI SDK Service
 * Tests all major functionality with the confirmed working credentials
 */
export async function GET(_request: NextRequest) {
  try {
    console.log('🧪 Testing finAPI SDK Service...');

    const results: {
      timestamp: string;
      tests: Record<string, unknown>;
      sdk_version: string;
      credentials_source: string;
      summary?: {
        successful_tests: number;
        total_tests: number;
        success_rate: string;
        status: string;
      };
      recommendation?: string;
    } = {
      timestamp: new Date().toISOString(),
      tests: {},
      sdk_version: 'finapi-client v1.0.3',
      credentials_source: 'Environment Variables (updated August 2025)',
    };

    // TEST 1: Credential Test
    console.log('🔑 Test 1: Credential validation...');
    try {
      const credentialTest = await finapiService.testCredentials();
      results.tests.credentials = {
        success: credentialTest.success,
        token_preview: credentialTest.token,
        error: credentialTest.error,
      };
    } catch (error: any) {
      results.tests.credentials = {
        success: false,
        error: error.message,
      };
    }

    // TEST 2: List Banks
    console.log('🏦 Test 2: List banks...');
    try {
      const banks = await finapiService.listBanks(undefined, 'demo', 1, 5);
      results.tests.list_banks = {
        success: true,
        bank_count: banks.length,
        sample_banks: banks.slice(0, 3).map(bank => ({
          id: bank.id,
          name: bank.name,
          location: bank.location,
        })),
      };
    } catch (error: any) {
      results.tests.list_banks = {
        success: false,
        error: error.message,
      };
    }

    // TEST 3: User Management (Create & Get Token)
    console.log('👤 Test 3: User management...');
    const testUserId = `taskilo_sdk_test_${Date.now()}`;
    const testPassword = 'SDKTestPassword123!';
    
    try {
      const userResult = await finapiService.getOrCreateUser(
        testUserId,
        testPassword,
        `${testUserId}@taskilo.de`
      );

      results.tests.user_management = {
        success: true,
        user_id: userResult.user.id,
        token_preview: userResult.userToken ? `${userResult.userToken.substring(0, 20)}...` : null,
      };

      // TEST 4: User-specific operations (Bank Connections, Accounts)
      console.log('🔗 Test 4: User-specific operations...');
      try {
        const bankConnections = await finapiService.getBankConnections(userResult.userToken);
        const accounts = await finapiService.getAccounts(userResult.userToken);

        results.tests.user_operations = {
          success: true,
          bank_connections_count: bankConnections.length,
          accounts_count: accounts.length,
        };
      } catch (error: any) {
        results.tests.user_operations = {
          success: false,
          error: error.message,
        };
      }

    } catch (error: any) {
      results.tests.user_management = {
        success: false,
        error: error.message,
      };
    }

    // Overall assessment
    const successfulTests = Object.values(results.tests).filter((test: any) => test.success).length;
    const totalTests = Object.keys(results.tests).length;
    
    results.summary = {
      successful_tests: successfulTests,
      total_tests: totalTests,
      success_rate: `${((successfulTests / totalTests) * 100).toFixed(1)}%`,
      status: successfulTests === totalTests ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED',
    };

    if (successfulTests === totalTests) {
      results.recommendation = '✅ finAPI SDK Service is fully functional! Ready for production integration.';
    } else {
      results.recommendation = '⚠️ Some tests failed. Check environment variables and credentials.';
    }

    console.log('✅ finAPI SDK Service test completed');
    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ finAPI SDK Service test failed:', error);
    return NextResponse.json({
      error: 'SDK Service test failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
