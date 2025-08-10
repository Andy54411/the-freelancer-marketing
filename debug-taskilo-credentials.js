#!/usr/bin/env node

/**
 * ✅ Debug: Google Ads Credentials und Taskilo Account Test
 * Account ID: 526-719-5046 (Taskilo)
 */

const { GoogleAdsApi } = require('google-ads-api');

// HARDCODED Credentials aus dem Code
const CREDENTIALS = {
  client_id: '1022290879475-s3cbfm0s99pv7s6pk9p1r3q0u7a1rvcl.apps.googleusercontent.com',
  client_secret: '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',
  developer_token: 'e_hZoYxYJKLOsULXAi86Og',
};

// ECHTE TASKILO ACCOUNT ID (ohne Bindestriche für Google Ads API)
const TASKILO_CUSTOMER_ID = '5267195046';

console.log('🔧 Google Ads Credentials Debug');
console.log('📋 Using Credentials:');
console.log(`   Client ID: ${CREDENTIALS.client_id}`);
console.log(`   Client Secret: ${CREDENTIALS.client_secret.substring(0, 20)}...`);
console.log(`   Developer Token: ${CREDENTIALS.developer_token}`);
console.log('');
console.log(`🎯 Testing Account: Taskilo (${TASKILO_CUSTOMER_ID})`);
console.log('');

