#!/usr/bin/env node

/**
 * Optimiertes Tool für echte UI-Text-Extraktion
 * Findet nur echte Benutzeroberflächen-Texte
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lade Environment-Variablen
async function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '../.env.local');
    const envContent = await fs.readFile(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.slice(0, equalIndex);
          const value = trimmedLine.slice(equalIndex + 1).replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('Konnte .env.local nicht laden:', error.message);
  }
}

await loadEnvFile();

const CONFIG = {
  sourceLanguage: 'de',
  targetLanguages: ['en', 'fr', 'es'],
  srcDirectory: path.join(__dirname, '../src'),
  geminiApiKey: process.env.GEMINI_API_KEY,
};

// Verbesserte Patterns nur für UI-Texte
const UI_TEXT_PATTERNS = [
  // JSX Text zwischen Tags (nur echte Inhalte)
  />([^<>{}\n\r]+?)</g,
  // Button Text
  /(?:button|Button)(?:[^>]*>)([^<]+?)</g,
  // Placeholder Attribut
  /placeholder\s*=\s*["']([^"']{3,}?)["']/g,
  // Title Attribut
  /title\s*=\s*["']([^"']{3,}?)["']/g,
  // Alt Attribut für Bilder
  /alt\s*=\s*["']([^"']{3,}?)["']/g,
  // Überschriften
  /<h[1-6][^>]*>([^<]+?)<\/h[1-6]>/g,
  // Label Text
  /<label[^>]*>([^<]+?)<\/label>/g,
  // Aria Labels
  /aria-label\s*=\s*["']([^"']{3,}?)["']/g,
  // Strings in t() Funktionen
  /t\s*\(\s*["']([^"']+?)["']/g,
  // String Literals (nur längere, wahrscheinlich UI-relevante)
  /"([A-ZÄÖÜ][a-zäöüß\s]{5,}?)"/g,
  /'([A-ZÄÖÜ][a-zäöüß\s]{5,}?)'/g,
];

// Strenge Ignore-Patterns
const STRICT_IGNORE_PATTERNS = [
  // JavaScript/TypeScript Code
  /^[a-zA-Z_$][a-zA-Z0-9_$]*$/, // Variablennamen
  /^\d+$/, // Nur Zahlen
  /^[A-Z_]+$/, // Konstanten
  /^https?:\/\//, // URLs
  /^\/[a-zA-Z]/, // Pfade
  /^#[a-fA-F0-9]+$/, // Hex-Farben
  /^\w+\.\w+/, // CSS-Klassen oder Objektzugriffe
  /^class\s|^interface\s|^function\s|^const\s|^let\s|^var\s/, // Deklarationen
  /^\s*\/\//, // Kommentare
  /^\s*\*/, // Kommentare
  /console\./, // Console-Aufrufe
  /import\s|export\s/, // Import/Export
  /useState|useEffect|useRef/, // React Hooks
  /\(\)|\[\]|\{\}/, // Leere Strukturen
  /&&||\|\|/, // Operatoren
  /px|rem|em|%|vh|vw/, // CSS-Einheiten
  /className|style=/, // CSS-Attribute
  /^\s*</, // HTML/JSX Tags
  /^\s*\{/, // JavaScript Objekte
  /null|undefined|true|false/, // JavaScript Literale
  /\.tsx?$|\.jsx?$|\.css$/, // Dateiendungen
  /setLoading|setState|const|let|var/, // React/JS-Code
  // Spezifische Code-Patterns
  /^[\(\)\[\]\{\}]+$/, // Nur Klammern
  /^\s*[()[\]{}]+\s*$/, // Nur Klammern mit Whitespace
  /^[;,\.]$/, // Nur Satzzeichen
];

// Deutsche UI-Text-Indikatoren
const GERMAN_UI_INDICATORS = [
  // Häufige deutsche UI-Wörter
  /\b(Anmelden|Registrieren|Buchen|Suchen|Finden|Profil|Einstellungen|Kontakt|Hilfe|Support)\b/i,
  /\b(Willkommen|Hallo|Danke|Bitte|Weiter|Zurück|Speichern|Löschen|Bearbeiten)\b/i,
  /\b(Service|Dienstleister|Handwerker|Auftrag|Projekt|Bewertung|Termin|Datum)\b/i,
  /\b(Taskilo|Kunde|Anbieter|Zahlung|Rechnung|Preise|Kosten)\b/i,
  // Deutsche Artikel und Präpositionen
  /\b(der|die|das|den|dem|des|ein|eine|einen|einem|eines)\b/i,
  /\b(und|oder|mit|von|zu|für|auf|bei|nach|vor|aus|in|an)\b/i,
  // Deutsche Modalverben und Hilfsverben
  /\b(ist|sind|hat|haben|wird|werden|kann|soll|möchte|möchten)\b/i,
  // Deutsche Umlaute
  /[äöüßÄÖÜ]/,
  // Typische deutsche Endungen
  /\w+(ung|keit|heit|schaft|tät|lich|bar|sam)\b/i,
];

