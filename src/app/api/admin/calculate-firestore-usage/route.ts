// src/app/api/admin/calculate-firestore-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

/**
 * Berechnet die Größe eines Firestore-Dokuments
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
    const db = admin.firestore();
    const collectionRef = db.collection('companies').doc(companyId).collection(collectionName);

    const snapshot = await collectionRef.get();

    let totalSize = 0;
    const docCount = snapshot.size;

    snapshot.forEach(doc => {
      totalSize += calculateDocumentSize(doc.data());
    });

    return { size: totalSize, count: docCount };
  } catch {
    return { size: 0, count: 0 };
  }
}

/**
 * Berechnet Realtime Database Nutzung (Workspaces)
 */
async function scanRealtimeDatabaseWorkspaces(
  companyId: string
): Promise<{ size: number; count: number; tasks: number }> {
  try {
    const rtdb = admin.database();
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
  } catch {
    return { size: 0, count: 0, tasks: 0 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    console.log(`[Calculate Firestore] Scanning company: ${companyId}`);

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
    }

    // Scanne Realtime Database (Workspaces)
    const workspaceData = await scanRealtimeDatabaseWorkspaces(companyId);
    breakdown['workspaces_rtdb'] = { size: workspaceData.size, count: workspaceData.count };
    totalSize += workspaceData.size;

    // Update usage in Firestore
    const db = admin.firestore();
    const companyRef = db.collection('companies').doc(companyId);

    await companyRef.update({
      'usage.firestoreUsed': totalSize,
      'usage.realtimeDbUsed': workspaceData.size,
      'usage.lastUpdate': admin.firestore.FieldValue.serverTimestamp(),
      'usage.firestoreBreakdown': breakdown,
      'usage.stats.totalDocuments': totalDocs,
      'usage.stats.totalWorkspaces': workspaceData.count,
      'usage.stats.totalTasks': workspaceData.tasks,
    });

    return NextResponse.json({
      success: true,
      message: 'Usage calculated successfully (Firestore + Realtime Database)',
      data: {
        companyId,
        totalSize,
        totalDocs,
        workspaces: workspaceData.count,
        tasks: workspaceData.tasks,
        totalSizeFormatted: `${(totalSize / 1024).toFixed(2)} KB`,
        breakdown,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to calculate Firestore usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
