#!/usr/bin/env node

/**
 * 🔄 Google Ads Re-Connection Test Script
 * Überwacht die erneute Verbindung und testet Campaign Creation
 */

const https = require('https');

const CONFIG = {
  companyId: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
  maxWaitTime: 300000, // 5 Minuten
  checkInterval: 10000, // 10 Sekunden
  testCampaignData: {
    name: `Test Campaign ${new Date().toISOString().substr(0, 19).replace(/[:-]/g, '')}`,
    budgetAmountMicros: 20000000, // 20 EUR
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    adGroups: [
      {
        name: 'Mietkoch Test Group',
        cpcBidMicros: 1000000, // 1 EUR
        keywords: [
          { text: 'mietkoch test', matchType: 'BROAD' },
          { text: 'test catering', matchType: 'PHRASE' },
        ],
        ads: [
          {
            headlines: ['Test Mietkoch Service', 'Professional Catering', 'Event Koch Service'],
            descriptions: [
              'Test Kampagne für Mietkoch Service',
              'Professionelles Catering für Events',
            ],
            finalUrls: ['https://taskilo.de/services/hotel-gastronomie/mietkoch'],
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
        'User-Agent': 'Taskilo-Connection-Monitor/1.0',
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

async function checkConnectionStatus() {
  try {
    const response = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/status?companyId=${CONFIG.companyId}`,
      'GET'
    );

    const status = response.data;
    return {
      connected: status.connected || false,
      hasValidTokens: status.tokenStatus?.hasRefreshToken && status.tokenStatus?.hasAccessToken,
      accounts: status.accounts || [],
      customerId: status.accounts?.[0]?.id,
      accountName: status.accounts?.[0]?.name,
    };
  } catch (error) {
    console.error('❌ Status check error:', error.message);
    return { connected: false, hasValidTokens: false, accounts: [] };
  }
}

async function testCampaignCreation(customerId) {
  try {
    const requestPayload = {
      customerId: customerId,
      companyId: CONFIG.companyId,
      campaignData: CONFIG.testCampaignData,
    };

    const response = await makeHttpRequest(
      'https://taskilo.de/api/google-ads/campaigns/create-comprehensive',
      'POST',
      requestPayload
    );

    return {
      success: response.statusCode === 200 && response.data.success,
      statusCode: response.statusCode,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function waitForConnection() {
  console.log('🔄 Waiting for Google Ads connection...');
  console.log('👆 Please connect your Google Ads account in the dashboard now!');
  console.log(
    `🌐 Dashboard URL: https://taskilo.de/dashboard/company/${CONFIG.companyId}/google-ads`
  );
  console.log('');

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < CONFIG.maxWaitTime) {
    attempts++;
    console.log(`🔍 Connection check #${attempts}...`);

    const status = await checkConnectionStatus();

    console.log(
      `📊 Status: Connected=${status.connected}, Tokens=${status.hasValidTokens}, Accounts=${status.accounts.length}`
    );

    if (status.customerId && status.customerId !== 'no-google-ads-account') {
      console.log(`✅ Real Google Ads account detected!`);
      console.log(`🎯 Customer ID: ${status.customerId}`);
      console.log(`📛 Account Name: ${status.accountName}`);

      // Teste Campaign Creation
      console.log('\n🚀 Testing campaign creation...');
      const testResult = await testCampaignCreation(status.customerId);

      if (testResult.success) {
        console.log('🎉 CAMPAIGN CREATION SUCCESS!');
        console.log('🎯 Campaign ID:', testResult.data.data?.campaignId);
        console.log('📁 Ad Groups:', testResult.data.data?.adGroupIds?.length || 0);
        return {
          success: true,
          customerId: status.customerId,
          campaignId: testResult.data.data?.campaignId,
        };
      } else {
        console.log('❌ Campaign creation failed:');
        console.log('🔥 Error:', testResult.data || testResult.error);
        console.log('📊 Status Code:', testResult.statusCode);
        return {
          success: false,
          customerId: status.customerId,
          error: testResult.data || testResult.error,
        };
      }
    } else if (status.connected) {
      console.log('⚠️  Connected but no valid customer ID found');
    } else {
      console.log('❌ Not connected yet');
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
  }

  console.log('⏰ Timeout reached. Connection not established.');
  return { success: false, timeout: true };
}

async function main() {
  console.log('🔄 Google Ads Re-Connection Monitor');
  console.log('====================================');
  console.log('📅 Started:', new Date().toISOString());
  console.log('🏢 Company ID:', CONFIG.companyId);
  console.log('⏰ Max wait time:', CONFIG.maxWaitTime / 1000, 'seconds');
  console.log('');

  const result = await waitForConnection();

  console.log('\n📊 Final Result');
  console.log('================');

  if (result.success) {
    console.log('🎉 SUCCESS! Google Ads integration is working perfectly!');
    console.log('✅ Customer ID:', result.customerId);
    console.log('🎯 Created Campaign ID:', result.campaignId);
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Check your campaign in Google Ads dashboard');
    console.log('2. Start creating real campaigns in Taskilo');
    console.log('3. Monitor campaign performance');
  } else if (result.timeout) {
    console.log('⏰ Timeout: Please try connecting again in the dashboard');
  } else {
    console.log('❌ Failed: Campaign creation failed even with valid connection');
    console.log('🔍 Customer ID:', result.customerId);
    console.log('💥 Error:', result.error);
  }

  console.log('\n🏁 Monitor completed.');
}

// Script ausführen
if (require.main === module) {
  main();
}

module.exports = { main };
