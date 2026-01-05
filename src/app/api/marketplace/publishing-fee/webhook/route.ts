/**
 * Webhook für die Marktplatz-Veröffentlichungsgebühr
 * 
 * Wird vom Hetzner Payment-System aufgerufen wenn die Zahlung erfolgreich war.
 * Aktiviert das Projekt im Marktplatz.
 * 
 * POST /api/marketplace/publishing-fee/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // API-Key prüfen
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.HETZNER_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await import('@/firebase/server');
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { 
      type, 
      metadata, 
      paymentIntentId,
      status: paymentStatus 
    } = body;

    // Nur für Publishing-Fee Events
    if (type !== 'marketplace_publishing_fee' && metadata?.type !== 'marketplace_publishing_fee') {
      return NextResponse.json({ 
        success: true, 
        message: 'Nicht relevanter Event-Typ' 
      });
    }

    // Nur erfolgreiche Zahlungen verarbeiten
    if (paymentStatus !== 'succeeded' && paymentStatus !== 'paid') {
      return NextResponse.json({ 
        success: true, 
        message: 'Zahlung nicht erfolgreich' 
      });
    }

    const { projectId, publishingFeeId, customerId } = metadata || {};

    if (!projectId || !publishingFeeId) {
      return NextResponse.json(
        { error: 'projectId und publishingFeeId erforderlich' },
        { status: 400 }
      );
    }

    // Publishing-Fee als bezahlt markieren
    const feeRef = db.collection('marketplace_publishing_fees').doc(publishingFeeId);
    await feeRef.update({
      status: 'paid',
      paymentIntentId,
      paidAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Projekt aktivieren
    const projectRef = db.collection('project_requests').doc(projectId);
    await projectRef.update({
      status: 'active',
      isActive: true,
      isPublic: true,
      publishingFeePaid: true,
      publishingFeePaidAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Optional: Benachrichtigung an den Kunden senden
    if (customerId) {
      try {
        await db.collection('notifications').add({
          userId: customerId,
          type: 'marketplace_project_published',
          title: 'Projekt im Marktplatz veröffentlicht',
          message: 'Ihr Projekt wurde erfolgreich im Marktplatz veröffentlicht. Anbieter können jetzt Angebote abgeben.',
          data: {
            projectId,
            action: 'view_project',
          },
          read: false,
          createdAt: Timestamp.now(),
        });
      } catch {
        // Benachrichtigung ist optional, Fehler ignorieren
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Projekt erfolgreich aktiviert',
      projectId,
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
