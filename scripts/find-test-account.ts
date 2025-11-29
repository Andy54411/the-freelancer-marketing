import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
  client_secret: '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',
  developer_token: '3FmN2K6u6C-WMxZoaeUIgQ',
});

const refreshToken = '1//0g8y3AUTB3bYFCgYIARAAGBASNwF-L9IrSnwk9xxdfzEq-9fmzraEB2SQeB9Ko8Omf3S8fFIRGPWmbkp51at6jYLoC9AZpC8_04I';

async function main() {
  console.log('Attempting to list ALL accessible customers for this Refresh Token...');
  
  try {
    // This call does not require a manager ID and lists all accounts the user has access to
    const result = await client.listAccessibleCustomers(refreshToken);
    
    console.log('\n✅ SUCCESS: Retrieved accessible accounts list!');
    console.log('---------------------------------------------------');
    console.log(`Found ${result.resource_names.length} accessible accounts:`);
    
    for (const resourceName of result.resource_names) {
      // resourceName format: "customers/1234567890"
      const customerId = resourceName.split('/')[1];
      console.log(`- Customer ID: ${customerId}`);
      
      // Try to determine if it's a test account by trying to connect to it
      try {
        const customer = client.Customer({
          customer_id: customerId,
          refresh_token: refreshToken,
          login_customer_id: customerId,
        });
        
        // Try a lightweight query to check access level
        await customer.query('SELECT customer.id, customer.test_account FROM customer LIMIT 1');
        console.log(`  -> ✅ ACCESS GRANTED (Likely a Test Account or Token has access)`);
      } catch (err: any) {
        // console.log(err);
        if (err?.message?.includes('DEVELOPER_TOKEN_PROHIBITED')) {
           console.log(`  -> ❌ BLOCKED: Production Account (Token is Test-Only)`);
        } else {
           console.log(`  -> ⚠️ Error checking details: ${err.message}`);
        }
      }
    }
    console.log('---------------------------------------------------');

  } catch (error: any) {
    console.error('\n❌ ERROR: Failed to list accessible customers');
    if (error.message) console.error('Message:', error.message);
    if (error.errors) console.error('API Errors:', JSON.stringify(error.errors, null, 2));
  }
}

main();
