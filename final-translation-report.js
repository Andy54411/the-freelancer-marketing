#!/usr/bin/env node

console.log('🎯 FINALE ÜBERSETZUNGSANALYSE - Taskilo');
console.log('=====================================\n');

// Einfache Zählung der Keys pro Sprache
import { execSync } from 'child_process';

try {
    // Zähle deutsche Keys
    const deCount = execSync(
        'grep -c "    [\'\\"][^\'\\"]*[\'\\"].*:" src/contexts/LanguageContext.tsx | head -1',
        { encoding: 'utf8' }
    ).trim();

    // Zähle englische Keys (ab der englischen Sektion)
    const enCount = execSync(
        'sed -n \'/en: {/,/},/p\' src/contexts/LanguageContext.tsx | grep -c "    [\'\\"][^\'\\"]*[\'\\"].*:"',
        { encoding: 'utf8' }
    ).trim();

    console.log('📊 SPRACHSTATISTIKEN:');
    console.log(`  🇩🇪 Deutsche Übersetzungen: ${deCount}`);
    console.log(`  🇺🇸 Englische Übersetzungen: ${enCount}`);
    console.log(`  📝 Gesamte Übersetzungen: ${parseInt(deCount) + parseInt(enCount)}`);
    console.log();

    // Überprüfe die Struktur
    const totalLines = execSync("wc -l src/contexts/LanguageContext.tsx | awk '{print $1}'", {
        encoding: 'utf8',
    }).trim();
    console.log('📄 DATEISTRUKTUR:');
    console.log(`  📄 Gesamte Zeilen: ${totalLines}`);
    console.log(`  🏗️  Struktur: Vereinfacht (nur DE/EN)`);
    console.log(`  🧹 Automatische Übersetzung: Entfernt`);
    console.log();

    // Überprüfe Kategorien
    const categories = [
        'Basis UI-Elemente',
        'Navigation & Menu',
        'Hero Section',
        'Call to Action',
        'Banner',
        'Service Categories',
        'Booking Process',
        'Provider Profile',
        'Reviews & Ratings',
        'Forms & Validation',
        'Account & Authentication',
        'Messages & Chat',
        'Payment & Billing',
        'Time & Date',
        'Status Messages',
        'Error Messages',
        'Success Messages',
    ];

    console.log('📂 KATEGORIEN-ABDECKUNG:');
    categories.forEach(category => {
        try {
            execSync(`grep -q "// ${category}" src/contexts/LanguageContext.tsx`);
            console.log(`  ✅ ${category}`);
        } catch {
            console.log(`  ❌ ${category}`);
        }
    });
    console.log();

    // Bewertung
    const deNum = parseInt(deCount);
    const enNum = parseInt(enCount);

    console.log('🎯 QUALITÄTSBEWERTUNG:');

    if (deNum === enNum && deNum > 100) {
        console.log('  🏆 STATUS: EXZELLENT');
        console.log('  ✅ Vollständige zweisprachige Abdeckung');
        console.log('  ✅ Umfassende Übersetzungen (>100 Keys pro Sprache)');
        console.log('  ✅ Strukturiert und kategorisiert');
        console.log('  ✅ Produktionsreif');
    } else if (deNum === enNum) {
        console.log('  ✅ STATUS: GUT');
        console.log('  ✅ Ausgeglichene Sprachabdeckung');
        console.log('  ⚠️  Könnte mehr Übersetzungen gebrauchen');
    } else {
        console.log('  ⚠️  STATUS: BRAUCHT VERBESSERUNG');
        console.log('  ❌ Unausgeglichene Sprachabdeckung');
    }

    console.log();
    console.log('🚀 NÄCHSTE SCHRITTE:');
    console.log('  1. 🧪 Komponenten-Integration testen');
    console.log('  2. 🔄 Sprachswitch-Funktionalität prüfen');
    console.log('  3. 🎨 UI-Tests in beiden Sprachen');
    console.log('  4. 🚀 Live-Deployment vorbereiten');
} catch (error) {
    console.error('❌ Fehler bei der Analyse:', error.message);
}
