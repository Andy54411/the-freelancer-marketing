#!/usr/bin/env node

/**
 * Debug Firebase-Verbindung und Collections
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase initialisieren
const serviceAccount = require('./firebase_functions/service-account.json');
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const db = getFirestore();

async function debugFirebase() {
  try {
    console.log('🔧 Firebase Debug Information');
    console.log('');
    console.log('Environment Variables:');
    console.log(`  - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log('');

    // Test basic Firestore connection
    console.log('🔍 Testing Firestore connection...');

    // Liste alle top-level Collections
    const collections = await db.listCollections();
    console.log(`📚 Available collections (${collections.length}):`);

    for (const collection of collections) {
      console.log(`  - ${collection.id}`);

      try {
        const snapshot = await collection.limit(1).get();
        console.log(`    Size: ${snapshot.size} documents`);
      } catch (error) {
        console.log(`    Error: ${error.message}`);
      }
    }

    // Speziell nach "orders" suchen
    console.log('');
    console.log('🔍 Checking orders collection specifically...');
    try {
      const ordersRef = db.collection('orders');
      const ordersSnapshot = await ordersRef.limit(5).get();
      console.log(`📦 Orders collection size: ${ordersSnapshot.size}`);

      if (ordersSnapshot.size > 0) {
        console.log('First few orders:');
        ordersSnapshot.forEach(doc => {
          const data = doc.data();
          console.log(`  - ${doc.id}: ${data.projectTitle || 'No title'}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error accessing orders: ${error.message}`);
    }

    // Andere mögliche Collections prüfen
    console.log('');
    console.log('🔍 Checking other possible collections...');
    const possibleCollections = ['Orders', 'ORDER', 'auftraege', 'jobs', 'projects'];

    for (const collName of possibleCollections) {
      try {
        const collRef = db.collection(collName);
        const snapshot = await collRef.limit(1).get();
        if (snapshot.size > 0) {
          console.log(`✅ Found data in collection '${collName}': ${snapshot.size} document(s)`);
        }
      } catch (error) {
        // Ignore errors for non-existent collections
      }
    }
  } catch (error) {
    console.error('❌ Error during Firebase debug:', error.message);
    console.error(error);
  }
}

debugFirebase();
