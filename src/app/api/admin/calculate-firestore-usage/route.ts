// src/app/api/admin/calculate-firestore-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

/**
 * Berechnet die Größe eines Firestore-Dokuments
 */
function calculateDocumentSize(data: any): number {
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
  } catch (error) {
    console.error(`Error scanning ${collectionName}:`, error);
    return { size: 0, count: 0 };
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

    // Alle wichtigen Subcollections
    const collections = [
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
      'emailCache', // Gmail E-Mail Cache
    ];

    let totalSize = 0;
    let totalDocs = 0;
    const breakdown: Record<string, { size: number; count: number }> = {};

    // Scanne jede Collection
    for (const collName of collections) {
      console.log(`  Scanning: ${collName}...`);
      const result = await scanSubcollection(companyId, collName);

      breakdown[collName] = result;
      totalSize += result.size;
      totalDocs += result.count;

      console.log(`    ${result.count} docs, ${(result.size / 1024).toFixed(2)} KB`);
    }

    // Update usage in Firestore
    const db = admin.firestore();
    const companyRef = db.collection('companies').doc(companyId);

    await companyRef.update({
      'usage.firestoreUsed': totalSize,
      'usage.totalUsed': admin.firestore.FieldValue.increment(totalSize),
      'usage.lastUpdate': admin.firestore.FieldValue.serverTimestamp(),
      'usage.firestoreBreakdown': breakdown,
      'usage.stats.totalDocuments': totalDocs,
    });

    console.log(
      `[Calculate Firestore] ✅ Total: ${totalDocs} docs, ${(totalSize / 1024).toFixed(2)} KB`
    );

    return NextResponse.json({
      success: true,
      message: 'Firestore usage calculated successfully',
      data: {
        companyId,
        totalSize,
        totalDocs,
        totalSizeFormatted: `${(totalSize / 1024).toFixed(2)} KB`,
        breakdown,
      },
    });
  } catch (error) {
    console.error('[Calculate Firestore] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate Firestore usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
