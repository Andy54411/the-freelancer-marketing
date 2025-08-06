// Test finAPI CORRECT WebForm Flow - Trigger 451 Error
const https = require('https');
const querystring = require('querystring');

async function testCorrectWebFormFlow() {
  try {
    console.log('=== TESTING CORRECT finAPI WEBFORM FLOW ===');

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
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            console.error('Failed to parse token response:', data);
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const token = tokenResponse.access_token;
    console.log('✅ SUCCESS: Got client token');

    // 2. Create a test user first (this should work)
    console.log('\n--- Step 1: Creating test user ---');
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
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);
      req.write(createUserData);
      req.end();
    });

    console.log(`User creation: ${userResult.status}`);
    console.log(`Response: ${userResult.data.substring(0, 300)}`);

    if (userResult.status === 201) {
      console.log('✅ SUCCESS: User created, now getting user token...');

      // 3. Get user token
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
              headers: res.headers,
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

        // 4. Now try to import bank connection (should trigger 451 with WebForm)
        console.log('\n--- Step 2: Triggering WebForm via bank connection import ---');

        const importData = JSON.stringify({
          bankId: 10080, // GAD-Schulungsystem test bank
          credentials: [
            { label: 'Benutzerkennung', value: 'testuser' },
            { label: 'PIN', value: 'testpin' },
          ],
        });

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

        console.log(`Bank import result: ${importResult.status}`);
        console.log(`Response: ${importResult.data.substring(0, 500)}`);

        if (importResult.location) {
          console.log(`✅ SUCCESS! WebForm URL found: ${importResult.location}`);
        } else {
          console.log('❌ No Location header found');
        }
      } else {
        console.log('❌ FAILED: Could not get user token');
        console.log('Response:', userTokenResponse.data);
      }
    } else {
      console.log('❌ FAILED: Could not create user');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCorrectWebFormFlow();
