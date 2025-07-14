#!/usr/bin/env node
import { readFileSync } from 'fs';

console.log('🔍 Analysiere aktuelle Übersetzungsstruktur...\n');

// LanguageContext.tsx lesen
const languageContextPath = './src/contexts/LanguageContext.tsx';
const languageContent = readFileSync(languageContextPath, 'utf8');

// Extrahiere die Übersetzungskeys
const deSection = languageContent.match(/de: \{([\s\S]*?)\n  \},/);
const enSection = languageContent.match(/en: \{([\s\S]*?)\n  \},/);

if (!deSection || !enSection) {
    console.log('❌ Fehler beim Parsen der Übersetzungen');
    process.exit(1);
}

// Zähle Keys in beiden Sprachen
const deKeys = (deSection[1].match(/'[^']+'/g) || []).filter(key => key.includes(':')).length;
const enKeys = (enSection[1].match(/'[^']+'/g) || []).filter(key => key.includes(':')).length;

console.log('📊 Übersetzungsstatistiken:');
console.log(`  🇩🇪 Deutsch: ${deKeys} Übersetzungen`);
console.log(`  🇺🇸 Englisch: ${enKeys} Übersetzungen`);
console.log();

console.log('📈 Übersetzungsabdeckung:');
if (deKeys === enKeys) {
    console.log(`  ✅ Vollständige Abdeckung: ${deKeys} Keys in beiden Sprachen`);
} else {
    console.log(`  ⚠️  Unterschiedliche Anzahl: DE=${deKeys}, EN=${enKeys}`);
}
console.log();

// Kategorien analysieren
const categories = [
    'Basis UI-Elemente',
    'Navigation & Menu',
    'Hero Section',
    'Call to Action',
    'Banner',
    'Service Categories',
    'Booking Process',
    'Provider Profile',
    'Reviews & Ratings',
    'Forms & Validation',
    'Account & Authentication',
    'Messages & Chat',
    'Payment & Billing',
    'Time & Date',
    'Status Messages',
    'Error Messages',
    'Success Messages',
];

console.log('📂 Erkannte Kategorien:');
categories.forEach(category => {
    const found = languageContent.includes(`// ${category}`);
    console.log(`  ${found ? '✅' : '❌'} ${category}`);
});
console.log();

console.log('🎯 Gesamtqualität:');
console.log(`  📝 Gesamte Übersetzungseinträge: ${deKeys + enKeys}`);
console.log(`  🌍 Unterstützte Sprachen: 2 (Deutsch, Englisch)`);
console.log(`  ✅ Vollständigkeit: ${deKeys === enKeys ? '100%' : 'Inkonsistent'}`);
console.log();

if (deKeys === enKeys && deKeys > 100) {
    console.log('🎉 Exzellent - Umfassende zweisprachige Internationalisierung!');
    console.log();
    console.log('🚀 Empfohlene nächste Schritte:');
    console.log('  1. ✅ Komponenten mit Übersetzungen testen');
    console.log('  2. ✅ Sprachswitch-Funktionalität prüfen');
    console.log('  3. ✅ UI in beiden Sprachen validieren');
} else {
    console.log('⚠️  Übersetzungsstruktur benötigt weitere Arbeit.');
}

// Prüfe verfügbare Sprachen
const availableLanguagesMatch = languageContent.match(/availableLanguages = \[([\s\S]*?)\]/);
if (availableLanguagesMatch) {
    const langCount = (availableLanguagesMatch[1].match(/code:/g) || []).length;
    console.log(`\n📋 Konfigurierte Sprachen: ${langCount}`);
}
