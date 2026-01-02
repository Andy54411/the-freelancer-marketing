const admin = require('firebase-admin');

// Use default credentials from GOOGLE_APPLICATION_CREDENTIALS or emulator
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'taskilo-a2657'
  });
}

const db = admin.firestore();

async function getOrder() {
  const doc = await db.collection('auftraege').doc('4Lxr0zyAHpdctRXXv5B2').get();
  const data = doc.data();
  
  console.log('=== Beschreibungs-Felder ===');
  console.log('description:', data.description);
  console.log('jobDescription:', data.jobDescription);
  console.log('beschreibung:', data.beschreibung);
  console.log('taskDescription:', data.taskDescription);
  console.log('notes:', data.notes);
  console.log('details:', data.details);
  
  console.log('\n=== Alle Felder mit desc/besch/note/detail ===');
  Object.keys(data).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('desc') || lowerKey.includes('besch') || lowerKey.includes('note') || lowerKey.includes('detail')) {
      console.log(key + ':', data[key]);
    }
  });
  
  console.log('\n=== Alle Felder ===');
  Object.keys(data).sort().forEach(key => {
    console.log(key + ':', typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
  });
}

getOrder().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
