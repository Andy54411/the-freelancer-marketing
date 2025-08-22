import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tempJobDraftId = searchParams.get('id');

  if (!tempJobDraftId) {
    return NextResponse.json({ error: 'tempJobDraftId parameter fehlt' }, { status: 400 });
  }

  try {
    const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
    const tempJobDraftSnapshot = await tempJobDraftRef.get();

    if (!tempJobDraftSnapshot.exists) {
      return NextResponse.json({
        exists: false,
        message: `temporaryJobDraft ${tempJobDraftId} nicht gefunden`,
      });
    }

    const data = tempJobDraftSnapshot.data();

    return NextResponse.json({
      exists: true,
      tempJobDraftId: tempJobDraftId,
      status: data?.status,
      convertedToOrderId: data?.convertedToOrderId,
      createdAt: data?.createdAt,
      customerFirebaseUid: data?.customerFirebaseUid,
      selectedAnbieterId: data?.selectedAnbieterId,
    });
  } catch (error: any) {
    console.error('[CHECK TEMPJOB ERROR]', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Prüfen des temporären Job-Entwurfs',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
