// Script zum Finden von Invoice-IDs in Firestore
// Verwendung: node find-invoices.js

const admin = require('firebase-admin');

// Firebase Admin initialisieren
if (!admin.apps.length) {
  try {
    // Versuche Service Account Key zu laden
    const serviceAccount = require('./firebase_functions/service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.log('⚠️ Service Account nicht gefunden, versuche andere Methode...');
    // Fallback: Environment Variable
    admin.initializeApp();
  }
}

const db = admin.firestore();

const findInvoices = async () => {
  console.log('🔍 Suche nach verfügbaren Rechnungen in Firestore...');

  try {
    const invoicesSnapshot = await db
      .collection('invoices')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (invoicesSnapshot.empty) {
      console.log('❌ Keine Rechnungen in der Datenbank gefunden');
      console.log('💡 Erstellen Sie zuerst eine Rechnung über das Dashboard');
      return;
    }

    console.log(`✅ ${invoicesSnapshot.size} Rechnungen gefunden:\n`);

    invoicesSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Invoice ID: ${doc.id}`);
      console.log(`   📋 Nummer: ${data.invoiceNumber || data.number || 'N/A'}`);
      console.log(`   💰 Betrag: ${data.total || data.amount || 'N/A'} €`);
      console.log(`   👤 Kunde: ${data.customerName || 'N/A'}`);
      console.log(
        `   📅 Erstellt: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('de-DE') : 'N/A'}`
      );
      console.log(`   📊 Status: ${data.status || 'N/A'}`);
      console.log(`   🏢 Company ID: ${data.companyId || 'N/A'}`);
      console.log('');
    });

    // Erste Invoice ID für Copy-Paste bereitstellen
    const firstInvoice = invoicesSnapshot.docs[0];
    console.log('🎯 Verwenden Sie diese Invoice-ID für den Test:');
    console.log(`📋 ${firstInvoice.id}`);
    console.log('');
    console.log('📝 Kopieren Sie diese ID in Ihr Test-Script!');
  } catch (error) {
    console.error('❌ Fehler beim Laden der Rechnungen:', error.message);
    console.log('');
    console.log('🔧 Mögliche Lösungen:');
    console.log('   1. Überprüfen Sie die Firebase-Konfiguration');
    console.log('   2. Stellen Sie sicher, dass service-account.json existiert');
    console.log('   3. Überprüfen Sie die Firestore-Berechtigungen');
  }
};

findInvoices();
