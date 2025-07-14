#!/usr/bin/env node

console.log('🧹 CLEANUP UNGENUTZTER DATEIEN - Taskilo');
console.log('==========================================\n');

import { readFileSync, unlinkSync, rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Sichere Kategorien zum Löschen
const safeToDelete = {
  buildArtifacts: ['.firebase/', 'firebase_functions/lib/', '.next/', 'dist/', 'build/'],

  analysisScripts: [
    'analyze-all-components.js',
    'analyze-final-translations.js',
    'analyze-translations.js',
    'analyze-unused-files.js',
    'check-all-chatbot-configs.js',
    'check-category-data.js',
    'check-component-translations.js',
    'check-firma-data.js',
    'check-stripe-accounts.js',
    'create-100-percent-plan.js',
    'debug-order.js',
    'final-translation-report.js',
    'fix-chatbot-model.js',
    'migrate-firma-data.js',
    'remove-contact-info-admin.js',
    'remove-contact-info.js',
    'repair-language-context.js',
    'set-custom-claim.js',
    'test-e2e-flow.js',
    'test-e2e-simple.js',
    'test-enhanced-chatbot.js',
    'test-fee-calculation.js',
    'test-improved-chatbot.js',
    'test-live-chatbot.js',
    'test-order-recognition.js',
    'track-translation-progress-updated.js',
    'track-translation-progress.js',
    'update-chatbot-config.js',
    'update-chatbot-model.js',
    'update-model-admin.js',
  ],

  translationArtifacts: [
    'cleaned-translations.json',
    'translation-completion-plan.json',
    'translation-quality-report.json',
    'ui-texts-extracted.json',
    'package-i18n.json',
  ],

  unusedComponents: [
    'src/app/pages/404.tsx',
    'src/app/services/page_new.tsx',
    'src/components/BaseHeader.tsx',
    'src/components/BookingChatModal.tsx',
    'src/components/BookingDetailsDrawer.tsx',
    'src/components/CustomerInfoCard.tsx',
    'src/components/DirectChatModal.test.ts',
    'src/components/Filter.tsx',
    'src/components/MapCircle.tsx',
    'src/components/MobileUploadCamera.tsx',
    'src/components/Modal.tsx',
    'src/components/PlaceAutocomplete.tsx',
    'src/components/PopupModal.tsx',
    'src/components/ProjectGallery.tsx',
    'src/components/RepresentativePersonalDataModal.tsx',
    'src/components/ReviewForm.tsx',
    'src/components/SubcategorySelectionModal.tsx',
    'src/components/UploadPromptDesktop.tsx',
    'src/components/UserHeaderContent.tsx',
  ],

  unusedUIComponents: [
    'src/components/ui/animated-group.tsx',
    'src/components/ui/breadcrumb.tsx',
    'src/components/ui/hover-card.tsx',
    'src/components/ui/popover.tsx',
    'src/components/ui/responsive-image.tsx',
    'src/components/ui/separator.tsx',
    'src/components/ui/sheet.tsx',
    'src/components/ui/sidebar.tsx',
    'src/components/ui/skeleton.tsx',
    'src/components/ui/sonner.tsx',
    'src/components/ui/text-effect.tsx',
  ],

  scriptsFolder: [
    'scripts/cleanup-translations.js',
    'scripts/complete-translations.js',
    'scripts/create-emulator-test-notification.js',
    'scripts/create-international-reviews.js',
    'scripts/create-test-notification.js',
    'scripts/create-test-reviews-admin.js',
    'scripts/create-test-reviews-live.js',
    'scripts/create-test-reviews-production.js',
    'scripts/create-test-reviews.js',
    'scripts/extract-ui-texts-improved.js',
    'scripts/extract-ui-texts.js',
    'scripts/find-provider-id.js',
    'scripts/fixCompanyProfileImages.js',
    'scripts/hybrid-translation.js',
    'scripts/migrateProfilePictureUrls.js',
    'scripts/test-notifications.js',
    'scripts/translate-project.js',
    'scripts/translation-quality-demo.js',
    'scripts/update-components.js',
  ],
};

// NICHT löschen (wichtige Dateien)
const doNotDelete = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'next.config.mjs',
  'tailwind.config.js',
  'firebase.json',
  'vercel.json',
  'README.md',
  'LICENSE',
  '.env',
  '.env.local',
  '.env.example',
  '.gitignore',
  'middleware.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/app/globals.css',
];

