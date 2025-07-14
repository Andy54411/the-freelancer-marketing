#!/usr/bin/env node
import { readFileSync } from 'fs';

console.log('🔍 Prüfe Component-spezifische Übersetzungen...\n');

// LanguageContext.tsx lesen
const languageContextPath = './src/contexts/LanguageContext.tsx';
const languageContent = readFileSync(languageContextPath, 'utf8');

// Component-spezifische Keys definieren
const requiredKeys = [
  // Hero Section
  'hero.title.line1',
  'hero.title.line2',
  'hero.title.line3',
  'hero.description',
  'hero.button.searchHelp',
  'hero.button.offerHelp',
  'hero.newProviders',
  'hero.noProviders',
  // Call to Action
  'cta.title',
  'cta.description',
  'cta.button.registerCustomer',
  'cta.button.registerProvider',
  'cta.benefits',
  // Banner
  'banner.text',
  'banner.learnMore',
  'banner.close',
];

const languages = ['de', 'en', 'es', 'fr'];

console.log('📋 Prüfe Component-Keys in allen Sprachen:\n');

languages.forEach(lang => {
  console.log(`🔍 ${lang.toUpperCase()}:`);

  const missingKeys = [];
  const foundKeys = [];

  requiredKeys.forEach(key => {
    if (languageContent.includes(`'${key}':`)) {
      foundKeys.push(key);
    } else {
      missingKeys.push(key);
    }
  });

  console.log(`  ✅ Gefunden: ${foundKeys.length}/${requiredKeys.length}`);

  if (missingKeys.length > 0) {
    console.log(`  ❌ Fehlend: ${missingKeys.join(', ')}`);
  }

  console.log();
});

console.log('📊 Zusammenfassung:');
console.log(`  📝 Zu prüfende Component-Keys: ${requiredKeys.length}`);
console.log(`  🌍 Sprachen: ${languages.length}`);
console.log(`  📈 Gesamte erwartete Übersetzungen: ${requiredKeys.length * languages.length}`);

// Prüfe ob alle Keys in allen Sprachen vorhanden sind
let allComplete = true;
requiredKeys.forEach(key => {
  const occurrences = (languageContent.match(new RegExp(`'${key}':`, 'g')) || []).length;
  if (occurrences < languages.length) {
    allComplete = false;
    console.log(`  ⚠️  ${key}: nur ${occurrences}/${languages.length} Sprachen`);
  }
});

if (allComplete) {
  console.log('\n🎉 Alle Component-Übersetzungen sind vollständig!');
} else {
  console.log('\n⚠️  Einige Component-Übersetzungen fehlen noch.');
}
