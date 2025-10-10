// src/app/api/admin/get-usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const db = admin.firestore();
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const data = companyDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        companyId,
        companyName: data?.companyName,
        storageLimit: data?.storageLimit,
        storagePlanId: data?.storagePlanId,
        usage: data?.usage || null,
      },
    });
  } catch (error) {
    console.error('[Get Usage] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
