/**
 * Company Payout API - Revolut/Escrow-basiert
 * 
 * POST - Auszahlung an Provider-Bankkonto anfordern
 * GET - Ausstehende Auszahlungen abrufen
 * 
 * Ersetzt Stripe Payouts durch Revolut Business API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse, isAuthorizedForCompany } from '@/lib/apiAuth';

const PAYMENT_BACKEND_URL = process.env.PAYMENT_BACKEND_URL || 'https://mail.taskilo.de';
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || process.env.WEBMAIL_API_KEY;

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { uid: companyId } = await params;

    // Prüfe Berechtigung
    if (!isAuthorizedForCompany(authResult.userId, companyId, authResult.token)) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    // Firebase Admin
    const { admin } = await import('@/firebase/server');
    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();
    const body = await request.json();
    const { escrowIds } = body;

    // Hole Company-Daten für Bankverbindung
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data()!;
    
    // Prüfe Bankverbindung
    const iban = companyData.iban || companyData.bankDetails?.iban || companyData.step3?.iban;
    if (!iban) {
      return NextResponse.json({ 
        error: 'Keine Bankverbindung hinterlegt',
        message: 'Bitte fügen Sie Ihre IBAN in den Unternehmenseinstellungen hinzu.',
      }, { status: 400 });
    }

    // Wenn spezifische Escrows angegeben
    if (escrowIds && Array.isArray(escrowIds)) {
      // Hole alle angegebenen Escrows
      const escrows: Array<{ id: string; orderId?: string; amount: number; providerAmount?: number; currency?: string; providerId?: string; status?: string }> = [];
      for (const escrowId of escrowIds) {
        const escrowDoc = await adminDb.collection('escrows').doc(escrowId).get();
        if (escrowDoc.exists) {
          const data = escrowDoc.data()!;
          if (data.providerId === companyId && data.status === 'held') {
            escrows.push({ 
              id: escrowId, 
              orderId: data.orderId,
              amount: data.amount || 0,
              providerAmount: data.providerAmount,
              currency: data.currency,
              providerId: data.providerId,
              status: data.status,
            });
          }
        }
      }

      if (escrows.length === 0) {
        return NextResponse.json({ 
          error: 'Keine auszahlbaren Escrows gefunden' 
        }, { status: 400 });
      }

      // Berechne Gesamtbetrag
      const totalAmount = escrows.reduce((sum, e) => sum + (e.providerAmount || e.amount), 0);

      // Rufe Payment Backend für Batch-Payout
      try {
        const response = await fetch(`${PAYMENT_BACKEND_URL}/api/payment/payout/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': PAYMENT_API_KEY || '',
          },
          body: JSON.stringify({
            payouts: escrows.map(e => ({
              orderId: e.orderId,
              providerId: companyId,
              amount: e.providerAmount || e.amount,
              currency: e.currency || 'EUR',
              iban: iban,
              bic: companyData.bic || companyData.bankDetails?.bic,
              name: companyData.companyName || companyData.name,
              reference: `Taskilo Auszahlung ${e.orderId}`,
            })),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Payout Backend Fehler');
        }

        // Update Escrows auf 'released'
        for (const escrow of escrows) {
          await adminDb.collection('escrows').doc(escrow.id).update({
            status: 'released',
            releasedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return NextResponse.json({
          success: true,
          message: `Auszahlung von ${totalAmount.toFixed(2)} EUR eingeleitet`,
          amount: totalAmount,
          escrowsReleased: escrows.length,
        });
      } catch (backendError) {
        console.error('[Payout] Backend error:', backendError);
        return NextResponse.json({ 
          error: 'Auszahlung fehlgeschlagen',
          details: backendError instanceof Error ? backendError.message : 'Unknown',
        }, { status: 500 });
      }
    }

    // Ohne spezifische Escrows: Hole alle verfügbaren
    const availableEscrows = await adminDb
      .collection('escrows')
      .where('providerId', '==', companyId)
      .where('status', '==', 'held')
      .get();

    // Filter: Nur Escrows mit abgelaufener Clearing-Periode
    const now = admin.firestore.Timestamp.now();
    const releasableEscrows = availableEscrows.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((e: any) => e.clearingEndsAt && e.clearingEndsAt.toMillis() <= now.toMillis());

    if (releasableEscrows.length === 0) {
      return NextResponse.json({ 
        error: 'Keine auszahlbaren Beträge verfügbar',
        message: 'Alle Zahlungen befinden sich noch in der Clearing-Periode.',
      }, { status: 400 });
    }

    const totalAmount = releasableEscrows.reduce((sum, e: any) => sum + (e.providerAmount || e.amount), 0);

    return NextResponse.json({
      success: true,
      availableAmount: totalAmount,
      escrowCount: releasableEscrows.length,
      escrows: releasableEscrows.map((e: any) => ({
        id: e.id,
        orderId: e.orderId,
        amount: e.providerAmount || e.amount,
        clearingEndsAt: e.clearingEndsAt?.toDate?.() || e.clearingEndsAt,
      })),
      message: 'Nutzen Sie POST mit escrowIds um Auszahlung zu initiieren',
    });

  } catch (error) {
    console.error('[Payout] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { uid: companyId } = await params;

    // Prüfe Berechtigung
    if (!isAuthorizedForCompany(authResult.userId, companyId, authResult.token)) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    // Firebase Admin
    const { admin } = await import('@/firebase/server');
    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();

    // Hole alle Escrows für diese Company
    const escrowsSnapshot = await adminDb
      .collection('escrows')
      .where('providerId', '==', companyId)
      .get();

    const escrows = escrowsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const now = admin.firestore.Timestamp.now();

    // Kategorisiere
    const held = escrows.filter((e: any) => e.status === 'held');
    const clearing = held.filter((e: any) => e.clearingEndsAt && e.clearingEndsAt.toMillis() > now.toMillis());
    const available = held.filter((e: any) => !e.clearingEndsAt || e.clearingEndsAt.toMillis() <= now.toMillis());
    const released = escrows.filter((e: any) => e.status === 'released');

    const clearingTotal = clearing.reduce((sum, e: any) => sum + (e.providerAmount || e.amount || 0), 0);
    const availableTotal = available.reduce((sum, e: any) => sum + (e.providerAmount || e.amount || 0), 0);
    const releasedTotal = released.reduce((sum, e: any) => sum + (e.providerAmount || e.amount || 0), 0);

    return NextResponse.json({
      success: true,
      balance: {
        inClearing: clearingTotal,
        available: availableTotal,
        released: releasedTotal,
        currency: 'EUR',
      },
      counts: {
        inClearing: clearing.length,
        available: available.length,
        released: released.length,
      },
      availableEscrows: available.map((e: any) => ({
        id: e.id,
        orderId: e.orderId,
        amount: e.providerAmount || e.amount,
        createdAt: e.createdAt?.toDate?.() || e.createdAt,
      })),
    });

  } catch (error) {
    console.error('[Payout GET] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
