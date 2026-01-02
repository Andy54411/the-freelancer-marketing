/**
 * API to finalize missing orders from paid TempDrafts
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { tempDraftId } = await request.json();

    if (!tempDraftId) {
      return NextResponse.json({ error: 'tempDraftId required' }, { status: 400 });
    }

    // 1. TempJobDraft laden
    const tempDraftRef = db.collection('temporaryJobDrafts').doc(tempDraftId);
    const tempDraftDoc = await tempDraftRef.get();

    if (!tempDraftDoc.exists) {
      return NextResponse.json({ error: 'TempDraft not found' }, { status: 404 });
    }

    const tempDraftData = tempDraftDoc.data();
    
    // Prüfe ob bereits konvertiert
    if (tempDraftData?.convertedToOrderId) {
      return NextResponse.json({
        success: true,
        orderId: tempDraftData.convertedToOrderId,
        message: 'Auftrag bereits erstellt',
        alreadyExists: true,
      });
    }

    // 2. Auftrag erstellen
    const orderData: Record<string, unknown> = {
      titel: tempDraftData?.titel || `Auftrag für ${tempDraftData?.selectedSubcategory || tempDraftData?.unterkategorie || 'Dienstleistung'}`,
      beschreibung: tempDraftData?.beschreibung || tempDraftData?.description || '',
      kategorie: tempDraftData?.kategorie || tempDraftData?.selectedCategory || '',
      unterkategorie: tempDraftData?.unterkategorie || tempDraftData?.selectedSubcategory || '',
      selectedSubcategory: tempDraftData?.selectedSubcategory || tempDraftData?.unterkategorie || '',
      selectedCategory: tempDraftData?.selectedCategory || tempDraftData?.kategorie || '',
      
      kundeId: tempDraftData?.kundeId || tempDraftData?.customerFirebaseUid,
      customerFirebaseUid: tempDraftData?.customerFirebaseUid || tempDraftData?.kundeId,
      kundentyp: tempDraftData?.kundentyp || tempDraftData?.customerType || 'privat',
      
      selectedAnbieterId: tempDraftData?.anbieterId || tempDraftData?.selectedAnbieterId,
      providerName: tempDraftData?.providerName,
      
      jobDateFrom: tempDraftData?.jobDateFrom || null,
      jobDateTo: tempDraftData?.jobDateTo || null,
      time: tempDraftData?.time || tempDraftData?.jobTimePreference || null,
      jobTimePreference: tempDraftData?.jobTimePreference || null,
      auftragsDauer: tempDraftData?.auftragsDauer || tempDraftData?.jobDurationString || null,
      jobTotalCalculatedHours: tempDraftData?.jobTotalCalculatedHours || null,
      
      jobCalculatedPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
      totalPriceInCents: tempDraftData?.jobCalculatedPriceInCents || 0,
      price: tempDraftData?.jobCalculatedPriceInCents ? tempDraftData.jobCalculatedPriceInCents / 100 : 0,
      totalAmount: tempDraftData?.jobCalculatedPriceInCents ? tempDraftData.jobCalculatedPriceInCents / 100 : 0,
      currency: 'EUR',
      
      postalCode: tempDraftData?.postalCode || tempDraftData?.jobPostalCode || '',
      city: tempDraftData?.city || tempDraftData?.jobCity || '',
      street: tempDraftData?.street || tempDraftData?.jobStreet || '',
      
      status: 'zahlung_erhalten_clearing',
      paymentMethod: 'escrow',
      
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
      
      tempDraftId: tempDraftId,
    };

    // B2B Felder
    if (tempDraftData?.isB2B || tempDraftData?.companyId) {
      orderData.isB2B = true;
      orderData.companyId = tempDraftData.companyId;
      orderData.companyName = tempDraftData.companyName;
    }

    const orderRef = await db.collection('auftraege').add(orderData);

    // 3. TempDraft als konvertiert markieren
    await tempDraftRef.update({
      convertedToOrderId: orderRef.id,
      convertedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      message: 'Auftrag erfolgreich erstellt',
      alreadyExists: false,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
