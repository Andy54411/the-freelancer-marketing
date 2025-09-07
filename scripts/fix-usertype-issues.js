#!/usr/bin/env node

/**
 * TASKILO - userType/user_type Fixer Script
 * Behebt automatisch alle Inkonsistenzen zwischen userType und user_type
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 TASKILO userType → user_type Auto-Fixer\n');

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

let totalFixes = 0;

// KATEGORIEN DER PROBLEMATISCHEN DATEIEN
const problematicFiles = [
  // Admin APIs - definitiv userType → user_type
  'src/app/api/admin/tickets/reply/route.ts',
  'src/app/api/admin/companies/[id]/route.ts',
  'src/app/api/admin/provider-scoring/route.ts',

  // Settings & Company-Daten - definitiv user_type
  'src/app/dashboard/company/[uid]/settings/page.tsx',

  // Quotes mit B2C/B2B Logic - könnte userType behalten für API calls
  'src/app/dashboard/user/[uid]/quotes/received/[quoteId]/page.tsx',
  'src/components/quotes/QuotePaymentModal.tsx',

  // getUserOrders API - customer/provider ist hier richtig, aber userType→user_type für Datenfelder
  'src/app/api/getUserOrders.ts',
  'src/app/api/getUserOrdersHTTP/route.ts',

  // Header & Navigation - user_type für Datenfelder
  'src/components/Header.tsx',
  'src/components/UserHeader.tsx',

  // TimeTracker - user_type für Datenfelder
  'src/lib/timeTracker.ts',
];

// AUTOMATISCHE FIXES
const fixes = [
  {
    description: 'Admin Tickets: userType → user_type',
    file: 'src/app/api/admin/tickets/reply/route.ts',
    replacements: [
      {
        from: "userType: 'admin'",
        to: "user_type: 'admin'",
      },
      {
        from: 'userType: decoded.role',
        to: 'user_type: decoded.role',
      },
      {
        from: 'authResult.userType',
        to: 'authResult.user_type',
      },
    ],
  },
  {
    description: 'Company Settings: userType → user_type',
    file: 'src/app/dashboard/company/[uid]/settings/page.tsx',
    replacements: [
      {
        from: 'userType: userData?.user_type',
        to: 'user_type: userData?.user_type',
      },
    ],
  },
  {
    description: 'getUserOrders: userType Parameter → user_type für DB-Felder',
    file: 'src/app/api/getUserOrders.ts',
    note: 'Hier ist userType Parameter OK, aber Datenfelder sollten user_type sein',
  },
  {
    description: 'TimeTracker: userType → user_type für Datenfelder',
    file: 'src/lib/timeTracker.ts',
    replacements: [
      {
        from: 'userType: usersData?.user_type',
        to: 'user_type: usersData?.user_type',
      },
    ],
  },
];

// FUNKTION: DATEI REPARIEREN
const fixFile = (filePath, replacements) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`${colors.yellow}⚠️  Datei nicht gefunden: ${filePath}${colors.reset}`);
      return 0;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixed = 0;

    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from, 'g'), to);
        console.log(`   ${colors.green}✅ ${from} → ${to}${colors.reset}`);
        fileFixed++;
        totalFixes++;
      }
    });

    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(
        `   ${colors.cyan}💾 Datei gespeichert: ${fileFixed} Änderungen${colors.reset}\n`
      );
    }

    return fileFixed;
  } catch (error) {
    console.log(`   ${colors.red}❌ Fehler: ${error.message}${colors.reset}\n`);
    return 0;
  }
};

// HAUPT-FIXING PROZESS
console.log(`${colors.bold}${colors.blue}=== AUTOMATISCHE KORREKTUREN ===\n${colors.reset}`);

fixes.forEach(({ description, file, replacements, note }) => {
  console.log(`${colors.yellow}🔧 ${description}${colors.reset}`);
  console.log(`   📁 ${file}`);

  if (note) {
    console.log(`   ${colors.magenta}📝 ${note}${colors.reset}\n`);
    return;
  }

  if (replacements) {
    const fixed = fixFile(file, replacements);
    if (fixed === 0) {
      console.log(`   ${colors.green}✅ Bereits korrekt oder nicht gefunden${colors.reset}\n`);
    }
  }
});

// SPEZIELLE FIXES FÜR KOMPLEXERE FÄLLE
console.log(`${colors.bold}${colors.blue}=== SPEZIELLE KORREKTUREN ===\n${colors.reset}`);

// UserHeader.tsx - userType Variable ist OK, aber Datenfeld sollte user_type sein
console.log(`${colors.yellow}🔧 UserHeader: Debug-Ausgabe korrigieren${colors.reset}`);
const userHeaderPath = 'src/components/UserHeader.tsx';
if (fs.existsSync(userHeaderPath)) {
  let userHeaderContent = fs.readFileSync(userHeaderPath, 'utf8');

  // userType als lokale Variable ist OK, aber in Debug-Ausgabe verwirrt es
  const debugLineOld =
    'userType: authUser?.user_type, // Verwende AuthContext statt firestoreUserData';
  const debugLineNew =
    'user_type: authUser?.user_type, // Verwende AuthContext statt firestoreUserData';

  if (userHeaderContent.includes(debugLineOld)) {
    userHeaderContent = userHeaderContent.replace(debugLineOld, debugLineNew);
    fs.writeFileSync(userHeaderPath, userHeaderContent, 'utf8');
    console.log(`   ${colors.green}✅ Debug-Ausgabe korrigiert${colors.reset}`);
    totalFixes++;
  } else {
    console.log(`   ${colors.green}✅ Bereits korrekt${colors.reset}`);
  }
}

// Header.tsx - Funktionsparameter korrigieren
console.log(`\n${colors.yellow}🔧 Header: Funktionsparameter korrigieren${colors.reset}`);
const headerPath = 'src/components/Header.tsx';
if (fs.existsSync(headerPath)) {
  let headerContent = fs.readFileSync(headerPath, 'utf8');

  // Funktionsparameter von userType zu user_type
  const funcOld = "(uid: string | undefined, userType: FirestoreUserData['user_type'])";
  const funcNew = "(uid: string | undefined, user_type: FirestoreUserData['user_type'])";

  if (headerContent.includes(funcOld)) {
    headerContent = headerContent.replace(funcOld, funcNew);
    // Auch die Verwendung im Function Body
    headerContent = headerContent.replace('if (!uid || !userType)', 'if (!uid || !user_type)');
    headerContent = headerContent.replace("userType === 'firma'", "user_type === 'firma'");

    fs.writeFileSync(headerPath, headerContent, 'utf8');
    console.log(`   ${colors.green}✅ Funktionsparameter korrigiert${colors.reset}`);
    totalFixes += 3;
  } else {
    console.log(`   ${colors.green}✅ Bereits korrekt${colors.reset}`);
  }
}

// ANALYTICS CONTEXT - BEWUSST NICHT ÄNDERN
console.log(
  `\n${colors.green}ℹ️  Analytics Context: userType ist hier KORREKT (Marketing-Begriffe)${colors.reset}`
);
console.log(`   📁 src/contexts/AnalyticsContext.tsx`);
console.log(`   💡 'user' | 'company' sind Marketing-Begriffe, nicht DB-Felder\n`);

// QUOTE/CHAT COMPONENTS - NUR DATENFELDER ÄNDERN
console.log(`${colors.green}ℹ️  Quote/Chat Components: Nur DB-Felder ändern${colors.reset}`);
console.log(`   💡 currentUserType: 'customer' | 'provider' ist korrekt für Quote-Logic\n`);

// FINAL REPORT
console.log(`${colors.bold}${colors.blue}=== ZUSAMMENFASSUNG ===\n${colors.reset}`);

if (totalFixes > 0) {
  console.log(`${colors.green}🎉 ${totalFixes} Korrekturen angewendet!${colors.reset}\n`);

  console.log(`${colors.bold}${colors.yellow}📋 NÄCHSTE SCHRITTE:${colors.reset}`);
  console.log(`${colors.yellow}1.${colors.reset} pnpm build - Projekt kompilieren`);
  console.log(`${colors.yellow}2.${colors.reset} git add . && git commit - Änderungen committen`);
  console.log(`${colors.yellow}3.${colors.reset} Testen auf https://taskilo.de`);
  console.log(`${colors.yellow}4.${colors.reset} Chat-Berechtigung prüfen\n`);

  console.log(`${colors.bold}${colors.cyan}🔍 VERBLEIBENDE MANUAL CHECKS:${colors.reset}`);
  console.log(`${colors.cyan}•${colors.reset} Quote Payment Modals: userType für API calls OK?`);
  console.log(`${colors.cyan}•${colors.reset} Support Tickets: userType für UI-Logic OK?`);
  console.log(`${colors.cyan}•${colors.reset} getUserOrders: Parameter vs. Datenfelder getrennt?`);
} else {
  console.log(
    `${colors.green}✅ Keine Korrekturen erforderlich - alles bereits korrekt!${colors.reset}`
  );
}

console.log(`\n${colors.bold}${colors.green}✅ AUTO-FIXER BEENDET${colors.reset}`);
