#!/usr/bin/env node
/**
 * Service-Updater für Firestore Migration
 * Aktualisiert automatisch alle Service-Dateien von Collections zu Subcollections
 */

const fs = require('fs');
const path = require('path');

class ServiceUpdater {
  constructor() {
    this.serviceDirectory = path.join(__dirname, '..', 'src', 'services');
    this.componentDirectory = path.join(__dirname, '..', 'src', 'components');
    this.appDirectory = path.join(__dirname, '..', 'src', 'app');

    this.collectionsToMigrate = [
      'customers',
      'inventory',
      'stockMovements',
      'timeEntries',
      'quotes',
      'expenses',
      'orderTimeTracking',
    ];

    this.changedFiles = [];
    this.errors = [];
  }

  updateFile(filePath) {
    try {
      console.log(`🔍 Analysiere: ${path.relative(process.cwd(), filePath)}`);

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      let hasChanges = false;

      // Pattern 1: collection('collectionName') -> collection('companies').doc(companyId).collection('collectionName')
      for (const collectionName of this.collectionsToMigrate) {
        const oldPattern = new RegExp(`collection\\(['"\`]${collectionName}['"\`]\\)`, 'g');
        const newPattern = `collection('companies').doc(companyId).collection('${collectionName}')`;

        if (oldPattern.test(content)) {
          content = content.replace(oldPattern, newPattern);
          hasChanges = true;
          console.log(`   ✅ Aktualisiert: collection('${collectionName}') -> Subcollection`);
        }
      }

      // Pattern 2: doc(db, 'collectionName', ...) -> doc(db, 'companies', companyId, 'collectionName', ...)
      for (const collectionName of this.collectionsToMigrate) {
        const oldPattern = new RegExp(`doc\\(db,\\s*['"\`]${collectionName}['"\`],`, 'g');
        const newPattern = `doc(db, 'companies', companyId, '${collectionName}',`;

        if (oldPattern.test(content)) {
          content = content.replace(oldPattern, newPattern);
          hasChanges = true;
          console.log(`   ✅ Aktualisiert: doc(db, '${collectionName}', ...) -> Subcollection`);
        }
      }

      // Pattern 3: Entferne where('companyId', '==', companyId) Klauseln
      const companyIdWherePattern = /\.where\(['"`]companyId['"`],\s*['"`]==['"`],\s*[^)]+\)/g;
      if (companyIdWherePattern.test(content)) {
        content = content.replace(companyIdWherePattern, '');
        hasChanges = true;
        console.log(`   ✅ Entfernt: where('companyId', '==', ...) Klauseln`);
      }

      // Pattern 4: Füge companyId Parameter hinzu, falls nicht vorhanden
      if (hasChanges && !content.includes('companyId: string')) {
        // Finde Funktionsdefinitionen und füge companyId Parameter hinzu
        const functionPattern =
          /(async\s+function\s+\w+|static\s+async\s+\w+|\w+:\s*async\s*)\s*\([^)]*\)/g;
        content = content.replace(functionPattern, match => {
          if (!match.includes('companyId')) {
            const insertPos = match.lastIndexOf(')');
            const beforeClosing = match.substring(0, insertPos);
            const hasParams =
              beforeClosing.includes('(') && beforeClosing.split('(')[1].trim().length > 0;
            const newParam = hasParams ? ', companyId: string' : 'companyId: string';
            return match.substring(0, insertPos) + newParam + match.substring(insertPos);
          }
          return match;
        });
      }

      // Datei nur schreiben, wenn Änderungen vorhanden
      if (hasChanges && content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.changedFiles.push(filePath);
        console.log(`   💾 Datei aktualisiert: ${path.relative(process.cwd(), filePath)}`);
      } else if (!hasChanges) {
        console.log(`   ⏭️  Keine Änderungen erforderlich`);
      }
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
      console.error(`   ❌ Fehler: ${error.message}`);
    }
  }

  findFiles(directory, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
    const files = [];

    if (!fs.existsSync(directory)) {
      console.log(`⚠️  Verzeichnis nicht gefunden: ${directory}`);
      return files;
    }

    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  run() {
    console.log('🚀 Service-Updater für Firestore Migration\n');
    console.log('📂 Durchsuche Verzeichnisse:');
    console.log(`   - Services: ${this.serviceDirectory}`);
    console.log(`   - Components: ${this.componentDirectory}`);
    console.log(`   - App: ${this.appDirectory}\n`);

    // Sammle alle zu aktualisierenden Dateien
    const allFiles = [
      ...this.findFiles(this.serviceDirectory),
      ...this.findFiles(this.componentDirectory),
      ...this.findFiles(this.appDirectory),
    ];

    console.log(`📄 Gefundene Dateien: ${allFiles.length}\n`);

    // Aktualisiere jede Datei
    allFiles.forEach(file => this.updateFile(file));

    // Ergebnisse anzeigen
    console.log('\n📊 Migration Ergebnisse:');
    console.log(`✅ Erfolgreich aktualisiert: ${this.changedFiles.length} Dateien`);
    console.log(`❌ Fehler: ${this.errors.length} Dateien\n`);

    if (this.changedFiles.length > 0) {
      console.log('🔄 Aktualisierte Dateien:');
      this.changedFiles.forEach(file => {
        console.log(`   - ${path.relative(process.cwd(), file)}`);
      });
      console.log();
    }

    if (this.errors.length > 0) {
      console.log('❌ Fehler bei folgenden Dateien:');
      this.errors.forEach(error => {
        console.log(`   - ${path.relative(process.cwd(), error.file)}: ${error.error}`);
      });
      console.log();
    }

    console.log('🎯 Service-Updates abgeschlossen!\n');

    if (this.changedFiles.length > 0) {
      console.log('⚠️  WICHTIG: Bitte prüfen Sie die Änderungen vor dem nächsten Schritt:');
      console.log('   git diff # Änderungen überprüfen');
      console.log('   npm run build # Build testen');
      console.log('   npm run type-check # TypeScript prüfen\n');
    }
  }
}

// Script ausführen
const updater = new ServiceUpdater();
updater.run();
