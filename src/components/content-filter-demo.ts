/**
 * Beispiel-Script zur Demonstration des Content-Filters
 * Führe dieses Script aus um zu sehen, wie der Filter funktioniert
 */

import { ContactDataFilter } from './DirectChatModal';

// Test-Nachrichten
const testMessages = [
  // Blockierte Nachrichten
  "Hallo! Meine Telefonnummer ist 0123 456789",
  "Schreib mir eine E-Mail an: max@example.com", 
  "Ruf mich an: +49 151 12345678",
  "Besuche meine Website: www.meine-firma.de",
  "WhatsApp: 01701234567 oder Email: info@firma.de",
  
  // Erlaubte Nachrichten
  "Ich habe 5 Jahre Erfahrung in Webentwicklung",
  "Das Projekt würde etwa 2-3 Wochen dauern",
  "Gerne erstelle ich Ihnen ein detailliertes Angebot",
  "Ich kann Ihnen bei der Website-Entwicklung helfen"
];

// Funktion zum Testen des Filters
function demonstrateFilter() {
  console.log('🔍 CONTENT-FILTER DEMONSTRATION\n');
  console.log('===============================\n');
  
  testMessages.forEach((message, index) => {
    const result = ContactDataFilter.containsContactData(message);
    
    console.log(`📝 Nachricht ${index + 1}:`);
    console.log(`"${message}"`);
    console.log(`Status: ${result.blocked ? '❌ BLOCKIERT' : '✅ ERLAUBT'}`);
    
    if (result.blocked) {
      console.log(`Grund: ${result.reason}`);
      console.log('💡 Vorschläge:');
      result.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion}`);
      });
    }
    
    console.log('---\n');
  });
  
  console.log('🎯 ZUSAMMENFASSUNG:');
  const blocked = testMessages.filter(msg => 
    ContactDataFilter.containsContactData(msg).blocked
  ).length;
  const allowed = testMessages.length - blocked;
  
  console.log(`✅ Erlaubte Nachrichten: ${allowed}`);
  console.log(`❌ Blockierte Nachrichten: ${blocked}`);
  console.log(`📊 Erkennungsrate: ${((blocked / testMessages.length) * 100).toFixed(1)}%`);
}

// Exportiere die Demo-Funktion
export { demonstrateFilter };

// Beispiel für die Verwendung:
/*
import { demonstrateFilter } from './content-filter-demo';
demonstrateFilter();
*/
