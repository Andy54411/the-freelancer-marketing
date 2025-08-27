#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Konfiguration
const projectRoot = __dirname;
const srcPath = path.join(projectRoot, 'src');

// INTELLIGENTE ANALYSE: Finde nur die WIRKLICH problematischen Dateien
const problemPatterns = {
  // Pattern 1: NUR users Collection ohne companies Fallback
  onlyUsersWithoutCompanies: /getDoc\(doc\(db,\s*['"`]users['"`][^}]+\)\s*;\s*(?![^}]*companies)/gs,

  // Pattern 2: updateDoc NUR auf users ohne companies
  updateOnlyUsers:
    /updateDoc\(doc\(db,\s*['"`]users['"`][^}]+\)\s*,\s*[^}]+\)\s*;\s*(?![^}]*companies)/gs,

  // Pattern 3: collection(db, 'users') ohne companies Collection Query
  collectionOnlyUsers: /collection\(db,\s*['"`]users['"`]\)[^}]*(?![^}]*companies)/gs,
};

// Company Dashboard relevante Pfade
const companyDashboardPaths = [
  '/dashboard/company/',
  '/components/dashboard/',
  '/components/dashboard_setting/',
  '/hooks/useCompany',
  'B2BPayment',
  'CompanyProfile',
  'ProviderBooking',
];

// Ergebnisse
const results = {
  totalFiles: 0,
  scannedFiles: 0,
  realProblems: [],
  summary: {
    critical: [],
    warnings: [],
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

// Hilfsfunktion: Analysiere Datei auf echte Probleme
function analyzeFileForRealProblems(filePath, content) {
  const relativePath = path.relative(projectRoot, filePath);
  const isCompanyRelevant = isCompanyDashboardRelevant(relativePath);

  if (!isCompanyRelevant) {
    return null; // Nicht relevant für Company Dashboard
  }

  const problems = [];

  // INTELLIGENTE ANALYSE: Unterscheide User vs Company Dashboard Context
  const isUserDashboard = relativePath.includes('/dashboard/user/');
  const isCompanyDashboard = relativePath.includes('/dashboard/company/');

  // Check 1: Hat die Datei users Collection Zugriffe OHNE companies Fallback?
  const hasUsersAccess =
    content.includes("doc(db, 'users'") || content.includes('collection(db, "users"');
  const hasCompaniesAccess =
    content.includes("doc(db, 'companies'") || content.includes('collection(db, "companies"');
  const hasFirmaAccess =
    content.includes("doc(db, 'firma'") || content.includes('collection(db, "firma"');

  // REGEL: User Dashboard darf nur users Collection verwenden
  if (isUserDashboard && hasUsersAccess && !hasCompaniesAccess) {
    // Das ist KORREKT für User Dashboard - kein Problem
    return null;
  }

  // REGEL: Company Dashboard sollte companies/firma + users Fallback haben
  if (isCompanyDashboard && hasUsersAccess && !hasCompaniesAccess && !hasFirmaAccess) {
    // Check: Hat es wenigstens ein Fallback Pattern?
    const hasFallbackPattern =
      content.includes('Falls nicht in') ||
      content.includes('Fallback') ||
      (content.includes('else {') && content.includes('users'));

    if (!hasFallbackPattern) {
      problems.push({
        type: 'NO_COMPANIES_FALLBACK',
        severity: 'CRITICAL',
        description: 'Company Dashboard verwendet nur users Collection ohne companies Fallback',
        line: findUsersCollectionLines(content),
      });
    }
  }

  // Check 2: Prüfe spezifische problematische Patterns
  Object.entries(problemPatterns).forEach(([patternName, pattern]) => {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      matches.forEach(match => {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        problems.push({
          type: patternName.toUpperCase(),
          severity: 'WARNING',
          description: `Potentiell problematisches Pattern: ${patternName}`,
          line: lineNumber,
          context: getLineContext(content, match.index),
        });
      });
    }
  });

  if (problems.length > 0) {
    return {
      file: relativePath,
      isCompanyDashboardRelevant: true,
      problems: problems,
      totalProblems: problems.length,
    };
  }

  return null;
}

// Hilfsfunktion: Finde Zeilen mit users Collection
function findUsersCollectionLines(content) {
  const lines = content.split('\n');
  const usersLines = [];

  lines.forEach((line, index) => {
    if (line.includes("doc(db, 'users'") || line.includes('collection(db, "users"')) {
      usersLines.push(index + 1);
    }
  });

  return usersLines;
}

// Hilfsfunktion: Kontext um gefundene Stelle
function getLineContext(content, index) {
  const lines = content.split('\n');
  const lineNumber = content.substring(0, index).split('\n').length;
  const contextLines = 2;

  const startLine = Math.max(0, lineNumber - contextLines - 1);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  return lines.slice(startLine, endLine).join('\n');
}

// Hilfsfunktion: Datei rekursiv scannen
function scanDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      results.totalFiles++;

      if (['.ts', '.tsx', '.js', '.jsx'].some(ext => entry.name.endsWith(ext))) {
        scanFile(fullPath);
      }
    }
  }
}

// Hilfsfunktion: Einzelne Datei scannen
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    results.scannedFiles++;

    const problems = analyzeFileForRealProblems(filePath, content);

    if (problems) {
      results.realProblems.push(problems);

      // Kategorisierung
      const hasCritical = problems.problems.some(p => p.severity === 'CRITICAL');
      if (hasCritical) {
        results.summary.critical.push(problems);
      } else {
        results.summary.warnings.push(problems);
      }
    }
  } catch (error) {
    console.error(`Fehler beim Scannen von ${filePath}:`, error.message);
  }
}

// Hauptfunktion
function main() {
  console.log('🔍 INTELLIGENTER SCAN - Nur echte Collection-Probleme\n');
  console.log(`📁 Projektpfad: ${projectRoot}`);
  console.log(`📂 Quellcodepfad: ${srcPath}\n`);

  const startTime = Date.now();

  if (fs.existsSync(srcPath)) {
    scanDirectory(srcPath);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Ergebnisse ausgeben
  console.log('📊 INTELLIGENTE SCAN-ERGEBNISSE');
  console.log('='.repeat(50));
  console.log(`⏱️  Dauer: ${duration.toFixed(2)}s`);
  console.log(`📄 Dateien insgesamt: ${results.totalFiles}`);
  console.log(`🔎 Gescannte Dateien: ${results.scannedFiles}`);
  console.log(`❌ Dateien mit ECHTEN Problemen: ${results.realProblems.length}`);
  console.log(`🚨 Kritische Probleme: ${results.summary.critical.length}`);
  console.log(`⚠️  Warnungen: ${results.summary.warnings.length}\n`);

  // KRITISCHE Probleme (MÜSSEN sofort behoben werden)
  if (results.summary.critical.length > 0) {
    console.log('🚨 KRITISCHE PROBLEME - SOFORT BEHEBEN:');
    console.log('-'.repeat(50));
    results.summary.critical.forEach(file => {
      console.log(`📄 ${file.file}`);
      file.problems.forEach(problem => {
        if (problem.severity === 'CRITICAL') {
          console.log(`   🔥 ${problem.description}`);
          if (Array.isArray(problem.line)) {
            console.log(`   📍 Zeilen: ${problem.line.join(', ')}`);
          } else {
            console.log(`   📍 Zeile: ${problem.line}`);
          }
        }
      });
      console.log('');
    });
  } else {
    console.log('✅ KEINE KRITISCHEN PROBLEME GEFUNDEN!\n');
  }

  // Warnungen
  if (results.summary.warnings.length > 0) {
    console.log('⚠️  WARNUNGEN - Überprüfung empfohlen:');
    console.log('-'.repeat(40));
    results.summary.warnings.forEach(file => {
      console.log(`📄 ${file.file}`);
      file.problems.forEach(problem => {
        console.log(`   ⚠️  ${problem.description} (Zeile ${problem.line})`);
      });
      console.log('');
    });
  }

  // Fazit
  console.log('💡 FAZIT:');
  console.log('='.repeat(15));

  if (results.summary.critical.length === 0) {
    console.log('🎉 ALLE KRITISCHEN COLLECTION-PROBLEME SIND BEHOBEN!');
    console.log('✅ Das B2B Payment System sollte jetzt korrekt funktionieren.');
  } else {
    console.log(
      `❌ Es gibt noch ${results.summary.critical.length} kritische Probleme zu beheben.`
    );
    console.log('🔧 Diese müssen für funktionierendes B2B Payment korrigiert werden.');
  }

  if (results.summary.warnings.length > 0) {
    console.log(
      `⚠️  ${results.summary.warnings.length} Dateien sollten überprüft werden (nicht kritisch).`
    );
  }

  // JSON Export
  const reportPath = path.join(projectRoot, 'intelligent-collection-scan.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detaillierter Report: ${reportPath}`);
}

// Skript ausführen
if (require.main === module) {
  main();
}

module.exports = { main, results };
