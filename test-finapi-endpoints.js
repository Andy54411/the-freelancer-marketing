// Test finAPI WebForm Endpoints
const https = require('https');
const querystring = require('querystring');

async function testFinAPIEndpoints() {
  try {
    // 1. Get client token - Using correct finAPI Sandbox Credentials
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29', // Default Client
      client_secret: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
    });

    const tokenResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'sandbox.finapi.io',
        port: 443,
        path: '/api/v2/oauth/token', // FIXED: Use v2 API path
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
            console.log('Token response:', response);
            resolve(response);
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
    console.log('✅ Got client token:', token ? 'SUCCESS' : 'FAILED');
    console.log('Token type:', tokenResponse.token_type);
    console.log('Token length:', token ? token.length : 'N/A');

    // 2. Test different WebForm endpoints - Updated for v2 API
    const endpoints = [
      '/api/v2/webForms',
      '/api/v2/webForms/bankConnectionImport',
      '/api/v2/standalone/bankConnectionImport',
      '/api/v2/mandatorAdmin/webForms',
      '/api/v2/users/webForms',
      '/api/v2/bankConnections/webForms',
      '/api/v2/bankConnections/import/webForm',
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'sandbox.finapi.io',
            port: 443,
            path: endpoint,
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
              resolve({ status: res.statusCode, data, headers: res.headers });
            });
          });

          req.on('error', reject);
          req.end();
        });

        console.log(`${endpoint}: ${result.status} - ${result.data.substring(0, 200)}`);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }

    // 3. Test POST WebForm creation with v1 and v2
    console.log('\n--- Testing WebForm POST Creation ---');
    const webFormEndpoints = [
      { path: '/api/v2/webForms', version: 'v2' },
      { path: '/api/v2/users/webForms', version: 'v2-users' }, // This one gave 405!
      { path: '/api/v2/standalone/webForms', version: 'v2-standalone' },
    ];

    for (const { path, version } of webFormEndpoints) {
      try {
        const postData = JSON.stringify({
          mode: 'BANK_CONNECTION_IMPORT',
          userActionRequired: true,
          callbackUrl: 'https://taskilo.de/api/finapi/callback',
          skipPositionsDownload: false,
        });

        const result = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'sandbox.finapi.io',
            port: 443,
            path: path,
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            },
          };

          const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              resolve({ status: res.statusCode, data, headers: res.headers });
            });
          });

          req.on('error', reject);
          req.write(postData);
          req.end();
        });

        console.log(
          `POST ${path} (${version}): ${result.status} - ${result.data.substring(0, 300)}`
        );
      } catch (error) {
        console.log(`POST ${path} (${version}): ERROR - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFinAPIEndpoints();
