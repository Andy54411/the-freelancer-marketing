// Test script to trigger Firestore index error and show automatic creation link
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, getDocs } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDtOHLrJZOaJw1YO5PhlOe1UhEoqPl1p_I',
  authDomain: 'tilvo-f142f.firebaseapp.com',
  projectId: 'tilvo-f142f',
  storageBucket: 'tilvo-f142f.appspot.com',
  messagingSenderId: '726334540438',
  appId: '1:726334540438:web:c8dc2a2cb86bfcc23a1d7c',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testChatQuery() {
  try {
    console.log('🔍 Testing chat query that requires index...');

    // This query will fail if the index doesn't exist
    const chatQuery = query(
      collection(db, 'chat'),
      where('chatId', '==', 'test_order_123'),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(chatQuery);
    console.log('✅ Query successful! Index exists.');
    console.log(`Found ${querySnapshot.size} messages`);
  } catch (error) {
    console.log('❌ Index error detected:');
    console.log(error.message);

    // Extract the automatic index creation link
    const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s\)]+/);
    if (match) {
      console.log('\n🔗 AUTOMATIC INDEX CREATION LINK:');
      console.log(match[0]);
      console.log('\n📋 Click this link to automatically create the required index!');
    } else {
      console.log('\n⚠️  No automatic link found in error message.');
      console.log('Manual index creation required in Firebase Console.');
    }
  }
}

testChatQuery();
