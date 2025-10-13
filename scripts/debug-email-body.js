/**
 * Debug Script: Check email body in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'tilvo-f142f',
  });
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

async function checkEmailBodies() {
  try {
    console.log('🔍 Checking email bodies in Firestore...');

    const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';

    const emailsSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('emailCache')
      .limit(5)
      .get();

    console.log(`\n📧 Found ${emailsSnapshot.size} emails in emailCache\n`);

    emailsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('─────────────────────────────────────');
      console.log(`📧 Email ID: ${doc.id}`);
      console.log(`Subject: ${data.subject}`);
      console.log(`From: ${data.from}`);
      console.log(`Date: ${data.date}`);
      console.log(`\nBody length: ${data.body?.length || 0} chars`);
      console.log(`HTML Body length: ${data.htmlBody?.length || 0} chars`);
      console.log(`Snippet: ${data.snippet?.substring(0, 100)}...`);

      if (data.body) {
        console.log(`\n✅ Body exists (${data.body.length} chars):`);
        console.log(data.body.substring(0, 200) + '...');
      } else {
        console.log('\n❌ NO BODY FOUND!');
      }

      if (data.htmlBody) {
        console.log(`\n✅ HTML Body exists (${data.htmlBody.length} chars)`);
      }

      console.log('─────────────────────────────────────\n');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkEmailBodies();
