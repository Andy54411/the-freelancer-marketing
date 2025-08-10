#!/usr/bin/env node

/**
 * 🧪 Enhanced Google Ads Campaign Test with Real Account Detection
 * Testet die Kampagnen-Erstellung mit echten Google Ads Accounts
 */

const https = require('https');

// Test-Konfiguration
const CONFIG = {
  apiUrl: 'https://taskilo.de/api/google-ads/campaigns/create-comprehensive',
  companyId: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
  testCampaignData: {
    name: `Mietkoch Kampagne ${new Date().toISOString().substr(0, 19).replace(/[:-]/g, '')}`,
    budgetAmountMicros: 30000000, // 30 EUR in Micros
    advertisingChannelType: 'SEARCH',
    biddingStrategyType: 'MANUAL_CPC',
    startDate: new Date().toISOString().split('T')[0],
    adGroups: [
      {
        name: 'Mietkoch Berlin',
        cpcBidMicros: 1500000, // 1.50 EUR in Micros
        keywords: [
          { text: 'mietkoch berlin', matchType: 'BROAD' },
          { text: 'event catering berlin', matchType: 'PHRASE' },
          { text: '[private chef berlin]', matchType: 'EXACT' },
          { text: 'koch für event mieten', matchType: 'BROAD' },
          { text: 'catering service privat', matchType: 'PHRASE' },
        ],
        ads: [
          {
            headlines: [
              'Professioneller Mietkoch',
              'Event Catering Berlin',
              'Private Chef Service',
            ],
            descriptions: [
              'Buche jetzt deinen Mietkoch für unvergessliche Events in Berlin',
              'Professionelles Catering für private und Business-Veranstaltungen',
            ],
            finalUrls: ['https://taskilo.de/services/hotel-gastronomie/mietkoch'],
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
        'User-Agent': 'Taskilo-Google-Ads-Test/1.0',
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
 * 🎯 Force Google Ads Account Refresh
 */
async function forceAccountRefresh() {
  console.log('🔄 Forcing Google Ads account refresh to detect real accounts...');

  try {
    const response = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/reset?companyId=${CONFIG.companyId}`,
      'POST',
      { forceRefresh: true }
    );

    console.log('📊 Account refresh response:', {
      statusCode: response.statusCode,
      data: response.data,
    });

    if (response.statusCode === 200) {
      console.log('✅ Account refresh initiated');
      return true;
    } else {
      console.log('⚠️ Account refresh failed, continuing anyway...');
      return false;
    }
  } catch (error) {
    console.error('🔥 Account refresh error:', error.message);
    return false;
  }
}

/**
 * 🎯 Get All Available Customer IDs
 */
async function getAllCustomerIds() {
  console.log('🔍 Getting all available customer IDs...');

  try {
    // Hole Firestore-Konfiguration
    const firestoreResponse = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/firestore-debug?companyId=${CONFIG.companyId}`,
      'GET'
    );

    // Hole Google Ads Status
    const statusResponse = await makeHttpRequest(
      `https://taskilo.de/api/google-ads/status?companyId=${CONFIG.companyId}`,
      'GET'
    );

    console.log('📊 Firestore Config:', firestoreResponse.data?.data?.linkedAccounts);
    console.log('📊 Status Accounts:', statusResponse.data?.accounts);

    const customerIds = [];

    // Sammle Customer IDs aus verschiedenen Quellen
    if (firestoreResponse.data?.data?.linkedAccounts) {
      for (const account of firestoreResponse.data.data.linkedAccounts) {
        if (account.id && account.id !== 'no-google-ads-account') {
          customerIds.push({
            id: account.id,
            name: account.name,
            source: 'firestore',
            testAccount: account.testAccount,
          });
        }
      }
    }

    if (statusResponse.data?.accounts) {
      for (const account of statusResponse.data.accounts) {
        if (account.id && account.id !== 'no-google-ads-account') {
          customerIds.push({
            id: account.id,
            name: account.name,
            source: 'status',
            testAccount: account.testAccount,
          });
        }
      }
    }

    // Entferne Duplikate
    const uniqueCustomerIds = customerIds.filter(
      (customer, index, self) => index === self.findIndex(c => c.id === customer.id)
    );

    console.log('✅ Found customer IDs:', uniqueCustomerIds);
    return uniqueCustomerIds;
  } catch (error) {
    console.error('🔥 Customer ID fetch error:', error.message);
    return [];
  }
}

/**
 * 🎯 Test Campaign Creation with Customer ID
 */
async function testCampaignWithCustomerId(customerId, customerName) {
  console.log(`\n🚀 Testing campaign creation with Customer ID: ${customerId} (${customerName})`);

  try {
    const requestPayload = {
      customerId: customerId,
      companyId: CONFIG.companyId,
      campaignData: CONFIG.testCampaignData,
    };

    console.log('📤 Sending campaign creation request...');
    console.log('📦 Customer ID:', customerId);
    console.log('📦 Campaign Name:', CONFIG.testCampaignData.name);

    const startTime = Date.now();
    const response = await makeHttpRequest(CONFIG.apiUrl, 'POST', requestPayload);
    const endTime = Date.now();

    console.log(`⏱️  Request Duration: ${endTime - startTime}ms`);
    console.log('📊 Response Status:', response.statusCode);

    if (response.statusCode === 200 && response.data.success) {
      console.log('🎉 CAMPAIGN CREATION SUCCESS!');
      console.log('🎯 Campaign ID:', response.data.data?.campaignId);
      console.log('📁 Ad Group IDs:', response.data.data?.adGroupIds);
      return { success: true, customerId, response: response.data };
    } else {
      console.log('❌ Campaign creation failed');
      console.log('🔥 Error:', response.data);
      return { success: false, customerId, error: response.data };
    }
  } catch (error) {
    console.error('🔥 Campaign test error:', error.message);
    return { success: false, customerId, error: error.message };
  }
}

/**
 * 🎯 Test with Manual Customer ID Input
 */
async function testWithManualCustomerId() {
  console.log('\n🎯 Attempting to find customer ID from Google Ads account...');

  // Bekannte Test-Customer-IDs (Google Ads Test Accounts)
  const testCustomerIds = [
    { id: '1234567890', name: 'Test Account 1' },
    { id: '9876543210', name: 'Test Account 2' },
    { id: '1111111111', name: 'Generic Test Account' },
  ];

  // Versuche auch mit einer realistischen Customer ID basierend auf Google Ads Format
  const potentialCustomerIds = [
    { id: '123-456-7890', name: 'Formatted Test Account' },
    { id: '1022290879', name: 'Derived from Client ID' }, // Aus der Google Client ID abgeleitet
  ];

  const allTestIds = [...testCustomerIds, ...potentialCustomerIds];

  for (const customer of allTestIds) {
    console.log(`\n🧪 Testing with customer ID: ${customer.id}`);

    try {
      const result = await testCampaignWithCustomerId(customer.id, customer.name);
      if (result.success) {
        console.log(`✅ SUCCESS with customer ID: ${customer.id}`);
        return result;
      } else {
        console.log(`❌ Failed with customer ID: ${customer.id}`);
        if (result.error?.error) {
          console.log('🔍 Error details:', result.error.error);
        }
      }
    } catch (error) {
      console.log(`🔥 Error with customer ID ${customer.id}:`, error.message);
    }

    // Kurze Pause zwischen Tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return null;
}

/**
 * 🧪 Main Test Function
 */
async function runEnhancedTests() {
  console.log('🧪 Enhanced Google Ads Campaign Creation Test');
  console.log('===============================================');
  console.log('📅 Test Time:', new Date().toISOString());
  console.log('🏢 Company ID:', CONFIG.companyId);
  console.log('🎯 Campaign Name:', CONFIG.testCampaignData.name);

  try {
    // Schritt 1: Account Refresh
    await forceAccountRefresh();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Warte 2 Sekunden

    // Schritt 2: Verfügbare Customer IDs finden
    const customerIds = await getAllCustomerIds();

    let successfulResult = null;

    // Schritt 3: Teste mit gefundenen Customer IDs
    if (customerIds.length > 0) {
      console.log(`\n🎯 Testing with ${customerIds.length} found customer IDs...`);

      for (const customer of customerIds) {
        if (customer.id !== 'no-google-ads-account') {
          const result = await testCampaignWithCustomerId(customer.id, customer.name);
          if (result.success) {
            successfulResult = result;
            break;
          }
        }
      }
    }

    // Schritt 4: Falls keine echten Customer IDs gefunden, teste mit Test-IDs
    if (!successfulResult) {
      console.log('\n🎯 No valid customer IDs found, trying with test accounts...');
      successfulResult = await testWithManualCustomerId();
    }

    // Ergebnis
    console.log('\n📊 Final Test Results');
    console.log('======================');

    if (successfulResult) {
      console.log('🎉 CAMPAIGN CREATION SUCCESSFUL!');
      console.log('✅ Working Customer ID:', successfulResult.customerId);
      console.log('🎯 Created Campaign ID:', successfulResult.response?.data?.campaignId);
      console.log(
        '📁 Created Ad Groups:',
        successfulResult.response?.data?.adGroupIds?.length || 0
      );

      console.log('\n🔧 Next Steps:');
      console.log('1. ✅ Your Google Ads integration is working!');
      console.log('2. 🎯 Use this Customer ID in your Taskilo dashboard');
      console.log('3. 📈 Start creating real campaigns for your business');
      console.log('4. 🚀 Test the campaign in Google Ads dashboard');
    } else {
      console.log('❌ CAMPAIGN CREATION FAILED');
      console.log('🔧 Troubleshooting needed:');
      console.log('1. Verify Google Ads account is properly set up');
      console.log('2. Check Google Ads API access permissions');
      console.log('3. Ensure billing is set up in Google Ads');
      console.log('4. Verify OAuth tokens are valid');

      console.log('\n💡 Potential Solutions:');
      console.log('- Create a new Google Ads account at ads.google.com');
      console.log('- Complete Google Ads account setup including billing');
      console.log('- Re-authenticate Google Ads connection in Taskilo');
      console.log('- Contact Google Ads support for API access issues');
    }
  } catch (error) {
    console.error('\n🔥 Test Script Error:', error.message);
    console.error('📋 Error Stack:', error.stack);
  }

  console.log('\n🏁 Enhanced test completed.');
}

// Script ausführen
if (require.main === module) {
  runEnhancedTests();
}

module.exports = { runEnhancedTests };
