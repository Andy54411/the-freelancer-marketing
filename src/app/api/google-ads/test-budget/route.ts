// Test Budget Creation API for Google Ads
// Isolierter Test der Budget-Erstellung zur Fehlerdiagnose

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log('🧪 Testing Google Ads Budget Creation for:', companyId);

    // Try to get Google Ads configuration using same logic as status API
    let googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');
    let googleAdsSnap = await googleAdsDocRef.get();
    let actualCompanyId = companyId;

    console.log('🔍 Debug Google Ads test-budget Check:', {
      companyId,
      docExists: googleAdsSnap.exists,
      docPath: `companies/${companyId}/integrations/googleAds`,
      timestamp: new Date().toISOString(),
    });

    // If not found with provided companyId, search all companies for Google Ads config
    if (!googleAdsSnap.exists) {
      console.log(`🔍 Google Ads config not found for ${companyId}, searching all companies...`);

      const companiesRef = db.collection('companies');
      const companiesSnap = await companiesRef.get();

      for (const companyDoc of companiesSnap.docs) {
        const testGoogleAdsDocRef = companyDoc.ref.collection('integrations').doc('googleAds');
        const testGoogleAdsSnap = await testGoogleAdsDocRef.get();

        if (testGoogleAdsSnap.exists) {
          console.log(`✅ Found Google Ads config for company: ${companyDoc.id}`);
          googleAdsDocRef = testGoogleAdsDocRef;
          googleAdsSnap = testGoogleAdsSnap;
          actualCompanyId = companyDoc.id;
          break;
        }
      }

      if (!googleAdsSnap.exists) {
        console.log('❌ No Google Ads configuration found in any company');
        return NextResponse.json(
          {
            error: 'No Google Ads configuration found',
            searchedCompanyId: companyId,
            message: 'No company has Google Ads integration set up',
          },
          { status: 404 }
        );
      }
    }

    const data = googleAdsSnap.data();
    const accountConfig = data?.accountConfig;

    if (!accountConfig?.refreshToken) {
      return NextResponse.json(
        {
          error: 'No refresh token found',
          searchedCompanyId: companyId,
          actualCompanyId,
        },
        { status: 400 }
      );
    }

    // Get first customer
    const customersResponse = await googleAdsClientService.getAccessibleCustomers(
      accountConfig.refreshToken
    );

    if (!customersResponse.success || !customersResponse.data?.length) {
      return NextResponse.json(
        { error: 'No customers found', details: customersResponse.error },
        { status: 400 }
      );
    }

    // ✅ WICHTIG: Verwende ersten AKTIVEN Account, nicht einfach den ersten
    const enabledCustomer = customersResponse.data.find(c => c.status === 'ENABLED');
    const customerId = enabledCustomer?.id || customersResponse.data[0].id;
    console.log(
      '🎯 Testing budget creation for customer:',
      customerId,
      enabledCustomer ? '(ENABLED)' : '(FALLBACK - CHECK ACCOUNT STATUS)'
    );

    // Test direct budget creation with Google Ads API
    const { GoogleAdsApi } = await import('google-ads-api');

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: accountConfig.refreshToken,
    });

    // Test 1: Simple budget creation
    console.log('💰 Test 1: Creating simple budget...');
    try {
      const budgetResult = await customer.campaignBudgets.create([
        {
          name: `Test Budget ${Date.now()}`,
          amount_micros: 50000000, // 50€
          delivery_method: 'STANDARD',
          explicitly_shared: false,
        },
      ]);

      const budgetResourceName = budgetResult.results[0].resource_name;
      console.log('✅ Budget created successfully:', budgetResourceName);

      return NextResponse.json({
        success: true,
        message: 'Budget creation test passed',
        data: {
          searchedCompanyId: companyId,
          actualCompanyId,
          customerId,
          budgetResourceName,
          budgetId: budgetResourceName.split('/')[3],
          test: 'simple_budget_creation',
        },
      });
    } catch (budgetError: any) {
      console.error('❌ Budget creation failed:', budgetError);

      // Extract all possible error information
      const errorInfo = {
        name: budgetError.name,
        message: budgetError.message,
        code: budgetError.code,
        status: budgetError.status,
        details: budgetError.details,
        failures: budgetError.failures,
        stack: budgetError.stack?.substring(0, 500),
        // Google Ads specific errors
        errors: budgetError.errors,
        error_code: budgetError.error_code,
        request_id: budgetError.request_id,
        // Full object for debugging
        fullError: JSON.parse(JSON.stringify(budgetError, Object.getOwnPropertyNames(budgetError))),
      };

      return NextResponse.json({
        success: false,
        error: 'Budget creation test failed',
        data: {
          searchedCompanyId: companyId,
          actualCompanyId,
          customerId,
          test: 'simple_budget_creation',
          errorInfo,
          primaryError: budgetError.message || budgetError.details || 'Unknown error',
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Budget test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Budget test execution failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
