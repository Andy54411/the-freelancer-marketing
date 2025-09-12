#!/usr/bin/env node
/*
  Entfernt console.log/info/debug/trace (optional warn/error) sicher per AST.
  Standard: durchsucht "src" und schließt API-Routen aus.

  Nutzung:
    node scripts/remove-console-logs.js --dir=src --dry-run
    node scripts/remove-console-logs.js --dir=src --include-api
    node scripts/remove-console-logs.js --dir=src --include-warn --include-error

  Optionen:
    --dir=PATH           Root-Verzeichnis (Default: src)
    --ext=csv            Dateiendungen, Komma-separiert (Default: ts,tsx,js,jsx,mjs,cjs)
    --include-api        API-Routen (…/api/…) mitbearbeiten (Default: false)
    --include-warn       console.warn entfernen (Default: false)
    --include-error      console.error entfernen (Default: false)
    --dry-run            Nur zählen und Dateien anzeigen, nichts schreiben
    --silent             Keine Datei-Liste ausgeben, nur Zusammenfassung
*/

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [k, v] = arg.includes('=') ? arg.split('=') : [arg, true];
    return [k.replace(/^--/, ''), v === undefined ? true : v];
  })
);

const rootDir = path.resolve(process.cwd(), args.dir || 'src');
const includeApi = Boolean(args['include-api'] || false);
const includeWarn = Boolean(args['include-warn'] || false);
const includeError = Boolean(args['include-error'] || false);
const dryRun = Boolean(args['dry-run'] || false);
const silent = Boolean(args['silent'] || false);
const exts = String(args.ext || 'ts,tsx,js,jsx,mjs,cjs')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const IGNORE_FOLDERS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out',
  'dataconnect-generated',
]);

const shouldSkipFolder = p => {
  const parts = p.split(path.sep);
  return parts.some(part => IGNORE_FOLDERS.has(part));
};

const files = [];
const walk = dir => {
  if (shouldSkipFolder(dir)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else {
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (!exts.includes(ext)) continue;
      if (!includeApi && full.includes(`${path.sep}api${path.sep}`)) continue;
      files.push(full);
    }
  }
};

if (!fs.existsSync(rootDir)) {
  console.error(`Pfad nicht gefunden: ${rootDir}`);
  process.exit(1);
}

walk(rootDir);

const isConsoleMember = (node, names) => {
  return (
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: 'console' }) &&
    ((t.isIdentifier(node.property) && names.has(node.property.name)) ||
      (t.isStringLiteral(node.property) && names.has(node.property.value)))
  );
};

const removeTargets = new Set(['log', 'info', 'debug', 'trace']);
if (includeWarn) removeTargets.add('warn');
if (includeError) removeTargets.add('error');

let totalFilesTouched = 0;
let totalStatementsRemoved = 0;
const perFile = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'decorators-legacy',
        'objectRestSpread',
        'topLevelAwait',
      ],
    });
  } catch (e) {
    // Parser-Fehler – überspringen
    continue;
  }

  let removed = 0;

  traverse(ast, {
    // Entferne selbständige Statements: console.*(...);
    ExpressionStatement(path) {
      const expr = path.node.expression;
      if (t.isCallExpression(expr) && isConsoleMember(expr.callee, removeTargets)) {
        path.remove();
        removed++;
      }
    },

    // Ersetze Pfeilfunktionen, deren Body ausschließlich ein console.*-Call ist
    ArrowFunctionExpression(path) {
      const body = path.node.body;
      if (t.isCallExpression(body) && isConsoleMember(body.callee, removeTargets)) {
        path.node.body = t.blockStatement([]); // () => {}
        removed++;
      }
    },

    // Entferne console.* in Sequenzen: (a(), console.log('x'), b())
    SequenceExpression(path) {
      const filtered = path.node.expressions.filter(expr => {
        return !(t.isCallExpression(expr) && isConsoleMember(expr.callee, removeTargets));
      });
      if (filtered.length !== path.node.expressions.length) {
        removed += path.node.expressions.length - filtered.length;
        if (filtered.length === 0) {
          path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)));
        } else if (filtered.length === 1) {
          path.replaceWith(filtered[0]);
        } else {
          path.node.expressions = filtered;
        }
      }
    },

    // Entferne console.* in JSX-Ausdrücken: {console.log(...)} -> {null}
    JSXExpressionContainer(path) {
      const expr = path.node.expression;
      if (t.isCallExpression(expr) && isConsoleMember(expr.callee, removeTargets)) {
        path.node.expression = t.nullLiteral();
        removed++;
      }
    },
  });

  if (removed > 0) {
    totalFilesTouched++;
    totalStatementsRemoved += removed;
    perFile.push({ file, removed });

    if (!dryRun) {
      const out = generate(ast, { retainLines: true }, code).code;
      fs.writeFileSync(file, out, 'utf8');
    }
  }
}

if (!silent) {
  for (const info of perFile) {
    console.log(
      `${info.removed.toString().padStart(3, ' ')}  ${path.relative(process.cwd(), info.file)}`
    );
  }
}

console.log(`\nEntfernte Aufrufe: ${totalStatementsRemoved} in ${totalFilesTouched} Dateien`);
if (dryRun) {
  console.log('(Dry-Run: keine Dateien verändert)');
}
