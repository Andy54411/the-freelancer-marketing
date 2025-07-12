/**
 * Test-Datei für den Content-Filter im DirectChatModal
 * Diese Datei demonstriert die verschiedenen Arten von blockierten Inhalten
 */

// Import der ContactDataFilter Klasse
import { ContactDataFilter } from './DirectChatModal';

// Beispiele für blockierte Inhalte:

const testCases = {
  telefonnummern: [
    "Meine Nummer ist 0123 456789",
    "Ruf mich an: +49 151 12345678",
    "Tel: 030-12345678",
    "Handy: 01701234567",
    "Telefon 0049 30 12345678",
    "WhatsApp: +49-151-123-456-78",
    "Kontaktiere mich unter 01234567890"
  ],
  
  emails: [
    "Schreib mir eine Mail: max@example.com",
    "meine Email ist test(at)gmail(dot)com",
    "Kontakt: user.name@company.de",
    "E-Mail: info AT firma DOT de",
    "Mail an: contact@business.org"
  ],
  
  websites: [
    "Besuche meine Website: www.example.com",
    "Schau mal auf https://meine-firma.de",
    "Mehr Infos unter: company.com/portfolio",
    "Link: example.org/contact"
  ],
  
  kombiniert: [
    "Ruf mich an unter 0123456789 oder schreib an info@firma.de",
    "Telefon: 030123456 oder website: www.firma.com",
    "Kontakt: +49151123456 oder check meine Website example.de"
  ],
  
  erlaubt: [
    "Ich kann Ihnen bei der Website-Entwicklung helfen",
    "Mein Angebot umfasst Design und Programmierung",
    "Ich habe 5 Jahre Erfahrung in diesem Bereich",
    "Das Projekt würde etwa 2-3 Wochen dauern",
    "Gerne erstelle ich Ihnen ein detailliertes Angebot"
  ]
};

// Funktionen zum Testen:
function testContentFilter() {
  console.log("=== CONTENT FILTER TEST ===\n");
  
  Object.entries(testCases).forEach(([category, cases]) => {
    console.log(`${category.toUpperCase()}:`);
    cases.forEach((testCase, index) => {
      const result = ContactDataFilter.containsContactData(testCase);
      console.log(`${index + 1}. "${testCase}"`);
      console.log(`   ❌ Blockiert: ${result.blocked ? 'JA' : 'NEIN'}`);
      if (result.blocked) {
        console.log(`   📝 Grund: ${result.reason}`);
      }
      console.log("");
    });
    console.log("---\n");
  });
}

export default testCases;
