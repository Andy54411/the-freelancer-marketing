/**
 * Firebase Scheduled Function: Tägliche Firestore Usage Berechnung
 * 
 * Läuft automatisch jeden Tag um 3 Uhr morgens und berechnet die
 * Firestore-Nutzung für alle Companies inklusive emailCache und Workspaces.
 * 
 * @module scheduled-usage-calculation
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

/**
 * Berechnet die Größe eines Firestore-Dokuments
 * Inklusive Firestore Overhead (32 bytes + 8 bytes pro Field)
 */
function calculateDocumentSize(data: Record<string, unknown>): number {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');

  // Firestore overhead: ~32 bytes pro Dokument + Field overhead
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
    const docCount = snapshot.size;

    snapshot.forEach(doc => {
      totalSize += calculateDocumentSize(doc.data());
    });

    return { size: totalSize, count: docCount };
  } catch (error) {
    logger.error(`Error scanning ${collectionName} for company ${companyId}:`, error);
    return { size: 0, count: 0 };
  }
}

/**
 * Scannt Realtime Database Workspaces für eine Company
 */
async function scanRealtimeDatabaseWorkspaces(
  companyId: string
): Promise<{ size: number; count: number; tasks: number }> {
  try {
    const rtdb = getDatabase();
    const workspacesRef = rtdb.ref('workspaces');
    const snapshot = await workspacesRef.once('value');
    const allWorkspaces = snapshot.val() || {};

    let totalSize = 0;
    let workspaceCount = 0;
    let taskCount = 0;

    for (const [, workspace] of Object.entries(allWorkspaces)) {
      const ws = workspace as { companyId?: string; tasks?: Record<string, unknown> };
      if (ws && ws.companyId === companyId) {
        const workspaceJson = JSON.stringify(workspace);
        totalSize += Buffer.byteLength(workspaceJson, 'utf8');
        workspaceCount++;

        if (ws.tasks && typeof ws.tasks === 'object') {
          taskCount += Object.keys(ws.tasks).length;
        }
      }
    }

    return { size: totalSize, count: workspaceCount, tasks: taskCount };
  } catch (error) {
    logger.error(`Error scanning Realtime Database for company ${companyId}:`, error);
    return { size: 0, count: 0, tasks: 0 };
  }
}

/**
 * Berechnet die Firestore-Nutzung für eine einzelne Company
 */
