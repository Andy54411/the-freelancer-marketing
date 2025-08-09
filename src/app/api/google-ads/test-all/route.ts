// ✅ Umfassende Google Ads Client Library Test Route
// Testet alle APIs systematisch mit der neuen Client Library

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const testMode = searchParams.get('mode') || 'all'; // 'all', 'auth', 'customers', 'campaigns', 'status'

    console.log('🧪 Starting comprehensive Google Ads Client Library tests...');

    const results: any = {
      testStarted: new Date().toISOString(),
      companyId,
      testMode,
      clientLibrary: true,
      results: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: [],
      },
    };

    // 1. ✅ SERVICE STATUS TEST
    if (testMode === 'all' || testMode === 'status') {
      console.log('📊 Testing Service Status...');
      try {
        const serviceStatus = await googleAdsClientService.getServiceStatus();
        results.results.serviceStatus = {
          test: 'Service Status Check',
          success: serviceStatus.success,
          data: serviceStatus.data,
          error: serviceStatus.error,
        };
        results.summary.total++;
        if (serviceStatus.success) results.summary.passed++;
        else results.summary.failed++;
      } catch (error: any) {
        // EXTREM detaillierte Fehlererfassung
        console.error('🔥 Service Status Error Details:', error);

        // Bessere Fehlermeldung extrahieren
        const primaryError =
          error.message ||
          error.error_description ||
          error.description ||
          error.details ||
          (error.response && JSON.stringify(error.response)) ||
          (typeof error === 'string' ? error : 'Service status check failed');

        const errorDetails = {
          message: primaryError,
          originalMessage: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          statusCode: error.statusCode || error.status,
          response: error.response?.data || error.response,
          headers: error.response?.headers,
          request: error.config
            ? {
                url: error.config.url,
                method: error.config.method,
                headers: error.config.headers,
                data: error.config.data,
              }
            : undefined,
          cause: error.cause,
          errno: error.errno,
          syscall: error.syscall,
          hostname: error.hostname,
          address: error.address,
          port: error.port,
          // Google Ads API spezifische Fehler
          googleAdsFailure: error.googleAdsFailure,
          errors: error.errors,
          details: error.details,
          // Vollständiges Error-Objekt für Debug
          fullError: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
        };

        results.results.serviceStatus = {
          test: 'Service Status Check',
          success: false,
          error: primaryError,
          data: {
            errorDetails,
            debug: {
              errorType: typeof error,
              errorConstructor: error.constructor?.name,
              hasStack: !!error.stack,
              timestamp: new Date().toISOString(),
            },
          },
        };
        results.summary.total++;
        results.summary.failed++;
        results.summary.errors.push(
          `Service Status: ${primaryError} (${error.name || 'Unknown Type'})`
        );
      }
    }

    // 2. ✅ AUTHENTICATION FLOW TEST
    if (testMode === 'all' || testMode === 'auth') {
      console.log('🔐 Testing Authentication Flow...');
      try {
        // Test OAuth URL generation
        const authUrl = googleAdsClientService.generateAuthUrl(
          companyId,
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-ads/callback`
        );

        results.results.authFlow = {
          test: 'OAuth URL Generation',
          success: true,
          data: {
            urlGenerated: !!authUrl,
            urlLength: authUrl.length,
            containsClientId: authUrl.includes(process.env.GOOGLE_ADS_CLIENT_ID || ''),
            containsScope: authUrl.includes('adwords'),
            url: authUrl.substring(0, 100) + '...', // Truncate for security
          },
        };
        results.summary.total++;
        results.summary.passed++;
      } catch (error: any) {
        // EXTREM detaillierte Fehlererfassung für Auth Flow
        console.error('🔥 Auth Flow Error Details:', error);

        // Bessere Fehlermeldung extrahieren
        const primaryError =
          error.message ||
          error.error_description ||
          error.description ||
          error.details ||
          (error.response && JSON.stringify(error.response)) ||
          `OAuth URL generation failed: Missing environment variables or invalid configuration`;

        const errorDetails = {
          message: primaryError,
          originalMessage: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          statusCode: error.statusCode || error.status,
          response: error.response?.data || error.response,
          headers: error.response?.headers,
          request: error.config
            ? {
                url: error.config.url,
                method: error.config.method,
                headers: error.config.headers,
                data: error.config.data,
              }
            : undefined,
          // OAuth spezifische Fehler
          oauthError: error.oauth_error,
          oauthErrorDescription: error.error_description,
          // Vollständiges Error-Objekt
          fullError: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
        };

        results.results.authFlow = {
          test: 'OAuth URL Generation',
          success: false,
          error: primaryError,
          data: {
            errorDetails,
            debug: {
              errorType: typeof error,
              errorConstructor: error.constructor?.name,
              hasStack: !!error.stack,
              environmentCheck: {
                hasClientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
                hasClientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
                hasDeveloperToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
              },
              timestamp: new Date().toISOString(),
            },
          },
        };
        results.summary.total++;
        results.summary.failed++;
        results.summary.errors.push(`Auth Flow: ${primaryError} (${error.name || 'Unknown Type'})`);
      }
    }

    // 3. ✅ STORED CONFIGURATION TEST
    let storedConfig: any = null;
    try {
      const googleAdsDocRef = db
        .collection('companies')
        .doc(companyId)
        .collection('integrations')
        .doc('googleAds');

      const googleAdsSnap = await googleAdsDocRef.get();

      if (googleAdsSnap.exists) {
        const data = googleAdsSnap.data();
        storedConfig = data?.accountConfig;

        results.results.storedConfig = {
          test: 'Stored Configuration Check',
          success: true,
          data: {
            configExists: true,
            hasRefreshToken: !!storedConfig?.refreshToken,
            hasAccessToken: !!storedConfig?.accessToken,
            hasClientId: !!storedConfig?.clientId,
            hasDeveloperToken: !!storedConfig?.developerToken,
            tokenExpiry: storedConfig?.tokenExpiry,
            isExpired: storedConfig?.tokenExpiry
              ? new Date(storedConfig.tokenExpiry.toDate()) < new Date()
              : null,
          },
        };
      } else {
        results.results.storedConfig = {
          test: 'Stored Configuration Check',
          success: false,
          error: 'No Google Ads configuration found for this company',
        };
      }
      results.summary.total++;
      if (storedConfig) results.summary.passed++;
      else results.summary.failed++;
    } catch (error: any) {
      // EXTREM detaillierte Fehlererfassung für Stored Config
      console.error('🔥 Stored Config Error Details:', error);

      // Bessere Fehlermeldung extrahieren
      const primaryError =
        error.message ||
        error.code ||
        error.details ||
        `Firebase configuration access failed for company ${companyId}`;

      const errorDetails = {
        message: primaryError,
        originalMessage: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        // Firebase spezifische Fehler
        firebaseError: error.code,
        firebaseMessage: error.message,
        // Vollständiges Error-Objekt
        fullError: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
      };

      results.results.storedConfig = {
        test: 'Stored Configuration Check',
        success: false,
        error: primaryError,
        data: {
          errorDetails,
          debug: {
            errorType: typeof error,
            errorConstructor: error.constructor?.name,
            companyId: companyId,
            timestamp: new Date().toISOString(),
          },
        },
      };
      results.summary.total++;
      results.summary.failed++;
      results.summary.errors.push(
        `Stored Config: ${primaryError} (${error.name || 'Unknown Type'})`
      );
    }

    // 4. ✅ CUSTOMER ACCESS TEST (nur wenn Config vorhanden)
    if ((testMode === 'all' || testMode === 'customers') && storedConfig?.refreshToken) {
      console.log('👥 Testing Customer Access...');
      try {
        const customersResponse = await googleAdsClientService.getAccessibleCustomers(
          storedConfig.refreshToken
        );

        results.results.customerAccess = {
          test: 'Accessible Customers',
          success: customersResponse.success,
          data: {
            customerCount: customersResponse.data?.length || 0,
            customers:
              customersResponse.data?.map((c: any) => ({
                id: c.id,
                name: c.name,
                status: c.status,
                manager: c.manager,
                testAccount: c.testAccount,
              })) || [],
          },
          error: customersResponse.error,
        };
        results.summary.total++;
        if (customersResponse.success) results.summary.passed++;
        else results.summary.failed++;
      } catch (error: any) {
        // EXTREM detaillierte Fehlererfassung für Customer Access
        console.error('🔥 Customer Access Error Details:', error);

        // Bessere Fehlermeldung extrahieren
        const primaryError =
          error.message ||
          error.error_description ||
          error.details ||
          (error.response && JSON.stringify(error.response)) ||
          `Failed to fetch accessible customers - Token may be expired or invalid`;

        const errorDetails = {
          message: primaryError,
          originalMessage: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          statusCode: error.statusCode || error.status,
          response: error.response?.data || error.response,
          headers: error.response?.headers,
          request: error.config
            ? {
                url: error.config.url,
                method: error.config.method,
                headers: error.config.headers,
              }
            : undefined,
          // Google Ads API spezifische Fehler
          googleAdsFailure: error.googleAdsFailure,
          errors: error.errors,
          details: error.details,
          // OAuth Token spezifische Probleme
          tokenInfo: {
            hasRefreshToken: !!storedConfig?.refreshToken,
            refreshTokenLength: storedConfig?.refreshToken?.length,
            tokenExpiry: storedConfig?.tokenExpiry,
            isExpired: storedConfig?.tokenExpiry
              ? new Date(storedConfig.tokenExpiry.toDate()) < new Date()
              : null,
          },
          // Vollständiges Error-Objekt
          fullError: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))),
        };

        results.results.customerAccess = {
          test: 'Accessible Customers',
          success: false,
          error: primaryError,
          data: {
            errorDetails,
            debug: {
              errorType: typeof error,
              errorConstructor: error.constructor?.name,
              hasStoredConfig: !!storedConfig,
              timestamp: new Date().toISOString(),
            },
          },
        };
        results.summary.total++;
        results.summary.failed++;
        results.summary.errors.push(
          `Customer Access: ${primaryError} (${error.name || 'Unknown Type'})`
        );
      }
    }

    // 5. ✅ CONNECTION STATUS TEST (nur wenn Config vorhanden)
    if ((testMode === 'all' || testMode === 'status') && storedConfig) {
      console.log('🔗 Testing Connection Status...');
      try {
        const connectionStatus = await googleAdsClientService.checkConnectionStatus(storedConfig);

        results.results.connectionStatus = {
          test: 'Connection Status Check',
          success: connectionStatus.success,
          data: connectionStatus.data,
          error: connectionStatus.error,
        };
        results.summary.total++;
        if (connectionStatus.success) results.summary.passed++;
        else results.summary.failed++;
      } catch (error: any) {
        results.results.connectionStatus = {
          test: 'Connection Status Check',
          success: false,
          error: error.message,
        };
        results.summary.total++;
        results.summary.failed++;
        results.summary.errors.push(`Connection Status: ${error.message}`);
      }
    }

    // 6. ✅ CAMPAIGNS TEST (nur wenn Config vorhanden)
    if ((testMode === 'all' || testMode === 'campaigns') && storedConfig?.refreshToken) {
      console.log('📊 Testing Campaigns Access...');
      try {
        // Get first customer ID for campaigns test
        const customersResponse = await googleAdsClientService.getAccessibleCustomers(
          storedConfig.refreshToken
        );

        if (
          customersResponse.success &&
          customersResponse.data &&
          customersResponse.data.length > 0
        ) {
          const customerId = customersResponse.data[0].id;

          const campaignsResponse = await googleAdsClientService.getCampaigns(
            storedConfig.refreshToken,
            customerId
          );

          results.results.campaigns = {
            test: 'Campaigns Access',
            success: campaignsResponse.success,
            data: {
              customerId,
              campaignCount: campaignsResponse.data?.campaigns?.length || 0,
              campaigns:
                campaignsResponse.data?.campaigns?.slice(0, 3).map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  status: c.status,
                  type: c.type,
                  budget: c.budget,
                  impressions: c.metrics?.impressions,
                })) || [],
            },
            error: campaignsResponse.error,
          };
          results.summary.total++;
          if (campaignsResponse.success) results.summary.passed++;
          else results.summary.failed++;
        } else {
          results.results.campaigns = {
            test: 'Campaigns Access',
            success: false,
            error: 'No accessible customers found for campaigns test',
          };
          results.summary.total++;
          results.summary.failed++;
        }
      } catch (error: any) {
        results.results.campaigns = {
          test: 'Campaigns Access',
          success: false,
          error: error.message,
        };
        results.summary.total++;
        results.summary.failed++;
        results.summary.errors.push(`Campaigns: ${error.message}`);
      }
    }

    // 7. ✅ CUSTOMER INFO TEST (nur wenn Config vorhanden)
    if ((testMode === 'all' || testMode === 'customers') && storedConfig?.refreshToken) {
      console.log('📋 Testing Customer Info...');
      try {
        const customersResponse = await googleAdsClientService.getAccessibleCustomers(
          storedConfig.refreshToken
        );

        if (
          customersResponse.success &&
          customersResponse.data &&
          customersResponse.data.length > 0
        ) {
          const customerId = customersResponse.data[0].id;

          const customerInfo = await googleAdsClientService.getCustomerInfo(
            storedConfig.refreshToken,
            customerId
          );

          results.results.customerInfo = {
            test: 'Customer Info Details',
            success: customerInfo.success,
            data: customerInfo.data,
            error: customerInfo.error,
          };
          results.summary.total++;
          if (customerInfo.success) results.summary.passed++;
          else results.summary.failed++;
        } else {
          results.results.customerInfo = {
            test: 'Customer Info Details',
            success: false,
            error: 'No accessible customers found for customer info test',
          };
          results.summary.total++;
          results.summary.failed++;
        }
      } catch (error: any) {
        results.results.customerInfo = {
          test: 'Customer Info Details',
          success: false,
          error: error.message,
        };
        results.summary.total++;
        results.summary.failed++;
        results.summary.errors.push(`Customer Info: ${error.message}`);
      }
    }

    // ✅ FINAL SUMMARY
    results.testCompleted = new Date().toISOString();
    results.duration = new Date().getTime() - new Date(results.testStarted).getTime();
    results.summary.successRate =
      results.summary.total > 0
        ? Math.round((results.summary.passed / results.summary.total) * 100)
        : 0;

    const overallSuccess = results.summary.successRate >= 80; // 80% success rate threshold

    console.log(
      `✅ Test completed: ${results.summary.passed}/${results.summary.total} passed (${results.summary.successRate}%)`
    );

    return NextResponse.json({
      success: overallSuccess,
      message: `Google Ads Client Library Tests: ${results.summary.passed}/${results.summary.total} passed`,
      ...results,
    });
  } catch (error: any) {
    console.error('❌ Test suite error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test suite execution failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
