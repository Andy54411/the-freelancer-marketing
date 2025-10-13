const admin = require('firebase-admin');
const { google } = require('googleapis');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../service-account-key.json')),
  });
}

const db = admin.firestore();

async function renewGmailWatch() {
  try {
    console.log('🔄 Renewing Gmail Watch...\n');

    // Get emailConfig
    const emailConfigsSnapshot = await db
      .collection('companies')
      .doc('LLc8PX1VYHfpoFknk8o51LAOfSA2')
      .collection('emailConfigs')
      .where('provider', '==', 'gmail')
      .where('isActive', '==', true)
      .get();

    if (emailConfigsSnapshot.empty) {
      console.log('❌ No active Gmail config found');
      return;
    }

    const emailConfigDoc = emailConfigsSnapshot.docs[0];
    const emailConfig = emailConfigDoc.data();
    const configId = emailConfigDoc.id;

    console.log('✅ Found email config:', configId);
    console.log('📧 Email:', emailConfig.email);
    console.log('🔑 Has tokens:', !!emailConfig.tokens);

    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials(emailConfig.tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Stop existing watch (if any)
    try {
      await gmail.users.stop({ userId: 'me' });
      console.log('🛑 Stopped existing watch');
    } catch (error) {
      console.log('ℹ️  No existing watch to stop');
    }

    // Start new watch
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX', 'SENT'],
        topicName: 'projects/tilvo-f142f/topics/gmail-notifications',
      },
    });

    console.log('\n✅ Gmail Watch renewed successfully!');
    console.log('📊 History ID:', watchResponse.data.historyId);
    console.log('⏰ Expiration:', new Date(watchResponse.data.expiration).toLocaleString());

    // Update Firestore
    await emailConfigDoc.ref.update({
      watchEnabled: true,
      watchSetupAt: admin.firestore.FieldValue.serverTimestamp(),
      'gmailProfile.historyId': watchResponse.data.historyId,
      watchExpiration: new Date(parseInt(watchResponse.data.expiration)),
    });

    console.log('✅ Firestore updated');
  } catch (error) {
    console.error('❌ Error renewing watch:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

renewGmailWatch();
