#!/usr/bin/env node

/**
 * Automatisches Internationalisierungs-Tool für Taskilo
 * Findet alle deutschen Texte und erstellt Übersetzungen
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lade .env.local Datei manuell
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

// Lade Environment-Variablen
await loadEnvFile();

// Konfiguration
const CONFIG = {
  sourceLanguage: 'de',
  targetLanguages: ['en', 'fr', 'es'],
  srcDirectory: path.join(__dirname, '../src'),
  translationsFile: path.join(__dirname, '../src/contexts/LanguageContext.tsx'),
  // Google Gemini API Key (setzen Sie diese in .env.local)
  geminiApiKey: process.env.GEMINI_API_KEY,
};

// Regex-Patterns für verschiedene Texttypen
const TEXT_PATTERNS = [
  // JSX Text zwischen Tags (nur längere Texte)
  />\s*([^<>{}\n\r]+?)\s*</g,
  // Placeholder Attribute
  /placeholder\s*=\s*["']([^"']{5,}?)["']/g,
  // Title Attribute
  /title\s*=\s*["']([^"']{5,}?)["']/g,
  // Alt Attribute
  /alt\s*=\s*["']([^"']{5,}?)["']/g,
  // String Literals (nur längere deutsche Texte)
  /"([^"]{15,}?)"/g,
  /'([^']{15,}?)'/g,
  // Template Literals
  /`([^`]{15,}?)`/g,
];

// Zu ignorierende Texte
const IGNORE_PATTERNS = [
  /^[a-zA-Z_$][a-zA-Z0-9_$]*$/, // Variablennamen
  /^[\d\s\-+().]+$/, // Nur Zahlen und Zeichen
  /^[A-Z_]+$/, // Konstanten
  /^https?:\/\//, // URLs
  /^\/[a-zA-Z]/, // Pfade
  /^#[a-fA-F0-9]+$/, // Hex-Farben
  /^\w+\.\w+/, // CSS-Klassen oder Objektzugriffe
  /^&&/, // JavaScript &&-Operatoren
  /^\s*\{/, // JavaScript-Objektstart
  /^\s*\[/, // JavaScript-Array-Start
  /^\s*function/, // Funktionsdeklarationen
  /^\s*const\s/, // Konstanten-Deklarationen
  /^\s*let\s/, // Variable-Deklarationen
  /^\s*var\s/, // Variable-Deklarationen
  /^\s*if\s*\(/, // If-Statements
  /^\s*else/, // Else-Statements
  /^\s*return/, // Return-Statements
  /^[a-zA-Z0-9_.-]+\.(js|ts|tsx|jsx|css|scss|json)$/, // Dateinamen
  /^[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+/, // CSS-Properties
];

// Deutsche Texte sammeln
async function extractGermanTexts(directory) {
  const germanTexts = new Set();

  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Ignoriere bestimmte Ordner
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        // Nur bestimmte Dateitypen scannen
        if (/\.(tsx?|jsx?|vue|svelte)$/.test(entry.name)) {
          await scanFile(fullPath);
        }
      }
    }
  }

  async function scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Verschiedene Text-Patterns durchsuchen
      for (const pattern of TEXT_PATTERNS) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const text = match[1]?.trim();
          if (text && isGermanText(text)) {
            germanTexts.add(text);
          }
        }
      }
    } catch (error) {
      console.warn(`Fehler beim Lesen von ${filePath}:`, error.message);
    }
  }

  function isGermanText(text) {
    // Prüfe ob es deutscher Text ist
    if (text.length < 5) return false;

    // Ignoriere bestimmte Patterns
    for (const pattern of IGNORE_PATTERNS) {
      if (pattern.test(text)) return false;
    }

    // Ignoriere reine Code-Snippets
    if (text.includes('&&') || text.includes('||') || text.includes('==') || text.includes('!=')) {
      return false;
    }

    // Ignoriere CSS/Style-Texte
    if (
      text.includes('className') ||
      text.includes('style=') ||
      text.includes('px') ||
      text.includes('rem')
    ) {
      return false;
    }

    // Ignoriere HTML/JSX-Tags
    if (text.includes('<') || text.includes('>') || text.includes('{') || text.includes('}')) {
      return false;
    }

    // Deutsche Indikatoren
    const germanIndicators = [
      /\bund\b/,
      /\boder\b/,
      /\bfür\b/,
      /\bmit\b/,
      /\bvon\b/,
      /\bzu\b/,
      /\bin\b/,
      /\ban\b/,
      /\bich\b/,
      /\bsie\b/,
      /\ber\b/,
      /\bes\b/,
      /\bwir\b/,
      /\bihr\b/,
      /\bdas\b/,
      /\bder\b/,
      /\bdie\b/,
      /ä|ö|ü|ß/, // Deutsche Umlaute
      /\bist\b/,
      /\bsind\b/,
      /\bwird\b/,
      /\bwerden\b/,
      /\bkann\b/,
      /\bsoll\b/,
      /\bhaben\b/,
      /\bhat\b/,
      /\bauf\b/,
      /\bbei\b/,
      /\bnach\b/,
      /\bvor\b/,
      /\baus\b/,
      /\bein\b/,
      /\beine\b/,
      /\beinen\b/,
      /\beiner\b/,
      /\bwenn\b/,
      /\bweil\b/,
      /\bdass\b/,
      /\baber\b/,
      /\bauch\b/,
      /\bnur\b/,
      /\bschon\b/,
      /\bnoch\b/,
    ];

    // Mindestens ein deutscher Indikator sollte vorhanden sein
    const hasGermanIndicator = germanIndicators.some(pattern => pattern.test(text.toLowerCase()));

    // Zusätzlich: Text sollte mehrere Wörter enthalten
    const wordCount = text.trim().split(/\s+/).length;
    const hasMultipleWords = wordCount >= 2;

    return hasGermanIndicator && hasMultipleWords;
  }

  await scanDirectory(directory);
  return Array.from(germanTexts).sort();
}

// Übersetzung mit Google Gemini
async function translateTexts(texts, targetLanguage) {
  if (!CONFIG.geminiApiKey) {
    console.error('GEMINI_API_KEY nicht gesetzt! Fügen Sie ihn zu .env.local hinzu.');
    return {};
  }

  const translations = {};
  const batchSize = 15; // Texte in Gruppen übersetzen

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

      const prompt = `Du bist ein professioneller Übersetzer. Übersetze die folgenden deutschen Texte ins ${languageNames[targetLanguage]}. 

Kontext: Es handelt sich um eine Dienstleistungsplattform namens "Taskilo", die Kunden mit Handwerkern und anderen Dienstleistern verbindet.

Wichtige Regeln:
1. Behalte den Markennamen "Taskilo" bei
2. Verwende natürliche, professionelle Sprache
3. Behalte HTML-Tags und Formatierung bei
4. Übersetze Button-Texte actionsorientiert
5. Antworte nur mit einem gültigen JSON-Objekt im Format: {"original_text": "übersetzter_text"}

Deutsche Texte zum Übersetzen:
${JSON.stringify(batch)}

JSON Antwort:`;

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
              temperature: 0.3,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API Fehler: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text;

      try {
        // JSON aus der Antwort extrahieren - mehrere Versuche
        let jsonString = responseText;

        // Versuche 1: Komplette Antwort als JSON
        try {
          const translatedBatch = JSON.parse(jsonString);
          Object.assign(translations, translatedBatch);
        } catch {
          // Versuche 2: JSON zwischen ```json und ``` finden
          const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
          } else {
            // Versuche 3: JSON zwischen { und } finden
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            }
          }

          // Bereinige das JSON
          jsonString = jsonString
            .replace(/,\s*}/g, '}') // Entferne trailing commas
            .replace(/,\s*]/g, ']') // Entferne trailing commas in arrays
            .replace(/\n/g, ' ') // Entferne Newlines
            .replace(/\r/g, '') // Entferne Carriage Returns
            .trim();

          const translatedBatch = JSON.parse(jsonString);
          Object.assign(translations, translatedBatch);
        }
      } catch (parseError) {
        console.warn(`JSON Parse Fehler für Batch:`, parseError.message);
        console.warn('Antwort war:', responseText.slice(0, 500) + '...');

        // Fallback: Versuche einfache Text-Extraktion
        try {
          const lines = responseText.split('\n');
          const simpleTranslations = {};

          for (let i = 0; i < batch.length && i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('{') && !line.startsWith('}')) {
              simpleTranslations[batch[i]] = line.replace(/^["']|["']$/g, '');
            } else {
              simpleTranslations[batch[i]] = batch[i]; // Fallback auf Original
            }
          }

          Object.assign(translations, simpleTranslations);
        } catch {
          // Letzter Fallback: Originaltexte verwenden
          batch.forEach(text => {
            translations[text] = text;
          });
        }
      }

      // Kurze Pause zwischen Requests
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Fehler bei Batch-Übersetzung:`, error);
      // Fallback: Originaltexte verwenden
      batch.forEach(text => {
        translations[text] = text;
      });
    }
  }

  return translations;
}

// Translation Keys generieren
function generateTranslationKeys(texts) {
  const keys = {};

  texts.forEach(text => {
    // Einfachen Key aus dem Text generieren
    let key = text
      .toLowerCase()
      .replace(/[äöüß]/g, match => {
        const map = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
        return map[match] || match;
      })
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4) // Maximal 4 Wörter
      .join('.');

    // Stelle sicher, dass der Key eindeutig ist
    let finalKey = key;
    let counter = 1;
    while (Object.values(keys).includes(finalKey)) {
      finalKey = `${key}.${counter}`;
      counter++;
    }

    keys[text] = finalKey;
  });

  return keys;
}

// Neue LanguageContext.tsx erstellen
async function updateLanguageContext(germanTexts, allTranslations) {
  const keys = generateTranslationKeys(germanTexts);

  // Neue Übersetzungsstruktur erstellen
  const newTranslations = {
    de: {},
    en: {},
    fr: {},
    es: {},
  };

  // Deutsche Texte als Basis
  germanTexts.forEach(text => {
    const key = keys[text];
    newTranslations.de[key] = text;
  });

  // Übersetzungen hinzufügen
  CONFIG.targetLanguages.forEach(lang => {
    germanTexts.forEach(text => {
      const key = keys[text];
      newTranslations[lang][key] = allTranslations[lang]?.[text] || text;
    });
  });

  // Bestehende Übersetzungen aus LanguageContext.tsx lesen
  const existingContent = await fs.readFile(CONFIG.translationsFile, 'utf-8');

  // Neue Übersetzungen in das bestehende Format einfügen
  const updatedContent = existingContent.replace(
    /const translations = \{[\s\S]*?\};/,
    `const translations = ${JSON.stringify(newTranslations, null, 2)};`
  );

  // Backup erstellen
  await fs.writeFile(CONFIG.translationsFile + '.backup', existingContent);

  // Neue Datei schreiben
  await fs.writeFile(CONFIG.translationsFile, updatedContent);

  console.log(`✅ LanguageContext.tsx aktualisiert mit ${germanTexts.length} Übersetzungen`);
  console.log(`📁 Backup erstellt: ${CONFIG.translationsFile}.backup`);

  // Translation Keys Mapping für Code-Updates ausgeben
  const keyMappingFile = path.join(__dirname, 'translation-keys-mapping.json');
  await fs.writeFile(keyMappingFile, JSON.stringify(keys, null, 2));
  console.log(`🔑 Translation Keys Mapping gespeichert: ${keyMappingFile}`);
}

// Haupt-Funktion
async function main() {
  try {
    console.log('🚀 Starte automatische Internationalisierung von Taskilo...\n');

    // 1. Deutsche Texte sammeln
    console.log('📖 Sammle deutsche Texte aus dem Projekt...');
    const germanTexts = await extractGermanTexts(CONFIG.srcDirectory);
    console.log(`✅ ${germanTexts.length} deutsche Texte gefunden\n`);

    if (germanTexts.length === 0) {
      console.log('❌ Keine deutschen Texte gefunden.');
      return;
    }

    // Erste 10 Texte anzeigen
    console.log('📝 Beispiel-Texte:');
    germanTexts.slice(0, 10).forEach((text, i) => {
      console.log(`   ${i + 1}. ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`);
    });
    console.log('');

    // 2. Übersetzungen für alle Zielsprachen
    const allTranslations = {};

    for (const lang of CONFIG.targetLanguages) {
      console.log(`🌐 Übersetze nach ${lang.toUpperCase()}...`);
      allTranslations[lang] = await translateTexts(germanTexts, lang);
      console.log(`✅ ${lang.toUpperCase()} Übersetzung abgeschlossen\n`);
    }

    // 3. LanguageContext.tsx aktualisieren
    console.log('📝 Aktualisiere LanguageContext.tsx...');
    await updateLanguageContext(germanTexts, allTranslations);

    console.log('\n🎉 Internationalisierung abgeschlossen!');
    console.log('\n📋 Nächste Schritte:');
    console.log('1. Überprüfen Sie die generierten Übersetzungen');
    console.log('2. Ersetzen Sie Hardcoded-Texte mit t() Funktionen');
    console.log('3. Testen Sie die verschiedenen Sprachen');
    console.log('4. Passen Sie Übersetzungen bei Bedarf manuell an');
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

// Skript ausführen
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { extractGermanTexts, translateTexts, updateLanguageContext };
