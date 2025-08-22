// src/app/api/test-job-conversion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentIntentId, tempJobDraftId, firebaseUserId } = body;

    console.log('[TEST JOB CONVERSION] Testing job conversion for:', {
      paymentIntentId,
      tempJobDraftId,
      firebaseUserId,
    });

    if (!tempJobDraftId || !firebaseUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'tempJobDraftId und firebaseUserId sind erforderlich',
        },
        { status: 400 }
      );
    }

    // Prüfe ob der temporäre Job-Entwurf existiert
    const tempJobDraftRef = db.collection('temporaryJobDrafts').doc(tempJobDraftId);
    const tempJobDraftSnapshot = await tempJobDraftRef.get();

    if (!tempJobDraftSnapshot.exists) {
      return NextResponse.json({
        success: false,
        error: `Temporärer Job-Entwurf ${tempJobDraftId} nicht gefunden`,
        availableDrafts: await getAllTempDrafts(),
      });
    }

    const tempJobDraftData = tempJobDraftSnapshot.data()!;

    if (tempJobDraftData.status === 'converted') {
      return NextResponse.json({
        success: false,
        error: 'Job-Entwurf wurde bereits konvertiert',
        jobDraftData: tempJobDraftData,
      });
    }

    // ECHTE KONVERTIERUNG - Erstelle Order
    const orderData = {
      ...tempJobDraftData,
      status: 'confirmed',
      paymentStatus: 'paid',
      createdAt: new Date(),
      updatedAt: new Date(),
      orderId: `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId: paymentIntentId || 'test_payment_intent',
    };

    // Füge zur auftraege Collection hinzu
    const orderRef = await db.collection('auftraege').add(orderData);

    // Markiere tempJobDraft als konvertiert (lösche nicht, für Debug-Zwecke)
    await tempJobDraftRef.update({
      status: 'converted',
      convertedAt: new Date(),
      convertedToOrderId: orderRef.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Job erfolgreich konvertiert zu Order',
      orderId: orderRef.id,
      orderData,
      tempJobDraftId: tempJobDraftId,
    });
  } catch (error) {
    console.error('[TEST JOB CONVERSION] Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

async function getAllTempDrafts() {
  try {
    const snapshot = await db
      .collection('temporaryJobDrafts')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data(),
    }));
  } catch (error) {
    console.error('Fehler beim Laden der temporären Job-Entwürfe:', error);
    return [];
  }
}
