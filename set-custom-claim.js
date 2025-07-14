const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

// --- Configuration ---
// Get UID and role from command-line arguments
const [uid, roleToSet] = process.argv.slice(2);

if (!uid || !roleToSet) {
  console.error('Usage: node set-custom-claim.js <uid> <role>');
  process.exit(1);
}
// --- End Configuration ---

// Initialize the Admin SDK for the live environment.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setClaim() {
  try {
    // Set the custom claim for the user
    await admin.auth().setCustomUserClaims(uid, { role: roleToSet });
    console.log(`✅ Successfully set role '${roleToSet}' for user ${uid}.`);

    // Verify the claim was set
    const userRecord = await admin.auth().getUser(uid);
    console.log('\nVerification:');
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Email: ${userRecord.email}`);
    console.log(`  Custom Claims:`, userRecord.customClaims);
  } catch (error) {
    console.error('❌ Error setting custom claim:', error.message);
  }
}

setClaim();
