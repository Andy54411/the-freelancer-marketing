const admin = require('firebase-admin');

// --- Configuration ---
// The UID of the user you want to modify.
const uid = 'nPcQhCqrROOcThDtthMPNHDpCZ8m';
// The role you want to assign. Can be 'company' or 'admin'.
const roleToSet = 'company';
// --- End Configuration ---

// IMPORTANT: Replace this with your actual Firebase project ID.
// You can find it in your Firebase project settings or firebase.json.
const projectId = 'tasko-andy'; // <-- Ersetze 'tasko-andy' mit deiner echten Projekt-ID

// Set this environment variable to connect to the Auth emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

// Initialize the Admin SDK.
// No credentials needed when running against the emulator.
admin.initializeApp({ projectId });

async function setClaim() {
    if (!uid || !roleToSet || projectId === 'your-firebase-project-id') {
        console.error('Error: Please provide a UID and a role in the configuration section, and update the projectId.');
        return;
    }

    try {
        // Set the custom claim for the user
        await admin.auth().setCustomUserClaims(uid, { role: roleToSet });
        console.log(`✅ Successfully set custom claim for user ${uid}.`);

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