function createBackup() {
  console.log('📦 Erstelle Sicherung...');
  try {
    // Git status prüfen
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      console.log('⚠️  Ungespeicherte Änderungen gefunden. Erstelle Commit...');
      execSync('git add .');
      execSync('git commit -m "Backup before cleanup: Save current state"');
    }

    // Branch für Cleanup erstellen
    const branchName = `cleanup-${Date.now()}`;
    execSync(`git checkout -b ${branchName}`);
    console.log(`✅ Backup-Branch erstellt: ${branchName}`);
    return branchName;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Sicherung:', error.message);
    process.exit(1);
  }
}

function deleteFiles(files, categoryName) {
  console.log(`\n🗑️  Lösche ${categoryName}...`);
  let deletedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    try {
      if (existsSync(file)) {
        if (doNotDelete.some(protectedFile => file.includes(protectedFile))) {
          console.log(`   ⏭️  Übersprungen (geschützt): ${file}`);
          skippedCount++;
          continue;
        }

        // Ordner oder Datei?
        if (file.endsWith('/')) {
          rmSync(file, { recursive: true, force: true });
          console.log(`   🗂️  Ordner gelöscht: ${file}`);
        } else {
          unlinkSync(file);
          console.log(`   📄 Datei gelöscht: ${file}`);
        }
        deletedCount++;
      } else {
        console.log(`   ❓ Nicht gefunden: ${file}`);
        skippedCount++;
      }
    } catch (error) {
      console.log(`   ❌ Fehler beim Löschen ${file}: ${error.message}`);
      skippedCount++;
    }
  }

  console.log(`   ✅ ${deletedCount} gelöscht, ${skippedCount} übersprungen`);
  return { deleted: deletedCount, skipped: skippedCount };
}

function cleanupProject() {
  console.log('🚀 Starte Projekt-Cleanup...\n');

  const results = {};
  let totalDeleted = 0;
  let totalSkipped = 0;

  // 1. Build Artifacts (sicher)
  console.log('🔧 PHASE 1: Build Artifacts');
  const buildResult = deleteFiles(safeToDelete.buildArtifacts, 'Build Artifacts');
  results.buildArtifacts = buildResult;
  totalDeleted += buildResult.deleted;
  totalSkipped += buildResult.skipped;

  // 2. Analysis Scripts (sicher)
  console.log('\n📊 PHASE 2: Analyse-Skripte');
  const analysisResult = deleteFiles(safeToDelete.analysisScripts, 'Analyse-Skripte');
  results.analysisScripts = analysisResult;
  totalDeleted += analysisResult.deleted;
  totalSkipped += analysisResult.skipped;

  // 3. Translation Artifacts (sicher)
  console.log('\n🌍 PHASE 3: Übersetzungs-Artefakte');
  const translationResult = deleteFiles(
    safeToDelete.translationArtifacts,
    'Übersetzungs-Artefakte'
  );
  results.translationArtifacts = translationResult;
  totalDeleted += translationResult.deleted;
  totalSkipped += translationResult.skipped;

  // 4. Scripts Folder (sicher)
  console.log('\n📜 PHASE 4: Scripts Ordner');
  const scriptsResult = deleteFiles(safeToDelete.scriptsFolder, 'Scripts');
  results.scriptsFolder = scriptsResult;
  totalDeleted += scriptsResult.deleted;
  totalSkipped += scriptsResult.skipped;

  return {
    results,
    totalDeleted,
    totalSkipped,
  };
}

