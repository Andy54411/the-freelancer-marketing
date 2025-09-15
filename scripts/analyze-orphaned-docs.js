#!/usr/bin/env node
/**
 * Analysiert Dokumente ohne companyId und versucht sie zuzuordnen
 */

const admin = require('firebase-admin');

// Firebase initialisieren
if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: 'tilvo-f142f' });
}

const db = admin.firestore();

async function analyzeOrphanedDocuments() {
  console.log('🔍 Analysiere verwaiste Dokumente ohne companyId...\n');

  // Prüfe quotes Collection (sollte leer sein nach Migration)
  try {
    const quotesSnapshot = await db.collection('quotes').get();
    
    if (!quotesSnapshot.empty) {
      console.log('📄 QUOTES Collection (sollte leer sein):');
      quotesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Daten:`, JSON.stringify(data, null, 2));
        console.log(`   companyId: ${data.companyId || 'FEHLT'}`);
        console.log(`   providerId: ${data.providerId || 'N/A'}`);
        console.log(`   customerId: ${data.customerId || 'N/A'}`);
        console.log(`   createdAt: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ quotes Collection ist leer (wie erwartet nach Migration)');
    }
  } catch (error) {
    console.log(`❌ Fehler beim Lesen von quotes: ${error.message}`);
  }

  // Prüfe orderTimeTracking Collection (sollte leer sein nach Migration)
  try {
    const trackingSnapshot = await db.collection('orderTimeTracking').get();
    
    if (!trackingSnapshot.empty) {
      console.log('\n📄 ORDER_TIME_TRACKING Collection (sollte leer sein):');
      trackingSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   ID: ${doc.id}`);
        console.log(`   Daten:`, JSON.stringify(data, null, 2));
        console.log(`   companyId: ${data.companyId || 'FEHLT'}`);
        console.log(`   orderId: ${data.orderId || 'N/A'}`);
        console.log(`   providerId: ${data.providerId || 'N/A'}`);
        console.log(`   userId: ${data.userId || 'N/A'}`);
        console.log(`   createdAt: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`);
        console.log('   ---');
      });
    } else {
      console.log('✅ orderTimeTracking Collection ist leer (wie erwartet nach Migration)');
    }
  } catch (error) {
    console.log(`❌ Fehler beim Lesen von orderTimeTracking: ${error.message}`);
  }

  // Prüfe alle Companies um eine mögliche Zuordnung zu finden
  console.log('\n🏢 Verfügbare Companies:');
  try {
    const companiesSnapshot = await db.collection('companies').get();
    companiesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   Company ID: ${doc.id}`);
      console.log(`   Name: ${data.companyName || data.name || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Owner: ${data.uid || data.ownerId || 'N/A'}`);
      console.log('   ---');
    });
  } catch (error) {
    console.log(`❌ Fehler beim Lesen von companies: ${error.message}`);
  }

  console.log('\n🎯 Analyse abgeschlossen!');
}

analyzeOrphanedDocuments().catch(console.error);