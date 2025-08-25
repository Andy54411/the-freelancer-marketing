// src/app/api/list-temp-drafts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(req: NextRequest) {
  try {

    const snapshot = await db.collection('temporaryJobDrafts')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const drafts = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    return NextResponse.json({
      success: true,
      count: drafts.length,
      drafts: drafts
    });

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firebaseUserId } = body;

    let query = db.collection('temporaryJobDrafts').orderBy('createdAt', 'desc');

    if (firebaseUserId) {
      query = query.where('firebaseUserId', '==', firebaseUserId) as any;
    }

    const snapshot = await query.limit(10).get();

    const drafts = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    return NextResponse.json({
      success: true,
      firebaseUserId: firebaseUserId,
      count: drafts.length,
      drafts: drafts
    });

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
