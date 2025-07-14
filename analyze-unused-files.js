#!/usr/bin/env node

console.log('🔍 ANALYSE UNGENUTZTER DATEIEN - Taskilo');
console.log('==========================================\n');

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { execSync } from 'child_process';

// Konfiguration
const config = {
  projectRoot: process.cwd(),
  ignoreDirs: [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.vercel',
    'firebase-export-*',
    'dataconnect-generated',
    'coverage',
  ],
  ignoreFiles: [
    '.DS_Store',
    '*.log',
    '*.map',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.env*',
    'tsconfig.tsbuildinfo',
  ],
  entryPoints: [
    'src/app/page.tsx',
    'src/app/layout.tsx',
    'src/app/globals.css',
    'next.config.mjs',
    'tailwind.config.js',
    'middleware.ts',
    'firebase.json',
    'vercel.json',
  ],
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json'],
};

let allFiles = new Set();
let usedFiles = new Set();
let componentUsage = new Map();
let importGraph = new Map();

// Hilfsfunktionen
function shouldIgnoreDir(dirName) {
  return config.ignoreDirs.some(ignore => {
    if (ignore.includes('*')) {
      return dirName.match(new RegExp(ignore.replace('*', '.*')));
    }
    return dirName === ignore || dirName.startsWith(ignore);
  });
}

function shouldIgnoreFile(fileName) {
  return config.ignoreFiles.some(ignore => {
    if (ignore.includes('*')) {
      return fileName.match(new RegExp(ignore.replace('*', '.*')));
    }
    return fileName === ignore;
  });
}

function isValidExtension(filePath) {
  const ext = extname(filePath);
  return config.extensions.includes(ext);
}

