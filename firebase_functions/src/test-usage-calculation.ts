/**
 * Test HTTP Function für manuelle Ausführung der Usage Calculation
 * Nutzt die gleiche Logik wie die Scheduled Function
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * Berechnet die Größe eines Firestore-Dokuments
 */
function calculateDocumentSize(data: any): number {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
  const overhead = 32 + Object.keys(data).length * 8;
  return sizeInBytes + overhead;
}

/**
 * Scannt eine Subcollection und berechnet die Größe
 */
async function scanSubcollection(
  companyId: string,
  collectionName: string
): Promise<{ size: number; count: number }> {
  try {
    const db = getFirestore();
    const collectionRef = db.collection('companies').doc(companyId).collection(collectionName);
    const snapshot = await collectionRef.get();

    let totalSize = 0;
    snapshot.forEach(doc => {
      totalSize += calculateDocumentSize(doc.data());
    });

    return { size: totalSize, count: snapshot.size };
  } catch (error) {
    logger.error(`Error scanning ${collectionName}:`, error);
    return { size: 0, count: 0 };
  }
}

/**
 * Berechnet die Firestore-Nutzung für eine Company
 */
async function calculateUsageForCompany(companyId: string) {
  logger.info(`[Test] Scanning company: ${companyId}`);

  const collections = [
    'customers', 'invoices', 'quotes', 'expenses', 'inventory',
    'employees', 'timeEntries', 'calendar_events', 'bookingAccounts',
    'reminders', 'reviews', 'servicePackages', 'settings',
    'stockMovements', 'transaction_links', 'projects', 'notifications',
    'stornoRechnungen', 'inlineInvoiceServices', 'kostenstellen',
    'storage_subscriptions', 'emailCache',
  ];

  let totalSize = 0;
  let totalDocs = 0;
  const breakdown: Record<string, { size: number; count: number }> = {};

  for (const collName of collections) {
    const result = await scanSubcollection(companyId, collName);
    breakdown[collName] = result;
    totalSize += result.size;
    totalDocs += result.count;

    if (result.count > 0) {
      logger.info(`  ✓ ${collName}: ${result.count} docs, ${(result.size / 1024).toFixed(2)} KB`);
    }
  }

  const db = getFirestore();
  await db.collection('companies').doc(companyId).update({
    'usage.firestoreUsed': totalSize,
    'usage.lastUpdate': FieldValue.serverTimestamp(),
    'usage.firestoreBreakdown': breakdown,
    'usage.stats.totalDocuments': totalDocs,
  });

  logger.info(`[Test] ✅ ${totalDocs} docs, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  return { totalSize, totalDocs, breakdown };
}

/**
 * HTTP Test Function
 */
export const testUsageCalculation = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (req, res) => {
    const startTime = Date.now();
    logger.info('=== TEST: Usage Calculation Started ===');

    try {
      const db = getFirestore();
      const companiesSnapshot = await db.collection('companies').get();
      const totalCompanies = companiesSnapshot.size;

      logger.info(`Found ${totalCompanies} companies`);

      let successCount = 0;
      let failureCount = 0;
      let totalDocsProcessed = 0;
      let totalSizeProcessed = 0;
      const results: any[] = [];

      for (const companyDoc of companiesSnapshot.docs) {
        try {
          const result = await calculateUsageForCompany(companyDoc.id);
          successCount++;
          totalDocsProcessed += result.totalDocs;
          totalSizeProcessed += result.totalSize;
          
          results.push({
            companyId: companyDoc.id,
            docs: result.totalDocs,
            sizeMB: (result.totalSize / 1024 / 1024).toFixed(2),
          });
        } catch (error) {
          failureCount++;
          logger.error(`Failed: ${companyDoc.id}`, error);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      const summary = {
        success: true,
        totalCompanies,
        successCount,
        failureCount,
        totalDocuments: totalDocsProcessed,
        totalSizeMB: (totalSizeProcessed / 1024 / 1024).toFixed(2),
        durationSeconds: parseFloat(duration),
        results: results.slice(0, 10), // Erste 10 Companies
      };

      logger.info('=== TEST: Complete ===');
      logger.info(`✅ ${successCount}/${totalCompanies} companies`);
      logger.info(`📊 ${totalDocsProcessed} docs, ${(totalSizeProcessed / 1024 / 1024).toFixed(2)} MB`);
      logger.info(`⏱️  ${duration}s`);

      res.status(200).json(summary);
    } catch (error) {
      logger.error('TEST ERROR:', error);
      res.status(500).json({
        error: 'Failed to calculate usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
