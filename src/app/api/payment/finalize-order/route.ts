/**
 * Finalize Order API
 * 
 * Konvertiert einen temporaryJobDraft zu einem echten Auftrag in der auftraege Collection
 * nach erfolgreicher Escrow-Zahlung
 * 
 * WICHTIG: Verwendet Firestore Transaction um Race Conditions zu verhindern
 * wenn Webhook und Erfolgsseite gleichzeitig aufrufen
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse } from '@/lib/apiAuth';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    let body;
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { tempDraftId, escrowId } = body;

    if (!tempDraftId) {
      return NextResponse.json(
        { success: false, error: 'tempDraftId required' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // db ist ab hier garantiert nicht null - speichere in lokale Variable für TypeScript
    const firestore = db;

    const tempDraftRef = firestore.collection('temporaryJobDrafts').doc(tempDraftId);

    // Transaktion für atomare Prüfung und Erstellung - verhindert Duplikate
    const result = await firestore.runTransaction(async (transaction) => {
      // 1. TempJobDraft laden (innerhalb der Transaktion)
      const tempDraftDoc = await transaction.get(tempDraftRef);

      if (!tempDraftDoc.exists) {
        return { success: false, error: 'TempJobDraft nicht gefunden', status: 404 };
      }

      const tempDraftData = tempDraftDoc.data();
      
      // WICHTIG: Prüfe ob bereits konvertiert - verhindert Duplikate
      if (tempDraftData?.convertedToOrderId) {
        return {
          success: true,
          orderId: tempDraftData.convertedToOrderId,
          message: 'Auftrag bereits erstellt',
          alreadyExists: true,
        };
      }

      // 2. Escrow prüfen (wenn angegeben)
      if (escrowId) {
        const escrowRef = firestore.collection('escrows').doc(escrowId);
        const escrowDoc = await transaction.get(escrowRef);

        if (!escrowDoc.exists) {
          return { success: false, error: 'Escrow nicht gefunden', status: 404 };
        }

        const escrowData = escrowDoc.data();
        // Escrow muss mindestens pending oder held sein
        if (!['pending', 'held', 'funded'].includes(escrowData?.status)) {
          return { success: false, error: `Ungültiger Escrow-Status: ${escrowData?.status}`, status: 400 };
        }
      }

      // 3. Auftrag in auftraege Collection erstellen
      const orderData: Record<string, unknown> = {
        titel: tempDraftData?.titel || `Auftrag für ${tempDraftData?.selectedSubcategory || tempDraftData?.unterkategorie || 'Dienstleistung'}`,
        beschreibung: tempDraftData?.beschreibung || tempDraftData?.description || '',
        kategorie: tempDraftData?.kategorie || tempDraftData?.selectedCategory || '',
        unterkategorie: tempDraftData?.unterkategorie || tempDraftData?.selectedSubcategory || '',
        selectedSubcategory: tempDraftData?.selectedSubcategory || tempDraftData?.unterkategorie || '',
        selectedCategory: tempDraftData?.selectedCategory || tempDraftData?.kategorie || '',
        
        kundeId: tempDraftData?.kundeId || tempDraftData?.customerFirebaseUid || authResult.userId,
        customerFirebaseUid: tempDraftData?.customerFirebaseUid || authResult.userId,
        kundentyp: tempDraftData?.kundentyp || tempDraftData?.customerType || 'privat',
        
        selectedAnbieterId: tempDraftData?.anbieterId || tempDraftData?.selectedAnbieterId,
        providerName: tempDraftData?.providerName,
        
        jobDateFrom: tempDraftData?.jobDateFrom || tempDraftData?.date || null,
        jobDateTo: tempDraftData?.jobDateTo || null,
        time: tempDraftData?.time || tempDraftData?.jobTimePreference || null,
        jobTimePreference: tempDraftData?.jobTimePreference || null,
        auftragsDauer: tempDraftData?.auftragsDauer || tempDraftData?.jobDurationString || null,
        jobTotalCalculatedHours: tempDraftData?.jobTotalCalculatedHours || null,
        
        jobCalculatedPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
        totalPriceInCents: tempDraftData?.jobCalculatedPriceInCents || tempDraftData?.totalPriceInCents || 0,
        totalAmountPaidByBuyer: tempDraftData?.jobCalculatedPriceInCents || tempDraftData?.totalPriceInCents || 0,
        price: tempDraftData?.jobCalculatedPriceInCents ? tempDraftData.jobCalculatedPriceInCents / 100 : (tempDraftData?.price || tempDraftData?.preis || 0),
        totalAmount: tempDraftData?.jobCalculatedPriceInCents ? tempDraftData.jobCalculatedPriceInCents / 100 : (tempDraftData?.totalAmount || tempDraftData?.price || 0),
        currency: 'EUR',
        
        postalCode: tempDraftData?.postalCode || tempDraftData?.jobPostalCode || '',
        city: tempDraftData?.city || tempDraftData?.jobCity || '',
        street: tempDraftData?.street || tempDraftData?.jobStreet || '',
        
        status: 'zahlung_erhalten_clearing',
        
        escrowId: escrowId || null,
        paymentMethod: 'escrow',
        
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
        
        tempDraftId: tempDraftId,
        createdBy: 'success_page', // Markiere dass von Erfolgsseite erstellt
      };

      // B2B Felder
      if (tempDraftData?.isB2B || tempDraftData?.companyId) {
        orderData.isB2B = true;
        orderData.companyId = tempDraftData.companyId;
        orderData.companyName = tempDraftData.companyName;
      }

      // Neuen Auftrag erstellen (innerhalb der Transaktion)
      const orderRef = firestore.collection('auftraege').doc();
      transaction.set(orderRef, orderData);

      // 4. TempDraft als konvertiert markieren (innerhalb derselben Transaktion!)
      transaction.update(tempDraftRef, {
        convertedToOrderId: orderRef.id,
        convertedAt: FieldValue.serverTimestamp(),
        convertedBy: 'success_page',
        status: 'converted',
      });

      // 5. Escrow mit Order-ID verknüpfen (falls vorhanden)
      if (escrowId) {
        const escrowRef = firestore.collection('escrows').doc(escrowId);
        transaction.update(escrowRef, {
          finalOrderId: orderRef.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        success: true,
        orderId: orderRef.id,
        message: 'Auftrag erfolgreich erstellt',
        alreadyExists: false,
      };
    });

    // Ergebnis der Transaktion verarbeiten
    if (!result.success && result.status) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    console.log(`[Finalize Order] ${result.alreadyExists ? 'Order already exists' : 'Created order'} ${result.orderId} from tempDraft ${tempDraftId}`);

    return NextResponse.json({
      success: result.success,
      orderId: result.orderId,
      message: result.message,
    });

  } catch (error) {
    console.error('[Finalize Order] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
