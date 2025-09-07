#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Suche nach userType/user_type Inkonsistenzen...\n');

// Farbcodes für bessere Lesbarkeit
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const issues = [];

// 1. PROBLEMATISCHE PATTERNS FINDEN
console.log(`${colors.bold}${colors.blue}=== PROBLEMATISCHE PATTERNS ===\n${colors.reset}`);

const problematicPatterns = [
  {
    name: 'userType: "customer"',
    pattern: 'userType.*["\']customer["\']',
    shouldBe:
      'user_type: "kunde" (für Datenfelder) oder currentUserType: "customer" (für Quote-Chats)',
  },
  {
    name: 'userType: "company"',
    pattern: 'userType.*["\']company["\']',
    shouldBe: 'user_type: "firma"',
  },
  {
    name: "userType: 'customer'",
    pattern: 'userType.*["\']customer["\']',
    shouldBe: 'user_type: "kunde" (für Datenfelder)',
  },
  {
    name: "userType: 'company'",
    pattern: 'userType.*["\']company["\']',
    shouldBe: 'user_type: "firma"',
  },
  {
    name: 'userType == "company"',
    pattern: 'userType.*==.*["\']company["\']',
    shouldBe: 'user_type == "firma"',
  },
  {
    name: 'userType == "customer"',
    pattern: 'userType.*==.*["\']customer["\']',
    shouldBe: 'user_type == "kunde"',
  },
];

// 2. SUCHE IN DATEIEN
const searchPatterns = patterns => {
  patterns.forEach(({ name, pattern, shouldBe }) => {
    try {
      console.log(`${colors.yellow}Suche nach: ${name}${colors.reset}`);

      const result = execSync(
        `grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.rules" -n "${pattern}" src/ firebase_functions/ firestore.rules 2>/dev/null || true`,
        {
          encoding: 'utf8',
        }
      ).trim();

      if (result) {
        console.log(`${colors.red}❌ GEFUNDEN:${colors.reset}`);
        const matches = result.split('\n');
        matches.forEach(match => {
          if (match.trim()) {
            const [file, line, content] = match.split(':');
            console.log(`   📁 ${colors.cyan}${file}:${line}${colors.reset}`);
            console.log(`   📄 ${content.trim()}`);
            issues.push({
              type: 'problematic_pattern',
              file,
              line,
              pattern: name,
              content: content.trim(),
              shouldBe,
            });
          }
        });
        console.log(`   ${colors.magenta}💡 Sollte sein: ${shouldBe}${colors.reset}\n`);
      } else {
        console.log(`${colors.green}✅ Nicht gefunden${colors.reset}\n`);
      }
    } catch (error) {
      console.log(`${colors.red}❌ Fehler bei Suche: ${error.message}${colors.reset}\n`);
    }
  });
};

// 3. FIRESTORE REGELN PRÜFEN
console.log(`${colors.bold}${colors.blue}=== FIRESTORE RULES PRÜFUNG ===\n${colors.reset}`);

try {
  const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');

  // Prüfe auf veraltete userType Referenzen
  if (firestoreRules.includes('.userType')) {
    console.log(`${colors.red}❌ FIRESTORE RULES: .userType gefunden${colors.reset}`);
    issues.push({
      type: 'firestore_rules',
      issue: 'userType field used instead of user_type',
    });
  } else {
    console.log(`${colors.green}✅ FIRESTORE RULES: Keine .userType Referenzen${colors.reset}`);
  }

  // Prüfe auf 'company' statt 'firma'
  if (firestoreRules.includes("== 'company'")) {
    console.log(`${colors.red}❌ FIRESTORE RULES: 'company' Wert gefunden${colors.reset}`);
    issues.push({
      type: 'firestore_rules',
      issue: 'company value used instead of firma',
    });
  } else {
    console.log(`${colors.green}✅ FIRESTORE RULES: Keine 'company' Werte${colors.reset}`);
  }
} catch (error) {
  console.log(`${colors.red}❌ Kann firestore.rules nicht lesen: ${error.message}${colors.reset}`);
}

console.log('');

// 4. DATENBANK FIELD KONSISTENZ
console.log(`${colors.bold}${colors.blue}=== DATENFELD KONSISTENZ ===\n${colors.reset}`);

const dataFieldPatterns = [
  {
    name: 'Datenfeld userType:',
    pattern: '^[^/]*userType:',
    shouldBe: 'user_type:',
  },
  {
    name: 'Firestore userType Feld',
    pattern: '\\.userType[^A-Za-z]',
    shouldBe: '.user_type',
  },
];

// 5. INTERFACE/TYPE DEFINITIONEN PRÜFEN
console.log(`${colors.bold}${colors.blue}=== INTERFACE DEFINITIONEN ===\n${colors.reset}`);

