import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { TimeTrackingMigration } from './src/lib/timeTrackingMigration.js';

// Firebase Config - KORRIGIERT MIT RICHTIGER PROJECT ID
const firebaseConfig = {
  apiKey: 'AIzaSyD_jf9CiuvGKMK7wUw9mu-NkUIJDzoMusw',
  authDomain: 'tilvo-f142f.firebaseapp.com',
  projectId: 'tilvo-f142f',
  storageBucket: 'tilvo-f142f.firebasestorage.app',
  messagingSenderId: '1022290879475',
  appId: '1:1022290879475:web:45b6e46859948ec15ae886',
  measurementId: 'G-WWXT65CVC8',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Debug: Teste die Billing-Korrektur mit Firmen-Stundensätzen
 */
async function debugBillingFix(orderId) {
  try {
    console.log('🔍 Debug Billing Fix für Order:', orderId);

    // 1. Hole den Auftrag
    const orderRef = doc(db, 'auftraege', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error('❌ Order nicht gefunden!');
      return;
    }

    const orderData = orderDoc.data();

    console.log('\n📋 Auftrag Details:');
    console.log('- selectedAnbieterId:', orderData.selectedAnbieterId);
    console.log('- jobCalculatedPriceInCents:', orderData.jobCalculatedPriceInCents);
    console.log('- jobTotalCalculatedHours:', orderData.jobTotalCalculatedHours);

    // 2. Hole die Firma und deren Stundensatz
    if (orderData.selectedAnbieterId) {
      const companyRef = doc(db, 'companies', orderData.selectedAnbieterId);
      const companyDoc = await getDoc(companyRef);

      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        console.log('\n🏢 Firma Details:');
        console.log('- Company Name:', companyData.name || 'N/A');
        console.log('- hourlyRate:', companyData.hourlyRate, '€/h');
        console.log('- Email:', companyData.email);

        // 3. Berechne korrekte Kosten
        if (orderData.timeTracking) {
          const additionalEntries = orderData.timeTracking.timeEntries.filter(
            e => e.category === 'additional'
          );

          console.log('\n⏰ TimeTracking Details:');
          console.log(
            '- Stored hourlyRate:',
            (orderData.timeTracking.hourlyRate / 100).toFixed(2),
            '€/h'
          );
          console.log('- Company hourlyRate:', companyData.hourlyRate, '€/h');
          console.log('- Additional Entries:', additionalEntries.length);

          let totalAdditionalHours = 0;
          let wrongBillingAmount = 0;
          let correctBillingAmount = 0;

          additionalEntries.forEach(entry => {
            totalAdditionalHours += entry.hours;
            wrongBillingAmount += entry.billableAmount || 0;
            correctBillingAmount += entry.hours * companyData.hourlyRate * 100; // Cents
          });

          console.log('\n💰 Billing Vergleich:');
          console.log('- Total Additional Hours:', totalAdditionalHours, 'h');
          console.log('- Wrong Billing:', (wrongBillingAmount / 100).toFixed(2), '€');
          console.log('- Correct Billing:', (correctBillingAmount / 100).toFixed(2), '€');
          console.log(
            '- Unterschied:',
            ((correctBillingAmount - wrongBillingAmount) / 100).toFixed(2),
            '€'
          );

          if (wrongBillingAmount !== correctBillingAmount) {
            console.log('\n🚨 BILLING FEHLER ERKANNT!');
            console.log('⚙️ Führe Migration aus...');

            await TimeTrackingMigration.fixTimeTrackingForOrder(orderId);
            console.log('✅ Migration abgeschlossen');
          } else {
            console.log('\n✅ Billing ist korrekt');
          }
        }
      } else {
        console.log('\n❌ Firma nicht gefunden!');
      }
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Test mit Order ID
const ORDER_ID = 'QcLu8Ybrt0z3JyHJqtOW'; // Die Order mit dem Billing-Problem
debugBillingFix(ORDER_ID);
