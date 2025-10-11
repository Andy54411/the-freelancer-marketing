/**
 * Test Script for Email Integration System
 * Tests all three API endpoints
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test configuration (REPLACE WITH YOUR REAL CREDENTIALS FOR TESTING)
const TEST_CONFIG = {
  companyId: 'YOUR_COMPANY_ID_HERE',
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: 'YOUR_EMAIL@gmail.com',
    password: 'YOUR_APP_PASSWORD', // Use Gmail App Password
  },
  imap: {
    enabled: true,
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    username: 'YOUR_EMAIL@gmail.com',
    password: 'YOUR_APP_PASSWORD',
  },
};

async function testSmtpConnection() {
  console.log('\n🧪 Testing SMTP Connection...');
  try {
    const response = await fetch(`${BASE_URL}/api/email/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtp: TEST_CONFIG.smtp,
        testType: 'smtp',
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SMTP Test PASSED:', data.message);
      return true;
    } else {
      console.log('❌ SMTP Test FAILED:', data.message);
      console.log('   Error:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ SMTP Test ERROR:', error.message);
    return false;
  }
}

async function testImapConnection() {
  console.log('\n🧪 Testing IMAP Connection...');
  try {
    const response = await fetch(`${BASE_URL}/api/email/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imap: TEST_CONFIG.imap,
        testType: 'imap',
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ IMAP Test PASSED:', data.message);
      return true;
    } else {
      console.log('❌ IMAP Test FAILED:', data.message);
      console.log('   Error:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ IMAP Test ERROR:', error.message);
    return false;
  }
}

async function testEmailSend() {
  console.log('\n🧪 Testing Email Send...');

  // First check if we need to save config
  console.log('⚠️  Email Send test requires saved configuration in Firestore');
  console.log('   This test will be skipped in automated testing');
  console.log('   Please test manually via the UI after saving your config');

  return null; // Skip for now
}

async function testEmailSync() {
  console.log('\n🧪 Testing Email Sync...');

  console.log('⚠️  Email Sync test requires saved configuration in Firestore');
  console.log('   This test will be skipped in automated testing');
  console.log('   Please test manually via the UI after saving your config');

  return null; // Skip for now
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  E-Mail Integration System - API Test Suite       ║');
  console.log('╚════════════════════════════════════════════════════╝');

  console.log('\n📋 Configuration:');
  console.log('   SMTP Server:', TEST_CONFIG.smtp.host);
  console.log('   SMTP Port:', TEST_CONFIG.smtp.port);
  console.log('   SMTP Username:', TEST_CONFIG.smtp.username);
  console.log('   IMAP Server:', TEST_CONFIG.imap.host);
  console.log('   IMAP Port:', TEST_CONFIG.imap.port);

  if (TEST_CONFIG.smtp.username === 'YOUR_EMAIL@gmail.com') {
    console.log('\n⚠️  WARNING: Please update TEST_CONFIG with real credentials!');
    console.log('   Edit scripts/test-email-integration.js');
    console.log('   For Gmail: Use App Password from https://myaccount.google.com/apppasswords');
    console.log('\n   Skipping connection tests...');
    return;
  }

  const results = {
    smtp: await testSmtpConnection(),
    imap: await testImapConnection(),
    send: await testEmailSend(),
    sync: await testEmailSync(),
  };

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                              ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log(
    `SMTP Connection: ${results.smtp ? '✅ PASS' : results.smtp === null ? '⏭️  SKIP' : '❌ FAIL'}`
  );
  console.log(
    `IMAP Connection: ${results.imap ? '✅ PASS' : results.imap === null ? '⏭️  SKIP' : '❌ FAIL'}`
  );
  console.log(
    `Email Send:      ${results.send ? '✅ PASS' : results.send === null ? '⏭️  SKIP' : '❌ FAIL'}`
  );
  console.log(
    `Email Sync:      ${results.sync ? '✅ PASS' : results.sync === null ? '⏭️  SKIP' : '❌ FAIL'}`
  );

  const passCount = Object.values(results).filter(r => r === true).length;
  const failCount = Object.values(results).filter(r => r === false).length;
  const skipCount = Object.values(results).filter(r => r === null).length;

  console.log('\n📊 Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);

  if (failCount === 0 && passCount > 0) {
    console.log('\n🎉 All enabled tests passed!');
  } else if (failCount > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
