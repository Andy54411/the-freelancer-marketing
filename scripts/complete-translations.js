import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
Return ONLY a JSON object with the German text as key and the translation as value.

German texts:
${texts.map((text, i) => `"${text}"`).join(',\n')}

Return valid JSON format without any markdown formatting.`;

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

    // JSON parsen mit Fallback-Strategien
    let translations = {};

    try {
      translations = JSON.parse(generatedText);
    } catch {
      try {
        const cleanedText = generatedText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        translations = JSON.parse(cleanedText);
      } catch {
        try {
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            translations = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.warn('⚠️ JSON-Parsing fehlgeschlagen für', targetLanguage);
          return {};
        }
      }
    }

    return translations;
  } catch (error) {
    console.error(`❌ Übersetzungsfehler für ${targetLanguage}:`, error.message);
    return {};
  }
}

// Schlaf-Funktion für API-Rate-Limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function completeTranslations() {
  console.log('🔄 Vervollständige fehlende Übersetzungen...');

  // Lade aktuelle Übersetzungen
  const contextPath = path.join(__dirname, '../src/contexts/LanguageContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');

  const translationsMatch = content.match(/const translations = (\{[\s\S]*?\});/);
  if (!translationsMatch) {
    console.error('❌ Translations-Block nicht gefunden');
    return;
  }

  let translations;
  try {
    translations = eval(`(${translationsMatch[1]})`);
  } catch (error) {
    console.error('❌ Fehler beim Parsen der Übersetzungen:', error.message);
    return;
  }

  const { de, en, es, fr } = translations;
  const germanKeys = Object.keys(de);

  console.log(`📊 Aktueller Stand:`);
  console.log(`  🇩🇪 Deutsche Texte: ${germanKeys.length}`);
  console.log(`  🇬🇧 Englische Übersetzungen: ${Object.keys(en).length}`);
  console.log(`  🇪🇸 Spanische Übersetzungen: ${Object.keys(es).length}`);
  console.log(`  🇫🇷 Französische Übersetzungen: ${Object.keys(fr).length}`);

  // Finde fehlende Übersetzungen
  const missingTranslations = {};

  for (const [langCode, langName] of Object.entries(TARGET_LANGUAGES)) {
    const existingTranslations = langCode === 'en' ? en : langCode === 'es' ? es : fr;
    const missingKeys = germanKeys.filter(key => !existingTranslations.hasOwnProperty(de[key]));
    const missingTexts = missingKeys.map(key => de[key]);

    missingTranslations[langCode] = {
      texts: missingTexts,
      count: missingTexts.length,
    };

    console.log(`  ❌ ${langName} fehlt: ${missingTexts.length} Übersetzungen`);
  }

  // Übersetze fehlende Texte in kleineren Batches (wegen API-Limits)
  const SMALL_BATCH_SIZE = 5;

  for (const [langCode, langName] of Object.entries(TARGET_LANGUAGES)) {
    const missing = missingTranslations[langCode];
    if (missing.count === 0) continue;

    console.log(`\n🌍 Vervollständige ${langName} (${missing.count} Texte)...`);

    const existingLangTranslations = langCode === 'en' ? en : langCode === 'es' ? es : fr;

    for (let i = 0; i < missing.texts.length; i += SMALL_BATCH_SIZE) {
      const batch = missing.texts.slice(i, i + SMALL_BATCH_SIZE);
      const batchNum = Math.floor(i / SMALL_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(missing.texts.length / SMALL_BATCH_SIZE);

      console.log(`  📦 Batch ${batchNum}/${totalBatches}: ${batch.length} Texte`);

      const batchTranslations = await translateText(batch, langCode);

      // Füge Übersetzungen hinzu
      Object.entries(batchTranslations).forEach(([germanText, translation]) => {
        existingLangTranslations[germanText] = translation;
      });

      console.log(`    ✅ ${Object.keys(batchTranslations).length} Übersetzungen hinzugefügt`);

      // Längere Pause zwischen Batches
      if (i + SMALL_BATCH_SIZE < missing.texts.length) {
        console.log(`    ⏳ Pause 3 Sekunden...`);
        await sleep(3000);
      }
    }
  }

  // Aktualisiere die Datei
  console.log('\n💾 Aktualisiere LanguageContext.tsx...');

  try {
    // Backup erstellen
    const backupPath = contextPath + '.completion-backup.' + Date.now();
    fs.copyFileSync(contextPath, backupPath);
    console.log(`  📋 Backup erstellt: ${path.basename(backupPath)}`);

    // Neue translations erstellen
    const updatedTranslations = { de, en, es, fr };
    const newTranslationsBlock = `const translations = ${JSON.stringify(updatedTranslations, null, 2)};`;

    // Datei aktualisieren
    const newContent = content.replace(
      /const translations = \{[\s\S]*?\n\};/,
      newTranslationsBlock
    );
    fs.writeFileSync(contextPath, newContent);

    console.log('✅ LanguageContext.tsx erfolgreich aktualisiert');

    // Finale Statistiken
    console.log('\n🎉 Vervollständigung abgeschlossen!');
    console.log('='.repeat(50));
    console.log(`📊 Finale Statistiken:`);
    console.log(`  🇩🇪 Deutsche Texte: ${Object.keys(de).length}`);
    console.log(`  🇬🇧 Englische Übersetzungen: ${Object.keys(en).length}`);
    console.log(`  🇪🇸 Spanische Übersetzungen: ${Object.keys(es).length}`);
    console.log(`  🇫🇷 Französische Übersetzungen: ${Object.keys(fr).length}`);

    const totalGerman = Object.keys(de).length;
    const enCoverage = ((Object.keys(en).length / totalGerman) * 100).toFixed(1);
    const esCoverage = ((Object.keys(es).length / totalGerman) * 100).toFixed(1);
    const frCoverage = ((Object.keys(fr).length / totalGerman) * 100).toFixed(1);

    console.log(`\n📈 Übersetzungsabdeckung:`);
    console.log(`  🇬🇧 Englisch: ${enCoverage}%`);
    console.log(`  🇪🇸 Spanisch: ${esCoverage}%`);
    console.log(`  🇫🇷 Französisch: ${frCoverage}%`);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren:', error.message);
  }
}

// Script ausführen
if (import.meta.url === `file://${__filename}`) {
  completeTranslations().catch(console.error);
}

export { completeTranslations };
