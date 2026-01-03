/**
 * Company Payout API - Revolut/Escrow-basiert mit Level-System
 * 
 * POST - Auszahlung an Provider-Bankkonto anfordern
 * GET - Ausstehende Auszahlungen abrufen (mit Level-basierter Clearing-Periode)
 * 
 * Level-basierte Auszahlungszeiten:
 * - new/level1: 7 Tage Standard (kostenlos), 2 Tage Express (4,5% Gebühr)
 * - level2/top_rated: Sofortige Auszahlung (kostenlos)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse, isAuthorizedForCompany } from '@/lib/apiAuth';
import { type TaskiloLevel, PAYOUT_CONFIG } from '@/services/TaskiloLevelService';

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

      // WICHTIG: Prüfe ob alle Aufträge eine hochgeladene Rechnung haben
      const ordersWithoutInvoice: string[] = [];
      for (const escrow of escrows) {
        if (escrow.orderId) {
          const orderDoc = await adminDb.collection('auftraege').doc(escrow.orderId).get();
          if (orderDoc.exists) {
            const orderData = orderDoc.data();
            const invoiceStatus = orderData?.invoice?.status;
            // Nur 'uploaded' oder 'downloaded' erlauben Auszahlung
            if (!invoiceStatus || invoiceStatus === 'pending' || invoiceStatus === 'requested') {
              const title = orderData?.selectedSubcategory || `Auftrag ${escrow.orderId.slice(-6)}`;
              ordersWithoutInvoice.push(title);
            }
          }
        }
      }

      if (ordersWithoutInvoice.length > 0) {
        return NextResponse.json({ 
          error: 'Auszahlung nicht möglich - Rechnungen fehlen',
          message: `Für folgende Aufträge wurde noch keine Rechnung hochgeladen: ${ordersWithoutInvoice.join(', ')}. Bitte laden Sie zuerst alle Rechnungen hoch.`,
          ordersWithoutInvoice,
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

        // Pruefe ob ALLE Payouts erfolgreich waren
        const payoutResults = result.results as Array<{ orderId: string; success: boolean; paymentId?: string; error?: string }> | undefined;
        if (!payoutResults || payoutResults.length === 0) {
          throw new Error('Keine Payout-Ergebnisse erhalten');
        }

        const successfulPayouts = payoutResults.filter(r => r.success);
        const failedPayouts = payoutResults.filter(r => !r.success);

        // Nur erfolgreiche Escrows auf 'released' setzen
        for (const successResult of successfulPayouts) {
          const escrow = escrows.find(e => e.orderId === successResult.orderId);
          if (escrow) {
            await adminDb.collection('escrows').doc(escrow.id).update({
              status: 'released',
              releasedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              paymentId: successResult.paymentId,
            });
          }
        }

        // Wenn alle fehlgeschlagen sind, Fehler werfen
        if (successfulPayouts.length === 0) {
          const firstError = failedPayouts[0]?.error || 'Alle Auszahlungen fehlgeschlagen';
          throw new Error(firstError);
        }

        // Teilerfolg oder voller Erfolg
        const releasedAmount = successfulPayouts.reduce((sum, r) => {
          const escrow = escrows.find(e => e.orderId === r.orderId);
          return sum + (escrow?.providerAmount || escrow?.amount || 0);
        }, 0);

        return NextResponse.json({
          success: true,
          message: failedPayouts.length > 0
            ? `Teilweise erfolgreich: ${successfulPayouts.length}/${escrows.length} Auszahlungen`
            : `Auszahlung von ${(releasedAmount / 100).toFixed(2)} EUR eingeleitet`,
          amount: releasedAmount / 100,
          escrowsReleased: successfulPayouts.length,
          escrowsFailed: failedPayouts.length,
          failedOrders: failedPayouts.map(f => ({ orderId: f.orderId, error: f.error })),
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
    
    interface EscrowData {
      id: string;
      orderId?: string;
      amount?: number;
      providerAmount?: number;
      clearingEndsAt?: { toMillis: () => number; toDate?: () => Date };
      status?: string;
    }
    
    const releasableEscrows = availableEscrows.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as EscrowData)
      .filter((e) => e.clearingEndsAt && e.clearingEndsAt.toMillis() <= now.toMillis());

    if (releasableEscrows.length === 0) {
      return NextResponse.json({ 
        error: 'Keine auszahlbaren Beträge verfügbar',
        message: 'Alle Zahlungen befinden sich noch in der Clearing-Periode.',
      }, { status: 400 });
    }

    // WICHTIG: Prüfe ob alle Aufträge eine hochgeladene Rechnung haben
    const ordersWithoutInvoiceAuto: string[] = [];
    for (const escrow of releasableEscrows) {
      if (escrow.orderId) {
        const orderDoc = await adminDb.collection('auftraege').doc(escrow.orderId).get();
        if (orderDoc.exists) {
          const orderData = orderDoc.data();
          const invoiceStatus = orderData?.invoice?.status;
          if (!invoiceStatus || invoiceStatus === 'pending' || invoiceStatus === 'requested') {
            const title = orderData?.selectedSubcategory || `Auftrag ${escrow.orderId.slice(-6)}`;
            ordersWithoutInvoiceAuto.push(title);
          }
        }
      }
    }

    if (ordersWithoutInvoiceAuto.length > 0) {
      return NextResponse.json({ 
        error: 'Auszahlung nicht möglich - Rechnungen fehlen',
        message: `Für folgende Aufträge wurde noch keine Rechnung hochgeladen: ${ordersWithoutInvoiceAuto.join(', ')}. Bitte laden Sie zuerst alle Rechnungen hoch.`,
        ordersWithoutInvoice: ordersWithoutInvoiceAuto,
      }, { status: 400 });
    }

    const totalAmount = releasableEscrows.reduce((sum, e) => sum + (e.providerAmount || e.amount || 0), 0);

    return NextResponse.json({
      success: true,
      availableAmount: totalAmount,
      escrowCount: releasableEscrows.length,
      escrows: releasableEscrows.map((e) => ({
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

    // Hole Company-Daten für Tasker-Level
    const companyDoc = await adminDb.collection('companies').doc(companyId).get();
    const companyData = companyDoc.exists ? companyDoc.data() : null;
    const taskerLevel = (companyData?.taskerLevel?.currentLevel || 'new') as TaskiloLevel;
    const payoutConfig = PAYOUT_CONFIG[taskerLevel];

    // Hole alle Escrows für diese Company
    const escrowsSnapshot = await adminDb
      .collection('escrows')
      .where('providerId', '==', companyId)
      .get();

    interface EscrowDoc {
      id: string;
      orderId?: string;
      amount?: number;
      providerAmount?: number;
      clearingEndsAt?: { toMillis: () => number; toDate?: () => Date };
      status?: string;
      createdAt?: { toDate?: () => Date };
    }

    const escrows: EscrowDoc[] = escrowsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EscrowDoc);
    const now = admin.firestore.Timestamp.now();

    // Kategorisiere - mit Level-basierter Clearing-Periode
    const held = escrows.filter((e) => e.status === 'held');
    
    // Für Level 2 und Top Rated: Sofortige Verfügbarkeit (clearingDays = 0)
    const isInstantPayout = payoutConfig.clearingDays === 0;
    
    let clearing: EscrowDoc[];
    let available: EscrowDoc[];
    
    if (isInstantPayout) {
      // Level 2 + Top Rated: Alle held Escrows sind sofort verfügbar
      clearing = [];
      available = held;
    } else {
      // new + level1: Standard Clearing-Periode prüfen
      clearing = held.filter((e) => e.clearingEndsAt && e.clearingEndsAt.toMillis() > now.toMillis());
      available = held.filter((e) => !e.clearingEndsAt || e.clearingEndsAt.toMillis() <= now.toMillis());
    }
    
    const released = escrows.filter((e) => e.status === 'released');

    // WICHTIG: Escrow-Beträge sind in CENTS gespeichert, konvertiere zu EUR
    const centsToEur = (cents: number) => cents / 100;
    
    const clearingTotalCents = clearing.reduce((sum, e: { providerAmount?: number; amount?: number }) => sum + (e.providerAmount || e.amount || 0), 0);
    const availableTotalCents = available.reduce((sum, e: { providerAmount?: number; amount?: number }) => sum + (e.providerAmount || e.amount || 0), 0);
    const releasedTotalCents = released.reduce((sum, e: { providerAmount?: number; amount?: number }) => sum + (e.providerAmount || e.amount || 0), 0);
    
    // Konvertiere zu EUR
    const clearingTotal = centsToEur(clearingTotalCents);
    const availableTotal = centsToEur(availableTotalCents);
    const releasedTotal = centsToEur(releasedTotalCents);

    // Hole Rechnungsstatus für alle verfügbaren Escrows
    const ordersWithInvoiceStatus = await Promise.all(
      available.map(async (e: { id: string; orderId?: string; providerAmount?: number; amount?: number; createdAt?: { toDate?: () => Date } }) => {
        let invoiceStatus: string | undefined;
        let projectTitle = '';
        let realOrderId = e.orderId;
        
        if (e.orderId) {
          // Zuerst: Versuche den Auftrag direkt zu finden
          let orderDoc = await adminDb.collection('auftraege').doc(e.orderId).get();
          
          // Falls nicht gefunden: Suche nach tempDraftId (Escrow speichert manchmal die Draft-ID)
          if (!orderDoc.exists) {
            const ordersByDraft = await adminDb.collection('auftraege')
              .where('tempDraftId', '==', e.orderId)
              .limit(1)
              .get();
            
            if (!ordersByDraft.empty) {
              orderDoc = ordersByDraft.docs[0];
              realOrderId = orderDoc.id; // Die echte Auftrags-ID
            }
          }
          
          if (orderDoc.exists) {
            const orderData = orderDoc.data();
            invoiceStatus = orderData?.invoice?.status;
            projectTitle = orderData?.selectedSubcategory || orderData?.serviceTitle || `Auftrag ${realOrderId?.slice(-6) || 'unbekannt'}`;
          }
        }
        
        return {
          id: e.id,
          orderId: realOrderId, // Verwende die echte Auftrags-ID
          amount: centsToEur(e.providerAmount || e.amount || 0),
          createdAt: e.createdAt?.toDate?.() || e.createdAt,
          invoiceStatus,
          projectTitle,
        };
      })
    );

    // Prüfe ob alle Aufträge eine hochgeladene Rechnung haben
    const ordersWithMissingInvoices = ordersWithInvoiceStatus.filter(
      o => !o.invoiceStatus || o.invoiceStatus === 'pending' || o.invoiceStatus === 'requested'
    );

    // Berechne Payout-Optionen basierend auf Level
    const standardFee = availableTotal * (payoutConfig.standardFeePercent / 100);
    const expressFee = availableTotal * (payoutConfig.expressFeePercent / 100);

    return NextResponse.json({
      success: true,
      // Level-Info
      taskerLevel,
      payoutConfig: {
        clearingDays: payoutConfig.clearingDays,
        expressAvailable: payoutConfig.expressAvailable,
        expressDays: payoutConfig.expressDays,
        expressFeePercent: payoutConfig.expressFeePercent,
        standardFeePercent: payoutConfig.standardFeePercent,
        isInstantPayout,
      },
      // Balance-Info
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
      // Payout-Optionen
      payoutOptions: {
        standard: {
          name: isInstantPayout ? 'Sofortige Auszahlung' : 'Standard Auszahlung',
          fee: standardFee,
          feePercentage: payoutConfig.standardFeePercent,
          estimatedTime: isInstantPayout ? 'Sofort' : `${payoutConfig.clearingDays} Tage`,
          description: isInstantPayout 
            ? 'Als Level 2+ Tasker erhalten Sie sofortige, kostenlose Auszahlungen.'
            : `Standard-Auszahlung nach ${payoutConfig.clearingDays} Tagen Clearing-Periode. Kostenlos.`,
          finalAmount: availableTotal - standardFee,
          available: availableTotal > 0,
        },
        express: payoutConfig.expressAvailable ? {
          name: 'Express Auszahlung',
          fee: expressFee,
          feePercentage: payoutConfig.expressFeePercent,
          estimatedTime: `${payoutConfig.expressDays} Tage`,
          description: `Express-Auszahlung in ${payoutConfig.expressDays} Tagen. Gebühr: ${payoutConfig.expressFeePercent}%`,
          finalAmount: availableTotal - expressFee,
          available: availableTotal > 0,
        } : null,
      },
      // Aufträge
      availableEscrows: ordersWithInvoiceStatus,
      availableAmount: availableTotal,
      orderCount: available.length,
      orders: ordersWithInvoiceStatus,
      ordersWithMissingInvoices: ordersWithMissingInvoices.length,
      canPayout: ordersWithMissingInvoices.length === 0 && availableTotal > 0,
    });

  } catch (error) {
    console.error('[Payout GET] Error:', error);
    return NextResponse.json(
      { error: 'Interner Server-Fehler', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
