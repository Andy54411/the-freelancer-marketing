#!/usr/bin/env node

/**
 * 🧪 Google Ads Campaign Creation Terminal Test Script
 * Testet die Kampagnen-Erstellung direkt im Terminal mit detailliertem Logging
 */

const https = require('https');

// Test-Konfiguration
const CONFIG = {
  apiUrl: 'https://taskilo.de/api/google-ads/campaigns/create-comprehensive',
  companyId: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1', // Deine Company ID
  testCampaignData: {
    name: `Test Kampagne ${new Date().toISOString().substr(0, 19).replace(/[:-]/g, '')}`,
    budgetAmountMicros: 50000000, // 50 EUR in Micros
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    adGroups: [
      {
        name: 'Test Ad Group 1',
        cpcBidMicros: 1000000, // 1 EUR in Micros
        keywords: [
          { text: 'mietkoch berlin', matchType: 'BROAD' },
          { text: 'event catering', matchType: 'PHRASE' },
          { text: '[private chef]', matchType: 'EXACT' },
        ],
        ads: [
          {
            headlines: [
              'Professioneller Mietkoch',
              'Event Catering Service',
              'Private Chef für Events',
            ],
            descriptions: [
              'Buche jetzt deinen Mietkoch für unvergessliche Veranstaltungen',
              'Professionelles Catering für private und Business-Events',
            ],
            finalUrls: ['https://taskilo.de/services/mietkoch'],
          },
        ],
      },
    ],
  },
};

/**
 * 🔧 HTTP Request Helper
 */
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
        'User-Agent': 'Google-Ads-Test-Script/1.0',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            parseError: parseError.message,
          });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * 🎯 Test Google Ads Status
 */
async function testGoogleAdsStatus() {
  console.log('🔍 Testing Google Ads API Status...');

  try {
    const response = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/status?companyId=${CONFIG.companyId}`,
      'GET'
    );

    console.log('📊 Status Response:', {
      statusCode: response.statusCode,
      data: response.data,
    });

    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ Google Ads API Status: Connected');
      return true;
    } else {
      console.log('❌ Google Ads API Status: Not Connected');
      return false;
    }
  } catch (error) {
    console.error('🔥 Status Check Error:', error.message);
    return false;
  }
}

/**
 * 🎯 Get Customer ID from Google Ads Configuration
 */
async function getCustomerId() {
  console.log('🔍 Getting Customer ID from Google Ads configuration...');

  try {
    const response = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/firestore-debug?companyId=${CONFIG.companyId}`,
      'GET'
    );

    if (response.statusCode === 200 && response.data.success) {
      // Zuerst versuchen, customerId aus accountConfig zu holen
      let customerId = response.data.data?.accountConfig?.customerId;

      // Falls nicht vorhanden, aus linkedAccounts nehmen
      if (!customerId && response.data.data?.linkedAccounts?.length > 0) {
        const firstAccount = response.data.data.linkedAccounts[0];
        customerId = firstAccount.id;
        console.log('⚠️  Using customer ID from linkedAccounts:', customerId);
      }

      console.log('✅ Customer ID found:', customerId);
      console.log('📊 Account config:', response.data.data?.accountConfig ? 'EXISTS' : 'MISSING');
      console.log('📊 Linked accounts:', response.data.data?.linkedAccounts?.length || 0);

      if (customerId === 'no-google-ads-account') {
        console.log(
          '❌ Found dummy account ID - this means no real Google Ads account is connected!'
        );
        console.log('🔧 You need to properly connect a real Google Ads account first.');
        return null;
      }

      return customerId;
    } else {
      console.log('❌ Failed to get Customer ID:', response.data);
      return null;
    }
  } catch (error) {
    console.error('🔥 Customer ID fetch error:', error.message);
    return null;
  }
}

/**
 * 🎯 Test Campaign Creation
 */
