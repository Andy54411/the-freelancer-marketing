// Token Testing Script
const crypto = require('crypto');

// Erstelle Test Token Data
const testTokenData = {
  access_token: "fake_access_token_12345",
  refresh_token: "fake_refresh_token_67890",
  token_type: "Bearer",
  expires_in: 3600,
  scope: "openid profile account_id email",
  id_token: "fake_id_token_abcdef",
  client_id: "6111ad8e8cae82d1a805950f2ae4adc4",
  environment: "development",
  api_base_url: "https://apisandbox.datev.de",
  connected_at: Date.now(),
  original_client_id: "6111ad8e8cae82d1a805950f2ae4adc4"
};

// Konvertiere zu Base64 (wie im echten System)
const tokenJson = JSON.stringify(testTokenData);
const tokenBase64 = Buffer.from(tokenJson).toString('base64');

console.log('🔧 TEST TOKEN DATA:');
console.log('Raw JSON:', tokenJson);
console.log('\n🔐 BASE64 TOKEN:');
console.log(tokenBase64);
console.log('\n🎯 TOKEN COOKIE NAME:');
console.log(`datev_tokens_token-test-12345`);

// Test Token Parsing
console.log('\n🔍 TOKEN PARSING TEST:');
try {
  const decoded = Buffer.from(tokenBase64, 'base64').toString('utf-8');
  const parsed = JSON.parse(decoded);
  console.log('✅ Parsing successful:', parsed.client_id);
} catch (error) {
  console.log('❌ Parsing failed:', error.message);
}
