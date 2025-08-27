const https = require('https');

// Test the current API that the frontend is calling
const testQuoteDetailAPI = async () => {
  const uid = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
  const quoteId = 'quote_1756320622873_zuv5lwk04';

  // This is the URL the frontend is actually calling (received, not incoming!)
  const url = `https://taskilo.de/api/company/${uid}/quotes/received/${quoteId}`;

  console.log('🔍 Testing API:', url);

  const options = {
    hostname: 'taskilo.de',
    path: `/api/company/${uid}/quotes/received/${quoteId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Raw Response:', data);

        try {
          const jsonData = JSON.parse(data);
          console.log('\n🔍 Parsed Response:');
          console.log('Success:', jsonData.success);

          if (jsonData.quote) {
            console.log('Quote Status:', jsonData.quote.status);
            console.log('Has Response:', jsonData.quote.hasResponse);
            console.log('Response Data:', jsonData.quote.response);
            console.log('Proposals:', jsonData.quote.proposals);
          }

          if (jsonData.error) {
            console.log('❌ Error:', jsonData.error);
          }
        } catch (parseError) {
          console.log('❌ Failed to parse JSON:', parseError.message);
        }

        resolve(data);
      });
    });

    req.on('error', error => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
};

// Run the test
testQuoteDetailAPI()
  .then(() => {
    console.log('\n✅ Test completed');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });
