const https = require('https');

// Test the live B2B quotes API
const testB2BQuotesAPI = async () => {
  const uid = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
  const url = `https://taskilo.de/api/company/${uid}/quotes/received`;

  const options = {
    hostname: 'taskilo.de',
    path: `/api/company/${uid}/quotes/received`,
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
        console.log('Response Body:', data);

        try {
          const jsonData = JSON.parse(data);
          console.log('\nParsed Response:');
          console.log('Success:', jsonData.success);
          console.log('Quotes Count:', jsonData.quotes?.length || 0);
          if (jsonData.quotes && jsonData.quotes.length > 0) {
            console.log('First Quote:', JSON.stringify(jsonData.quotes[0], null, 2));
          }
        } catch (parseError) {
          console.log('Failed to parse JSON:', parseError.message);
        }

        resolve(data);
      });
    });

    req.on('error', error => {
      console.error('Request error:', error);
      reject(error);
    });

    req.end();
  });
};

// Run the test
testB2BQuotesAPI()
  .then(() => {
    console.log('\nTest completed');
  })
  .catch(error => {
    console.error('Test failed:', error);
  });