function interactiveCleanup() {
  console.log('🤔 INTERAKTIVE AUSWAHL für riskantere Löschungen:\n');

  // Unused Components (vorsichtig)
  console.log('⚠️  UNGENUTZTE KOMPONENTEN:');
  console.log('Diese Komponenten scheinen ungenutzt zu sein.');
  console.log('Möchten Sie diese löschen? (Empfehlung: Nein, manuell prüfen)');
  safeToDelete.unusedComponents.forEach(comp => console.log(`   - ${comp}`));
  console.log('\nHinweis: Diese sollten manuell geprüft werden!\n');

  // UI Components
  console.log('🧩 UNGENUTZTE UI-KOMPONENTEN:');
  console.log('Diese UI-Komponenten scheinen ungenutzt zu sein.');
  safeToDelete.unusedUIComponents.forEach(comp => console.log(`   - ${comp}`));
  console.log('\nHinweis: Diese könnten in Zukunft verwendet werden!\n');
}

function generateCleanupReport(results) {
  console.log('\n📋 CLEANUP-BERICHT:');
  console.log('==================');

  Object.entries(results.results).forEach(([category, result]) => {
    console.log(`${category}: ${result.deleted} gelöscht, ${result.skipped} übersprungen`);
  });

  console.log(
    `\n📊 GESAMT: ${results.totalDeleted} Dateien gelöscht, ${results.totalSkipped} übersprungen`
  );

  // Geschätzte Speicherersparnis
  console.log('\n💾 GESCHÄTZTE SPEICHERERSPARNIS:');
  console.log('- Build Artifacts: ~50-100MB');
  console.log('- Analyse-Skripte: ~1-2MB');
  console.log('- Übersetzungs-Artefakte: ~500KB');
  console.log('- Scripts: ~2-3MB');
  console.log('- GESAMT: ~53-105MB');
}

function postCleanupActions() {
  console.log('\n🔄 POST-CLEANUP AKTIONEN:');
  console.log('========================');

  console.log('1. Teste das Projekt:');
  console.log('   npm run dev');
  console.log('   npm run build');

  console.log('\n2. Führe Tests aus (falls vorhanden):');
  console.log('   npm test');

  console.log('\n3. Prüfe Git-Status:');
  console.log('   git status');
  console.log('   git diff');

  console.log('\n4. Bei Problemen - Zurücksetzen:');
  console.log('   git checkout main');
  console.log('   git branch -D cleanup-[timestamp]');

  console.log('\n5. Bei Erfolg - Merge:');
  console.log('   git checkout main');
  console.log('   git merge cleanup-[timestamp]');
  console.log('   git push origin main');
}

// Hauptausführung
async function main() {
  try {
    console.log('🎯 Taskilo Projekt Cleanup');
    console.log('========================\n');

    // Sicherung erstellen
    const backupBranch = createBackup();

    // Sichere Dateien löschen
    const cleanupResults = cleanupProject();

    // Bericht generieren
    generateCleanupReport(cleanupResults);

    // Interaktive Auswahl für riskantere Löschungen
    interactiveCleanup();

    // Post-Cleanup Aktionen
    postCleanupActions();

    console.log('\n✅ Cleanup erfolgreich abgeschlossen!');
    console.log(`📝 Backup-Branch: ${backupBranch}`);
    console.log('\n⚠️  WICHTIG: Testen Sie das Projekt gründlich!');
  } catch (error) {
    console.error('❌ Fehler beim Cleanup:', error.message);
    process.exit(1);
  }
}

// Bestätigung vor Ausführung
console.log('⚠️  WARNUNG: Dieses Skript wird Dateien PERMANENT löschen!');
console.log(
  'Haben Sie eine Sicherung erstellt? (Das Skript erstellt automatisch einen Git-Branch)'
);
console.log('\nFortfahren? Drücken Sie Ctrl+C zum Abbrechen oder Enter zum Fortfahren...');

// Warten auf Benutzer-Eingabe (in Node.js)
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', () => {
  main();
});
