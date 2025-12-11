// Test-Script für Job-Alert Push-Benachrichtigungen
// Dieses Script erstellt einen Test-Job, der die Cloud Function triggert

const admin = require('firebase-admin');
const path = require('path');

// Firebase initialisieren
const serviceAccountPath = path.join(__dirname, '../firebase_functions/service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath))
});

const db = admin.firestore();

async function createTestJob() {
  console.log('🚀 Starte Job-Alert Test...\n');

  // 1. Prüfe ob User VP9BNVTey1WvdkMb0EPA3rdPq4t2 einen Jobfinder hat
  const userId = 'VP9BNVTey1WvdkMb0EPA3rdPq4t2';
  
  console.log(`📋 Lade Jobfinder für User ${userId}...`);
  const jobfinderSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('jobfinder')
    .get();

  if (jobfinderSnapshot.empty) {
    console.log('❌ Keine Jobfinder gefunden!');
    console.log('   Bitte erstelle zuerst einen Jobfinder in der Web-Version oder Flutter App.');
    process.exit(1);
  }

  console.log(`✅ ${jobfinderSnapshot.size} Jobfinder gefunden:\n`);
  jobfinderSnapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    console.log(`   ${i + 1}. "${data.name || 'Unbenannt'}"`);
    console.log(`      - Aktiv: ${data.active ? 'Ja' : 'Nein'}`);
    console.log(`      - Suchbegriff: ${data.searchTerm || '-'}`);
    console.log(`      - Kategorie: ${data.category || '-'}`);
    console.log(`      - Standort: ${data.location || '-'}`);
    console.log('');
  });

  // 2. Prüfe FCM Token
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const fcmTokens = userData?.fcmTokens || [];
  
  console.log(`📱 FCM Tokens: ${fcmTokens.length} Token(s) vorhanden`);
  if (fcmTokens.length > 0) {
    console.log(`   Erster Token: ${fcmTokens[0].substring(0, 30)}...`);
  } else {
    console.log('⚠️  Keine FCM Tokens! Push-Benachrichtigung wird nicht funktionieren.');
    console.log('   Bitte öffne die Flutter App, damit ein Token registriert wird.');
  }

  // 3. Finde eine Company zum Erstellen des Jobs
  const companiesSnapshot = await db.collection('companies').limit(1).get();
  
  if (companiesSnapshot.empty) {
    console.log('\n❌ Keine Companies gefunden!');
    process.exit(1);
  }

  const companyDoc = companiesSnapshot.docs[0];
  const companyId = companyDoc.id;
  const companyData = companyDoc.data();
  
  console.log(`\n🏢 Verwende Company: ${companyData.companyName || companyId}`);

  // 4. Erstelle einen Test-Job
  console.log('\n📝 Erstelle Test-Job...');
  
  const testJob = {
    title: 'Test-Koch für Jobfinder-Test',
    description: 'Dies ist ein Test-Job, um die Jobfinder Push-Benachrichtigung zu testen.',
    companyId: companyId,
    companyName: companyData.companyName || 'Test Company',
    location: 'München',
    category: 'Hotel & Gastronomie',
    type: 'Vollzeit',
    status: 'active',
    postedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const jobRef = await db
    .collection('companies')
    .doc(companyId)
    .collection('jobs')
    .add(testJob);

  console.log(`✅ Test-Job erstellt: ${jobRef.id}`);
  console.log('\n🔔 Die Cloud Function sollte jetzt triggern und Push-Benachrichtigungen senden...');
  console.log('   Prüfe die Firebase Console unter Functions > Logs');
  console.log('   Prüfe dein Handy auf Push-Benachrichtigungen');

  // 5. Warte 5 Sekunden und lösche den Test-Job wieder
  console.log('\n⏳ Warte 10 Sekunden...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Optinal: Job löschen
  // console.log('\n🗑️  Lösche Test-Job...');
  // await jobRef.delete();
  // console.log('✅ Test-Job gelöscht');

  console.log('\n✅ Test abgeschlossen!');
  process.exit(0);
}

createTestJob().catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});
