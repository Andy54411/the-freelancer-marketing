// Sofort-Korrektur für falsche Stundensatz-Berechnung
// Korrigiert die billableAmount für zusätzliche Stunden basierend auf korrektem Stundensatz

import { TimeTrackingMigration } from './src/lib/timeTrackingMigration.js';

const ORDER_ID = 'YOUR_ORDER_ID_HERE'; // Hier die OrderID eintragen

async function fixHourlyRateCalculation() {
  try {
    console.log('🔧 Starte Stundensatz-Korrektur für Order:', ORDER_ID);

    // Verwende die erweiterte Migration
    await TimeTrackingMigration.fixTimeTrackingForOrder(ORDER_ID);

    console.log('✅ Stundensatz-Korrektur erfolgreich abgeschlossen!');
    console.log('🔄 Alle billableAmount-Werte wurden neu berechnet mit korrektem Stundensatz.');
    console.log('💰 8h × 41€ = 328€ (statt 984€)');
  } catch (error) {
    console.error('❌ Fehler bei der Stundensatz-Korrektur:', error);
  }
}

// Nur ausführen wenn ORDER_ID gesetzt ist
if (ORDER_ID !== 'YOUR_ORDER_ID_HERE') {
  fixHourlyRateCalculation();
} else {
  console.log('❗ Bitte setzen Sie die ORDER_ID im Script bevor Sie es ausführen.');
  console.log('📋 Sie finden die Order ID in der URL wenn Sie den Auftrag öffnen.');
  console.log(
    '💡 Beispiel: Wenn URL ist "/dashboard/user/abc123/orders/xyz789" dann ist OrderID "xyz789"'
  );
}
