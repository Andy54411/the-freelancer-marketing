#!/usr/bin/env node

/**
 * DATEV API Error Debug Script
 * Sucht nach dem Ursprung des POST Requests zu /api/datev/organization
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const RESET = '\x1b[0m';

console.log(`${CYAN}🔍 DATEV API Error Debug Script${RESET}`);
console.log(`${YELLOW}Suche nach POST Requests zu /api/datev/organization...${RESET}\n`);

// Basis-Verzeichnisse zum Durchsuchen
const searchDirs = [
  'src/components',
  'src/app',
  'src/lib',
  'src/services',
  'src/hooks',
  'src/contexts',
  'firebase_functions/src',
];

const projectRoot = process.cwd();
const results = [];

// Dateierweiterungen die durchsucht werden sollen
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

// Suchmuster für verschiedene POST Request Varianten
const searchPatterns = [
  // Direkte API Calls
  { pattern: /\/api\/datev\/organization(?!')/g, description: 'Direkte API Route (singular)' },
  { pattern: /POST.*api\/datev\/organization/gi, description: 'POST Request zu organization' },
  {
    pattern: /method:\s*['"](POST|post)['"](.*\n)*.*datev.*organization/gi,
    description: 'POST method mit DATEV organization',
  },

  // Fetch Calls
  {
    pattern: /fetch\s*\(\s*[^)]*datev\/organization/gi,
    description: 'Fetch zu datev/organization',
  },
  {
    pattern: /fetch\s*\(\s*['"\/`][^'"]*api\/datev\/organization/gi,
    description: 'Fetch API Call',
  },

  // URL Konstruktion
  { pattern: /new\s+URL\s*\([^)]*datev\/organization/gi, description: 'URL Constructor' },
  {
    pattern: /\$\{[^}]*\}.*datev\/organization/gi,
    description: 'Template String mit organization',
  },

  // Axios/andere HTTP Clients
  { pattern: /axios\.post.*datev.*organization/gi, description: 'Axios POST' },
  { pattern: /\.post\s*\([^)]*datev.*organization/gi, description: 'HTTP Client POST' },

  // Konfiguration/Routen
  { pattern: /['"\/`][^'"]*api\/datev\/organization['"\/`]/g, description: 'String mit API Route' },
  { pattern: /organization(?!s)/g, description: "Singular 'organization' (könnte falsch sein)" },
];

function searchInFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    searchPatterns.forEach(({ pattern, description }) => {
      let match;
      const globalPattern = new RegExp(pattern.source, pattern.flags);

      while ((match = globalPattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1];

        // Skip false positives
        if (
          line.includes('organizations') || // Skip plural forms
          line.includes('//') || // Skip comments
          line.includes('*') || // Skip comments
          line.includes('console.log') || // Skip debug logs
          relativePath.includes('/debug-') // Skip debug files
        ) {
          continue;
        }

        results.push({
          file: relativePath,
          line: lineNumber,
          content: line.trim(),
          match: match[0],
          description,
          severity: getSeverity(description, line),
        });
      }
    });
  } catch (error) {
    console.error(`${RED}Fehler beim Lesen der Datei ${relativePath}: ${error.message}${RESET}`);
  }
}

function getSeverity(description, line) {
  if (description.includes('POST') && line.includes('organization')) return 'HIGH';
  if (description.includes('Fetch') && line.includes('organization')) return 'HIGH';
  if (description.includes('API Route')) return 'MEDIUM';
  return 'LOW';
}

function searchDirectory(dir) {
  const fullPath = path.join(projectRoot, dir);

  if (!fs.existsSync(fullPath)) {
    console.log(`${YELLOW}⚠️ Verzeichnis ${dir} nicht gefunden${RESET}`);
    return;
  }

  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (
          !item.startsWith('.') &&
          item !== 'node_modules' &&
          item !== 'dist' &&
          item !== 'build'
        ) {
          walkDir(itemPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          const relativePath = path.relative(projectRoot, itemPath);
          searchInFile(itemPath, relativePath);
        }
      }
    });
  }

  walkDir(fullPath);
}

// Hauptsuche
console.log(`${BLUE}📂 Durchsuche Verzeichnisse:${RESET}`);
searchDirs.forEach(dir => {
  console.log(`   - ${dir}`);
  searchDirectory(dir);
});

console.log(`\n${CYAN}🔍 Zusätzliche Prüfungen:${RESET}`);

// Prüfe spezifische Dateien
const specificFiles = ['next.config.mjs', 'middleware.ts', 'package.json'];

specificFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`   - ${file}`);
    searchInFile(filePath, file);
  }
});

// Prüfe auf Build-Artifacts
const buildDirs = ['dist', 'build', '.next'];
buildDirs.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (fs.existsSync(fullPath)) {
    console.log(
      `${YELLOW}⚠️ Build-Verzeichnis ${dir} gefunden - könnte gecachte Routen enthalten${RESET}`
    );
  }
});

// Ergebnisse ausgeben
console.log(`\n${CYAN}📊 ERGEBNISSE:${RESET}`);
console.log(`${WHITE}Gefundene Treffer: ${results.length}${RESET}\n`);

if (results.length === 0) {
  console.log(`${GREEN}✅ Keine verdächtigen DATEV organization API Aufrufe gefunden!${RESET}`);
  console.log(`${YELLOW}💡 Der 404-Fehler könnte durch Browser-Cache verursacht werden.${RESET}`);
  console.log(`${BLUE}🔧 Lösungen:${RESET}`);
  console.log(`   1. Browser-Cache leeren (Ctrl+Shift+R)`);
  console.log(`   2. Inkognito-Modus verwenden`);
  console.log(`   3. Next.js Cache leeren: rm -rf .next`);
  console.log(`   4. Development Server neu starten`);
} else {
  // Gruppiere Ergebnisse nach Schweregrad
  const highSeverity = results.filter(r => r.severity === 'HIGH');
  const mediumSeverity = results.filter(r => r.severity === 'MEDIUM');
  const lowSeverity = results.filter(r => r.severity === 'LOW');

  if (highSeverity.length > 0) {
    console.log(`${RED}🚨 KRITISCHE PROBLEME (${highSeverity.length}):${RESET}`);
    highSeverity.forEach(result => {
      console.log(`   ${RED}❌ ${result.file}:${result.line}${RESET}`);
      console.log(`      ${result.description}`);
      console.log(`      ${YELLOW}Code: ${result.content}${RESET}`);
      console.log(`      ${MAGENTA}Match: "${result.match}"${RESET}\n`);
    });
  }

  if (mediumSeverity.length > 0) {
    console.log(`${YELLOW}⚠️ VERDÄCHTIGE STELLEN (${mediumSeverity.length}):${RESET}`);
    mediumSeverity.forEach(result => {
      console.log(`   ${YELLOW}⚠️ ${result.file}:${result.line}${RESET}`);
      console.log(`      ${result.description}`);
      console.log(`      Code: ${result.content}`);
      console.log(`      Match: "${result.match}"\n`);
    });
  }

  if (lowSeverity.length > 0) {
    console.log(`${BLUE}ℹ️ INFORMATIONEN (${lowSeverity.length}):${RESET}`);
    lowSeverity.slice(0, 10).forEach(result => {
      // Limit to 10 for readability
      console.log(`   ${BLUE}ℹ️ ${result.file}:${result.line}${RESET} - ${result.match}`);
    });
    if (lowSeverity.length > 10) {
      console.log(`   ${BLUE}... und ${lowSeverity.length - 10} weitere${RESET}`);
    }
  }
}

console.log(`\n${CYAN}🔧 EMPFOHLENE AKTIONEN:${RESET}`);
console.log(`${WHITE}1. Alle kritischen Probleme beheben${RESET}`);
console.log(`${WHITE}2. Next.js Cache leeren: ${YELLOW}rm -rf .next${RESET}`);
console.log(`${WHITE}3. Development Server neu starten${RESET}`);
console.log(`${WHITE}4. Browser-Cache leeren oder Inkognito-Modus verwenden${RESET}`);
console.log(`${WHITE}5. Network-Tab in DevTools überwachen${RESET}`);

console.log(`\n${GREEN}✅ Debug-Skript abgeschlossen!${RESET}`);
