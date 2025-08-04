// Debug-Script für Rechnungserstellung
// Kann über die Browser-Konsole auf der Rechnungsseite ausgeführt werden

console.log('🔍 Debugging Rechnungserstellung...');

// Überprüfe Firestore-Verbindung
try {
  console.log('✅ Firebase/Firestore importiert');
} catch (error) {
  console.error('❌ Firebase/Firestore Fehler:', error);
}

// Test-Rechnung erstellen
const testCreateInvoice = async () => {
  try {
    console.log('🚀 Teste Rechnungserstellung...');

    // Hole UID aus der URL
    const urlParts = window.location.pathname.split('/');
    const uid = urlParts[urlParts.indexOf('company') + 1];
    console.log('📋 Company UID:', uid);

    // Auth prüfen
    const user = window.firebase?.auth()?.currentUser;
    console.log('👤 Current User:', user?.uid);
    console.log('🔑 User Token:', await user?.getIdTokenResult());

    if (!user || user.uid !== uid) {
      console.error('❌ Auth Problem: User UID stimmt nicht mit Company UID überein');
      return;
    }

    // Test-Daten
    const testInvoice = {
      companyId: uid,
      createdBy: uid,
      customerName: 'Test Kunde',
      customerEmail: 'test@example.com',
      customerAddress: 'Test Straße 1\n12345 Test Stadt',
      issueDate: '2025-08-04',
      dueDate: '2025-08-18',
      invoiceNumber: 'R-2025-TEST',
      description: 'Test Rechnung',
      items: [
        {
          id: 'test-1',
          description: 'Test Position',
          quantity: 1,
          unitPrice: 100,
          total: 100,
        },
      ],
      amount: 100,
      tax: 19,
      total: 119,
      status: 'draft',
      template: 'modern',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('📄 Test Invoice Data:', testInvoice);

    // Firebase Firestore Test
    if (window.db) {
      const docRef = await window.firebase.firestore().collection('invoices').add(testInvoice);
      console.log('✅ Rechnung erfolgreich erstellt! Document ID:', docRef.id);
    } else {
      console.error('❌ Firestore db nicht verfügbar');
    }
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Rechnung:', error);
    console.error('Error Details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
  }
};

// Führe Test aus
testCreateInvoice();

console.log('💡 Debug-Script geladen. Führe testCreateInvoice() aus um zu testen.');
