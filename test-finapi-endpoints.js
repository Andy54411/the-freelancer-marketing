// Test finAPI WebForm Endpoints
const https = require('https');
const querystring = require('querystring');

async function testFinAPIEndpoints() {
  try {
    // 1. Get client token
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.FINAPI_SANDBOX_CLIENT_ID,
      client_secret: process.env.FINAPI_SANDBOX_CLIENT_SECRET,
    });

    const tokenResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'sandbox.finapi.io',
        port: 443,
        path: '/oauth/token',
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
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const token = tokenResponse.access_token;
    console.log('✅ Got client token');

    // 2. Test different WebForm endpoints
    const endpoints = [
      '/api/webForms',
      '/api/v1/webForms',
      '/api/v2/webForms',
      '/api/webForms/bankConnectionImport',
      '/api/v1/webForms/bankConnectionImport',
      '/api/v2/webForms/bankConnectionImport',
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
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFinAPIEndpoints();
