#!/usr/bin/env node

/**
 * Complete Usage Calculator
 *
 * Berechnet sowohl Firebase Storage (Dateien) als auch Firestore (Datenbank)
 * Nutzung für Firmen.
 *
 * Usage: node scripts/calculate-complete-usage.js [companyId]
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use FIREBASE_SERVICE_ACCOUNT_KEY from env
    const serviceAccountKey =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'tilvo-f142f.firebasestorage.app',
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // Fallback: Application Default Credentials (works if gcloud is configured)
      admin.initializeApp({
        storageBucket: 'tilvo-f142f.firebasestorage.app',
      });
      console.log('✅ Firebase Admin initialized with default credentials');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
    process.exit(1);
  }
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Berechnet die Größe eines Firestore-Dokuments
 */
function calculateDocumentSize(data) {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');

  // Firestore overhead: ~32 bytes pro Dokument + Field overhead
  const overhead = 32 + Object.keys(data).length * 8;

  return sizeInBytes + overhead;
}

/**
 * Berechnet die Größe einer Firestore-Collection
 */
async function calculateCollectionSize(companyId, collectionName, isSubcollection = false) {
  try {
    const collectionRef = isSubcollection
      ? db.collection('companies').doc(companyId).collection(collectionName)
      : db.collection(collectionName).where('companyId', '==', companyId);

    const snapshot = await collectionRef.get();

    let totalSize = 0;
    let docCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      totalSize += calculateDocumentSize(data);
      docCount++;

      // Rekursiv: Subcollections scannen
      const subcollections = await doc.ref.listCollections();
      for (const subcoll of subcollections) {
        const subSnapshot = await subcoll.get();
        for (const subDoc of subSnapshot.docs) {
          totalSize += calculateDocumentSize(subDoc.data());
          docCount++;
        }
      }
    }

    return { size: totalSize, count: docCount };
  } catch (error) {
    console.error(`   ⚠️  Error scanning ${collectionName}:`, error.message);
    return { size: 0, count: 0 };
  }
}

/**
 * Berechnet Firebase Storage Nutzung
 */
async function calculateStorageUsage(companyId) {
  console.log(`\n📦 Calculating Storage (Files)...`);

  let totalSize = 0;
  let fileCount = 0;
  const breakdown = {
    invoices: { size: 0, count: 0 },
    customerDocs: { size: 0, count: 0 },
    employeeDocs: { size: 0, count: 0 },
    calendarFiles: { size: 0, count: 0 },
    taxDocs: { size: 0, count: 0 },
    other: { size: 0, count: 0 },
  };

  try {
    const prefixes = [
      `invoices/${companyId}/`,
      `companies/${companyId}/`,
      `employee_documents/${companyId}/`,
      `steuerberater-docs/${companyId}/`,
    ];

    for (const prefix of prefixes) {
      console.log(`   Scanning: ${prefix}...`);

      const [files] = await bucket.getFiles({ prefix });

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const size = parseInt(metadata.size) || 0;

        totalSize += size;
        fileCount++;

        // Kategorisiere Dateien
        if (file.name.startsWith('invoices/')) {
          breakdown.invoices.size += size;
          breakdown.invoices.count++;
        } else if (file.name.includes('/customers/')) {
          breakdown.customerDocs.size += size;
          breakdown.customerDocs.count++;
        } else if (file.name.includes('employee_documents/')) {
          breakdown.employeeDocs.size += size;
          breakdown.employeeDocs.count++;
        } else if (file.name.includes('/calendar_events/')) {
          breakdown.calendarFiles.size += size;
          breakdown.calendarFiles.count++;
        } else if (file.name.includes('steuerberater-docs/')) {
          breakdown.taxDocs.size += size;
          breakdown.taxDocs.count++;
        } else {
          breakdown.other.size += size;
          breakdown.other.count++;
        }
      }
    }

    console.log(`   ✅ Files: ${fileCount}, Size: ${formatBytes(totalSize)}`);

    return { totalSize, fileCount, breakdown };
  } catch (error) {
    console.error(`   ❌ Error calculating storage:`, error.message);
    return { totalSize: 0, fileCount: 0, breakdown };
  }
}

/**
 * Berechnet Firestore Datenbank Nutzung
 */
async function calculateFirestoreUsage(companyId) {
  console.log(`\n💾 Calculating Firestore (Database)...`);

  let totalSize = 0;
  let totalDocs = 0;
  const breakdown = {};

  // Wichtige Collections für Firmen
  const collections = [
    // Subcollections
    { name: 'customers', isSub: true },
    { name: 'invoices', isSub: true },
    { name: 'quotes', isSub: true },
    { name: 'expenses', isSub: true },
    { name: 'inventory', isSub: true },
    { name: 'employees', isSub: true },
    { name: 'timeEntries', isSub: true },
    { name: 'orderTimeTracking', isSub: true },
    { name: 'workspaces', isSub: true },

    // Root collections mit companyId Filter
    { name: 'auftraege', isSub: false },
    { name: 'chats', isSub: false },
    { name: 'notifications', isSub: false },
  ];

  for (const { name, isSub } of collections) {
    console.log(`   Scanning: ${name}...`);
    const result = await calculateCollectionSize(companyId, name, isSub);

    breakdown[name] = result;
    totalSize += result.size;
    totalDocs += result.count;

    console.log(`      ${result.count} docs, ${formatBytes(result.size)}`);
  }

  console.log(`   ✅ Total: ${totalDocs} docs, ${formatBytes(totalSize)}`);

  return { totalSize, totalDocs, breakdown };
}

