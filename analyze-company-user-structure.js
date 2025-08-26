#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 TASKILO COMPANY-USER STRUCTURE ANALYZER');
console.log('==========================================\n');

// Konfiguration
const projectRoot = __dirname;
const srcPath = path.join(projectRoot, 'src');
const firebaseFunctionsPath = path.join(projectRoot, 'firebase_functions', 'src');

// Problem-Patterns die wir suchen
const problemPatterns = {
  // Firebase Auth Trigger Standard-Werte
  authTriggerProblems: [
    /user_type.*\|\|.*['"](firma|kunde)['"]/, // Standard-Werte in Auth Triggern
    /userData\.user_type.*\|\|.*['"](firma|kunde)['"]/, // Fallback-Werte
  ],

  // Company-Erstellung in users Collection
  companyInUsersProblems: [
    /setDoc.*users.*user_type.*firma/, // Company wird in users erstellt
    /collection\(['"]+users['"]+\).*user_type.*firma/, // Company-Query in users
    /where\(['"]+user_type['"]+.*['"]+firma['"]+\)/, // Company-Filter in users
  ],

  // Veraltete Architektur-Patterns
  architectureProblems: [
    /users.*companies.*sync/, // Synchronisation zwischen Collections
    /merge.*users.*companies/, // Merging zwischen Collections
    /users.*collection.*companies.*collection/, // Beide Collections parallel verwendet
  ],

  // User-Type Logik Probleme
  userTypeProblems: [
    /if.*user_type.*===.*['"]+firma['"]+/, // Firma-Checks in users
    /userData\.user_type.*['"]+firma['"]+/, // Direkte Firma-Referenzen
    /user_type.*==.*['"]+firma['"]+/, // Firma-Vergleiche
  ],
};

// Dateien die ausgeschlossen werden sollen
const excludePatterns = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /\.map$/,
  /\.min\.js$/,
  /emulator-exports/,
  /\.tsbuildinfo$/,
];

// Alle relevanten Dateien finden
function findRelevantFiles(dir) {
  const files = [];

  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        // Ausgeschlossene Pfade überspringen
        if (excludePatterns.some(pattern => pattern.test(fullPath))) {
          continue;
        }

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          // Nur relevante Dateitypen
          if (/\.(ts|tsx|js|jsx)$/.test(item)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Kann Verzeichnis nicht lesen: ${currentDir}`);
    }
  }

  scanDirectory(dir);
  return files;
}

// Datei-Inhalt analysieren
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    const problems = [];

    // Alle Problem-Pattern durchgehen
    for (const [category, patterns] of Object.entries(problemPatterns)) {
      for (const pattern of patterns) {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            problems.push({
              category,
              file: relativePath,
              line: index + 1,
              content: line.trim(),
              pattern: pattern.toString(),
            });
          }
        });
      }
    }

    return problems;
  } catch (error) {
    console.warn(`⚠️  Kann Datei nicht lesen: ${filePath}`);
    return [];
  }
}

// Firebase Auth Trigger spezifisch prüfen
function analyzeAuthTriggers() {
  console.log('🔥 FIREBASE AUTH TRIGGER ANALYSE');
  console.log('================================\n');

  const triggerFile = path.join(firebaseFunctionsPath, 'triggers_firestore.ts');

  if (!fs.existsSync(triggerFile)) {
    console.log('❌ Firebase Trigger Datei nicht gefunden!');
    return;
  }

  const content = fs.readFileSync(triggerFile, 'utf8');
  const lines = content.split('\n');

  // Schaue nach dem createUserProfile Trigger
  let inCreateUserProfile = false;
  let triggerProblems = [];

  lines.forEach((line, index) => {
    if (line.includes('createUserProfile') && line.includes('onDocumentCreated')) {
      inCreateUserProfile = true;
    }

    if (inCreateUserProfile && line.includes('user_type:')) {
      if (line.includes("|| 'firma'")) {
        triggerProblems.push({
          line: index + 1,
          content: line.trim(),
          problem: "Standard-Wert 'firma' für user_type - sollte 'kunde' sein",
        });
      } else if (line.includes("|| 'kunde'")) {
        console.log(`✅ Zeile ${index + 1}: Standard-Wert korrekt auf 'kunde' gesetzt`);
      }
    }

    if (inCreateUserProfile && line.includes('});')) {
      inCreateUserProfile = false;
    }
  });

  if (triggerProblems.length > 0) {
    console.log('❌ PROBLEME IN AUTH TRIGGER:');
    triggerProblems.forEach(problem => {
      console.log(`   Zeile ${problem.line}: ${problem.content}`);
      console.log(`   Problem: ${problem.problem}\n`);
    });
  } else {
    console.log('✅ Auth Trigger korrekt konfiguriert\n');
  }
}

// Company-Registrierung analysieren
function analyzeCompanyRegistration() {
  console.log('🏢 COMPANY-REGISTRIERUNG ANALYSE');
  console.log('=================================\n');

  const regFile = path.join(srcPath, 'app', 'register', 'company', 'step5', 'page.tsx');

  if (!fs.existsSync(regFile)) {
    console.log('❌ Company-Registrierung Datei nicht gefunden!');
    return;
  }

  const content = fs.readFileSync(regFile, 'utf8');
  const lines = content.split('\n');

  let problems = [];
  let fixes = [];

  lines.forEach((line, index) => {
    // Prüfe auf doppelte Users-Collection Erstellung
    if (line.includes('setDoc') && line.includes('users') && line.includes('userBasicData')) {
      problems.push({
        line: index + 1,
        content: line.trim(),
        problem: 'Company erstellt Dokument in users Collection',
      });
    }

    // Prüfe auf korrekte updateDoc Verwendung
    if (line.includes('updateDoc') && line.includes('users') && line.includes('user_type')) {
      fixes.push({
        line: index + 1,
        content: line.trim(),
        fix: 'Verwendet updateDoc statt setDoc für users',
      });
    }

    // Prüfe auf companies Collection Erstellung
    if (line.includes('setDoc') && line.includes('companies')) {
      fixes.push({
        line: index + 1,
        content: line.trim(),
        fix: 'Erstellt korrekt companies Collection',
      });
    }
  });

  if (problems.length > 0) {
    console.log('❌ PROBLEME IN COMPANY-REGISTRIERUNG:');
    problems.forEach(problem => {
      console.log(`   Zeile ${problem.line}: ${problem.content}`);
      console.log(`   Problem: ${problem.problem}\n`);
    });
  }

  if (fixes.length > 0) {
    console.log('✅ KORREKTUREN IN COMPANY-REGISTRIERUNG:');
    fixes.forEach(fix => {
      console.log(`   Zeile ${fix.line}: ${fix.fix}\n`);
    });
  }
}

// Service-APIs analysieren
function analyzeServiceAPIs() {
  console.log('🔌 SERVICE APIs ANALYSE');
  console.log('========================\n');

  const files = findRelevantFiles(srcPath);
  const apiProblems = [];

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(projectRoot, file);

    // Suche nach veralteten Company-Queries
    if (content.includes("where('user_type', '==', 'firma')")) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes("where('user_type', '==', 'firma')")) {
          apiProblems.push({
            file: relativePath,
            line: index + 1,
            content: line.trim(),
            problem: 'Sucht Companies in users Collection statt companies Collection',
          });
        }
      });
    }
  });

  if (apiProblems.length > 0) {
    console.log('❌ VERALTETE API-PATTERNS GEFUNDEN:');
    apiProblems.forEach(problem => {
      console.log(`   📁 ${problem.file}:${problem.line}`);
      console.log(`   📝 ${problem.content}`);
      console.log(`   ⚠️  ${problem.problem}\n`);
    });

    console.log('🔧 EMPFOHLENE LÖSUNG:');
    console.log('   - Ändere Queries von users zu companies Collection');
    console.log('   - Verwende companies.where() statt users.where(user_type)');
    console.log('   - Aktualisiere alle Service-APIs entsprechend\n');
  } else {
    console.log('✅ Alle Service-APIs verwenden korrekte Collections\n');
  }
}

// Hauptanalyse durchführen
function runMainAnalysis() {
  console.log('📊 VOLLSTÄNDIGE PROJEKT-ANALYSE');
  console.log('================================\n');

  const allFiles = [...findRelevantFiles(srcPath), ...findRelevantFiles(firebaseFunctionsPath)];

  console.log(`🔍 Analysiere ${allFiles.length} Dateien...\n`);

  const allProblems = [];

  allFiles.forEach(file => {
    const problems = analyzeFile(file);
    allProblems.push(...problems);
  });

  // Gruppiere Probleme nach Kategorie
  const problemsByCategory = {};
  allProblems.forEach(problem => {
    if (!problemsByCategory[problem.category]) {
      problemsByCategory[problem.category] = [];
    }
    problemsByCategory[problem.category].push(problem);
  });

  // Zeige Ergebnisse
  if (Object.keys(problemsByCategory).length === 0) {
    console.log('🎉 KEINE PROBLEME GEFUNDEN!');
    console.log('Alle Company-User-Strukturen sind korrekt implementiert.\n');
  } else {
    console.log('❌ PROBLEME GEFUNDEN:');
    console.log('====================\n');

    for (const [category, problems] of Object.entries(problemsByCategory)) {
      console.log(`📂 ${category.toUpperCase()} (${problems.length} Probleme):`);

      problems.forEach(problem => {
        console.log(`   📁 ${problem.file}:${problem.line}`);
        console.log(`   📝 ${problem.content}`);
        console.log('');
      });
    }
  }

  return allProblems;
}

// Lösungsvorschläge generieren
function generateSolutions(problems) {
  if (problems.length === 0) return;

  console.log('🔧 LÖSUNGSVORSCHLÄGE');
  console.log('=====================\n');

  console.log('1. 🔥 Firebase Auth Trigger reparieren:');
  console.log('   - Ändere Standard user_type von "firma" zu "kunde"');
  console.log('   - Datei: firebase_functions/src/triggers_firestore.ts\n');

  console.log('2. 🏢 Company-Registrierung korrigieren:');
  console.log('   - Verwende updateDoc() statt setDoc() für users');
  console.log('   - Erstelle nur companies Collection für Firmendaten');
  console.log('   - Datei: src/app/register/company/step5/page.tsx\n');

  console.log('3. 🔌 Service-APIs migrieren:');
  console.log('   - Alle Company-Queries von users zu companies Collection');
  console.log('   - Aktualisiere where-Klauseln entsprechend');
  console.log('   - Betrifft: APIs, Services, Components\n');

  console.log('4. 🧪 Nach Implementierung testen:');
  console.log('   - Neue Company-Registrierung durchführen');
  console.log('   - Prüfen dass kein user_type:"firma" in users Collection');
  console.log('   - Alle Company-Services funktional testen\n');
}

// Skript ausführen
console.log('Starting analysis...\n');

analyzeAuthTriggers();
analyzeCompanyRegistration();
analyzeServiceAPIs();

const problems = runMainAnalysis();
generateSolutions(problems);

console.log('🏁 ANALYSE ABGESCHLOSSEN');
console.log('=========================');
console.log(`📊 Insgesamt ${problems.length} Probleme gefunden`);
console.log('🚀 Führe die Lösungsvorschläge durch, um alle Probleme zu beheben.\n');
