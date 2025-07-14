#!/usr/bin/env node

console.log('🧩 KOMPONENTEN-VERWENDUNGSANALYSE - Taskilo');
console.log('=============================================\n');

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';

const config = {
  projectRoot: process.cwd(),
  sourceDir: 'src',
  extensions: ['.tsx', '.jsx', '.ts', '.js'],
  ignoreDirs: ['node_modules', '.git', '.next', 'dist', 'build'],
};

let componentFiles = new Map(); // fileName -> filePath
let componentUsage = new Map(); // componentName -> [usedInFiles]
let importUsage = new Map(); // filePath -> [importedFiles]
let exportedComponents = new Map(); // filePath -> [exportedNames]

// Dateien sammeln
function collectComponentFiles(dir = join(config.projectRoot, config.sourceDir)) {
  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!config.ignoreDirs.includes(item)) {
          collectComponentFiles(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = extname(fullPath);
        if (config.extensions.includes(ext)) {
          const relativePath = relative(config.projectRoot, fullPath);
          const fileName = item.replace(ext, '');
          componentFiles.set(fileName, relativePath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warnung: Kann Verzeichnis nicht lesen: ${dir}`);
  }
}

// Exports aus einer Datei extrahieren
function extractExports(content, filePath) {
  const exports = [];

  // Default exports
  const defaultExportRegex =
    /export\s+default\s+(?:function\s+)?(\w+)|export\s+default\s+(?:class\s+)?(\w+)/g;
  let match;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    const componentName = match[1] || match[2];
    if (componentName) {
      exports.push(componentName);
    }
  }

  // Named exports
  const namedExportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // Export { } syntax
  const exportListRegex = /export\s*{([^}]+)}/g;
  while ((match = exportListRegex.exec(content)) !== null) {
    const exportList = match[1];
    const exportNames = exportList.split(',').map(name => name.trim().split(' as ')[0]);
    exports.push(...exportNames);
  }

  return exports;
}

// Imports aus einer Datei extrahieren
function extractImports(content, filePath) {
  const imports = [];

  // ES6 imports
  const importRegex =
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.') || importPath.startsWith('@/')) {
      imports.push(importPath);
    }
  }

  return imports;
}

// Komponenten-Verwendung in JSX extraktieren
function extractJSXUsage(content) {
  const components = [];

  // JSX-Tags finden
  const jsxRegex = /<(\w+)(?:\s|>|\/)/g;
  let match;

  while ((match = jsxRegex.exec(content)) !== null) {
    const componentName = match[1];
    // Nur PascalCase-Komponenten (keine HTML-Tags)
    if (
      componentName[0] === componentName[0].toUpperCase() &&
      !['HTML', 'SVG', 'Image', 'Link', 'Head', 'Script', 'Meta'].includes(componentName)
    ) {
      components.push(componentName);
    }
  }

  return [...new Set(components)]; // Duplikate entfernen
}

// Datei analysieren
function analyzeFile(filePath) {
  try {
    const fullPath = join(config.projectRoot, filePath);
    const content = readFileSync(fullPath, 'utf-8');

    // Exports sammeln
    const exports = extractExports(content, filePath);
    if (exports.length > 0) {
      exportedComponents.set(filePath, exports);
    }

    // Imports sammeln
    const imports = extractImports(content, filePath);
    if (imports.length > 0) {
      importUsage.set(filePath, imports);
    }

    // JSX-Verwendung sammeln
    const jsxComponents = extractJSXUsage(content);
    for (const componentName of jsxComponents) {
      if (!componentUsage.has(componentName)) {
        componentUsage.set(componentName, []);
      }
      componentUsage.get(componentName).push(filePath);
    }
  } catch (error) {
    console.warn(`Warnung: Kann Datei nicht analysieren: ${filePath}`);
  }
}

// Ungenutzte Komponenten finden
function findUnusedComponents() {
  const allExportedComponents = new Set();
  const usedComponents = new Set();

  // Alle exportierten Komponenten sammeln
  for (const [filePath, exports] of exportedComponents) {
    for (const componentName of exports) {
      allExportedComponents.add(componentName);
    }
  }

  // Alle verwendeten Komponenten sammeln
  for (const [componentName, usedInFiles] of componentUsage) {
    usedComponents.add(componentName);
  }

  // Ungenutzte finden
  const unusedComponents = [];
  for (const componentName of allExportedComponents) {
    if (!usedComponents.has(componentName)) {
      // Finde die Datei, die diese Komponente exportiert
      for (const [filePath, exports] of exportedComponents) {
        if (exports.includes(componentName)) {
          unusedComponents.push({
            name: componentName,
            file: filePath,
          });
        }
      }
    }
  }

  return unusedComponents;
}

// Import-Analyse
function analyzeImports() {
  const unusedImportFiles = [];
  const usedFiles = new Set();

  // Alle importierten Dateien sammeln
  for (const [filePath, imports] of importUsage) {
    for (const importPath of imports) {
      // Relativen Pfad auflösen
      let resolvedPath = importPath;

      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const basePath = dirname(filePath);
        resolvedPath = join(basePath, importPath);
      } else if (importPath.startsWith('@/')) {
        resolvedPath = importPath.replace('@/', 'src/');
      }

      // Erweiterung hinzufügen wenn nötig
      for (const ext of config.extensions) {
        const pathWithExt = resolvedPath + ext;
        if (componentFiles.has(pathWithExt.split('/').pop().replace(ext, ''))) {
          usedFiles.add(pathWithExt);
          break;
        }
      }
    }
  }

  // Ungenutzte Dateien finden
  for (const [fileName, filePath] of componentFiles) {
    if (!usedFiles.has(filePath) && !isEntryPoint(filePath)) {
      unusedImportFiles.push(filePath);
    }
  }

  return unusedImportFiles;
}

// Entry Points identifizieren
function isEntryPoint(filePath) {
  const entryPatterns = [
    '/page.tsx',
    '/layout.tsx',
    '/loading.tsx',
    '/error.tsx',
    '/not-found.tsx',
    '/route.ts',
    'globals.css',
    'middleware.ts',
  ];

  return entryPatterns.some(pattern => filePath.includes(pattern));
}

// Komponentenkomplexität analysieren
function analyzeComplexity() {
  const complexityReport = [];

  for (const [fileName, filePath] of componentFiles) {
    try {
      const fullPath = join(config.projectRoot, filePath);
      const content = readFileSync(fullPath, 'utf-8');

      const lines = content.split('\n').length;
      const imports = (content.match(/import\s+/g) || []).length;
      const exports = (content.match(/export\s+/g) || []).length;
      const hooks = (content.match(/use[A-Z]\w*/g) || []).length;
      const jsxElements = (content.match(/<\w+/g) || []).length;

      complexityReport.push({
        file: filePath,
        lines,
        imports,
        exports,
        hooks,
        jsxElements,
        complexity: lines + imports * 2 + hooks * 3 + jsxElements,
      });
    } catch (error) {
      // Ignorieren
    }
  }

  return complexityReport.sort((a, b) => b.complexity - a.complexity);
}

// Berichte generieren
function generateReports() {
  const unusedComponents = findUnusedComponents();
  const unusedFiles = analyzeImports();
  const complexityReport = analyzeComplexity();

  console.log('📊 KOMPONENTENANALYSE ERGEBNISSE:');
  console.log('================================\n');

  // Ungenutzte Komponenten
  console.log(`🚫 UNGENUTZTE KOMPONENTEN (${unusedComponents.length}):`);
  if (unusedComponents.length > 0) {
    unusedComponents.forEach(comp => {
      console.log(`   - ${comp.name} in ${comp.file}`);
    });
  } else {
    console.log('   ✅ Alle exportierten Komponenten werden verwendet!');
  }

  console.log(`\n📄 MÖGLICHERWEISE UNGENUTZTE DATEIEN (${unusedFiles.length}):`);
  if (unusedFiles.length > 0) {
    unusedFiles.slice(0, 20).forEach(file => {
      // Top 20
      console.log(`   - ${file}`);
    });
    if (unusedFiles.length > 20) {
      console.log(`   ... und ${unusedFiles.length - 20} weitere`);
    }
  } else {
    console.log('   ✅ Alle Dateien scheinen verwendet zu werden!');
  }

  // Komplexeste Komponenten
  console.log('\n🧠 TOP 10 KOMPLEXESTE KOMPONENTEN:');
  complexityReport.slice(0, 10).forEach((comp, index) => {
    console.log(
      `   ${index + 1}. ${comp.file} (${comp.lines} Zeilen, ${comp.hooks} Hooks, Komplexität: ${comp.complexity})`
    );
  });

  // Statistiken
  console.log('\n📈 STATISTIKEN:');
  console.log(`   📂 Analysierte Dateien: ${componentFiles.size}`);
  console.log(
    `   🧩 Exportierte Komponenten: ${Array.from(exportedComponents.values()).flat().length}`
  );
  console.log(`   🔗 Import-Verbindungen: ${importUsage.size}`);
  console.log(
    `   📊 Durchschnittliche Komplexität: ${Math.round(complexityReport.reduce((sum, comp) => sum + comp.complexity, 0) / complexityReport.length)}`
  );

  // Cleanup-Empfehlungen
  console.log('\n💡 CLEANUP-EMPFEHLUNGEN:');
  console.log('========================');

  if (unusedComponents.length > 0) {
    console.log('1. Ungenutzte Komponenten überprüfen und entfernen:');
    unusedComponents.slice(0, 5).forEach(comp => {
      console.log(`   rm "${comp.file}"`);
    });
  }

  if (unusedFiles.length > 0) {
    console.log('\n2. Möglicherweise ungenutzte Dateien überprüfen:');
    unusedFiles.slice(0, 5).forEach(file => {
      console.log(`   # Prüfen: ${file}`);
    });
  }

  console.log('\n3. Komplexe Komponenten überarbeiten:');
  complexityReport.slice(0, 3).forEach(comp => {
    console.log(`   # Vereinfachen: ${comp.file} (${comp.complexity} Komplexität)`);
  });
}

// Hauptausführung
async function main() {
  try {
    console.log('🔍 Sammle Komponentendateien...');
    collectComponentFiles();

    console.log('📝 Analysiere Dateien...');
    for (const [fileName, filePath] of componentFiles) {
      analyzeFile(filePath);
    }

    console.log('📊 Generiere Berichte...\n');
    generateReports();

    console.log('\n✅ Komponentenanalyse abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error.message);
    process.exit(1);
  }
}

main();
