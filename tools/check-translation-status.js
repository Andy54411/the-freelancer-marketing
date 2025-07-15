#!/usr/bin/env node

/**
 * Taskilo - Übersetzungsstatus-Checker
 * Überprüft alle Seiten auf fehlende Übersetzungen
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, '../src/app');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Bekannte Übersetzungskeys aus messages/de.json
const KNOWN_KEYS = [
    'Navigation', 'Footer', 'ComingSoon', 'Hero', 'Stats', 'Categories',
    'Testimonials', 'Platform', 'CTA', 'Common', 'About', 'Contact',
    'Services', 'Login', 'Register', 'Dashboard', 'Profile', 'Booking',
    'Legal', 'Errors', 'Banner', 'ServiceDiscovery'
];

// Muster für hardcoded deutsche Texte
const GERMAN_TEXT_PATTERNS = [
    />\s*([A-ZÄÖÜ][a-zäöüß\s]{5,}?)\s*</g,
    /placeholder\s*=\s*["']([A-ZÄÖÜ][^"']{5,}?)["']/g,
    /title\s*=\s*["']([A-ZÄÖÜ][^"']{5,}?)["']/g,
    /"([A-ZÄÖÜ][a-zäöüß\s]{10,}?)"/g,
];

// Deutsche Indikatoren
const GERMAN_INDICATORS = [
    /\b(der|die|das|und|oder|für|von|mit|zu|auf|bei|nach|über|unter|vor|zwischen|durch|gegen|ohne|um|während|wegen|trotz|seit|bis|als|wenn|dass|welche|diese|jene|alle|einige|viele|wenige|andere|neue|alte|große|kleine|gute|schlechte|erste|letzte|nächste|beste|schlimmste)\b/i,
    /\b(ist|sind|haben|wird|werden|können|müssen|sollten|möchten|sollen|wollen|dürfen|mag|kann|hat|war|waren|wurde|wurden|gewesen|gehabt|gemacht|getan|gesagt|gekommen|gegangen|gekauft|verkauft|gearbeitet|gelebt|gestorben|geboren)\b/i,
    /[äöüßÄÖÜ]/,
    /\b(Anmelden|Registrieren|Buchen|Suchen|Finden|Profil|Einstellungen|Kontakt|Hilfe|Support|Willkommen|Hallo|Danke|Bitte|Weiter|Zurück|Speichern|Löschen|Bearbeiten)\b/i,
];

function isGermanText(text) {
    if (text.length < 5) return false;

    // Ignoriere Code-Patterns
    if (text.includes('className') || text.includes('useState') || text.includes('useEffect')) return false;
    if (text.includes('px') || text.includes('rem') || text.includes('vh') || text.includes('vw')) return false;
    if (text.includes('{{') || text.includes('}}') || text.includes('${')) return false;

    return GERMAN_INDICATORS.some(pattern => pattern.test(text));
}

function extractGermanTexts(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = [];

    GERMAN_TEXT_PATTERNS.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const text = match[1];
            if (isGermanText(text)) {
                results.push({
                    text: text.trim(),
                    line: content.substring(0, match.index).split('\n').length,
                    pattern: pattern.source
                });
            }
        }
    });

    return results;
}

function scanDirectory(dir) {
    const results = [];

    function scanRecursive(currentDir) {
        const files = fs.readdirSync(currentDir);

        for (const file of files) {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                scanRecursive(filePath);
            } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                const germanTexts = extractGermanTexts(filePath);
                if (germanTexts.length > 0) {
                    results.push({
                        file: path.relative(path.join(__dirname, '..'), filePath),
                        texts: germanTexts
                    });
                }
            }
        }
    }

    scanRecursive(dir);
    return results;
}

console.log('🔍 Taskilo - Übersetzungsstatus-Checker');
console.log('=====================================\n');

// Scanne Pages
console.log('📄 Scanne Seiten...');
const pageResults = scanDirectory(PAGES_DIR);

// Scanne Components
console.log('🧩 Scanne Komponenten...');
const componentResults = scanDirectory(COMPONENTS_DIR);

const allResults = [...pageResults, ...componentResults];

console.log('\n📊 ERGEBNISSE:');
console.log('==============\n');

let totalFiles = 0;
let totalTexts = 0;

allResults.forEach(result => {
    totalFiles++;
    totalTexts += result.texts.length;

    console.log(`📁 ${result.file}`);
    console.log(`   📝 ${result.texts.length} hardcoded deutsche Texte gefunden:`);

    result.texts.slice(0, 5).forEach((text, i) => {
        console.log(`   ${i + 1}. Zeile ${text.line}: "${text.text.substring(0, 50)}${text.text.length > 50 ? '...' : ''}"`);
    });

    if (result.texts.length > 5) {
        console.log(`   ... und ${result.texts.length - 5} weitere`);
    }

    console.log();
});

console.log('📈 ZUSAMMENFASSUNG:');
console.log(`   📁 Dateien mit hardcoded Texten: ${totalFiles}`);
console.log(`   📝 Gesamt hardcoded Texte: ${totalTexts}`);
console.log(`   🎯 Übersetzungsfortschritt: ${totalTexts === 0 ? '100%' : 'In Arbeit'}`);

console.log('\n🚀 NÄCHSTE SCHRITTE:');
console.log('1. Hardcoded Texte durch t() Aufrufe ersetzen');
console.log('2. Fehlende Übersetzungskeys in messages/de.json hinzufügen');
console.log('3. Translation Watcher überwacht automatisch die Synchronisation');
console.log('4. UI in beiden Sprachen testen');

console.log('\n💡 BEISPIEL-IMPLEMENTIERUNG:');
console.log('// Vorher:');
console.log('<h1>Über uns</h1>');
console.log('// Nachher:');
console.log('<h1>{t("About.title")}</h1>');

console.log('\n📞 HILFE:');
console.log('- Translation Watcher: npm run translation-watcher');
console.log('- Übersetzungen prüfen: node tools/check-translations.js');
console.log('- Dokumentation: docs/COMPLETE_TRANSLATION_GUIDE.md');
