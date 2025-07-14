#!/usr/bin/env node

/**
 * Automatisches Update aller React Komponenten für i18n
 * Ersetzt hardcoded deutsche Texte durch t() Funktionen
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateComponentsForI18n() {
  const srcDir = path.join(__dirname, '../src');
  const keyMappingFile = path.join(__dirname, 'translation-keys-mapping.json');

  // Lade das Key-Mapping
  let keyMapping = {};
  try {
    const mappingContent = await fs.readFile(keyMappingFile, 'utf-8');
    keyMapping = JSON.parse(mappingContent);
  } catch (error) {
    console.error(
      '❌ Konnte translation-keys-mapping.json nicht laden. Führen Sie zuerst translate-project.js aus.'
    );
    return;
  }

  // Finde alle React-Komponenten
  async function updateDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', '.next', '.git'].includes(entry.name)) {
          await updateDirectory(fullPath);
        }
      } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
        await updateComponent(fullPath);
      }
    }
  }

  async function updateComponent(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;

      // Prüfe ob bereits useLanguage importiert ist
      const hasLanguageImport = content.includes('useLanguage');
      const hasTranslationUsage = content.includes('const { t }');

      // Ersetze hardcoded deutsche Texte
      Object.entries(keyMapping).forEach(([germanText, key]) => {
        // Verschiedene Patterns für Text-Ersetzung
        const patterns = [
          // JSX Text zwischen Tags
          new RegExp(`>\\s*${escapeRegex(germanText)}\\s*<`, 'g'),
          // Attribute values
          new RegExp(`(placeholder|title|alt)\\s*=\\s*["']${escapeRegex(germanText)}["']`, 'g'),
          // String literals
          new RegExp(`["']${escapeRegex(germanText)}["']`, 'g'),
        ];

        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            console.log(`   📝 Ersetze: "${germanText.slice(0, 50)}..." → t('${key}')`);

            // Verschiedene Ersetzungslogiken
            if (content.includes(`>${germanText}<`)) {
              content = content.replace(`>${germanText}<`, `>{t('${key}')}<`);
              modified = true;
            }

            if (content.includes(`placeholder="${germanText}"`)) {
              content = content.replace(`placeholder="${germanText}"`, `placeholder={t('${key}')}`);
              modified = true;
            }

            if (content.includes(`title="${germanText}"`)) {
              content = content.replace(`title="${germanText}"`, `title={t('${key}')}`);
              modified = true;
            }

            if (content.includes(`"${germanText}"`)) {
              content = content.replace(`"${germanText}"`, `t('${key}')`);
              modified = true;
            }
          }
        });
      });

      // Füge useLanguage Import hinzu, wenn nötig
      if (modified && !hasLanguageImport) {
        // Finde andere Imports und füge useLanguage hinzu
        if (content.includes('import') && content.includes('from')) {
          const importRegex = /(import.*from\s+['"][^'"]*['"];?\s*)/g;
          const imports = content.match(importRegex) || [];
          const lastImport = imports[imports.length - 1];

          if (lastImport) {
            const newImport = "import { useLanguage } from '@/contexts/LanguageContext';\\n";
            content = content.replace(lastImport, lastImport + newImport);
          }
        }
      }

      // Füge const { t } hinzu, wenn nötig
      if (modified && !hasTranslationUsage) {
        // Finde den Komponenten-Beginn und füge t-Funktion hinzu
        const componentMatch = content.match(/(export\s+default\s+function\s+\w+.*?\{)/);
        if (componentMatch) {
          const componentStart = componentMatch[1];
          const newStart = componentStart + '\\n  const { t } = useLanguage();\\n';
          content = content.replace(componentStart, newStart);
        }
      }

      if (modified) {
        // Backup erstellen
        await fs.writeFile(filePath + '.backup', await fs.readFile(filePath, 'utf-8'));

        // Aktualisierte Datei schreiben
        await fs.writeFile(filePath, content);
        console.log(`✅ ${path.relative(srcDir, filePath)} aktualisiert`);
      }
    } catch (error) {
      console.warn(`⚠️  Fehler bei ${filePath}:`, error.message);
    }
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  console.log('🔄 Aktualisiere React-Komponenten für i18n...');
  await updateDirectory(srcDir);
  console.log('✅ Komponenten-Update abgeschlossen');
}

// Führe das Update aus
updateComponentsForI18n().catch(console.error);
