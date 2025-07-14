#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔍 ANALYSIERE ALLE KOMPONENTEN AUF ÜBERSETZUNGSINTEGRATION');
console.log('======================================================\n');

// Funktion zum rekursiven Durchsuchen von Verzeichnissen
function getAllFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
    let results = [];

    try {
        const list = readdirSync(dir);

        for (const file of list) {
            const filePath = join(dir, file);
            const stat = statSync(filePath);

            if (stat && stat.isDirectory()) {
                // Rekursiv in Unterverzeichnisse
                if (!file.includes('node_modules') && !file.includes('.git')) {
                    results = results.concat(getAllFiles(filePath, extensions));
                }
            } else {
                // Prüfe Dateierweiterung
                if (extensions.some(ext => file.endsWith(ext))) {
                    results.push(filePath);
                }
            }
        }
    } catch (error) {
        console.warn(`⚠️ Fehler beim Lesen von ${dir}: ${error.message}`);
    }

    return results;
}

// Sammle alle Komponenten-Dateien
const componentFiles = getAllFiles('./src/components');
const appFiles = getAllFiles('./src/app').filter(f => f.includes('.tsx') || f.includes('.jsx'));
const allReactFiles = [...componentFiles, ...appFiles];

console.log(`📁 Gefundene React-Dateien: ${allReactFiles.length}\n`);

// Kategorien für Analyse
const analysisResults = {
    usingTranslations: [],
    notUsingTranslations: [],
    containsHardcodedText: [],
    errors: [],
};

// Analysiere jede Datei
allReactFiles.forEach(filePath => {
    try {
        const content = readFileSync(filePath, 'utf8');
        const fileName = filePath.replace('./src/', '');

        // Prüfe auf useLanguage Hook
        const usesLanguageHook = content.includes('useLanguage');

        // Prüfe auf t() Funktion
        const usesTranslationFunction = content.includes('t(') && content.includes("'");

        // Prüfe auf hardcodierten deutschen/englischen Text
        const hasHardcodedText =
            content.match(/['"`][A-ZÄÖÜ][a-zäöüß\s]{5,}['"`]/g) ||
            content.match(/['"`](Lade|Fehler|Erfolg|Speichern|Löschen|Bearbeiten)['"`]/g) ||
            content.match(/['"`](Loading|Error|Success|Save|Delete|Edit)['"`]/g);

        // Klassifiziere die Datei
        if (usesLanguageHook || usesTranslationFunction) {
            analysisResults.usingTranslations.push({
                file: fileName,
                hasHook: usesLanguageHook,
                hasFunction: usesTranslationFunction,
                hardcodedText: hasHardcodedText ? hasHardcodedText.slice(0, 3) : null,
            });
        } else {
            analysisResults.notUsingTranslations.push({
                file: fileName,
                hardcodedText: hasHardcodedText ? hasHardcodedText.slice(0, 3) : null,
            });
        }

        if (hasHardcodedText && hasHardcodedText.length > 0) {
            analysisResults.containsHardcodedText.push({
                file: fileName,
                examples: hasHardcodedText.slice(0, 5),
            });
        }
    } catch (error) {
        analysisResults.errors.push({
            file: filePath,
            error: error.message,
        });
    }
});

// Ergebnisse ausgeben
console.log('📊 ANALYSEERGEBNISSE:');
console.log('====================\n');

console.log(`✅ KOMPONENTEN MIT ÜBERSETZUNGEN: ${analysisResults.usingTranslations.length}`);
analysisResults.usingTranslations.forEach(item => {
    const status = item.hasHook && item.hasFunction ? '🟢' : '🟡';
    console.log(`  ${status} ${item.file}`);
    if (item.hardcodedText) {
        console.log(`    ⚠️  Hardcoded: ${item.hardcodedText.join(', ')}`);
    }
});

console.log(`\n❌ KOMPONENTEN OHNE ÜBERSETZUNGEN: ${analysisResults.notUsingTranslations.length}`);
analysisResults.notUsingTranslations.forEach(item => {
    console.log(`  🔴 ${item.file}`);
    if (item.hardcodedText) {
        console.log(`    ⚠️  Hardcoded: ${item.hardcodedText.join(', ')}`);
    }
});

console.log(`\n⚠️  DATEIEN MIT HARDCODED TEXT: ${analysisResults.containsHardcodedText.length}`);
analysisResults.containsHardcodedText.forEach(item => {
    console.log(`  📝 ${item.file}:`);
    item.examples.forEach(text => {
        console.log(`    - ${text}`);
    });
});

if (analysisResults.errors.length > 0) {
    console.log(`\n❌ FEHLER BEIM ANALYSIEREN: ${analysisResults.errors.length}`);
    analysisResults.errors.forEach(item => {
        console.log(`  🚨 ${item.file}: ${item.error}`);
    });
}

// Zusammenfassung
const totalFiles = allReactFiles.length;
const translatedFiles = analysisResults.usingTranslations.length;
const untranslatedFiles = analysisResults.notUsingTranslations.length;
const hardcodedFiles = analysisResults.containsHardcodedText.length;

console.log('\n🎯 ZUSAMMENFASSUNG:');
console.log('==================');
console.log(`📁 Gesamte React-Dateien: ${totalFiles}`);
console.log(
    `✅ Mit Übersetzungen: ${translatedFiles} (${((translatedFiles / totalFiles) * 100).toFixed(1)}%)`
);
console.log(
    `❌ Ohne Übersetzungen: ${untranslatedFiles} (${((untranslatedFiles / totalFiles) * 100).toFixed(1)}%)`
);
console.log(
    `⚠️  Mit Hardcoded-Text: ${hardcodedFiles} (${((hardcodedFiles / totalFiles) * 100).toFixed(1)}%)`
);

console.log('\n🏆 BEWERTUNG:');
if (translatedFiles / totalFiles > 0.8) {
    console.log('🟢 SEHR GUT - Über 80% der Komponenten verwenden Übersetzungen');
} else if (translatedFiles / totalFiles > 0.5) {
    console.log('🟡 MITTEL - Über 50% der Komponenten verwenden Übersetzungen');
} else {
    console.log('🔴 VERBESSERUNG NÖTIG - Weniger als 50% der Komponenten verwenden Übersetzungen');
}

console.log('\n🚀 EMPFEHLUNGEN:');
if (untranslatedFiles > 0) {
    console.log(`1. 🔧 ${untranslatedFiles} Komponenten für Übersetzungen überarbeiten`);
}
if (hardcodedFiles > 0) {
    console.log(`2. 📝 ${hardcodedFiles} Dateien mit hardcoded Text refaktorieren`);
}
console.log('3. ✅ Übersetzungskeys für alle gefundenen Texte hinzufügen');
console.log('4. 🧪 Integration testen und validieren');
