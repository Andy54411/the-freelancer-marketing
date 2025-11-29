import { GoogleAdsApi } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
  client_secret: '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',
  developer_token: '3FmN2K6u6C-WMxZoaeUIgQ',
});

const refreshToken = '1//0g8y3AUTB3bYFCgYIARAAGBASNwF-L9IrSnwk9xxdfzEq-9fmzraEB2SQeB9Ko8Omf3S8fFIRGPWmbkp51at6jYLoC9AZpC8_04I';
const accessibleIds = ['4959227548', '3303085284', '6559238498'];

async function main() {
  console.log('Checking account types for accessible IDs...');
  console.log('---------------------------------------------------');

  for (const id of accessibleIds) {
    try {
      const customer = client.Customer({
        customer_id: id,
        refresh_token: refreshToken,
        login_customer_id: id,
      });

      const response = await customer.query(`
        SELECT 
          customer.id, 
          customer.descriptive_name, 
          customer.manager, 
          customer.test_account 
        FROM customer 
        LIMIT 1
      `);

      const info = response[0]?.customer;
      if (!info) {
        console.log(`ID: ${id} - No customer info found`);
        continue;
      }
      const isManager = info.manager;
      const isTest = info.test_account;
      
      console.log(`ID: ${info.id}`);
      console.log(`Name: ${info.descriptive_name}`);
      console.log(`Type: ${isManager ? '✅ MANAGER ACCOUNT' : '👤 Client Account'}`);
      console.log(`Test: ${isTest ? '✅ YES' : '❌ NO'}`);
      console.log('---------------------------------------------------');

    } catch (error: any) {
      console.log(`ID: ${id} - Error: ${error.message}`);
      console.log('---------------------------------------------------');
    }
  }
}

main();
