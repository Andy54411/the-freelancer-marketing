const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Initialize with service account from environment variable
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

let cleanKey = serviceAccountKey.trim();
if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
  cleanKey = cleanKey.slice(1, -1);
}
// Handle escaped JSON
cleanKey = cleanKey.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const serviceAccount = JSON.parse(cleanKey);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function updateEmployeeEmail() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  const employeeId = 'Oij8EPXKb7g2YohST6nu';
  const newEmail = 'andystaudinger@icloud.com'; // Die neue E-Mail
  
  try {
    const employeeRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const doc = await employeeRef.get();
    
    if (!doc.exists) {
      console.log('Employee not found!');
      return;
    }
    
    console.log('Current email:', doc.data().email);
    
    await employeeRef.update({
      email: newEmail,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Email updated to:', newEmail);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

updateEmployeeEmail();
