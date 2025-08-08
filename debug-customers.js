const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyDe3QSf1iywvnR69u1hJ-3C-I8yNGFp6P4',
  authDomain: 'tilvo-f142f.firebaseapp.com',
  projectId: 'tilvo-f142f',
  storageBucket: 'tilvo-f142f.appspot.com',
  messagingSenderId: '531738066078',
  appId: '1:531738066078:web:1fa5ad0b0ca89dc624b1fc',
  measurementId: 'G-F9QZ8QQKFF',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCustomers() {
  try {
    console.log('📋 Checking customers...');

    // Test company ID from the error log
    const companyId = '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    const q = query(collection(db, 'customers'), where('companyId', '==', companyId));

    const querySnapshot = await getDocs(q);

    console.log(`Found ${querySnapshot.size} customers for company ${companyId}`);

    if (querySnapshot.size > 0) {
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Customer: ${data.name} (${doc.id})`);
        console.log(`Email: ${data.email}`);
        console.log(`Company ID: ${data.companyId}`);
        console.log('---');
      });
    } else {
      console.log('❌ No customers found. This is why the CustomerSelect is empty!');
      console.log('✅ Suggestion: Go to Finance → Customers and create some customers first');
    }
  } catch (error) {
    console.error('Error checking customers:', error);
  }
}

checkCustomers();
