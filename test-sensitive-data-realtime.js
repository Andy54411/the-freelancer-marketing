const { initializeApp } = require('firebase/app');
const { getFirestore, doc, addDoc, collection, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHRbJfWGMLLMz1d9Vms2I93ijlQWqOwAM",
  authDomain: "the-freelancer-marketing.firebaseapp.com",
  databaseURL: "https://the-freelancer-marketing-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "the-freelancer-marketing",
  storageBucket: "the-freelancer-marketing.firebasestorage.app",
  messagingSenderId: "1033077107103",
  appId: "1:1033077107103:web:7c7e2cf7f5d1d39a3dd8a9",
  measurementId: "G-PCMR4GRPJJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testSensitiveDataChat() {
  try {
    console.log('Testing sensitive data detection in DirectChats...');
    
    const chatId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2_t0VQOV5RfTMIIgo6UDhy5b3z0BL2';
    
    // Test message with email
    const testMessage1 = {
      senderId: 't0VQOV5RfTMIIgo6UDhy5b3z0BL2',
      senderName: 'andy staudinge',
      senderType: 'company',
      text: 'Hi, meine E-Mail-Adresse ist kontakt@mietkoch-andy.de für weitere Kommunikation.',
      type: 'text',
      content: 'Hi, meine E-Mail-Adresse ist kontakt@mietkoch-andy.de für weitere Kommunikation.',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      metadata: {},
      isRead: false
    };

    // Test message with phone number
    const testMessage2 = {
      senderId: 'LLc8PX1VYHfpoFknk8o51LAOfSA2',
      senderName: 'Mietkoch Andy',
      senderType: 'company', 
      text: 'Hier ist meine Telefonnummer für Notfälle: +49 176 98765432',
      type: 'text',
      content: 'Hier ist meine Telefonnummer für Notfälle: +49 176 98765432',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      metadata: {},
      isRead: false
    };

    // Test message with address
    const testMessage3 = {
      senderId: 't0VQOV5RfTMIIgo6UDhy5b3z0BL2',
      senderName: 'andy staudinge',
      senderType: 'company',
      text: 'Unsere Adresse ist Musterstraße 123, 10115 Berlin für den Service.',
      type: 'text',
      content: 'Unsere Adresse ist Musterstraße 123, 10115 Berlin für den Service.',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      metadata: {},
      isRead: false
    };

    console.log('Adding test message with email...');
    const docRef1 = await addDoc(collection(db, 'directChats', chatId, 'messages'), testMessage1);
    console.log('✓ Email message added:', docRef1.id);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Adding test message with phone...');
    const docRef2 = await addDoc(collection(db, 'directChats', chatId, 'messages'), testMessage2);
    console.log('✓ Phone message added:', docRef2.id);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Adding test message with address...');
    const docRef3 = await addDoc(collection(db, 'directChats', chatId, 'messages'), testMessage3);
    console.log('✓ Address message added:', docRef3.id);

    console.log('\n🎉 All test messages added successfully!');
    console.log('⚠️  Check the Lambda logs and Admin Dashboard for sensitive data alerts.');
    
  } catch (error) {
    console.error('Error testing sensitive data:', error);
  }
}

testSensitiveDataChat();