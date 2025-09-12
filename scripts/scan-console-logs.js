#!/usr/bin/env node
/*
  scan-console-logs.js
  Zweck: Sucht im Projekt nach auftretenden console.log/info/debug/trace und gibt Fundstellen strukturiert aus.
  Nutzung:
    - Alle Standardverzeichnisse (ohne node_modules, .next, etc.) durchsuchen:
        node scripts/scan-console-logs.js
    - Nur einen Ordner scannen (z. B. src):
        node scripts/scan-console-logs.js --dir=src
    - Als JSON ausgeben:
        node scripts/scan-console-logs.js --json
    - Warn/Error einbeziehen:
        node scripts/scan-console-logs.js --include-warn --include-error
    - Mit Non-Zero-Exit bei Fundstellen (für CI):
        node scripts/scan-console-logs.js --ci
*/

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (name, def = undefined) => {
  const found = args.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!found) return def;
  const eq = found.indexOf('=');
  return eq === -1 ? true : found.slice(eq + 1);
};

const rootDir = process.cwd();
const startDir = path.resolve(rootDir, getArg('dir', '.'));
const asJson = Boolean(getArg('json', false));
const includeWarn = Boolean(getArg('include-warn', false));
const includeError = Boolean(getArg('include-error', false));
const failOnFind = Boolean(getArg('ci', false));

// Dateiendungen, die wir scannen
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Verzeichnisse, die wir auslassen
const ignoredDirs = new Set([
  'node_modules',
  '.git',
  '.next',
  '.vercel',
  'dist',
  'build',
  'out',
  'coverage',
  'public',
  'dataconnect-generated',
  'emulator-exports',
  'firebase-export-backup',
  '.turbo',
  '.cache',
  'storybook-static',
]);

// Suchmuster
const parts = ['log', 'info', 'debug', 'trace'];
if (includeWarn) parts.push('warn');
if (includeError) parts.push('error');
const rx = new RegExp(`\\bconsole\\.(${parts.join('|')})\\s*\\(`);

/**
 * Prüft ob eine Datei-Endung unterstützt ist
 */
function hasSupportedExt(file) {
  return exts.has(path.extname(file));
}

/**
 * Einfache Heuristik: ignoriert Zeilen, die mit // beginnen.
 * Block-Kommentare werden nicht vollumfänglich geparst, um es simpel zu halten.
 */
function isCommented(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//');
}

/**
 * Läuft rekursiv durch ein Verzeichnis und sammelt Dateien mit passenden Endungen.
 */
function collectFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return acc; // fehlende Rechte etc. ignorieren
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ignoredDirs.has(ent.name)) continue;
      collectFiles(full, acc);
    } else if (ent.isFile()) {
      if (hasSupportedExt(full)) acc.push(full);
    }
  }
  return acc;
}

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!rx.test(line)) continue;
    if (isCommented(line)) continue;
    const col = line.indexOf('console.');
    hits.push({ file, line: i + 1, column: col + 1, text: line.trim() });
  }
  return hits;
}

function main() {
  const files = collectFiles(startDir);
  const results = [];
  for (const f of files) {
    try {
      const hits = scanFile(f);
      if (hits.length) results.push(...hits);
    } catch (e) {
      // still continue
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ count: results.length, results }, null, 2));
  } else {
    if (results.length === 0) {
      console.log('✅ Keine console-Aufrufe gefunden (', parts.join(', '), ') in', startDir);
    } else {
      console.log(`\n🔎 Gefundene console-Aufrufe (${parts.join(', ')}): ${results.length}\n`);
      for (const r of results) {
        // Relativer Pfad für bessere Lesbarkeit
        const rel = path.relative(rootDir, r.file);
        console.log(`${rel}:${r.line}:${r.column}  ${r.text}`);
      }
      console.log(`\nℹ️  Gesamt: ${results.length} Fundstellen in ${startDir}`);
      console.log(
        '    Tipp: Mit --json als JSON exportieren oder mit --dir=src nur Code durchsuchen.'
      );
    }
  }

  if (failOnFind && results.length > 0) process.exit(1);
}

main();
