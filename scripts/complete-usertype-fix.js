#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 COMPLETE TASKILO userType → user_type FIXER\n');

// Alle Dateien im src Verzeichnis durchsuchen
function getAllFiles(dir, extension = '.tsx') {
  let results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      results = results.concat(getAllFiles(fullPath, extension));
    } else if (
      file.isFile() &&
      (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js'))
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// Spezifische Probleme finden und reparieren
const fixes = [
  {
    description: 'Admin Tickets: userType → user_type',
    pattern: /userType\s*:\s*['"]admin['"]/g,
    replacement: 'user_type: "admin"',
    files: ['src/app/api/admin/tickets/reply/route.ts'],
  },
  {
    description: 'Admin Tickets: authResult.userType → authResult.user_type',
    pattern: /authResult\.userType/g,
    replacement: 'authResult.user_type',
    files: ['src/app/api/admin/tickets/reply/route.ts'],
  },
  {
    description: 'Admin Tickets: decoded.role → decoded.user_type',
    pattern: /userType\s*:\s*decoded\.role/g,
    replacement: 'user_type: decoded.user_type',
    files: ['src/app/api/admin/tickets/reply/route.ts'],
  },
  {
    description: 'Ticket Detail View: userType Parameter → user_type (für Daten)',
    pattern: /authResult\.userType\s*===\s*['"]admin['"]/g,
    replacement: 'authResult.user_type === "admin"',
    files: ['src/app/api/admin/tickets/reply/route.ts'],
  },
  {
    description: 'Dashboard Settings: Debug userType → user_type',
    pattern: /userType\s*:\s*userData\?\.\user_type/g,
    replacement: 'user_type: userData?.user_type',
    files: ['src/app/dashboard/company/[uid]/settings/page.tsx'],
  },
  {
    description: 'Support Page: userType="customer" → user_type="kunde" (für Daten)',
    pattern: /userType\s*=\s*["']customer["']/g,
    replacement: 'user_type="kunde"',
    files: ['src/app/dashboard/company/[uid]/support/page.tsx'],
  },
  {
    description: 'Quote Payment Modal: userType="company" → user_type="firma" (für Daten)',
    pattern: /userType\s*=\s*['"]company['"]/g,
    replacement: 'user_type="firma"',
    files: ['src/components/quotes/QuotePaymentModal.tsx'],
  },
  {
    description: 'Quote Payment Modal: apiPath userType → user_type',
    pattern: /userType\s*===\s*['"]user['"]/g,
    replacement: 'user_type === "kunde"',
    files: ['src/components/quotes/QuotePaymentModal.tsx'],
  },
  {
    description: 'TimeTracker: userType → user_type für Daten',
    pattern: /userType\s*:\s*usersData\?\.\user_type/g,
    replacement: 'user_type: usersData?.user_type',
    files: ['src/lib/timeTracker.ts'],
  },
];

let totalChanges = 0;

console.log('=== SYSTEMATISCHE KORREKTUREN ===\n');

// Wende alle Fixes an
for (const fix of fixes) {
  console.log(`🔧 ${fix.description}`);

  const filesToCheck = fix.files ? fix.files : getAllFiles('src');
  let fileChanges = 0;

  for (const relativeFile of filesToCheck) {
    const filePath = path.join(process.cwd(), relativeFile);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Datei nicht gefunden: ${relativeFile}`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const newContent = content.replace(fix.pattern, fix.replacement);

      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        const matches = (content.match(fix.pattern) || []).length;
        console.log(`   ✅ ${relativeFile}: ${matches} Änderungen`);
        fileChanges += matches;
        totalChanges += matches;
      }
    } catch (error) {
      console.log(`   ❌ Fehler in ${relativeFile}: ${error.message}`);
    }
  }

  if (fileChanges === 0) {
    console.log(`   ✅ Bereits korrekt oder nicht gefunden`);
  }
  console.log('');
}

console.log('=== VOLLSTÄNDIGE DATEI-SUCHE ===\n');

// Suche nach allen verbleibenden userType Problemen
const allFiles = getAllFiles('src');
let remainingIssues = [];

for (const filePath of allFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Suche nach Datenfeld-Zuweisungen (nicht Interface-Definitionen)
      if (
        line.match(/userType\s*:\s*["'](?:company|customer|admin)["']/g) &&
        !line.includes('interface') &&
        !line.includes('type ') &&
        !line.includes('currentUserType') &&
        !line.includes('//') &&
        !line.includes('trackUserRegistration') &&
        !line.includes("| 'company'") &&
        !line.includes('| "company"')
      ) {
        remainingIssues.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: index + 1,
          content: line.trim(),
          type: 'DATENFELD',
        });
      }

      // Suche nach Objekt-Zugriff auf userType Datenfelder
      if (line.match(/\.userType\s*==\s*["'](?:company|customer|admin)["']/g)) {
        remainingIssues.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: index + 1,
          content: line.trim(),
          type: 'OBJEKT_ZUGRIFF',
        });
      }

      // Suche nach authResult.userType
      if (line.match(/authResult\.userType/g)) {
        remainingIssues.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: index + 1,
          content: line.trim(),
          type: 'AUTH_RESULT',
        });
      }
    });
  } catch (error) {
    // Datei nicht lesbar, überspringe
  }
}

if (remainingIssues.length > 0) {
  console.log('🔍 VERBLEIBENDE PROBLEME GEFUNDEN:\n');

  remainingIssues.forEach(issue => {
    console.log(`📁 ${issue.file}:${issue.line}`);
    console.log(`   ${issue.type}: ${issue.content}`);
    console.log('');
  });

  console.log('❌ Diese müssen MANUELL korrigiert werden!\n');
} else {
  console.log('✅ Keine weiteren userType Probleme in Datenfeldern gefunden!\n');
}

console.log('=== ZUSAMMENFASSUNG ===\n');
console.log(`🎉 ${totalChanges} automatische Korrekturen angewendet!`);
console.log(`🔍 ${remainingIssues.length} verbleibende Probleme gefunden\n`);

if (remainingIssues.length === 0) {
  console.log('📋 NÄCHSTE SCHRITTE:');
  console.log('1. pnpm build - Projekt kompilieren');
  console.log('2. git add . && git commit - Änderungen committen');
  console.log('3. Testen auf https://taskilo.de');
  console.log('4. Chat-Berechtigung prüfen\n');

  console.log('✅ COMPLETE FIXER ERFOLGREICH BEENDET');
} else {
  console.log('⚠️  MANUELLE KORREKTUREN ERFORDERLICH');
  console.log('   Bitte die oben gelisteten Probleme manuell beheben');
}
