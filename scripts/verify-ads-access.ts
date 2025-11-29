import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
  client_secret: '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',
  developer_token: '3FmN2K6u6C-WMxZoaeUIgQ',
});

const refreshToken = '1//0g8y3AUTB3bYFCgYIARAAGBASNwF-L9IrSnwk9xxdfzEq-9fmzraEB2SQeB9Ko8Omf3S8fFIRGPWmbkp51at6jYLoC9AZpC8_04I';
const managerCustomerId = '7510031211'; 

async function main() {
  console.log('Authenticating with Google Ads API...');
  const customer = client.Customer({
    customer_id: managerCustomerId,
    refresh_token: refreshToken,
    login_customer_id: managerCustomerId, 
  });

  console.log(`Querying accounts for Manager: ${managerCustomerId}...`);
  
  try {
    // Simple query to list client accounts
    const response = await customer.query(`
      SELECT 
        customer_client.id, 
        customer_client.descriptive_name, 
        customer_client.status,
        customer_client.manager,
        customer_client.test_account
      FROM customer_client
      WHERE customer_client.status = 'ENABLED'
    `);

    console.log('\n✅ SUCCESS: Connected to Google Ads Manager Account!');
    console.log('---------------------------------------------------');
    console.log(`Found ${response.length} accounts:`);
    
    response.forEach((row: any) => {
      const client = row.customer_client;
      console.log(`- [${client.id}] ${client.descriptive_name} (Manager: ${client.manager}, Test: ${client.test_account})`);
    });
    console.log('---------------------------------------------------');

  } catch (error: any) {
    console.error('\n❌ ERROR: Failed to connect to Google Ads API');
    // console.error('Details:', JSON.stringify(error, null, 2));
    if (error.message) console.error('Message:', error.message);
    if (error.errors) console.error('API Errors:', JSON.stringify(error.errors, null, 2));
  }
}

main();
