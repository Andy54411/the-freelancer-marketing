#!/usr/bin/env node

/**
 * 🔍 Google Ads Detailed Error Test Script
 * Testet mit der gefundenen Customer ID und zeigt detaillierte Errors
 */

const https = require('https');

const CONFIG = {
  companyId: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
  customerId: '4959227548', // The Freelancer Crew
  testCampaignData: {
    name: `Simplified Test ${new Date().getTime()}`,
    budgetAmountMicros: 10000000, // 10 EUR (niedrigeres Budget)
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    adGroups: [
      {
        name: 'Simple Test Group',
        cpcBidMicros: 500000, // 0.50 EUR (niedrigeres CPC)
        keywords: [{ text: 'test keyword', matchType: 'BROAD' }],
        ads: [
          {
            headlines: ['Test Ad Headline 1', 'Test Ad Headline 2', 'Test Ad Headline 3'],
            descriptions: ['Test description for ad', 'Second test description'],
            finalUrls: ['https://taskilo.de'],
          },
        ],
      },
    ],
  },
};

function makeHttpRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Taskilo-Detailed-Test/1.0',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, res => {
      let responseData = '';
      res.on('data', chunk => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(responseData),
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            parseError: parseError.message,
          });
        }
      });
    });

    req.on('error', error => reject(error));
    if (postData) req.write(postData);
    req.end();
  });
}

async function testAccountAccess() {
  console.log('🔍 Testing Google Ads account access...');

  try {
    const response = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/diagnose?companyId=${CONFIG.companyId}&customerId=${CONFIG.customerId}`,
      'GET'
    );

    console.log('📊 Account access test result:', {
      statusCode: response.statusCode,
      data: response.data,
    });

    return response.statusCode === 200 && response.data.success;
  } catch (error) {
    console.error('❌ Account access test failed:', error.message);
    return false;
  }
}

async function testCampaignCreation() {
  console.log('🚀 Testing campaign creation with simplified data...');
  console.log('🎯 Customer ID:', CONFIG.customerId);
  console.log('💰 Budget: €10 (10,000,000 micros)');
  console.log('🔧 CPC Bid: €0.50 (500,000 micros)');

  try {
    const requestPayload = {
      customerId: CONFIG.customerId,
      companyId: CONFIG.companyId,
      campaignData: CONFIG.testCampaignData,
    };

    console.log('\n📤 Sending request...');
    const startTime = Date.now();

    const response = await makeHttpRequest(
      'https://taskilo.de/api/google-ads/campaigns/create-comprehensive',
      'POST',
      requestPayload
    );

    const endTime = Date.now();
    console.log(`⏱️  Request completed in ${endTime - startTime}ms`);
    console.log('📊 Response Status:', response.statusCode);

    if (response.statusCode === 200 && response.data.success) {
      console.log('\n🎉 CAMPAIGN CREATION SUCCESS!');
      console.log('✅ Campaign ID:', response.data.data?.campaignId);
      console.log('📁 Ad Groups:', response.data.data?.adGroupIds?.length || 0);
      return { success: true, data: response.data };
    } else {
      console.log('\n❌ CAMPAIGN CREATION FAILED');
      console.log('🔥 Full Error Response:', JSON.stringify(response.data, null, 2));

      // Analysiere spezifische Fehlermeldungen
      if (response.data?.details?.message) {
        console.log('💬 Error Message:', response.data.details.message);
      }

      if (response.data?.error) {
        console.log('⚠️  Error Type:', response.data.error);
      }

      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error('\n🔥 Request Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Google Ads Detailed Error Analysis');
  console.log('=====================================');
  console.log('📅 Test Time:', new Date().toISOString());
  console.log('🏢 Company ID:', CONFIG.companyId);
  console.log('👤 Customer ID:', CONFIG.customerId);
  console.log('📛 Account Name: The Freelancer Crew');
  console.log('');

  try {
    // Test 1: Account Access
    const accessOk = await testAccountAccess();
    console.log('✅ Account Access:', accessOk ? 'SUCCESS' : 'FAILED');

    // Test 2: Campaign Creation
    const result = await testCampaignCreation();

    // Zusammenfassung
    console.log('\n📊 Final Test Results');
    console.log('======================');

    if (result.success) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Google Ads integration is working');
      console.log('🎯 Campaign created successfully');
      console.log('');
      console.log('🚀 Next Steps:');
      console.log('1. Check the campaign in Google Ads dashboard');
      console.log('2. Test with real campaign data in Taskilo');
      console.log('3. Monitor campaign performance');
    } else {
      console.log('❌ TESTS FAILED');
      console.log('🔧 Possible Issues:');

      if (result.error?.details?.message?.includes('budget')) {
        console.log('💰 Budget Issue: Check billing setup in Google Ads');
        console.log('   - Ensure billing method is added');
        console.log('   - Verify account is not suspended');
        console.log('   - Check spending limits');
      }

      if (result.error?.details?.message?.includes('permission')) {
        console.log('🔐 Permission Issue: Check API access');
        console.log('   - Verify developer token is approved');
        console.log('   - Check OAuth scopes');
        console.log('   - Ensure account has campaign management access');
      }

      if (result.error?.details?.message?.includes('customer')) {
        console.log('👤 Customer Issue: Check account setup');
        console.log('   - Verify customer ID is correct');
        console.log('   - Check if account is properly activated');
        console.log('   - Ensure account type allows API access');
      }

      console.log('\n🔍 Detailed Error for Support:');
      console.log(JSON.stringify(result.error, null, 2));
    }
  } catch (error) {
    console.error('\n🔥 Script Error:', error.message);
  }

  console.log('\n🏁 Analysis completed.');
}

// Script ausführen
if (require.main === module) {
  main();
}

module.exports = { main };
