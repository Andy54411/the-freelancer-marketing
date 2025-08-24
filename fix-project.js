const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const db = admin.firestore();

async function fixProject() {
  console.log('🔧 Fixing project request...');

  await db.collection('project_requests').doc('m4mXgYoSxli0UXwluLRD').update({
    serviceSubcategory: 'Mietkoch',
    serviceCategory: 'Hotel & Gastronomie',
  });

  console.log('✅ Fixed!');

  const doc = await db.collection('project_requests').doc('m4mXgYoSxli0UXwluLRD').get();
  const data = doc.data();
  console.log('📊 Verified subcategory:', data.serviceSubcategory);
}

fixProject().catch(console.error);
