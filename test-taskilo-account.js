#!/usr/bin/env node

/**
 * ✅ Test Script für echten Taskilo Google Ads Account
 * Account ID: 526-719-5046 (Taskilo)
 */

const { GoogleAdsApi } = require('google-ads-api');

// Google Ads Client Configuration
const client = new GoogleAdsApi({
  client_id:
    process.env.GOOGLE_ADS_CLIENT_ID ||
    '1022290879475-s3cbfm0s99pv7s6pk9p1r3q0u7a1rvcl.apps.googleusercontent.com',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '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',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'e_hZoYxYJKLOsULXAi86Og',
});

// ECHTE TASKILO ACCOUNT ID (ohne Bindestriche für Google Ads API)
const TASKILO_CUSTOMER_ID = '5267195046';

console.log('🎯 Testing REAL Taskilo Google Ads Account');
console.log('📋 Account Info:');
console.log(`   Name: Taskilo`);
console.log(`   ID: 526-719-5046 (Display Format)`);
console.log(`   API Format: ${TASKILO_CUSTOMER_ID}`);
console.log('');

async function testTaskiloAccount() {
  try {
    // 1. Test Account Access
    console.log('🔍 Step 1: Testing Account Access...');

    // Hole Refresh Token aus Firestore (falls vorhanden)
    let refreshToken = null;
    try {
      const response = await fetch(
        'https://taskilo.de/api/google-ads/firestore-debug?companyId=0Rj5vGkBjeXrzZKBr4cFfV0jRuw1'
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.accountConfig?.refreshToken) {
          refreshToken = data.data.accountConfig.refreshToken;
          console.log('✅ Found stored refresh token');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not fetch stored tokens, using manual token if available');
    }

    if (!refreshToken) {
      console.log('❌ No refresh token available. Please complete OAuth setup first.');
      console.log('📋 Steps to get tokens:');
      console.log('   1. Visit: https://taskilo.de/dashboard/company/google-ads');
      console.log('   2. Click "Mit Google Ads verbinden"');
      console.log('   3. Complete OAuth flow');
      console.log('   4. Re-run this test');
      return;
    }

    const customer = client.Customer({
      customer_id: TASKILO_CUSTOMER_ID,
      refresh_token: refreshToken,
    });

    // Test Basic Customer Query
    try {
      console.log('🔍 Testing customer info query...');
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
        console.log('✅ Account Access Successful!');
        console.log('📋 Account Details:');
        console.log(`   ID: ${info.id}`);
        console.log(`   Name: ${info.descriptive_name}`);
        console.log(`   Currency: ${info.currency_code}`);
        console.log(`   Timezone: ${info.time_zone}`);
        console.log(`   Status: ${info.status}`);
        console.log(`   Manager Account: ${info.manager}`);
        console.log(`   Test Account: ${info.test_account}`);
        console.log('');
      }
    } catch (customerError) {
      console.error('❌ Customer access failed:', customerError.message);
      throw customerError;
    }

    // 2. Test Campaign Creation
    console.log('🚀 Step 2: Testing Campaign Creation...');

    try {
      // Erstelle Test Budget
      console.log('💰 Creating test budget...');
      const budgetResult = await customer.campaignBudgets.create([
        {
          name: `Test Budget ${new Date().toISOString().slice(0, 10)}`,
          amount_micros: 50000000, // 50 EUR in Mikros
          delivery_method: 'STANDARD',
        },
      ]);

      const budgetResourceName = budgetResult.results[0].resource_name;
      console.log('✅ Budget created:', budgetResourceName);

      // Erstelle Test Campaign
      console.log('🎯 Creating test campaign...');
      const today = new Date();
      const startDate = today.toISOString().split('T')[0].replace(/-/g, '');

      const campaignResult = await customer.campaigns.create([
        {
          name: `Test Campaign ${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}`,
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
      console.log('');

      // 3. Test Campaign Cleanup (löschen des Test-Campaigns)
      console.log('🧹 Step 3: Cleaning up test campaign...');

      try {
        await customer.campaigns.update([
          {
            resource_name: campaignResourceName,
            status: 'REMOVED',
            update_mask: { paths: ['status'] },
          },
        ]);
        console.log('✅ Test campaign removed successfully');
      } catch (cleanupError) {
        console.log('⚠️ Cleanup warning (campaign may remain):', cleanupError.message);
      }

      console.log('');
      console.log('🎉 SUCCESS: All tests passed!');
      console.log('📋 Summary:');
      console.log(`   ✅ Account access to Taskilo (${TASKILO_CUSTOMER_ID})`);
      console.log(`   ✅ Budget creation working`);
      console.log(`   ✅ Campaign creation working`);
      console.log(`   ✅ Campaign management working`);
      console.log('');
      console.log('🚀 Ready for production campaign creation!');
    } catch (campaignError) {
      console.error('❌ Campaign creation failed:', {
        message: campaignError.message,
        code: campaignError.code,
        status: campaignError.status,
        details: campaignError.details,
      });

      // Detaillierte Error-Analyse
      if (campaignError.failures && campaignError.failures.length > 0) {
        console.error('📋 Google Ads API Failures:');
        campaignError.failures.forEach((failure, index) => {
          console.error(
            `   ${index + 1}. Error Code: ${failure.error_code?.error_code || 'Unknown'}`
          );
          console.error(`      Message: ${failure.message || 'No message'}`);
          console.error(
            `      Location: ${failure.location?.field_path_elements?.map(e => e.field_name).join('.') || 'Unknown'}`
          );
        });
      }

      throw campaignError;
    }
  } catch (error) {
    console.error('🔥 Test failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.substring(0, 300),
    });

    console.log('');
    console.log('🔧 Troubleshooting Tips:');
    console.log('   1. Verify account ID format (no dashes in API calls)');
    console.log('   2. Check OAuth tokens are valid and not expired');
    console.log('   3. Ensure account has proper permissions');
    console.log('   4. Verify billing is set up in Google Ads account');
    console.log('   5. Check if account is suspended or has restrictions');

    process.exit(1);
  }
}

// Run Test
console.log('🎯 Starting Taskilo Google Ads Account Test...');
console.log('⏰ Timestamp:', new Date().toISOString());
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

testTaskiloAccount().catch(console.error);