/**
 * Berechnet komplette Nutzung für eine Firma
 */
async function calculateCompleteUsage(companyId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Company: ${companyId}`);
  console.log('='.repeat(60));

  // Storage berechnen
  const storage = await calculateStorageUsage(companyId);

  // Firestore berechnen
  const firestore = await calculateFirestoreUsage(companyId);

  // Gesamt
  const totalUsage = storage.totalSize + firestore.totalSize;

  // Firestore aktualisieren
  try {
    const companyRef = db.collection('companies').doc(companyId);

    await companyRef.update({
      'usage.storageUsed': storage.totalSize,
      'usage.firestoreUsed': firestore.totalSize,
      'usage.totalUsed': totalUsage,
      'usage.lastUpdate': admin.firestore.FieldValue.serverTimestamp(),
      'usage.storageBreakdown': storage.breakdown,
      'usage.firestoreBreakdown': firestore.breakdown,
      'usage.stats': {
        totalFiles: storage.fileCount,
        totalDocuments: firestore.totalDocs,
      },
    });

    console.log(`\n✅ Updated Firestore with usage data`);
  } catch (error) {
    console.error(`\n❌ Error updating Firestore:`, error.message);
  }

  // Zusammenfassung
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 ZUSAMMENFASSUNG');
  console.log('='.repeat(60));
  console.log(`\nStorage (Files):`);
  console.log(`  Files: ${storage.fileCount}`);
  console.log(`  Size: ${formatBytes(storage.totalSize)}`);
  console.log(`\nFirestore (Database):`);
  console.log(`  Documents: ${firestore.totalDocs}`);
  console.log(`  Size: ${formatBytes(firestore.totalSize)}`);
  console.log(`\nGESAMT:`);
  console.log(`  Combined: ${formatBytes(totalUsage)}`);

  // Limit check
  const companyDoc = await db.collection('companies').doc(companyId).get();
  const limit = companyDoc.data()?.storageLimit || 1 * 1024 * 1024 * 1024; // 1GB default
  const percentage = Math.round((totalUsage / limit) * 100);

  console.log(`  Limit: ${formatBytes(limit)}`);
  console.log(`  Usage: ${percentage}%`);

  if (percentage >= 90) {
    console.log(`\n⚠️  WARNING: ${percentage}% usage - Upgrade empfohlen!`);
  } else if (percentage >= 80) {
    console.log(`\n⚡ HINWEIS: ${percentage}% usage - Bald Upgrade nötig`);
  }

  return {
    storage,
    firestore,
    totalUsage,
    limit,
    percentage,
  };
}

/**
 * Formatiert Bytes in lesbare Größe
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Hauptfunktion
 */
async function main() {
  const targetCompanyId = process.argv[2];

  console.log('🚀 Complete Usage Calculator (Storage + Firestore)\n');

  if (targetCompanyId) {
    // Einzelne Firma
    await calculateCompleteUsage(targetCompanyId);
  } else {
    // Alle Firmen
    console.log('📋 Scanning all companies...\n');

    const companiesSnapshot = await db.collection('companies').get();
    const results = [];

    for (const doc of companiesSnapshot.docs) {
      const result = await calculateCompleteUsage(doc.id);
      results.push({ companyId: doc.id, ...result });
    }

    // Globale Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('🌍 GLOBALE STATISTIK');
    console.log('='.repeat(60));

    const totalStorage = results.reduce((sum, r) => sum + r.storage.totalSize, 0);
    const totalFirestore = results.reduce((sum, r) => sum + r.firestore.totalSize, 0);
    const totalFiles = results.reduce((sum, r) => sum + r.storage.fileCount, 0);
    const totalDocs = results.reduce((sum, r) => sum + r.firestore.totalDocs, 0);

    console.log(`\nFirmen: ${results.length}`);
    console.log(`\nStorage (Files):`);
    console.log(`  Files: ${totalFiles}`);
    console.log(`  Size: ${formatBytes(totalStorage)}`);
    console.log(`\nFirestore (Database):`);
    console.log(`  Documents: ${totalDocs}`);
    console.log(`  Size: ${formatBytes(totalFirestore)}`);
    console.log(`\nGESAMT: ${formatBytes(totalStorage + totalFirestore)}`);

    // Top 5 Nutzer
    const topUsers = results.sort((a, b) => b.totalUsage - a.totalUsage).slice(0, 5);

    console.log(`\nTop 5 Nutzer (kombiniert):`);
    topUsers.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.companyId}`);
      console.log(`     Total: ${formatBytes(r.totalUsage)} (${r.percentage}%)`);
      console.log(
        `     Storage: ${formatBytes(r.storage.totalSize)}, Firestore: ${formatBytes(r.firestore.totalSize)}`
      );
    });
  }

  console.log('\n✅ Done!');
  process.exit(0);
}

// Start
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
