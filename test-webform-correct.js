/**
 * Test korrekte finAPI WebForm 2.0 Implementation
 * Basiert auf finAPI Dokumentation: WebForm wird durch 451-Response ausgelöst
 */

const https = require('https');
const querystring = require('querystring');

async function testCorrectWebFormFlow() {
  console.log('🎯 Testing CORRECT WebForm 2.0 Flow...');
  console.log('Based on finAPI docs: WebForm is triggered by 451 response');

  try {
    // 1. Get Client Token
    console.log('\n1. Getting Client Token...');
    const clientToken = await getClientToken();
    console.log('✅ Client Token:', clientToken ? 'SUCCESS' : 'FAILED');

    // 2. Create User
    console.log('\n2. Creating User...');
    const userId = `webform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userPassword = 'TestPassword123!';

    const user = await createUser(clientToken, userId, userPassword);
    if (!user.success) {
      console.log('❌ User Creation Failed:', user.error);
      return;
    }
    console.log('✅ User Created:', userId);

    // 3. Get User Token
    console.log('\n3. Getting User Token...');
    const userToken = await getUserToken(userId, userPassword);
    if (!userToken.success) {
      console.log('❌ User Token Failed:', userToken.error);
      return;
    }
    console.log('✅ User Token:', userToken.token ? 'SUCCESS' : 'FAILED');

    // 4. Try Bank Connection Import (should return 451 with WebForm)
    console.log('\n4. Attempting Bank Connection Import (expecting 451)...');
    const importResult = await importBankConnection(userToken.token, 26579); // finAPI Test Bank

    console.log('📋 Import Result:', importResult);
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

async function getClientToken() {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29', // BACK TO WORKING CREDENTIALS
      client_secret: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
    });

    const options = {
      hostname: 'sandbox.finapi.io',
      port: 443,
      path: '/api/v2/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.access_token);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function createUser(clientToken, userId, password) {
  return new Promise(resolve => {
    const userData = JSON.stringify({
      id: userId,
      password: password,
      email: `${userId}@taskilo.de`,
      phone: '+49123456789',
      isAutoUpdateEnabled: true,
    });

    const options = {
      hostname: 'sandbox.finapi.io',
      port: 443,
      path: '/api/v2/users',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clientToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(userData),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(data) });
        } else {
          resolve({ success: false, error: data, status: res.statusCode });
        }
      });
    });

    req.on('error', error => {
      resolve({ success: false, error: error.message });
    });

    req.write(userData);
    req.end();
  });
}

async function getUserToken(userId, password) {
  return new Promise(resolve => {
    const postData = querystring.stringify({
      grant_type: 'password',
      client_id: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29', // BACK TO WORKING CREDENTIALS
      client_secret: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
      username: userId,
      password: password,
    });

    const options = {
      hostname: 'sandbox.finapi.io',
      port: 443,
      path: '/api/v2/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve({ success: true, token: response.access_token });
          } catch (e) {
            resolve({ success: false, error: 'Parse error: ' + data });
          }
        } else {
          resolve({ success: false, error: data, status: res.statusCode });
        }
      });
    });

    req.on('error', error => {
      resolve({ success: false, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

async function importBankConnection(userToken, bankId) {
  return new Promise(resolve => {
    const importData = JSON.stringify({
      bankId: bankId,
      bankingInterface: 'FINTS_SERVER', // REQUIRED: Use FINTS_SERVER interface
      name: `WebForm Test ${Date.now()}`,
      skipPositionsDownload: false,
      loadOwnerData: true,
      maxDaysForDownload: 90,
      accountTypes: ['Checking', 'Savings', 'CreditCard'],
      accountReferences: [],
      // Add dummy credentials to trigger WebForm (will return 451)
      loginCredentials: [
        {
          label: 'Benutzerkennung',
          value: 'dummy_user', // Dummy value to trigger WebForm
        },
        {
          label: 'PIN',
          value: 'dummy_pin', // Dummy value to trigger WebForm
        },
      ],
      storeSecrets: false, // Don't store credentials to avoid regulatory issues
    });

    const options = {
      hostname: 'sandbox.finapi.io',
      port: 443,
      path: '/api/v2/bankConnections/import',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(importData),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        console.log('📋 Import Response Status:', res.statusCode);
        console.log('📋 Import Response Headers:', res.headers);
        console.log('📋 Import Response Body:', data);

        if (res.statusCode === 451) {
          // EXPECTED! This is the WebForm trigger
          const locationHeader = res.headers.location;
          console.log('✅ PERFECT! Got 451 with Location Header:', locationHeader);

          resolve({
            status: 451,
            webFormUrl: locationHeader,
            message: 'WebForm triggered successfully',
            body: data,
          });
        } else if (res.statusCode === 200 || res.statusCode === 201) {
          // Bank connection created directly (no WebForm needed)
          resolve({
            status: res.statusCode,
            message: 'Bank connection created directly',
            body: data,
          });
        } else {
          // Error
          resolve({
            status: res.statusCode,
            error: data,
            message: 'Import failed',
          });
        }
      });
    });

    req.on('error', error => {
      resolve({ error: error.message });
    });

    req.write(importData);
    req.end();
  });
}

// Run the test
testCorrectWebFormFlow();
