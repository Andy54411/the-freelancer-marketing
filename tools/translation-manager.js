#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const TRANSLATIONS_DIR = path.join(process.cwd(), 'public', 'translations');

// Erstelle Übersetzungsverzeichnis falls nicht vorhanden
if (!fs.existsSync(TRANSLATIONS_DIR)) {
  fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
  console.log('✅ Übersetzungsverzeichnis erstellt:', TRANSLATIONS_DIR);
}

// Funktionen
const commands = {
  // Zeige alle verfügbaren Übersetzungen
  list: () => {
    console.log('\n📋 Verfügbare Übersetzungsdateien:');
    const files = fs.readdirSync(TRANSLATIONS_DIR).filter(file => file.endsWith('.json'));

    files.forEach(file => {
      const filePath = path.join(TRANSLATIONS_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const count = Object.keys(data).length;
      console.log(`  ${file}: ${count} Übersetzungen`);
    });
  },

  // Zeige Statistiken
  stats: () => {
    const files = fs.readdirSync(TRANSLATIONS_DIR).filter(file => file.endsWith('.json'));
    let totalTranslations = 0;

    console.log('\n📊 Übersetzungsstatistiken:');

    files.forEach(file => {
      const filePath = path.join(TRANSLATIONS_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const count = Object.keys(data).length;
      totalTranslations += count;

      console.log(`  ${file}:`);
      console.log(`    - Einträge: ${count}`);
      console.log(`    - Größe: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    });

    console.log(`\n  Gesamt: ${totalTranslations} Übersetzungen`);
  },

  // Exportiere Übersetzungen in verschiedene Formate
  export: (format = 'json') => {
    const files = fs.readdirSync(TRANSLATIONS_DIR).filter(file => file.endsWith('.json'));

    if (format === 'csv') {
      files.forEach(file => {
        const filePath = path.join(TRANSLATIONS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const csvPath = path.join(TRANSLATIONS_DIR, file.replace('.json', '.csv'));

        let csv = 'Original,Translation\n';
        Object.entries(data).forEach(([key, value]) => {
          csv += `"${key}","${value}"\n`;
        });

        fs.writeFileSync(csvPath, csv);
        console.log(`✅ CSV exportiert: ${csvPath}`);
      });
    } else if (format === 'js') {
      files.forEach(file => {
        const filePath = path.join(TRANSLATIONS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const jsPath = path.join(TRANSLATIONS_DIR, file.replace('.json', '.js'));

        const js = `export const translations = ${JSON.stringify(data, null, 2)};`;

        fs.writeFileSync(jsPath, js);
        console.log(`✅ JS exportiert: ${jsPath}`);
      });
    } else {
      console.log('❌ Unbekanntes Format. Verfügbar: json, csv, js');
    }
  },

  // Bereinige leere oder doppelte Einträge
  clean: () => {
    const files = fs.readdirSync(TRANSLATIONS_DIR).filter(file => file.endsWith('.json'));

    files.forEach(file => {
      const filePath = path.join(TRANSLATIONS_DIR, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const originalCount = Object.keys(data).length;

      const cleaned = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key && value && key.trim() !== '' && value.trim() !== '' && key !== value) {
          cleaned[key.trim()] = value.trim();
        }
      });

      const cleanedCount = Object.keys(cleaned).length;
      const removed = originalCount - cleanedCount;

      if (removed > 0) {
        fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
        console.log(`✅ ${file}: ${removed} Einträge entfernt, ${cleanedCount} verbleibend`);
      } else {
        console.log(`✅ ${file}: Bereits sauber`);
      }
    });
  },

  // Zeige Hilfe
  help: () => {
    console.log(`
🌐 Tasko Übersetzungsmanager

Befehle:
  list     - Zeige alle verfügbaren Übersetzungsdateien
  stats    - Zeige detaillierte Statistiken
  export   - Exportiere Übersetzungen (json, csv, js)
  clean    - Bereinige leere oder doppelte Einträge
  help     - Zeige diese Hilfe

Beispiele:
  node translation-manager.js list
  node translation-manager.js stats
  node translation-manager.js export csv
  node translation-manager.js clean
    `);
  },
};

// Führe Befehl aus
const command = process.argv[2];
const arg = process.argv[3];

if (commands[command]) {
  commands[command](arg);
} else {
  console.log('❌ Unbekannter Befehl. Verwende "help" für Hilfe.');
  commands.help();
}
