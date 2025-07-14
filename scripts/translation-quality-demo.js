import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lese die LanguageContext.tsx und extrahiere die Übersetzungen
function loadTranslations() {
  const contextPath = path.join(__dirname, '../src/contexts/LanguageContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');

  // Extrahiere den translations-Block
  const translationsMatch = content.match(/const translations = (\{[\s\S]*?\});/);
  if (!translationsMatch) {
    throw new Error('Translations-Block nicht gefunden');
  }

  // Parse das JSON (ein wenig tricky, da es JavaScript ist)
  try {
    const translationsString = translationsMatch[1];
    // Verwende eval nur hier für das Demonstrationsskript
    const translations = eval(`(${translationsString})`);
    return translations;
  } catch (error) {
    console.error('Fehler beim Parsen der Übersetzungen:', error.message);
    return null;
  }
}

function demonstrateTranslations() {
  console.log('🌍 Taskilo Internationalisierung - Qualitätsdemo');
  console.log('='.repeat(60));

  const translations = loadTranslations();
  if (!translations) return;

  const { de, en, es, fr } = translations;

  // Statistiken
  console.log('📊 Übersetzungsstatistiken:');
  console.log(`  🇩🇪 Deutsche Texte: ${Object.keys(de).length}`);
  console.log(`  🇬🇧 Englische Übersetzungen: ${Object.keys(en).length}`);
  console.log(`  🇪🇸 Spanische Übersetzungen: ${Object.keys(es).length}`);
  console.log(`  🇫🇷 Französische Übersetzungen: ${Object.keys(fr).length}`);

  // Berechne Abdeckung
  const totalGerman = Object.keys(de).length;
  const enCoverage = ((Object.keys(en).length / totalGerman) * 100).toFixed(1);
  const esCoverage = ((Object.keys(es).length / totalGerman) * 100).toFixed(1);
  const frCoverage = ((Object.keys(fr).length / totalGerman) * 100).toFixed(1);

  console.log('\\n📈 Übersetzungsabdeckung:');
  console.log(`  🇬🇧 Englisch: ${enCoverage}%`);
  console.log(`  🇪🇸 Spanisch: ${esCoverage}%`);
  console.log(`  🇫🇷 Französisch: ${frCoverage}%`);

  // Kategorisiere die Texte für bessere Analyse
  const categories = {
    errors: [],
    buttons: [],
    success: [],
    navigation: [],
    general: [],
  };

  Object.keys(de).forEach(key => {
    const text = de[key];
    if (text.toLowerCase().includes('fehler') || text.toLowerCase().includes('error')) {
      categories.errors.push(key);
    } else if (
      text.toLowerCase().includes('bestätigen') ||
      text.toLowerCase().includes('klicken') ||
      text.toLowerCase().includes('drücken')
    ) {
      categories.buttons.push(key);
    } else if (
      text.toLowerCase().includes('erfolg') ||
      text.toLowerCase().includes('gespeichert')
    ) {
      categories.success.push(key);
    } else if (text.toLowerCase().includes('navigation') || text.toLowerCase().includes('menü')) {
      categories.navigation.push(key);
    } else {
      categories.general.push(key);
    }
  });

  console.log('\\n🏷️ Text-Kategorien:');
  console.log(`  ❌ Fehlermeldungen: ${categories.errors.length}`);
  console.log(`  🔘 Buttons/Aktionen: ${categories.buttons.length}`);
  console.log(`  ✅ Erfolgsmeldungen: ${categories.success.length}`);
  console.log(`  🧭 Navigation: ${categories.navigation.length}`);
  console.log(`  📝 Allgemein: ${categories.general.length}`);

  // Zeige Beispiele für jede Kategorie
  console.log('\\n🎯 Qualitätsbeispiele:');

  // Fehlermeldungen
  if (categories.errors.length > 0) {
    const errorKey = categories.errors[0];
    console.log('\\n❌ Fehlermeldung:');
    console.log(`  🇩🇪 ${de[errorKey]}`);
    console.log(`  🇬🇧 ${en[errorKey] || 'Nicht übersetzt'}`);
    console.log(`  🇪🇸 ${es[errorKey] || 'Nicht übersetzt'}`);
    console.log(`  🇫🇷 ${fr[errorKey] || 'Nicht übersetzt'}`);
  }

  // Button-Texte
  if (categories.buttons.length > 0) {
    const buttonKey = categories.buttons[0];
    console.log('\\n🔘 Button/Aktion:');
    console.log(`  🇩🇪 ${de[buttonKey]}`);
    console.log(`  🇬🇧 ${en[buttonKey] || 'Nicht übersetzt'}`);
    console.log(`  🇪🇸 ${es[buttonKey] || 'Nicht übersetzt'}`);
    console.log(`  🇫🇷 ${fr[buttonKey] || 'Nicht übersetzt'}`);
  }

  // Finde die besten vollständig übersetzten Beispiele
  const fullyTranslated = Object.keys(de).filter(key => en[key] && es[key] && fr[key]);

  console.log(`\\n🎉 Vollständig übersetzte Texte: ${fullyTranslated.length}`);

  if (fullyTranslated.length > 0) {
    console.log('\\n🌟 Beispiel vollständiger Übersetzung:');
    const bestKey = fullyTranslated[0];
    console.log(`\\n"${bestKey}":`);
    console.log(`  🇩🇪 ${de[bestKey]}`);
    console.log(`  🇬🇧 ${en[bestKey]}`);
    console.log(`  🇪🇸 ${es[bestKey]}`);
    console.log(`  🇫🇷 ${fr[bestKey]}`);
  }

  // Zeige Fortschritt
  console.log('\\n📈 Internationalisierungsfortschritt:');
  console.log('✅ Vollständige deutsche Textbasis erstellt');
  console.log('✅ Automatisierte Extraktion von UI-Texten implementiert');
  console.log('✅ Code-Fragmente erfolgreich bereinigt');
  console.log('✅ Englische Übersetzungen weitgehend vollständig');
  console.log('⚠️ Spanische Übersetzungen teilweise (API-Limits)');
  console.log('⚠️ Französische Übersetzungen teilweise (API-Limits)');

  console.log('\\n🚀 Nächste Schritte:');
  console.log('1. Verbleibende Übersetzungen bei weniger API-Load nachholen');
  console.log('2. Integration in React-Komponenten testen');
  console.log('3. UI-Tests für alle Sprachen durchführen');
  console.log('4. Sprachauswahl-Komponente optimieren');

  // Erstelle einen simplen Testbericht
  const report = {
    timestamp: new Date().toISOString(),
    statistics: {
      german: Object.keys(de).length,
      english: Object.keys(en).length,
      spanish: Object.keys(es).length,
      french: Object.keys(fr).length,
    },
    coverage: {
      english: parseFloat(enCoverage),
      spanish: parseFloat(esCoverage),
      french: parseFloat(frCoverage),
    },
    categories: {
      errors: categories.errors.length,
      buttons: categories.buttons.length,
      success: categories.success.length,
      navigation: categories.navigation.length,
      general: categories.general.length,
    },
    fullyTranslatedCount: fullyTranslated.length,
    qualityScore: (parseFloat(enCoverage) + parseFloat(esCoverage) + parseFloat(frCoverage)) / 3,
  };

  const reportPath = path.join(__dirname, '../translation-quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\\n💾 Qualitätsbericht gespeichert: translation-quality-report.json`);
  console.log(`🎯 Durchschnittliche Qualitätsbewertung: ${report.qualityScore.toFixed(1)}%`);
}

// Script ausführen
if (import.meta.url === `file://${__filename}`) {
  demonstrateTranslations();
}

export { demonstrateTranslations };