async function debugGoogleAdsCredentials() {
  try {
    // 1. Test Token Refresh DIREKT
    console.log('🔍 Step 1: Testing Token Refresh Directly...');

    // Hole gespeicherten Refresh Token
    let refreshToken = null;
    try {
      console.log('📡 Fetching stored refresh token...');
      const response = await fetch(
        'https://taskilo.de/api/google-ads/firestore-debug?companyId=0Rj5vGkBjeXrzZKBr4cFfV0jRuw1'
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Firestore Response:', {
          success: data.success,
          hasData: !!data.data,
          hasAccountConfig: !!data.data?.accountConfig,
          hasRefreshToken: !!data.data?.accountConfig?.refreshToken,
        });

        if (data.success && data.data?.accountConfig?.refreshToken) {
          refreshToken = data.data.accountConfig.refreshToken;
          console.log('✅ Found refresh token');
          console.log(`   Token: ${refreshToken.substring(0, 30)}...`);
        } else {
          console.log('❌ No refresh token found in response');
        }
      } else {
        console.log(`❌ Firestore request failed: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      console.error('❌ Failed to fetch refresh token:', fetchError.message);
    }

    if (!refreshToken) {
      console.log('⚠️ No refresh token available. Testing would require OAuth setup.');
      console.log('📋 To get a refresh token:');
      console.log('   1. Visit: https://taskilo.de/dashboard/company/google-ads');
      console.log('   2. Complete OAuth flow');
      console.log('   3. Re-run this test');
      return;
    }

    // 2. Direct Token Refresh Test
    console.log('🔄 Step 2: Testing Direct Token Refresh...');

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CREDENTIALS.client_id,
          client_secret: CREDENTIALS.client_secret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      console.log(`📊 Token refresh response: ${tokenResponse.status} ${tokenResponse.statusText}`);

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        console.log('✅ Token refresh successful!');
        console.log(`   New Access Token: ${tokenData.access_token.substring(0, 30)}...`);
        console.log(`   Token Type: ${tokenData.token_type}`);
        console.log(`   Expires In: ${tokenData.expires_in} seconds`);

        // 3. Test Google Ads Client Library
        console.log('');
        console.log('🚀 Step 3: Testing Google Ads Client Library...');

        const client = new GoogleAdsApi({
          client_id: CREDENTIALS.client_id,
          client_secret: CREDENTIALS.client_secret,
          developer_token: CREDENTIALS.developer_token,
        });

        const customer = client.Customer({
          customer_id: TASKILO_CUSTOMER_ID,
          refresh_token: refreshToken,
        });

        console.log('🔍 Testing customer query...');
        const customerInfo = await customer.query(`
          SELECT 
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone,
            customer.status,
            customer.manager,
            customer.test_account
          FROM customer
          LIMIT 1
        `);

        if (customerInfo && customerInfo.length > 0) {
          const info = customerInfo[0].customer;
          console.log('✅ Google Ads API Access Successful!');
          console.log('📋 Taskilo Account Details:');
          console.log(`   ID: ${info.id}`);
          console.log(`   Name: ${info.descriptive_name}`);
          console.log(`   Currency: ${info.currency_code}`);
          console.log(`   Timezone: ${info.time_zone}`);
          console.log(`   Status: ${info.status}`);
          console.log(`   Manager Account: ${info.manager}`);
          console.log(`   Test Account: ${info.test_account}`);
          console.log('');

          // 4. Test Campaign Creation
          console.log('🎯 Step 4: Testing Campaign Creation...');

          // Test Budget Creation
          console.log('💰 Creating test budget...');
          const budgetResult = await customer.campaignBudgets.create([
            {
              name: `Taskilo Test Budget ${new Date().toISOString().slice(0, 10)}`,
              amount_micros: 30000000, // 30 EUR
              delivery_method: 'STANDARD',
            },
          ]);

          const budgetResourceName = budgetResult.results[0].resource_name;
          console.log('✅ Budget created successfully:', budgetResourceName);

          // Test Campaign Creation
          console.log('🚀 Creating test campaign...');
          const today = new Date();
          const startDate = today.toISOString().split('T')[0].replace(/-/g, '');

          const campaignResult = await customer.campaigns.create([
            {
              name: `Taskilo Test Campaign ${new Date().getTime()}`,
              advertising_channel_type: 'SEARCH',
              status: 'PAUSED',
              campaign_budget: budgetResourceName,
              bidding_strategy_type: 'MANUAL_CPC',
              start_date: startDate,
              network_settings: {
                target_google_search: true,
                target_search_network: true,
                target_content_network: false,
                target_partner_search_network: false,
              },
            },
          ]);

          const campaignResourceName = campaignResult.results[0].resource_name;
          const campaignId = campaignResourceName.split('/')[3];

          console.log('✅ Campaign created successfully!');
          console.log(`   Campaign ID: ${campaignId}`);
          console.log(`   Resource Name: ${campaignResourceName}`);

          // Cleanup
          console.log('🧹 Cleaning up test campaign...');
          try {
            await customer.campaigns.update([
              {
                resource_name: campaignResourceName,
                status: 'REMOVED',
                update_mask: { paths: ['status'] },
              },
            ]);
            console.log('✅ Test campaign removed');
          } catch (cleanupError) {
            console.log('⚠️ Cleanup warning:', cleanupError.message);
          }

          console.log('');
          console.log('🎉 ALL TESTS PASSED!');
          console.log('📋 Summary:');
          console.log(`   ✅ Credentials working`);
          console.log(`   ✅ Token refresh working`);
          console.log(`   ✅ Account access to Taskilo (${TASKILO_CUSTOMER_ID})`);
          console.log(`   ✅ Budget creation working`);
          console.log(`   ✅ Campaign creation working`);
          console.log(`   ✅ Campaign management working`);
          console.log('');
          console.log('🚀 Ready for production with Taskilo account!');
        } else {
          console.log('❌ No customer info returned');
        }
      } else {
        const errorData = await tokenResponse.json();
        console.error('❌ Token refresh failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData.error,
          errorDescription: errorData.error_description,
        });
      }
    } catch (tokenError) {
      console.error('❌ Token refresh error:', tokenError.message);
    }
  } catch (error) {
    console.error('🔥 Debug test failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.substring(0, 300),
    });

    // Google Ads API spezifische Fehler
    if (error.failures && error.failures.length > 0) {
      console.error('📋 Google Ads API Failures:');
      error.failures.forEach((failure, index) => {
        console.error(
          `   ${index + 1}. ${failure.error_code?.error_code || 'Unknown'}: ${failure.message || 'No message'}`
        );
      });
    }
  }
}

// Run Debug Test
console.log('🔧 Starting Google Ads Credentials Debug...');
console.log('⏰ Timestamp:', new Date().toISOString());
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

debugGoogleAdsCredentials().catch(console.error);
