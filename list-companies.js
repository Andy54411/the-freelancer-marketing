#!/usr/bin/env node

const admin = require('firebase-admin');

// Firebase Admin initialisieren
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://taskilo-b828a-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.firestore();

async function listCompanies() {
  try {
    console.log('📋 Verfügbare Company IDs:');

    // Prüfe users collection
    const usersSnapshot = await db.collection('users').limit(10).get();
    console.log('\n🔍 Users Collection:');
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.companyName || data.displayName) {
        console.log(`  - ${doc.id}: ${data.companyName || data.displayName}`);
      }
    });

    // Prüfe companies collection
    const companiesSnapshot = await db.collection('companies').limit(10).get();
    console.log('\n🔍 Companies Collection:');
    companiesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.companyName) {
        console.log(`  - ${doc.id}: ${data.companyName}`);
      }
    });

    // Prüfe existing reviews
    const reviewsSnapshot = await db.collection('reviews').limit(5).get();
    console.log('\n🔍 Bestehende Reviews:');
    if (reviewsSnapshot.empty) {
      console.log('  Keine Reviews gefunden.');
    } else {
      reviewsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - Review für Anbieter: ${data.anbieterId} (${data.sterne} Sterne)`);
      });
    }
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    process.exit(0);
  }
}

listCompanies();
