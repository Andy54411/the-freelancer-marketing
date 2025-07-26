// Debug-Script zur Überprüfung der TimeTracking-Berechnungen
// Findet und analysiert die Stundensatz-Berechnung für einen Auftrag

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase/clients.js';

async function debugTimeTrackingRates(orderId) {
  try {
    console.log('🔍 Debug TimeTracking Rates für Order:', orderId);

    const orderRef = doc(db, 'auftraege', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error('❌ Order nicht gefunden!');
      return;
    }

    const orderData = orderDoc.data();

    console.log('📋 Auftrag Details:');
    console.log('- jobCalculatedPriceInCents:', orderData.jobCalculatedPriceInCents);
    console.log('- originalJobPriceInCents:', orderData.originalJobPriceInCents);
    console.log('- jobTotalCalculatedHours:', orderData.jobTotalCalculatedHours);
    console.log('- jobDateFrom:', orderData.jobDateFrom);
    console.log('- jobDateTo:', orderData.jobDateTo);
    console.log('- jobDurationString:', orderData.jobDurationString);

    if (orderData.timeTracking) {
      console.log('\n⏰ TimeTracking Details:');
      console.log('- originalPlannedHours:', orderData.timeTracking.originalPlannedHours);
      console.log('- hourlyRate (in Cents):', orderData.timeTracking.hourlyRate);
      console.log('- hourlyRate (in Euro):', orderData.timeTracking.hourlyRate / 100);
      console.log('- totalLoggedHours:', orderData.timeTracking.totalLoggedHours);

      // Berechne was der korrekte Stundensatz sein sollte
      const totalPrice =
        orderData.jobCalculatedPriceInCents || orderData.originalJobPriceInCents || 98400;
      const originalPlannedHours = orderData.timeTracking.originalPlannedHours;
      const correctHourlyRateInEuros = totalPrice / 100 / originalPlannedHours;
      const correctHourlyRateInCents = Math.round(correctHourlyRateInEuros * 100);

      console.log('\n🧮 Berechnungen:');
      console.log('- Total Price (Cents):', totalPrice);
      console.log('- Total Price (Euro):', totalPrice / 100);
      console.log('- Original Planned Hours:', originalPlannedHours);
      console.log('- CORRECT Hourly Rate (Euro):', correctHourlyRateInEuros);
      console.log('- CORRECT Hourly Rate (Cents):', correctHourlyRateInCents);
      console.log('- STORED Hourly Rate (Cents):', orderData.timeTracking.hourlyRate);

      const difference = orderData.timeTracking.hourlyRate - correctHourlyRateInCents;
      console.log('- Difference (Cents):', difference);

      if (Math.abs(difference) > 10) {
        // Mehr als 10 Cent Unterschied
        console.log('⚠️  PROBLEM GEFUNDEN: Stundensatz ist falsch gespeichert!');
        console.log('Soll ich den Stundensatz korrigieren? (Y/N)');
      } else {
        console.log('✅ Stundensatz ist korrekt gespeichert');
      }

      // Zeige Time Entries
      if (orderData.timeTracking.timeEntries && orderData.timeTracking.timeEntries.length > 0) {
        console.log('\n📝 Time Entries:');
        orderData.timeTracking.timeEntries.forEach((entry, index) => {
          console.log(
            `${index + 1}. ${entry.date} - ${entry.hours}h - ${entry.category} - ${entry.status}`
          );
          if (entry.billableAmount) {
            console.log(
              `   Billable: ${entry.billableAmount} Cents = ${(entry.billableAmount / 100).toFixed(2)}€`
            );

            // Überprüfe Berechnung
            const expectedAmount = Math.round(entry.hours * correctHourlyRateInCents);
            if (entry.billableAmount !== expectedAmount) {
              console.log(
                `   ❌ FALSCH! Sollte sein: ${expectedAmount} Cents = ${(expectedAmount / 100).toFixed(2)}€`
              );
            } else {
              console.log(`   ✅ Korrekt berechnet`);
            }
          }
        });
      }
    } else {
      console.log('❌ Kein TimeTracking gefunden!');
    }
  } catch (error) {
    console.error('❌ Fehler beim Debug:', error);
  }
}

// Beispiel-Aufruf (OrderID muss angepasst werden)
const ORDER_ID = 'YOUR_ORDER_ID_HERE';

if (ORDER_ID !== 'YOUR_ORDER_ID_HERE') {
  debugTimeTrackingRates(ORDER_ID);
} else {
  console.log('❗ Bitte setzen Sie die ORDER_ID im Script bevor Sie es ausführen.');
  console.log('📋 Sie finden die Order ID in der URL wenn Sie den Auftrag öffnen.');
}