try {
  const interfaceResult = execSync(
    `grep -r --include="*.ts" --include="*.tsx" -n "userType.*:" src/ firebase_functions/ 2>/dev/null || true`,
    {
      encoding: 'utf8',
    }
  ).trim();

  if (interfaceResult) {
    console.log(
      `${colors.yellow}🔍 Interface/Type Definitionen mit userType gefunden:${colors.reset}`
    );
    const matches = interfaceResult.split('\n');
    matches.forEach(match => {
      if (match.trim()) {
        const [file, line, content] = match.split(':');
        console.log(`   📁 ${colors.cyan}${file}:${line}${colors.reset}`);
        console.log(`   📄 ${content.trim()}`);

        // Prüfe ob es legitim ist (z.B. Quote-Chat interfaces)
        if (
          content.includes("'customer' | 'provider'") ||
          content.includes('"customer" | "provider"')
        ) {
          console.log(`   ${colors.green}✅ LEGITIM: Quote/Chat Interface${colors.reset}`);
        } else if (
          content.includes("'user' | 'company'") ||
          content.includes('"user" | "company"')
        ) {
          console.log(
            `   ${colors.yellow}⚠️  PRÜFEN: Analytics/UI Interface - könnte OK sein${colors.reset}`
          );
        } else {
          console.log(
            `   ${colors.red}❌ PROBLEMATISCH: Sollte user_type verwenden${colors.reset}`
          );
          issues.push({
            type: 'interface_definition',
            file,
            line,
            content: content.trim(),
          });
        }
      }
    });
  } else {
    console.log(
      `${colors.green}✅ Keine problematischen Interface-Definitionen gefunden${colors.reset}`
    );
  }
} catch (error) {
  console.log(`${colors.red}❌ Fehler bei Interface-Suche: ${error.message}${colors.reset}`);
}

console.log('');

// SUCHE PATTERNS AUSFÜHREN
searchPatterns(problematicPatterns);
searchPatterns(dataFieldPatterns);

// 6. SAMMLUNG ALLER USERTYPE VERWENDUNGEN
console.log(`${colors.bold}${colors.blue}=== ALLE USERTYPE VERWENDUNGEN ===\n${colors.reset}`);

try {
  const allUserType = execSync(
    `grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.rules" -n "userType" src/ firebase_functions/ firestore.rules 2>/dev/null | head -50 || true`,
    {
      encoding: 'utf8',
    }
  ).trim();

  if (allUserType) {
    console.log(`${colors.yellow}📋 Erste 50 userType Verwendungen:${colors.reset}`);
    const matches = allUserType.split('\n');
    matches.forEach((match, index) => {
      if (match.trim()) {
        const [file, line, content] = match.split(':');
        console.log(
          `${index + 1}. ${colors.cyan}${file}:${line}${colors.reset} - ${content.trim()}`
        );
      }
    });
  }
} catch (error) {
  console.log(`${colors.red}❌ Fehler bei userType Suche: ${error.message}${colors.reset}`);
}

// 7. ZUSAMMENFASSUNG
console.log(`\n${colors.bold}${colors.blue}=== ZUSAMMENFASSUNG ===\n${colors.reset}`);

if (issues.length === 0) {
  console.log(
    `${colors.green}🎉 PERFEKT! Keine userType/user_type Inkonsistenzen gefunden!${colors.reset}`
  );
} else {
  console.log(`${colors.red}❌ ${issues.length} Problem(e) gefunden:${colors.reset}\n`);

  issues.forEach((issue, index) => {
    console.log(
      `${colors.red}${index + 1}.${colors.reset} ${colors.bold}${issue.type}${colors.reset}`
    );
    if (issue.file) {
      console.log(`   📁 ${issue.file}:${issue.line}`);
      console.log(`   📄 ${issue.content}`);
    }
    if (issue.shouldBe) {
      console.log(`   ${colors.magenta}💡 Sollte sein: ${issue.shouldBe}${colors.reset}`);
    }
    console.log('');
  });

  // EMPFEHLUNGEN
  console.log(`${colors.bold}${colors.yellow}🔧 EMPFOHLENE KORREKTUREN:${colors.reset}`);
  console.log(`${colors.yellow}1.${colors.reset} Datenfelder: userType → user_type`);
  console.log(`${colors.yellow}2.${colors.reset} Werte: "company" → "firma", "customer" → "kunde"`);
  console.log(
    `${colors.yellow}3.${colors.reset} Quote/Chat Interfaces können "customer"/"provider" behalten`
  );
  console.log(`${colors.yellow}4.${colors.reset} Analytics können "user"/"company" behalten`);
}

console.log(`\n${colors.bold}${colors.green}✅ SCRIPT BEENDET${colors.reset}`);