// Extrahiere nur echte UI-Texte
async function extractUITexts(directory) {
  const uiTexts = new Set();

  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          await scanFile(fullPath);
        }
      }
    }
  }

  async function scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      for (const pattern of UI_TEXT_PATTERNS) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(content)) !== null) {
          const text = match[1]?.trim();
          if (text && isGermanUIText(text)) {
            uiTexts.add(text);
          }
        }
      }
    } catch (error) {
      console.warn(`Fehler beim Lesen von ${filePath}:`, error.message);
    }
  }

  function isGermanUIText(text) {
    // Mindestlänge und maximale Länge
    if (text.length < 3 || text.length > 500) return false;

    // Ignoriere Code-Patterns
    for (const pattern of STRICT_IGNORE_PATTERNS) {
      if (pattern.test(text)) return false;
    }

    // Ignoriere reine Sonderzeichen
    if (!/[a-zA-ZäöüßÄÖÜ]/.test(text)) return false;

    // Ignoriere wenn zu viele Sonderzeichen
    const specialCharCount = (text.match(/[{}()[\];,.<>!@#$%^&*+=|\\]/g) || []).length;
    if (specialCharCount > text.length * 0.3) return false;

    // Muss deutsche Indikatoren haben
    const hasGermanIndicator = GERMAN_UI_INDICATORS.some(pattern => pattern.test(text));

    // Zusätzlich: sollte echte Wörter enthalten
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const hasRealWords = words.length > 0;

    return hasGermanIndicator && hasRealWords;
  }

  await scanDirectory(directory);
  return Array.from(uiTexts).sort();
}

// Gemini Übersetzung
async function translateWithGemini(texts, targetLanguage) {
  if (!CONFIG.geminiApiKey) {
    console.error('GEMINI_API_KEY nicht gesetzt!');
    return {};
  }

  const translations = {};
  const batchSize = 10; // Kleinere Batches für bessere Qualität

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    console.log(
      `Übersetze Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} nach ${targetLanguage}...`
    );

    try {
      const languageNames = {
        en: 'English',
        fr: 'French',
        es: 'Spanish',
      };

      const prompt = `Du bist ein professioneller UI/UX-Übersetzer. Übersetze die folgenden deutschen UI-Texte präzise ins ${languageNames[targetLanguage]}.

Kontext: Taskilo ist eine Plattform für Dienstleistungen (Handwerker, etc.)

Regeln:
1. Behalte "Taskilo" als Markenname bei
2. Übersetze UI-Elemente natürlich (Buttons, Labels, etc.)
3. Halte die Länge ähnlich (wichtig für UI)
4. Nutze branchenübliche Begriffe
5. Antworte NUR mit einem JSON-Objekt: {"original": "übersetzung", ...}

Deutsche UI-Texte:
${JSON.stringify(batch)}

JSON-Antwort:`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1, // Niedrigere Temperatur für konsistentere Übersetzungen
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API Fehler: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;

      try {
        // Extrahiere JSON
        const jsonMatch = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          Object.assign(translations, parsed);
        } else {
          console.warn('Kein JSON in Antwort gefunden');
          batch.forEach(text => (translations[text] = text));
        }
      } catch (parseError) {
        console.warn('JSON Parse Fehler:', parseError.message);
        batch.forEach(text => (translations[text] = text));
      }

      // Pause zwischen Requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Fehler bei Batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      batch.forEach(text => (translations[text] = text));
    }
  }

  return translations;
}

// Haupt-Funktion
async function main() {
  try {
    console.log('🔍 Extrahiere echte UI-Texte aus Taskilo...\n');

    const uiTexts = await extractUITexts(CONFIG.srcDirectory);
    console.log(`✅ ${uiTexts.length} UI-Texte gefunden\n`);

    if (uiTexts.length === 0) {
      console.log('❌ Keine UI-Texte gefunden.');
      return;
    }

    // Zeige Beispiele
    console.log('📝 Gefundene UI-Texte (Beispiele):');
    uiTexts.slice(0, 15).forEach((text, i) => {
      console.log(`   ${i + 1}. "${text}"`);
    });

    if (uiTexts.length > 15) {
      console.log(`   ... und ${uiTexts.length - 15} weitere\n`);
    }

    // Übersetzungen
    const allTranslations = { de: {} };

    // Deutsche Texte als Basis
    uiTexts.forEach(text => {
      const key = generateKey(text);
      allTranslations.de[key] = text;
    });

    // Übersetze in alle Zielsprachen
    for (const lang of CONFIG.targetLanguages) {
      console.log(`\n🌐 Übersetze nach ${lang.toUpperCase()}...`);
      const langTranslations = await translateWithGemini(uiTexts, lang);

      allTranslations[lang] = {};
      uiTexts.forEach(text => {
        const key = generateKey(text);
        allTranslations[lang][key] = langTranslations[text] || text;
      });

      console.log(`✅ ${lang.toUpperCase()} Übersetzung abgeschlossen`);
    }

    // Ausgabe speichern
    const outputFile = path.join(__dirname, 'ui-translations.json');
    await fs.writeFile(outputFile, JSON.stringify(allTranslations, null, 2));

    console.log(`\n✅ UI-Übersetzungen gespeichert: ${outputFile}`);
    console.log('\n📋 Nächste Schritte:');
    console.log('1. Überprüfen Sie die Übersetzungen');
    console.log('2. Integrieren Sie sie in LanguageContext.tsx');
    console.log('3. Aktualisieren Sie die Komponenten mit t() Aufrufen');
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

// Einfache Key-Generierung
function generateKey(text) {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, match => {
      const map = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
      return map[match] || match;
    })
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('.');
}

// Ausführen
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
