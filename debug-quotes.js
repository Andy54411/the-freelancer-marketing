const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.log('Firebase admin already initialized or error:', error);
  }
}

const db = admin.firestore();

async function debugQuotesIssue() {
  console.log('🔍 Debugging Incoming Quotes Issue...\n');

  const companyUid = '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

  // 1. Check if company exists
  console.log('1️⃣ Checking company data...');
  const companyDoc = await db.collection('companies').doc(companyUid).get();
  if (companyDoc.exists) {
    const companyData = companyDoc.data();
    console.log('✅ Company found:', companyData.companyName);
  } else {
    console.log('❌ Company not found');
    return;
  }

  // 2. Check company user data and subcategory
  console.log('\n2️⃣ Checking company user data...');
  const userDoc = await db.collection('users').doc(companyUid).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    const selectedSubcategory =
      userData?.onboarding?.selectedSubcategory || userData?.selectedSubcategory;
    console.log('✅ User data found');
    console.log('📂 Selected subcategory:', selectedSubcategory);
    console.log('👤 User type:', userData.user_type);
  } else {
    console.log('❌ User data not found');
    return;
  }

  // 3. Check total project_requests
  console.log('\n3️⃣ Checking all project_requests...');
  const allProjectsSnapshot = await db.collection('project_requests').limit(10).get();
  console.log('📊 Total project_requests:', allProjectsSnapshot.size);

  allProjectsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`📝 Project ${index + 1}:`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${data.title}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Subcategory: ${data.serviceSubcategory}`);
    console.log(`   Created: ${data.createdAt?.toDate?.()}`);
  });

  // 4. Check open projects
  console.log('\n4️⃣ Checking open project_requests...');
  const openProjectsSnapshot = await db
    .collection('project_requests')
    .where('status', '==', 'open')
    .get();
  console.log('🚀 Open projects:', openProjectsSnapshot.size);

  // 5. Check notifications for this company
  console.log('\n5️⃣ Checking notifications for company...');
  const notificationsSnapshot = await db
    .collection('notifications')
    .where('userId', '==', companyUid)
    .limit(5)
    .get();
  console.log('🔔 Notifications found:', notificationsSnapshot.size);

  notificationsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`🔔 Notification ${index + 1}:`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Read: ${data.isRead}`);
    console.log(`   Created: ${data.createdAt?.toDate?.()}`);
  });
}

debugQuotesIssue().catch(console.error);