// Alle Dateien sammeln
function collectAllFiles(dir = config.projectRoot) {
  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!shouldIgnoreDir(item)) {
          collectAllFiles(fullPath);
        }
      } else if (stat.isFile()) {
        if (!shouldIgnoreFile(item) && isValidExtension(fullPath)) {
          const relativePath = relative(config.projectRoot, fullPath);
          allFiles.add(relativePath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warnung: Kann Verzeichnis nicht lesen: ${dir}`);
  }
}

// Import-Statements extrahieren
function extractImports(filePath, content) {
  const imports = [];

  // ES6 imports
  const importRegex =
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;

  // require statements
  const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

  // CSS imports
  const cssImportRegex = /@import\s+['"`]([^'"`]+)['"`]/g;

  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  while ((match = cssImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

// Relative Pfade auflösen
function resolveImportPath(importPath, fromFile) {
  try {
    if (importPath.startsWith('.')) {
      // Relative imports
      const basePath = dirname(fromFile);
      let resolvedPath = join(basePath, importPath);

      // Verschiedene Erweiterungen versuchen
      for (const ext of config.extensions) {
        const pathWithExt = resolvedPath + ext;
        if (allFiles.has(pathWithExt)) {
          return pathWithExt;
        }

        // Index-Dateien versuchen
        const indexPath = join(resolvedPath, 'index' + ext);
        if (allFiles.has(indexPath)) {
          return indexPath;
        }
      }

      return resolvedPath;
    } else if (!importPath.startsWith('@/') && !importPath.startsWith('~')) {
      // Node modules - ignorieren
      return null;
    } else if (importPath.startsWith('@/')) {
      // Alias für src/
      const resolvedPath = importPath.replace('@/', 'src/');

      for (const ext of config.extensions) {
        const pathWithExt = resolvedPath + ext;
        if (allFiles.has(pathWithExt)) {
          return pathWithExt;
        }

        const indexPath = join(resolvedPath, 'index' + ext);
        if (allFiles.has(indexPath)) {
          return indexPath;
        }
      }

      return resolvedPath;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Komponenten-Verwendung extrahieren
function extractComponentUsage(content) {
  const components = [];

  // JSX Components (PascalCase)
  const jsxRegex = /<(\w+)(?:\s|>|\/)/g;
  let match;

  while ((match = jsxRegex.exec(content)) !== null) {
    const componentName = match[1];
    // Nur PascalCase Komponenten (keine HTML tags)
    if (
      componentName[0] === componentName[0].toUpperCase() &&
      !['HTML', 'SVG', 'Image', 'Link', 'Head', 'Script'].includes(componentName)
    ) {
      components.push(componentName);
    }
  }

  return components;
}

// Datei analysieren
function analyzeFile(filePath) {
  try {
    const fullPath = join(config.projectRoot, filePath);
    const content = readFileSync(fullPath, 'utf-8');

    // Imports extrahieren
    const imports = extractImports(filePath, content);
    importGraph.set(filePath, imports);

    // Für jedes Import den Pfad auflösen
    for (const importPath of imports) {
      const resolvedPath = resolveImportPath(importPath, filePath);
      if (resolvedPath && allFiles.has(resolvedPath)) {
        usedFiles.add(resolvedPath);
      }
    }

    // Komponenten-Verwendung analysieren
    const components = extractComponentUsage(content);
    for (const component of components) {
      if (!componentUsage.has(component)) {
        componentUsage.set(component, []);
      }
      componentUsage.get(component).push(filePath);
    }
  } catch (error) {
    console.warn(`Warnung: Kann Datei nicht analysieren: ${filePath}`);
  }
}

// Entry Points als verwendet markieren
function markEntryPointsAsUsed() {
  for (const entryPoint of config.entryPoints) {
    if (allFiles.has(entryPoint)) {
      usedFiles.add(entryPoint);
    }
  }

  // Next.js spezifische Dateien
  for (const file of allFiles) {
    if (
      file.includes('/app/') &&
      (file.endsWith('/page.tsx') ||
        file.endsWith('/layout.tsx') ||
        file.endsWith('/loading.tsx') ||
        file.endsWith('/error.tsx') ||
        file.endsWith('/not-found.tsx') ||
        file.endsWith('/route.ts'))
    ) {
      usedFiles.add(file);
    }
  }
}

// Dependency chain verfolgen
function traverseDependencies(filePath, visited = new Set()) {
  if (visited.has(filePath) || !allFiles.has(filePath)) {
    return;
  }

  visited.add(filePath);
  usedFiles.add(filePath);

  analyzeFile(filePath);

  const imports = importGraph.get(filePath) || [];
  for (const importPath of imports) {
    const resolvedPath = resolveImportPath(importPath, filePath);
    if (resolvedPath && allFiles.has(resolvedPath)) {
      traverseDependencies(resolvedPath, visited);
    }
  }
}

// Hauptanalyse
function analyzeProject() {
  console.log('📂 Sammle alle Dateien...');
  collectAllFiles();
  console.log(`   Gefunden: ${allFiles.size} Dateien\n`);

  console.log('🎯 Markiere Entry Points...');
  markEntryPointsAsUsed();

  console.log('🔗 Verfolge Dependencies...');
  for (const entryPoint of config.entryPoints) {
    if (allFiles.has(entryPoint)) {
      traverseDependencies(entryPoint);
    }
  }

  // Zusätzlich alle Next.js App Router Dateien verfolgen
  for (const file of allFiles) {
    if (usedFiles.has(file)) {
      traverseDependencies(file);
    }
  }

  console.log(`   Verwendete Dateien: ${usedFiles.size}\n`);
}

// Ergebnisse anzeigen
function showResults() {
  const unusedFiles = Array.from(allFiles).filter(file => !usedFiles.has(file));

  console.log('📊 ERGEBNISSE:');
  console.log('=============\n');

  console.log(`📁 Gesamte Dateien: ${allFiles.size}`);
  console.log(`✅ Verwendete Dateien: ${usedFiles.size}`);
  console.log(`❌ Ungenutzte Dateien: ${unusedFiles.length}\n`);

  if (unusedFiles.length > 0) {
    console.log('🗑️  UNGENUTZTE DATEIEN:');
    console.log('---------------------');

    // Nach Kategorien gruppieren
    const categories = {
      components: [],
      scripts: [],
      styles: [],
      configs: [],
      others: [],
    };

    for (const file of unusedFiles) {
      if (file.includes('/components/') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
        categories.components.push(file);
      } else if (file.endsWith('.js') || file.endsWith('.ts')) {
        categories.scripts.push(file);
      } else if (file.endsWith('.css') || file.endsWith('.scss')) {
        categories.styles.push(file);
      } else if (file.endsWith('.json') || file.includes('config')) {
        categories.configs.push(file);
      } else {
        categories.others.push(file);
      }
    }

    if (categories.components.length > 0) {
      console.log('\n🧩 Komponenten:');
      categories.components.forEach(file => console.log(`   - ${file}`));
    }

    if (categories.scripts.length > 0) {
      console.log('\n📜 Skripte:');
      categories.scripts.forEach(file => console.log(`   - ${file}`));
    }

    if (categories.styles.length > 0) {
      console.log('\n🎨 Styles:');
      categories.styles.forEach(file => console.log(`   - ${file}`));
    }

    if (categories.configs.length > 0) {
      console.log('\n⚙️  Konfiguration:');
      categories.configs.forEach(file => console.log(`   - ${file}`));
    }

    if (categories.others.length > 0) {
      console.log('\n📄 Andere:');
      categories.others.forEach(file => console.log(`   - ${file}`));
    }

    // Löschvorschlag
    console.log('\n💡 LÖSCHVORSCHLAG:');
    console.log('=================');
    console.log('Um diese Dateien zu löschen, führen Sie aus:');
    console.log('\n# Sicherung erstellen (empfohlen)');
    console.log('git add . && git commit -m "Backup before cleanup"');
    console.log('\n# Dateien löschen');

    const safeToDelete = unusedFiles.filter(
      file =>
        !file.includes('package.json') &&
        !file.includes('README') &&
        !file.includes('LICENSE') &&
        !file.includes('.env') &&
        !file.includes('vercel.json') &&
        !file.includes('firebase.json')
    );

    if (safeToDelete.length > 0) {
      safeToDelete.forEach(file => {
        console.log(`rm "${file}"`);
      });
    }
  } else {
    console.log('🎉 Alle Dateien werden verwendet! Projekt ist sauber.');
  }

  // Warnung für vorsichtige Löschung
  console.log('\n⚠️  WARNUNG:');
  console.log('============');
  console.log('- Erstellen Sie vor dem Löschen ein Git-Backup');
  console.log('- Prüfen Sie dynamische Imports (import() statements)');
  console.log('- Prüfen Sie String-basierte Imports');
  console.log('- Testen Sie das Projekt nach dem Löschen gründlich');
  console.log('- Manche Dateien könnten von Build-Tools verwendet werden');
}

// Zusätzliche Analyse für potentielle Probleme
function checkPotentialIssues() {
  console.log('\n🔍 ZUSÄTZLICHE ANALYSE:');
  console.log('======================\n');

  // Große Dateien finden
  const largeFiles = [];
  for (const file of allFiles) {
    try {
      const fullPath = join(config.projectRoot, file);
      const stats = statSync(fullPath);
      if (stats.size > 100000) {
        // > 100KB
        largeFiles.push({ file, size: Math.round(stats.size / 1024) });
      }
    } catch (error) {
      // Ignorieren
    }
  }

  if (largeFiles.length > 0) {
    console.log('📦 Große Dateien (>100KB):');
    largeFiles
      .sort((a, b) => b.size - a.size)
      .forEach(({ file, size }) => console.log(`   - ${file} (${size}KB)`));
    console.log();
  }

  // Doppelte Komponenten-Namen
  const componentNames = new Map();
  for (const file of allFiles) {
    if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      const fileName = file
        .split('/')
        .pop()
        .replace(/\.(tsx|jsx)$/, '');
      if (!componentNames.has(fileName)) {
        componentNames.set(fileName, []);
      }
      componentNames.get(fileName).push(file);
    }
  }

  const duplicateNames = Array.from(componentNames.entries()).filter(
    ([name, files]) => files.length > 1
  );

  if (duplicateNames.length > 0) {
    console.log('🔄 Komponenten mit gleichen Namen:');
    duplicateNames.forEach(([name, files]) => {
      console.log(`   - ${name}:`);
      files.forEach(file => console.log(`     ${file}`));
    });
    console.log();
  }
}

// Hauptausführung
async function main() {
  try {
    analyzeProject();
    showResults();
    checkPotentialIssues();

    console.log('\n✅ Analyse abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error.message);
    process.exit(1);
  }
}

main();
