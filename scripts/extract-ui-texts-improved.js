import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Erweiterte UI-Text-Muster für bessere Erkennung
const UI_TEXT_PATTERNS = [
  // JSX Text-Inhalte
  />\s*([A-ZÄÖÜ][^<>{}\n]+[a-zäöüß])\s*</g,

  // String-Literale in JSX-Attributen
  /(?:placeholder|title|aria-label|alt|label)\s*=\s*["']([^"']+)["']/g,

  // String-Literale in spezifischen Funktionen
  /(?:toast\.(?:success|error|info|warning)|alert|confirm|prompt)\s*\(\s*["']([^"']+)["']/g,

  // Text in Next.js Head/Title/Meta
  /<(?:title|meta[^>]+content)\s*[^>]*>\s*([^<]+)\s*</g,

  // Button/Label Text
  /(?:button|label|span|div|h[1-6]|p|li|td|th)(?:[^>]*)>\s*([A-ZÄÖÜ][^<>{}\n]+[.!?:]?)\s*</g,

  // Text in React-Komponenten
  /\{["']([A-ZÄÖÜ][^"']+)["']\}/g,

  // Error/Success Messages
  /(?:error|success|warning|info)(?:Message)?\s*=\s*["']([^"']+)["']/g,

  // Form Labels und Validierungstexte
  /(?:label|validation|required)(?:Text|Message)?\s*[:=]\s*["']([^"']+)["']/g,
];

// Muster zum Ausschließen von Code-Fragmenten
const EXCLUDE_PATTERNS = [
  /^[a-z]+\s*[=:(){}[\]]/, // Variablenzuweisungen
  /^\s*[a-z]+\(/, // Funktionsaufrufe
  /^\s*\/\//, // Kommentare
  /^\s*\*/, // Kommentare
  /^\s*import\s/, // Imports
  /^\s*export\s/, // Exports
  /^\s*const\s/, // Const-Deklarationen
  /^\s*let\s/, // Let-Deklarationen
  /^\s*var\s/, // Var-Deklarationen
  /^\s*if\s*\(/, // If-Statements
  /^\s*for\s*\(/, // For-Loops
  /^\s*while\s*\(/, // While-Loops
  /^\s*switch\s*\(/, // Switch-Statements
  /^\s*return\s/, // Return-Statements
  /^\s*throw\s/, // Throw-Statements
  /^\s*console\./, // Console-Ausgaben
  /^\s*\w+\.\w+/, // Objektzugriffe
  /[{}[\]()]/, // Enthält Code-Zeichen
  /^\s*[a-z]+\s*[:=]/, // Zuweisungen
  /^\d+/, // Beginnt mit Zahlen
  /^\s*[&<>]/, // HTML-Entities
  /%[a-z0-9]/i, // URL-Encoding
  /\\[ntr]/, // Escape-Sequenzen
  /^\s*[a-z]+(State|Ref|Context)/i, // React-spezifische Begriffe
];

// Deutsche Sprache validieren
function isGermanText(text) {
  const germanWords =
    /\b(der|die|das|und|oder|ist|sind|haben|wird|werden|können|müssen|sollten|für|von|mit|zu|auf|an|in|bei|nach|über|unter|vor|zwischen|durch|gegen|ohne|um|während|wegen|trotz|seit|bis|als|wenn|dass|welche|diese|jene|alle|einige|viele|wenige|andere|neue|alte|große|kleine|gute|schlechte|erste|letzte|nächste|beste|schlimmste)\b/i;
  const germanChars = /[äöüßÄÖÜ]/;

  return germanWords.test(text) || germanChars.test(text);
}

// Text-Qualität bewerten
function isQualityUIText(text) {
  if (!text || text.length < 3 || text.length > 200) return false;

  // Ausschließen von Code-Fragmenten
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Muss mindestens einen Buchstaben enthalten
  if (!/[a-zA-ZäöüßÄÖÜ]/.test(text)) return false;

  // Sollte nicht nur aus Sonderzeichen bestehen
  if (/^[^a-zA-ZäöüßÄÖÜ]+$/.test(text)) return false;

  // Sollte Wörter enthalten (keine einzelnen Zeichen)
  if (!/\b\w{2,}\b/.test(text)) return false;

  return true;
}

// Kategorie des UI-Texts bestimmen
function categorizeUIText(text, context) {
  if (/\b(fehler|error|warnung|warning)\b/i.test(text)) return 'error';
  if (/\b(erfolg|success|erfolgreich|gespeichert)\b/i.test(text)) return 'success';
  if (/\b(button|klicken|drücken|bestätigen|abbrechen)\b/i.test(text)) return 'button';
  if (/\b(titel|überschrift|heading)\b/i.test(context)) return 'heading';
  if (/\b(placeholder|eingabe|feld)\b/i.test(context)) return 'input';
  if (/\b(navigation|menü|link)\b/i.test(context)) return 'navigation';
  return 'general';
}

// Dateien nach UI-Texten durchsuchen
function extractUITextsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const texts = new Set();

    // Alle UI-Text-Muster anwenden
    for (const pattern of UI_TEXT_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const text = match[1]?.trim();
        if (text && isQualityUIText(text) && isGermanText(text)) {
          texts.add(text);
        }
      }
    }

    return Array.from(texts);
  } catch (error) {
    console.warn(`Fehler beim Lesen von ${filePath}:`, error.message);
    return [];
  }
}

// Hauptfunktion
async function extractUITexts() {
  console.log('🔍 Extrahiere hochwertige UI-Texte...');

  const srcDir = path.join(__dirname, '../src');
  const allTexts = new Map(); // Text -> {files: Set, category: string}

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.match(/\.(tsx?|jsx?)$/)) {
        const texts = extractUITextsFromFile(fullPath);
        const relativePath = path.relative(srcDir, fullPath);

        texts.forEach(text => {
          if (!allTexts.has(text)) {
            allTexts.set(text, {
              files: new Set(),
              category: categorizeUIText(text, relativePath),
            });
          }
          allTexts.get(text).files.add(relativePath);
        });
      }
    }
  }

  scanDirectory(srcDir);

  // Ergebnisse sortieren und formatieren
  const results = Array.from(allTexts.entries())
    .map(([text, data]) => ({
      text,
      category: data.category,
      files: Array.from(data.files),
      priority: data.category === 'error' ? 3 : data.category === 'button' ? 2 : 1,
    }))
    .sort((a, b) => b.priority - a.priority || a.text.localeCompare(b.text));

  console.log(`✅ ${results.length} hochwertige UI-Texte gefunden`);

  // Kategorien-Übersicht
  const categories = {};
  results.forEach(item => {
    categories[item.category] = (categories[item.category] || 0) + 1;
  });

  console.log('\n📊 Kategorien-Übersicht:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} Texte`);
  });

  // Top 20 Texte anzeigen
  console.log('\n🔝 Top 20 gefundene UI-Texte:');
  results.slice(0, 20).forEach((item, i) => {
    console.log(`${i + 1}. [${item.category}] "${item.text}" (in ${item.files.length} Dateien)`);
  });

  // Ergebnisse speichern
  const outputPath = path.join(__dirname, '../ui-texts-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n💾 Ergebnisse gespeichert in: ui-texts-extracted.json`);

  return results;
}

// Script ausführen
if (import.meta.url === `file://${__filename}`) {
  extractUITexts().catch(console.error);
}

export { extractUITexts };
