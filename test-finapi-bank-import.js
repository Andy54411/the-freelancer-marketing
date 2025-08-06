// Test finAPI Bank Connection Import with correct data structure
const https = require('https');
const querystring = require('querystring');

async function testBankConnectionImport() {
  try {
    console.log('=== TESTING BANK CONNECTION IMPORT - CORRECT STRUCTURE ===');

    // 1. Get client token
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29',
      client_secret: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
    });

    const tokenResponse = await new Promise((resolve, reject) => {
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
          resolve(JSON.parse(data));
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const token = tokenResponse.access_token;
    console.log('✅ SUCCESS: Got client token');

    // 2. First, let's check what the bank details look like
    console.log('\n--- Getting bank details ---');
    const bankResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'sandbox.finapi.io',
        port: 443,
        path: '/api/v2/banks/10080', // GAD-Schulungsystem
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        });
      });

      req.on('error', reject);
      req.end();
    });

    console.log('Bank details:', JSON.stringify(bankResult.data, null, 2));

    if (bankResult.data && bankResult.data.loginCredentials) {
      console.log('Required credentials:');
      bankResult.data.loginCredentials.forEach((cred, index) => {
        console.log(`  ${index}: ${cred.label} - ${cred.isSecret ? 'SECRET' : 'PUBLIC'}`);
      });

      // 3. Create a test user
      console.log('\n--- Creating test user ---');
      const testUserId = `testuser_${Date.now()}`;
      const testPassword = `pass_${Date.now()}`;

      const createUserData = JSON.stringify({
        id: testUserId,
        password: testPassword,
        email: `${testUserId}@example.com`,
        phone: '+491234567890',
        isAutoUpdateEnabled: true,
      });

      const userResult = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'sandbox.finapi.io',
          port: 443,
          path: '/api/v2/users',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(createUserData),
          },
        };

        const req = https.request(options, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              data: data,
            });
          });
        });

        req.on('error', reject);
        req.write(createUserData);
        req.end();
      });

      if (userResult.status === 201) {
        console.log('✅ SUCCESS: User created');

        // 4. Get user token
        const userTokenData = querystring.stringify({
          grant_type: 'password',
          client_id: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29',
          client_secret: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
          username: testUserId,
          password: testPassword,
        });

        const userTokenResponse = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'sandbox.finapi.io',
            port: 443,
            path: '/api/v2/oauth/token',
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(userTokenData),
            },
          };

          const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data),
              });
            });
          });

          req.on('error', reject);
          req.write(userTokenData);
          req.end();
        });

        if (userTokenResponse.status === 200) {
          const userToken = userTokenResponse.data.access_token;
          console.log('✅ SUCCESS: Got user token');

          // 5. Now try bank connection import with CORRECT structure
          console.log('\n--- Importing bank connection with correct structure ---');

          // Build credentials based on bank requirements
          const credentials = bankResult.data.loginCredentials.map(cred => ({
            label: cred.label,
            value: cred.isSecret ? 'testpin123' : 'testuser123',
          }));

          const importData = JSON.stringify({
            bankId: 10080,
            name: 'Test Bank Connection',
            credentials: credentials,
            storeSecrets: false, // Don't store secrets to avoid regulatory requirements
          });

          console.log('Import data:', importData);

          const importResult = await new Promise((resolve, reject) => {
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
                resolve({
                  status: res.statusCode,
                  data: data,
                  headers: res.headers,
                  location: res.headers.location,
                });
              });
            });

            req.on('error', reject);
            req.write(importData);
            req.end();
          });

          console.log(`\nBank import result: ${importResult.status}`);
          console.log(`Response: ${importResult.data}`);

          if (importResult.location) {
            console.log(`🎉 WEBFORM URL FOUND: ${importResult.location}`);
          }

          if (importResult.status === 451) {
            console.log('🎯 SUCCESS! Got 451 - WebForm is required!');
            console.log('This means WebForm flow is working correctly!');
          }
        } else {
          console.log('❌ FAILED: Could not get user token');
        }
      } else {
        console.log('❌ FAILED: Could not create user');
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBankConnectionImport();