async function calculateUsageForCompany(companyId: string): Promise<{
  totalSize: number;
  totalDocs: number;
  breakdown: Record<string, { size: number; count: number }>;
}> {
  logger.info(`[Usage Calculation] Scanning company: ${companyId}`);

  // Alle Subcollections die zur Usage-Berechnung gehoeren
  const collections = [
    // Kern-Business
    'customers',
    'invoices',
    'quotes',
    'expenses',
    'inventory',
    'employees',
    'timeEntries',
    'calendar_events',
    'bookingAccounts',
    'reminders',
    'reviews',
    'servicePackages',
    'settings',
    'stockMovements',
    'transaction_links',
    'projects',
    'notifications',
    'stornoRechnungen',
    'inlineInvoiceServices',
    'kostenstellen',
    'storage_subscriptions',
    // E-Mail & Gmail
    'emailCache',
    'emailConfigs',
    'gmail_sync_stats',
    'gmail_sync_status',
    // Personal & Zeiterfassung
    'employeeActivityLogs',
    'shifts',
    // Jobs & Recruiting
    'jobs',
    'jobApplications',
    // Advertising & Integrationen
    'advertising_connections',
    'campaign_drafts',
    'integrations',
    'integration_requests',
    // Vorlagen & Events
    'textTemplates',
    'realtime_events',
  ];

  let totalSize = 0;
  let totalDocs = 0;
  const breakdown: Record<string, { size: number; count: number }> = {};

  // Scanne jede Firestore Collection
  for (const collName of collections) {
    const result = await scanSubcollection(companyId, collName);

    breakdown[collName] = result;
    totalSize += result.size;
    totalDocs += result.count;

    if (result.count > 0) {
      logger.info(
        `  Firestore ${collName}: ${result.count} docs, ${(result.size / 1024).toFixed(2)} KB`
      );
    }
  }

  // Scanne Realtime Database (Workspaces)
  const workspaceData = await scanRealtimeDatabaseWorkspaces(companyId);
  breakdown['workspaces_rtdb'] = { size: workspaceData.size, count: workspaceData.count };
  totalSize += workspaceData.size;

  if (workspaceData.count > 0) {
    logger.info(
      `  Realtime DB: ${workspaceData.count} workspaces, ${workspaceData.tasks} tasks, ${(workspaceData.size / 1024).toFixed(2)} KB`
    );
  }

  // Update usage in Firestore
  const db = getFirestore();
  const companyRef = db.collection('companies').doc(companyId);

  await companyRef.update({
    'usage.firestoreUsed': totalSize,
    'usage.realtimeDbUsed': workspaceData.size,
    'usage.lastUpdate': FieldValue.serverTimestamp(),
    'usage.firestoreBreakdown': breakdown,
    'usage.stats.totalDocuments': totalDocs,
    'usage.stats.totalWorkspaces': workspaceData.count,
    'usage.stats.totalTasks': workspaceData.tasks,
  });

  logger.info(
    `[Usage Calculation] Company ${companyId}: ${totalDocs} docs, ${workspaceData.count} workspaces, ${(totalSize / 1024 / 1024).toFixed(2)} MB`
  );

  return { totalSize, totalDocs, breakdown };
}

/**
 * Scheduled Function: Läuft jeden Tag um 3 Uhr morgens
 * Berechnet Firestore-Usage für alle Companies
 */
export const dailyUsageCalculation = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'Europe/Berlin', // Deutsche Zeitzone
    retryCount: 3,
    timeoutSeconds: 540, // 9 Minuten Timeout
    memory: '512MiB',
  },
  async (event) => {
    const startTime = Date.now();
    logger.info('=== Starting Daily Firestore Usage Calculation ===');

    try {
      const db = getFirestore();

      // Hole alle Companies
      const companiesSnapshot = await db.collection('companies').get();
      const totalCompanies = companiesSnapshot.size;

      logger.info(`Found ${totalCompanies} companies to process`);

      let successCount = 0;
      let failureCount = 0;
      let totalDocsProcessed = 0;
      let totalSizeProcessed = 0;

      // Verarbeite jede Company
      for (const companyDoc of companiesSnapshot.docs) {
        try {
          const result = await calculateUsageForCompany(companyDoc.id);
          successCount++;
          totalDocsProcessed += result.totalDocs;
          totalSizeProcessed += result.totalSize;
        } catch (error) {
          failureCount++;
          logger.error(`Failed to process company ${companyDoc.id}:`, error);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info('=== Daily Usage Calculation Complete ===');
      logger.info(`✅ Success: ${successCount}/${totalCompanies} companies`);
      logger.info(`❌ Failed: ${failureCount} companies`);
      logger.info(`📊 Total: ${totalDocsProcessed} documents, ${(totalSizeProcessed / 1024 / 1024).toFixed(2)} MB`);
      logger.info(`⏱️  Duration: ${duration} seconds`);

      // Speichere Statistiken für Monitoring
      await db.collection('admin_logs').add({
        type: 'daily_usage_calculation',
        timestamp: FieldValue.serverTimestamp(),
        stats: {
          totalCompanies,
          successCount,
          failureCount,
          totalDocuments: totalDocsProcessed,
          totalSize: totalSizeProcessed,
          durationSeconds: parseFloat(duration),
        },
      });
    } catch (error) {
      logger.error('Fatal error in daily usage calculation:', error);
      throw error;
    }
  }
);
