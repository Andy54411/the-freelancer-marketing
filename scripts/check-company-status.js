const admin = require('firebase-admin');

// Firebase mit Application Default Credentials initialisieren
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'taskilo-fd3dc'
  });
}

const db = admin.firestore();

async function checkCompany() {
  const doc = await db.collection('companies').doc('LSeyPKLSCXTnyQd48Vuc6JLx7nH2').get();
  const data = doc.data();
  console.log('Status-relevante Felder:');
  console.log('  status:', data.status);
  console.log('  accountSuspended:', data.accountSuspended);
  console.log('  suspended:', data.suspended);
  console.log('  adminApproved:', data.adminApproved);
  console.log('  profileStatus:', data.profileStatus);
  console.log('  blocked:', data.blocked);
}

checkCompany().then(() => process.exit(0));
