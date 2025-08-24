const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const db = admin.firestore();

async function fixNotifications() {
  console.log('🔧 Fixing notifications with undefined isRead...');

  const snapshot = await db
    .collection('notifications')
    .where('userId', '==', '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1')
    .get();

  const batch = db.batch();
  let fixedCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.isRead === undefined) {
      batch.update(doc.ref, { isRead: false });
      fixedCount++;
      console.log('🔧 Fixing notification:', data.message);
    }
  });

  if (fixedCount > 0) {
    await batch.commit();
    console.log(`✅ Fixed ${fixedCount} notifications`);
  } else {
    console.log('✅ All notifications already have isRead property');
  }
}

fixNotifications().catch(console.error);
