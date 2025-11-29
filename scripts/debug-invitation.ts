import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
  client_secret: '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',
  developer_token: '3FmN2K6u6C-WMxZoaeUIgQ',
});

const refreshToken = '1//0g8y3AUTB3bYFCgYIARAAGBASNwF-L9IrSnwk9xxdfzEq-9fmzraEB2SQeB9Ko8Omf3S8fFIRGPWmbkp51at6jYLoC9AZpC8_04I';
const managerCustomerId = '6559238498'; // Test Manager
const targetCustomerId = '5267195046'; // The ID the user is trying to connect

async function main() {
  console.log(`Checking status of target account: ${targetCustomerId}...`);
  
  try {
    // We can try to access it directly if we have credentials, but we might not.
    // Instead, let's try to invite it from the manager and see what happens.
    
    const managerCustomer = client.Customer({
      customer_id: managerCustomerId,
      refresh_token: refreshToken,
      login_customer_id: managerCustomerId, 
    });

    console.log('Attempting to QUERY target account directly...');
    
    const targetCustomer = client.Customer({
      customer_id: targetCustomerId,
      refresh_token: refreshToken,
      login_customer_id: targetCustomerId,
    });

    const result = await targetCustomer.query('SELECT customer.id, customer.test_account FROM customer LIMIT 1');

    console.log('✅ Query successful!');
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('\n❌ ERROR: Failed to send invitation');
    if (error.message) console.error('Message:', error.message);
    if (error.errors) console.error('API Errors:', JSON.stringify(error.errors, null, 2));
  }
}

main();
