const fs = require('fs');
const path = require('path');

// Analysiere die aktuellen Übersetzungen
function analyzeTranslations() {
    console.log('🔍 Analysiere Übersetzungsstand...');
    console.log('='.repeat(60));

    const contextPath = '/Users/andystaudinger/Tasko/src/contexts/LanguageContext.tsx';

    try {
        const content = fs.readFileSync(contextPath, 'utf8');

        // Extrahiere den translations-Block
        const translationsMatch = content.match(/const translations = \{([\s\S]*?)\};/);
        if (!translationsMatch) {
            console.error('❌ Translations-Block nicht gefunden');
            return;
        }

        // Parse das translations-Objekt
        const translationsCode = translationsMatch[1];

        // Zähle die Übersetzungen für jede Sprache
        const stats = {};

        // Deutsche Übersetzungen zählen
        const deMatch = translationsCode.match(/de:\s*\{([\s\S]*?)\},?\s*en:/);
        if (deMatch) {
            const deContent = deMatch[1];
            const deKeys = (deContent.match(/[\w.]+:/g) || []).length;
            stats.de = deKeys;
        }

        // Englische Übersetzungen zählen
        const enMatch = translationsCode.match(/en:\s*\{([\s\S]*?)\},?\s*es:/);
        if (enMatch) {
            const enContent = enMatch[1];
            const enKeys = (enContent.match(/[\w.]+:/g) || []).length;
            stats.en = enKeys;
        }

        // Spanische Übersetzungen zählen
        const esMatch = translationsCode.match(/es:\s*\{([\s\S]*?)\},?\s*fr:/);
        if (esMatch) {
            const esContent = esMatch[1];
            const esKeys = (esContent.match(/[\w.]+:/g) || []).length;
            stats.es = esKeys;
        }

        // Französische Übersetzungen zählen
        const frMatch = translationsCode.match(/fr:\s*\{([\s\S]*?)\}/);
        if (frMatch) {
            const frContent = frMatch[1];
            const frKeys = (frContent.match(/[\w.]+:/g) || []).length;
            stats.fr = frKeys;
        }

        console.log('📊 Übersetzungsstatistiken:');
        console.log(`  🇩🇪 Deutsch: ${stats.de || 0} Übersetzungen`);
        console.log(`  🇬🇧 Englisch: ${stats.en || 0} Übersetzungen`);
        console.log(`  🇪🇸 Spanisch: ${stats.es || 0} Übersetzungen`);
        console.log(`  🇫🇷 Französisch: ${stats.fr || 0} Übersetzungen`);

        // Berechne Abdeckung
        const baseLang = stats.de || 0;
        if (baseLang > 0) {
            console.log('\\n📈 Übersetzungsabdeckung (basierend auf Deutsch):');
            console.log(`  🇬🇧 Englisch: ${(((stats.en || 0) / baseLang) * 100).toFixed(1)}%`);
            console.log(`  🇪🇸 Spanisch: ${(((stats.es || 0) / baseLang) * 100).toFixed(1)}%`);
            console.log(`  🇫🇷 Französisch: ${(((stats.fr || 0) / baseLang) * 100).toFixed(1)}%`);
        }

        // Gesamtqualität
        const totalTranslations = (stats.de || 0) + (stats.en || 0) + (stats.es || 0) + (stats.fr || 0);
        const maxPossible = (stats.de || 0) * 4; // 4 Sprachen
        const overallQuality =
            maxPossible > 0 ? ((totalTranslations / maxPossible) * 100).toFixed(1) : 0;

        console.log('\\n🎯 Gesamtqualität:');
        console.log(`  📝 Gesamte Übersetzungseinträge: ${totalTranslations}`);
        console.log(`  ✅ Vollständigkeit: ${overallQuality}%`);

        // Status bewerten
        console.log('\\n📋 Status-Bewertung:');
        if (overallQuality >= 90) {
            console.log('  🎉 Exzellent - Projekt ist vollständig internationalisiert!');
        } else if (overallQuality >= 75) {
            console.log('  ✅ Sehr gut - Grundlegende Internationalisierung abgeschlossen');
        } else if (overallQuality >= 50) {
            console.log('  ⚠️ Gut - Solide Basis, weitere Übersetzungen empfohlen');
        } else if (overallQuality >= 25) {
            console.log('  🔄 Ausreichend - Grundstruktur vorhanden, Ausbau nötig');
        } else {
            console.log('  ❌ Unvollständig - Weitere Arbeit erforderlich');
        }

        // Nächste Schritte
        console.log('\\n🚀 Empfohlene nächste Schritte:');

        if (stats.en && stats.es && stats.fr) {
            if (overallQuality >= 90) {
                console.log('  1. ✅ Projekt in Live-Umgebung testen');
                console.log('  2. ✅ UI-Tests für alle Sprachen durchführen');
                console.log('  3. ✅ Benutzerfeedback sammeln');
            } else {
                console.log('  1. 🔧 Fehlende Übersetzungen ergänzen');
                console.log('  2. 🧪 Qualitätskontrolle durchführen');
                console.log('  3. 🎯 Spezifische Taskilo-Begriffe übersetzen');
            }
        } else {
            console.log('  1. 🔄 Vervollständigungsskript ausführen');
            console.log('  2. 📝 Taskilo-spezifische Übersetzungen hinzufügen');
            console.log('  3. 🧪 Testphase einleiten');
        }

        return stats;
    } catch (error) {
        console.error('❌ Fehler beim Analysieren:', error.message);
        return null;
    }
}

// Script ausführen
if (require.main === module) {
    analyzeTranslations();
}

module.exports = { analyzeTranslations };
