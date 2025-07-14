import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muster für Code-Fragmente, die entfernt werden sollen
const CODE_PATTERNS = [
  // JavaScript/TypeScript Code
  /^\s*[a-z]+\s*[=:(){}[\]]/,
  /^\s*[a-z]+\(/,
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*import\s/,
  /^\s*export\s/,
  /^\s*const\s/,
  /^\s*let\s/,
  /^\s*var\s/,
  /^\s*if\s*\(/,
  /^\s*for\s*\(/,
  /^\s*while\s*\(/,
  /^\s*return\s/,
  /^\s*console\./,

  // React/JSX spezifisch
  /useState|useEffect|useRef|useContext/,
  /setLoading|setError|setState/,
  /\.map\(|\.filter\(|\.reduce\(/,

  // Code-Zeichen und Syntax
  /[{}[\]();]/,
  /\\[ntr]/,
  /%[a-z0-9]/i,
  /^\s*[&<>]/,

  // Sehr kurze oder sehr lange Texte
  /^.{1,2}$/,
  /^.{200,}$/,

  // Reine Zahlen oder Sonderzeichen
  /^\d+$/,
  /^[^a-zA-ZäöüßÄÖÜ]+$/,
];

// Muster für gültige UI-Texte
const VALID_UI_PATTERNS = [
  // Deutsche Sätze oder Phrasen
  /^[A-ZÄÖÜ][^{}[\]()]*[a-zäöüß.!?:]$/,

  // Kurze Labels oder Buttons
  /^[A-ZÄÖÜ][a-zäöüß\s]{2,30}$/,

  // Fehlermeldungen
  /\b(fehler|error|warnung|warning|erfolg|success)\b/i,

  // Typische UI-Texte
  /\b(klicken|drücken|eingeben|auswählen|bestätigen|abbrechen|speichern|laden|bearbeiten|löschen|hinzufügen|erstellen)\b/i,
];

function isValidUIText(key, value) {
  // Prüfe den Schlüssel
  if (CODE_PATTERNS.some(pattern => pattern.test(key))) {
    return false;
  }

  // Prüfe den Wert
  if (CODE_PATTERNS.some(pattern => pattern.test(value))) {
    return false;
  }

  // Muss mindestens einem gültigen UI-Muster entsprechen
  if (!VALID_UI_PATTERNS.some(pattern => pattern.test(value))) {
    return false;
  }

  return true;
}

function cleanupTranslations() {
  console.log('🧹 Bereinige vorhandene Übersetzungen...');

  const contextPath = path.join(__dirname, '../src/contexts/LanguageContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');

  // Extrahiere den translations-Block
  const translationsMatch = content.match(/const translations = \{[\s\S]*?\n\};/);
  if (!translationsMatch) {
    console.error('❌ Translations-Block nicht gefunden');
    return null;
  }

  const translationsBlock = translationsMatch[0];

  // Extrahiere deutsche Übersetzungen
  const deMatch = translationsBlock.match(/"de":\s*\{([\s\S]*?)\n\s*\}/);
  if (!deMatch) {
    console.error('❌ Deutsche Übersetzungen nicht gefunden');
    return null;
  }

  const deContent = deMatch[1];

  // Parse die Einträge
  const entries = new Map();
  const regex = /"([^"]+)":\s*"([^"]+)"/g;
  let match;
  let total = 0;
  let cleaned = 0;

  while ((match = regex.exec(deContent)) !== null) {
    const [, key, value] = match;
    total++;

    // Dekodiere escaped Zeichen
    const cleanKey = key.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const cleanValue = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');

    if (isValidUIText(cleanKey, cleanValue)) {
      entries.set(cleanKey, cleanValue);
      cleaned++;
    }
  }

  console.log(`📊 Bereinigung abgeschlossen:`);
  console.log(`  Ursprünglich: ${total} Einträge`);
  console.log(`  Bereinigt: ${cleaned} Einträge`);
  console.log(`  Entfernt: ${total - cleaned} Code-Fragmente`);

  // Zeige einige entfernte Einträge als Beispiel
  const removedExamples = [];
  const allOriginalEntries = new Set();

  regex.lastIndex = 0;
  while ((match = regex.exec(deContent)) !== null) {
    const [, key, value] = match;
    const cleanKey = key.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const cleanValue = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');

    allOriginalEntries.add(cleanKey);
    if (!entries.has(cleanKey) && removedExamples.length < 5) {
      removedExamples.push({ key: cleanKey, value: cleanValue });
    }
  }

  console.log('\n🗑️ Beispiele entfernter Code-Fragmente:');
  removedExamples.forEach((item, i) => {
    console.log(`${i + 1}. "${item.key}" -> "${item.value.substring(0, 50)}..."`);
  });

  // Zeige einige beibehaltene Einträge
  const keptExamples = Array.from(entries.entries()).slice(0, 5);
  console.log('\n✅ Beispiele beibehaltener UI-Texte:');
  keptExamples.forEach((item, i) => {
    console.log(`${i + 1}. "${item[0]}" -> "${item[1]}"`);
  });

  return {
    cleanedEntries: entries,
    stats: {
      total,
      cleaned,
      removed: total - cleaned,
    },
  };
}

// Script ausführen
if (import.meta.url === `file://${__filename}`) {
  const result = cleanupTranslations();

  if (result) {
    // Speichere bereinigte Übersetzungen
    const outputPath = path.join(__dirname, '../cleaned-translations.json');
    const output = {
      de: Object.fromEntries(result.cleanedEntries),
      stats: result.stats,
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Bereinigte Übersetzungen gespeichert in: cleaned-translations.json`);
  }
}

export { cleanupTranslations };
