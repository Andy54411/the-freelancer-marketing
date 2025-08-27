#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Konfiguration
const projectRoot = __dirname;
const srcPath = path.join(projectRoot, 'src');

// Patterns für users Collection Zugriffe
const usersCollectionPatterns = [
  /doc\(db,\s*['"`]users['"`]/g,
  /collection\(db,\s*['"`]users['"`]/g,
  /getDoc\(doc\(db,\s*['"`]users['"`]/g,
  /getDocs\(query\(collection\(db,\s*['"`]users['"`]/g,
  /updateDoc\(doc\(db,\s*['"`]users['"`]/g,
  /setDoc\(doc\(db,\s*['"`]users['"`]/g,
  /deleteDoc\(doc\(db,\s*['"`]users['"`]/g,
];

// Company Dashboard relevante Pfade (wo companies Collection verwendet werden sollte)
const companyDashboardPaths = [
  '/dashboard/company/',
  '/components/dashboard/',
  '/components/dashboard_setting/',
  '/hooks/useCompany',
  'B2BPayment',
  'CompanyProfile',
  'ProviderBooking',
];

// Dateierweiterungen zum Scannen
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// Ergebnisse sammeln
const results = {
  totalFiles: 0,
  scannedFiles: 0,
  usersCollectionUsages: [],
  potentialCompanyCollectionFiles: [],
  summary: {
    highPriority: [],
    mediumPriority: [],
    lowPriority: [],
  },
};

// Hilfsfunktion: Ist Datei relevant für Company Dashboard?
function isCompanyDashboardRelevant(filePath) {
  return companyDashboardPaths.some(
    pattern =>
      filePath.includes(pattern) ||
      path.basename(filePath).toLowerCase().includes(pattern.toLowerCase())
  );
}

// Hilfsfunktion: Datei rekursiv scannen
function scanDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Überspringe node_modules, .git, etc.
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      results.totalFiles++;

      // Nur relevante Dateierweiterungen scannen
      if (fileExtensions.some(ext => entry.name.endsWith(ext))) {
        scanFile(fullPath);
      }
    }
  }
}

// Hilfsfunktion: Einzelne Datei scannen
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);

    results.scannedFiles++;

    // Suche nach users Collection Patterns
    const foundUsages = [];

    usersCollectionPatterns.forEach(pattern => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        foundUsages.push({
          pattern: pattern.source,
          match: match[0],
          lineNumber,
          context: getLineContext(content, match.index),
        });
      });
    });

    if (foundUsages.length > 0) {
      const isCompanyRelevant = isCompanyDashboardRelevant(relativePath);

      const fileResult = {
        file: relativePath,
        isCompanyDashboardRelevant: isCompanyRelevant,
        usages: foundUsages,
        totalUsages: foundUsages.length,
      };

      results.usersCollectionUsages.push(fileResult);

      if (isCompanyRelevant) {
        results.potentialCompanyCollectionFiles.push(fileResult);
      }

      // Priorisierung
      if (isCompanyRelevant) {
        if (relativePath.includes('/dashboard/company/') || relativePath.includes('B2BPayment')) {
          results.summary.highPriority.push(fileResult);
        } else if (relativePath.includes('/components/dashboard')) {
          results.summary.mediumPriority.push(fileResult);
        } else {
          results.summary.lowPriority.push(fileResult);
        }
      }
    }
  } catch (error) {
    console.error(`Fehler beim Scannen von ${filePath}:`, error.message);
  }
}

// Hilfsfunktion: Kontext um gefundene Stelle extrahieren
function getLineContext(content, index) {
  const lines = content.split('\n');
  const lineNumber = content.substring(0, index).split('\n').length;
  const contextLines = 2;

  const startLine = Math.max(0, lineNumber - contextLines - 1);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  return lines.slice(startLine, endLine).join('\n');
}

// Hauptfunktion
function main() {
  console.log('🔍 Scanne Projekt nach users Collection Zugriffen...\n');
  console.log(`📁 Projektpfad: ${projectRoot}`);
  console.log(`📂 Quellcodepfad: ${srcPath}\n`);

  const startTime = Date.now();

  // Scanne src Verzeichnis
  if (fs.existsSync(srcPath)) {
    scanDirectory(srcPath);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Ergebnisse ausgeben
  console.log('📊 SCAN-ERGEBNISSE');
  console.log('='.repeat(50));
  console.log(`⏱️  Dauer: ${duration.toFixed(2)}s`);
  console.log(`📄 Dateien insgesamt: ${results.totalFiles}`);
  console.log(`🔎 Gescannte Dateien: ${results.scannedFiles}`);
  console.log(`📝 Dateien mit users Collection: ${results.usersCollectionUsages.length}`);
  console.log(`🏢 Company Dashboard relevant: ${results.potentialCompanyCollectionFiles.length}\n`);

  // Hochpriorisierte Dateien (KRITISCH)
  if (results.summary.highPriority.length > 0) {
    console.log('🚨 KRITISCH - Company Dashboard Dateien (benötigen companies Collection):');
    console.log('-'.repeat(70));
    results.summary.highPriority.forEach(file => {
      console.log(`📄 ${file.file} (${file.totalUsages} Verwendungen)`);
      file.usages.forEach(usage => {
        console.log(`   Zeile ${usage.lineNumber}: ${usage.match}`);
      });
      console.log('');
    });
  }

  // Mittlere Priorität
  if (results.summary.mediumPriority.length > 0) {
    console.log('⚠️  MITTEL - Dashboard Komponenten:');
    console.log('-'.repeat(40));
    results.summary.mediumPriority.forEach(file => {
      console.log(`📄 ${file.file} (${file.totalUsages} Verwendungen)`);
    });
    console.log('');
  }

  // Niedrige Priorität
  if (results.summary.lowPriority.length > 0) {
    console.log('ℹ️  NIEDRIG - Andere Company-relevante Dateien:');
    console.log('-'.repeat(45));
    results.summary.lowPriority.forEach(file => {
      console.log(`📄 ${file.file} (${file.totalUsages} Verwendungen)`);
    });
    console.log('');
  }

  // Detaillierte Auflistung aller users Collection Verwendungen
  console.log('📋 ALLE USERS COLLECTION VERWENDUNGEN:');
  console.log('='.repeat(50));

  results.usersCollectionUsages.forEach(file => {
    const priority = file.isCompanyDashboardRelevant ? '🚨 COMPANY' : '✅ NORMAL';
    console.log(`\n${priority} ${file.file}`);
    console.log(`Verwendungen: ${file.totalUsages}`);

    file.usages.forEach(usage => {
      console.log(`  Zeile ${usage.lineNumber}: ${usage.match}`);
    });
  });

  // Zusammenfassung und Empfehlungen
  console.log('\n');
  console.log('💡 EMPFEHLUNGEN:');
  console.log('='.repeat(20));

  if (results.summary.highPriority.length > 0) {
    console.log('1. 🚨 SOFORT korrigieren: Hochpriorisierte Company Dashboard Dateien');
    console.log('   → Implementiere companies → users Fallback Pattern');
  }

  if (results.summary.mediumPriority.length > 0) {
    console.log('2. ⚠️ Bald korrigieren: Dashboard Komponenten überprüfen');
  }

  if (results.summary.lowPriority.length > 0) {
    console.log('3. ℹ️ Langfristig: Andere Company-relevante Dateien prüfen');
  }

  const totalCompanyRelevant =
    results.summary.highPriority.length +
    results.summary.mediumPriority.length +
    results.summary.lowPriority.length;

  console.log(
    `\n📈 Status: ${totalCompanyRelevant} von ${results.usersCollectionUsages.length} Dateien benötigen möglicherweise companies Collection`
  );

  // JSON Export für weitere Verarbeitung
  const reportPath = path.join(projectRoot, 'collection-usage-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detaillierter Report gespeichert: ${reportPath}`);
}

// Skript ausführen
if (require.main === module) {
  main();
}

module.exports = { main, results };
