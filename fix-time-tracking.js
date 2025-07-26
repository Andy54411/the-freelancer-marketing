// Temporäres Script zur Korrektur der Zeiterfassung für einen spezifischen Auftrag
// Führt die TimeTrackingMigration aus um korrekte Kategorisierung zu gewährleisten

import { TimeTrackingMigration } from './src/lib/timeTrackingMigration.js';

// Hier muss die OrderID des betroffenen Auftrags eingegeben werden
const ORDER_ID = 'YOUR_ORDER_ID_HERE'; // Diese muss vom Benutzer bereitgestellt werden

async function fixTimeTracking() {
  try {
    console.log('🔧 Starte TimeTracking-Korrektur für Auftrag:', ORDER_ID);

    await TimeTrackingMigration.fixTimeTrackingForOrder(ORDER_ID);

    console.log('✅ TimeTracking-Korrektur erfolgreich abgeschlossen!');
    console.log(
      '🔄 Das System sollte jetzt korrekt zwischen "Geplant" und "Zusätzlich" unterscheiden.'
    );
  } catch (error) {
    console.error('❌ Fehler bei der TimeTracking-Korrektur:', error);
  }
}

// Nur ausführen wenn ORDER_ID gesetzt ist
if (ORDER_ID !== 'YOUR_ORDER_ID_HERE') {
  fixTimeTracking();
} else {
  console.log('❗ Bitte setzen Sie die ORDER_ID im Script bevor Sie es ausführen.');
  console.log('📋 Sie finden die Order ID in der URL wenn Sie den Auftrag öffnen.');
}
