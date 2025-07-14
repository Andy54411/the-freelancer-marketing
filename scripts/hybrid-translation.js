import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractUITexts } from './extract-ui-texts-improved.js';
import { cleanupTranslations } from './cleanup-translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Gemini API Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAZIoSAiKeG9uRj7X45FiFldzLjibbjjdY';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// Sprachen für die Übersetzung
const TARGET_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
};

async function translateText(texts, targetLanguage) {
  if (texts.length === 0) return {};

  const prompt = `Translate the following German UI texts to ${TARGET_LANGUAGES[targetLanguage]}. 
Maintain the context and tone appropriate for a web application interface.
Return ONLY a JSON object with the German text as key and the translation as value.

German texts to translate:
${texts.map((text, i) => `${i + 1}. "${text}"`).join('\n')}

Important:
- Keep UI-specific terms consistent
- Maintain formal/informal tone as appropriate
- Preserve any HTML entities or special formatting
- Return valid JSON format`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
    });

    if (!response.ok) {
      throw new Error(`API-Fehler: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0]?.content?.parts[0]?.text;

    if (!generatedText) {
      throw new Error('Keine Übersetzung erhalten');
    }

    // Versuche JSON zu parsen mit mehreren Fallback-Strategien
    let translations = {};

    try {
      // Direkte JSON-Parsing
      translations = JSON.parse(generatedText);
    } catch {
      try {
        // Entferne Markdown-Formatierung
        const cleanedText = generatedText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        translations = JSON.parse(cleanedText);
      } catch {
        try {
          // Suche nach JSON-Block im Text
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            translations = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.warn('⚠️ JSON-Parsing fehlgeschlagen, verwende Fallback-Methode');

          // Fallback: Parse Zeile für Zeile
          const lines = generatedText.split('\n');
          for (const line of lines) {
            const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
            if (match) {
              translations[match[1]] = match[2];
            }
          }
        }
      }
    }

    return translations;
  } catch (error) {
    console.error(`❌ Übersetzungsfehler für ${targetLanguage}:`, error.message);
    return {};
  }
}

async function hybridTranslationApproach() {
  console.log('🚀 Starte Hybrid-Übersetzungsansatz...');
  console.log('='.repeat(50));

  // Phase 1: Extrahiere neue hochwertige UI-Texte
  console.log('\n📝 Phase 1: Extrahiere hochwertige UI-Texte');
  const newUITexts = await extractUITexts();

  // Phase 2: Bereinige vorhandene Übersetzungen
  console.log('\n🧹 Phase 2: Bereinige vorhandene Übersetzungen');
  const cleanupResult = cleanupTranslations();

  if (!cleanupResult) {
    console.error('❌ Bereinigung fehlgeschlagen');
    return;
  }

  // Phase 3: Kombiniere bereinigte und neue Texte
  console.log('\n🔄 Phase 3: Kombiniere Texte');
  const existingTexts = cleanupResult.cleanedEntries;
  const newTexts = newUITexts.map(item => item.text);

  // Finde neue Texte, die noch nicht übersetzt wurden
  const textsToTranslate = newTexts.filter(text => !existingTexts.has(text));

  console.log(`📊 Text-Übersicht:`);
  console.log(`  Bereinigte existierende Texte: ${existingTexts.size}`);
  console.log(`  Neue UI-Texte gefunden: ${newTexts.length}`);
  console.log(`  Neue Texte zu übersetzen: ${textsToTranslate.length}`);

  // Phase 4: Übersetze neue Texte
  const finalTranslations = {
    de: Object.fromEntries(existingTexts),
    en: {},
    es: {},
    fr: {},
  };

  if (textsToTranslate.length > 0) {
    console.log('\n🌍 Phase 4: Übersetze neue Texte');

    // Übersetze in Batches von 10 Texten
    const BATCH_SIZE = 10;

    for (const [langCode, langName] of Object.entries(TARGET_LANGUAGES)) {
      console.log(`\n🔄 Übersetze nach ${langName}...`);

      for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
        const batch = textsToTranslate.slice(i, i + BATCH_SIZE);
        console.log(
          `  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(textsToTranslate.length / BATCH_SIZE)}: ${batch.length} Texte`
        );

        const batchTranslations = await translateText(batch, langCode);
        Object.assign(finalTranslations[langCode], batchTranslations);

        // Kurze Pause zwischen API-Aufrufen
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Füge neue deutsche Texte hinzu
    textsToTranslate.forEach(text => {
      // Generiere einen Schlüssel
      const key = text
        .toLowerCase()
        .replace(/[äöüß]/g, match => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[match])
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.+|\.+$/g, '')
        .substring(0, 50);

      finalTranslations.de[key] = text;
    });
  }

  // Phase 5: Aktualisiere LanguageContext.tsx
  console.log('\n💾 Phase 5: Aktualisiere LanguageContext.tsx');

  try {
    // Backup der aktuellen Datei
    const contextPath = path.join(__dirname, '../src/contexts/LanguageContext.tsx');
    const backupPath = path.join(
      __dirname,
      '../src/contexts/LanguageContext.tsx.backup.' + Date.now()
    );
    fs.copyFileSync(contextPath, backupPath);
    console.log(`  📋 Backup erstellt: ${path.basename(backupPath)}`);

    // Lese die aktuelle Datei
    let content = fs.readFileSync(contextPath, 'utf-8');

    // Erstelle den neuen translations-Block
    const newTranslationsBlock = `const translations = ${JSON.stringify(finalTranslations, null, 2)};`;

    // Ersetze den alten translations-Block
    content = content.replace(/const translations = \{[\s\S]*?\n\};/, newTranslationsBlock);

    // Schreibe die aktualisierte Datei
    fs.writeFileSync(contextPath, content);

    console.log('✅ LanguageContext.tsx erfolgreich aktualisiert');

    // Zusammenfassung
    console.log('\n🎉 Hybrid-Ansatz abgeschlossen!');
    console.log('='.repeat(50));
    console.log(`📊 Finale Statistiken:`);
    console.log(`  Deutsche Texte: ${Object.keys(finalTranslations.de).length}`);
    console.log(`  Englische Übersetzungen: ${Object.keys(finalTranslations.en).length}`);
    console.log(`  Spanische Übersetzungen: ${Object.keys(finalTranslations.es).length}`);
    console.log(`  Französische Übersetzungen: ${Object.keys(finalTranslations.fr).length}`);

    // Qualitätsprüfung - zeige einige Beispiele
    console.log('\n🔍 Qualitätsprüfung - Beispielübersetzungen:');
    const sampleKeys = Object.keys(finalTranslations.de).slice(0, 3);
    sampleKeys.forEach(key => {
      console.log(`\n"${key}":`);
      console.log(`  🇩🇪 ${finalTranslations.de[key]}`);
      console.log(`  🇬🇧 ${finalTranslations.en[key] || 'Nicht übersetzt'}`);
      console.log(`  🇪🇸 ${finalTranslations.es[key] || 'Nicht übersetzt'}`);
      console.log(`  🇫🇷 ${finalTranslations.fr[key] || 'Nicht übersetzt'}`);
    });
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der LanguageContext.tsx:', error.message);
  }
}

// Script ausführen
if (import.meta.url === `file://${__filename}`) {
  hybridTranslationApproach().catch(console.error);
}

export { hybridTranslationApproach };