async function testCampaignCreation() {
  console.log('\n🚀 Testing Google Ads Campaign Creation...');
  console.log('📝 Campaign Data:', JSON.stringify(CONFIG.testCampaignData, null, 2));

  try {
    // Hole die Customer ID
    const customerId = await getCustomerId();
    if (!customerId) {
      console.log('❌ Cannot proceed without Customer ID');
      return false;
    }

    const requestPayload = {
      customerId: customerId,
      companyId: CONFIG.companyId,
      campaignData: CONFIG.testCampaignData,
    };

    console.log('\n📤 Sending Request to:', CONFIG.apiUrl);
    console.log('📦 Request Payload:', JSON.stringify(requestPayload, null, 2));

    const startTime = Date.now();
    const response = await makeHttpRequest(CONFIG.apiUrl, 'POST', requestPayload);
    const endTime = Date.now();

    console.log(`\n⏱️  Request Duration: ${endTime - startTime}ms`);
    console.log('📊 Response Status Code:', response.statusCode);
    console.log('📋 Response Headers:', response.headers);
    console.log('📄 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.parseError) {
      console.log('❌ JSON Parse Error:', response.parseError);
      console.log('🔤 Raw Response:', response.data);
    }

    // Analyse der Response
    if (response.statusCode === 200) {
      if (response.data.success) {
        console.log('\n✅ Campaign Creation: SUCCESS');
        console.log('🎯 Campaign ID:', response.data.data?.campaignId);
        console.log('📁 Ad Group IDs:', response.data.data?.adGroupIds);
        return true;
      } else {
        console.log('\n❌ Campaign Creation: FAILED');
        console.log('🔥 Error Code:', response.data.error?.code);
        console.log('💬 Error Message:', response.data.error?.message);
        console.log('🔍 Error Details:', response.data.error?.details);
        return false;
      }
    } else if (response.statusCode === 500) {
      console.log('\n🔥 500 Internal Server Error');
      console.log('💥 This is the error we need to debug!');
      console.log('🔍 Response:', response.data);
      return false;
    } else {
      console.log(`\n❌ Unexpected Status Code: ${response.statusCode}`);
      console.log('🔍 Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('\n🔥 Campaign Creation Error:', error.message);
    console.error('📋 Error Stack:', error.stack);
    return false;
  }
}

/**
 * 🧪 Main Test Function
 */
async function runTests() {
  console.log('🧪 Google Ads Campaign Creation Test Script');
  console.log('================================================');
  console.log('📅 Test Time:', new Date().toISOString());
  console.log('🏢 Company ID:', CONFIG.companyId);
  console.log('🌐 API URL:', CONFIG.apiUrl);

  try {
    // Schritt 1: Status prüfen
    const statusOk = await testGoogleAdsStatus();

    if (!statusOk) {
      console.log(
        '\n⚠️  Google Ads API not properly connected, but continuing with campaign test...'
      );
    }

    // Schritt 2: Kampagne erstellen
    const campaignOk = await testCampaignCreation();

    // Ergebnis
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log('🔍 Status Check:', statusOk ? '✅ PASS' : '❌ FAIL');
    console.log('🎯 Campaign Creation:', campaignOk ? '✅ PASS' : '❌ FAIL');

    if (campaignOk) {
      console.log('\n🎉 All tests passed! Campaign creation works correctly.');
    } else {
      console.log('\n❌ Campaign creation failed. Check the error details above.');
      console.log('\n🔧 Debugging Tips:');
      console.log('   1. Check Google Ads API credentials');
      console.log('   2. Verify customer ID is valid');
      console.log('   3. Ensure account has proper permissions');
      console.log('   4. Check for API quota limits');
      console.log('   5. Verify ad content meets Google Ads policies');
    }
  } catch (error) {
    console.error('\n🔥 Test Script Error:', error.message);
    console.error('📋 Error Stack:', error.stack);
  }

  console.log('\n🏁 Test completed.');
}

// Script ausführen
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testCampaignCreation, testGoogleAdsStatus };
