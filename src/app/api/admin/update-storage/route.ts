// src/app/api/admin/update-storage/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { admin } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, storageGB, initializeUsage } = body;

    if (!companyId || !storageGB) {
      return NextResponse.json(
        { error: 'Missing required parameters: companyId, storageGB' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const storageBytes = storageGB * 1024 * 1024 * 1024;
    const planId = `${storageGB}gb`;

    const companyRef = db.collection('companies').doc(companyId);

    const updateData: any = {
      storageLimit: storageBytes,
      storagePlanId: planId,
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      manuallyUpdated: true,
    };

    // Initialize usage object if requested
    if (initializeUsage) {
      updateData.usage = {
        storageUsed: 450560, // 440 KB
        firestoreUsed: 0,
        totalUsed: 450560,
        lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
        stats: {
          totalFiles: 1,
          totalDocuments: 0,
        },
      };
    }

    await companyRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: `Storage updated to ${storageGB} GB for company ${companyId}`,
      storageLimit: storageBytes,
      planId,
    });
  } catch (error) {
    console.error('Storage update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
