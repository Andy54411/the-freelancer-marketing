// src/app/api/admin/initialize-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, storageUsed = 0, firestoreUsed = 0 } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    console.log(`[Initialize Usage] Setting usage for company: ${companyId}`);
    console.log(`  Storage: ${storageUsed} bytes`);
    console.log(`  Firestore: ${firestoreUsed} bytes`);

    const db = admin.firestore();
    const companyRef = db.collection('companies').doc(companyId);

    // Update mit merge (überschreibt nicht andere Felder)
    await companyRef.set(
      {
        usage: {
          storageUsed,
          firestoreUsed,
          totalUsed: storageUsed + firestoreUsed,
          lastUpdate: new Date(),
          stats: {
            totalFiles: 1,
            totalDocuments: 0,
          },
        },
      },
      { merge: true }
    );

    console.log('[Initialize Usage] ✅ Usage initialized successfully');

    return NextResponse.json({
      success: true,
      message: 'Usage initialized successfully',
      data: {
        companyId,
        storageUsed,
        firestoreUsed,
        totalUsed: storageUsed + firestoreUsed,
      },
    });
  } catch (error) {
    console.error('[Initialize Usage] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
