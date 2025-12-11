// Test-Script für Job-Alert Push-Benachrichtigungen
// Führe aus mit: node scripts/test-job-alert.js

const admin = require('firebase-admin');

// Firebase Admin initialisieren
const serviceAccount = require('../firebase_functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createTestJob() {
  // Ersetze mit einer echten Company ID aus deiner Datenbank
  const testCompanyId = 'TEST_COMPANY_ID'; // TODO: Echte Company ID einfügen
  
  const jobData = {
    title: 'Test Koch - Jobfinder Test',
    companyName: 'Test Restaurant GmbH',
    companyId: testCompanyId,
    location: 'München',
    category: 'Hotel & Gastronomie',
    type: 'Vollzeit',
    description: 'Dies ist ein Test-Job um die Jobfinder Push-Benachrichtigungen zu testen.',
    status: 'active',
    postedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    salary: {
      min: 2500,
      max: 3500,
      currency: 'EUR',
      period: 'month',
    },
    requirements: ['Erfahrung in der Küche', 'Teamfähigkeit'],
    benefits: ['Mitarbeiteressen', 'Flexible Arbeitszeiten'],
  };

  try {
    console.log('🚀 Erstelle Test-Job...');
    
    const jobRef = await db
      .collection('companies')
      .doc(testCompanyId)
      .collection('jobs')
      .add(jobData);
    
    console.log(`✅ Test-Job erstellt mit ID: ${jobRef.id}`);
    console.log(`📍 Pfad: /companies/${testCompanyId}/jobs/${jobRef.id}`);
    console.log('');
    console.log('🔔 Die Cloud Function "onJobCreatedForAlerts" sollte jetzt triggern.');
    console.log('   Prüfe die Firebase Console Logs für Details.');
    console.log('');
    console.log('📱 Wenn du einen Jobfinder mit passenden Kriterien hast,');
    console.log('   solltest du jetzt eine Push-Benachrichtigung erhalten!');
    console.log('');
    console.log('🗑️  Um den Test-Job zu löschen:');
    console.log(`   await db.collection('companies').doc('${testCompanyId}').collection('jobs').doc('${jobRef.id}').delete()`);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
  
  process.exit(0);
}

// Alternativ: Alle aktiven Job-Alerts anzeigen
async function listJobAlerts() {
  console.log('📋 Suche aktive Job-Alerts...\n');
  
  const usersSnapshot = await db.collection('users').get();
  let totalAlerts = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const alertsSnapshot = await db
      .collection('users')
      .doc(userDoc.id)
      .collection('job_alerts')
      .where('isActive', '==', true)
      .get();
    
    if (alertsSnapshot.size > 0) {
      console.log(`👤 User: ${userDoc.id}`);
      for (const alertDoc of alertsSnapshot.docs) {
        const alert = alertDoc.data();
        console.log(`   📌 Alert: "${alert.name}"`);
        console.log(`      Suchbegriff: ${alert.searchTerm || '-'}`);
        console.log(`      Standort: ${alert.location || '-'}`);
        console.log(`      Kategorie: ${alert.category || '-'}`);
        console.log(`      Push: ${alert.pushNotification ? 'Ja' : 'Nein'}`);
        totalAlerts++;
      }
      console.log('');
    }
  }
  
  console.log(`📊 Gesamt: ${totalAlerts} aktive Job-Alerts gefunden.`);
}

// Hauptfunktion
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'list') {
    await listJobAlerts();
  } else if (args[0] === 'create') {
    await createTestJob();
  } else {
    console.log('Job-Alert Test Script');
    console.log('=====================');
    console.log('');
    console.log('Verwendung:');
    console.log('  node scripts/test-job-alert.js list    - Zeigt alle aktiven Job-Alerts');
    console.log('  node scripts/test-job-alert.js create  - Erstellt einen Test-Job');
    console.log('');
    console.log('Vor dem Erstellen eines Test-Jobs:');
    console.log('1. Erstelle einen Jobfinder in der Flutter App');
    console.log('2. Editiere dieses Script und setze eine echte Company ID');
    console.log('3. Führe "node scripts/test-job-alert.js create" aus');
  }
  
  process.exit(0);
}

main();
