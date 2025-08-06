// Test finAPI v2 API Discovery
const https = require('https');
const querystring = require('querystring');

async function discoverFinAPIEndpoints() {
  try {
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
            const response = JSON.parse(data);
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
    console.log('SUCCESS: Got client token');

    // 2. Test common finAPI v2 endpoints to understand the structure
    const commonEndpoints = [
      '/api/v2',
      '/api/v2/banks',
      '/api/v2/users',
      '/api/v2/bankConnections',
      '/api/v2/accounts',
      '/api/v2/transactions',
      '/api/v2/payments',
      '/api/v2/webForm', // Singular
      '/api/v2/webform', // Lowercase
      '/api/v2/forms',
      '/api/v2/import',
      '/api/v2/import/webForm',
      '/api/v2/bankConnection/import',
    ];

    console.log('\n--- Discovering finAPI v2 API Structure ---');
    for (const endpoint of commonEndpoints) {
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
              resolve({ status: res.statusCode, data: data.substring(0, 500) });
            });
          });

          req.on('error', reject);
          req.end();
        });

        console.log(`${endpoint}: ${result.status} - ${result.data.substring(0, 100)}...`);
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Discovery failed:', error);
  }
}

discoverFinAPIEndpoints();
