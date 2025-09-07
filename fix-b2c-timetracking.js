const admin = require('firebase-admin');
const serviceAccount = require('./firebase-config.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixOrderTimeTracking() {
  const orderId = 'order_1757236855486_zfhg6tikp';
  console.log('🔧 Korrigiere TimeTracking für B2C Auftrag:', orderId);

  try {
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.log('❌ Auftrag nicht gefunden');
      return;
    }

    const orderData = orderDoc.data();
    console.log('📊 PaymentType:', orderData.paymentType);
    console.log('👤 CustomerType:', orderData.customerType);

    if (orderData.paymentType === 'b2c_fixed_price' && orderData.timeTracking?.timeEntries) {
      const timeEntries = orderData.timeTracking.timeEntries;
      console.log('⏰ Gefundene TimeEntries:', timeEntries.length);

      // Korrigiere alle timeEntries von 'additional' zu 'original' für B2C
      const updatedEntries = timeEntries.map(entry => {
        if (entry.category === 'additional') {
          console.log('🔄 Korrigiere Entry:', entry.id, 'von additional → original');
          return {
            ...entry,
            category: 'original',
            billableAmount: 0, // B2C: Original Stunden sind bereits bezahlt
          };
        }
        return entry;
      });

      await orderRef.update({
        'timeTracking.timeEntries': updatedEntries,
      });

      console.log('✅ TimeTracking erfolgreich korrigiert!');
      console.log('🔄 Bitte Browser neu laden!');
    } else {
      console.log('ℹ️ Keine Korrektur nötig oder kein B2C-Auftrag');
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

fixOrderTimeTracking().then(() => {
  console.log('🏁 Script beendet');
  process.exit(0);
});
