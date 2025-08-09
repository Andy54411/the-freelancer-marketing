// Debug script to understand Google Ads status
import { GoogleAdsSetupValidator } from './src/utils/googleAdsSetupValidator';

console.log('=== Google Ads Setup Validation ===');

const setupValidation = GoogleAdsSetupValidator.validateSetup();

console.log('Setup Valid:', setupValidation.valid);
console.log('Errors:', setupValidation.errors);
console.log('Warnings:', setupValidation.warnings);
console.log('Summary:', GoogleAdsSetupValidator.getSetupSummary(setupValidation));

console.log('\n=== Environment Variables ===');
console.log('GOOGLE_ADS_CLIENT_ID:', process.env.GOOGLE_ADS_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_ADS_CLIENT_SECRET:', process.env.GOOGLE_ADS_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log(
  'GOOGLE_ADS_DEVELOPER_TOKEN:',
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? 'SET' : 'NOT SET'
);
console.log(
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID:',
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? 'SET' : 'NOT SET'
);

if (setupValidation.valid) {
  console.log('\n✅ System should show: Ready for Google Ads Account Connection');
  console.log('✅ "Google Ads verbinden" button should be visible');
} else {
  console.log('\n❌ System should show: Setup Required');
  console.log('❌ Environment configuration needed');
}
