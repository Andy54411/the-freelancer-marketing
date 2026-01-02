/**
 * Debug API to check temporaryJobDrafts
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('id');

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    if (draftId) {
      const draftDoc = await db.collection('temporaryJobDrafts').doc(draftId).get();
      if (!draftDoc.exists) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        draft: { id: draftDoc.id, ...draftDoc.data() },
      });
    }

    // Get recent drafts
    const draftsSnap = await db.collection('temporaryJobDrafts').limit(5).get();
    const drafts = draftsSnap.docs.map(doc => ({
      id: doc.id,
      kundeId: doc.data().kundeId,
      customerFirebaseUid: doc.data().customerFirebaseUid,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    return NextResponse.json({ success: true, drafts });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
