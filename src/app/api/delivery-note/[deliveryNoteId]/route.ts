import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';

export async function GET(
  request: NextRequest,
  { params }: { params: { deliveryNoteId: string } }
) {
  try {
    const deliveryNoteId = params.deliveryNoteId;

    if (!deliveryNoteId) {
      return NextResponse.json({ error: 'Lieferschein-ID ist erforderlich' }, { status: 400 });
    }

    console.log('🔍 Loading delivery note via API:', deliveryNoteId);

    // Direkter Firestore-Zugriff mit Admin-Berechtigung
    const docRef = doc(db, 'deliveryNotes', deliveryNoteId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log('❌ Delivery note not found:', deliveryNoteId);
      return NextResponse.json({ error: 'Lieferschein nicht gefunden' }, { status: 404 });
    }

    const data = docSnap.data();
    const deliveryNote = {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      sentAt: data.sentAt?.toDate(),
      deliveredAt: data.deliveredAt?.toDate(),
      invoicedAt: data.invoicedAt?.toDate(),
    };

    console.log('✅ Delivery note loaded successfully:', data.deliveryNoteNumber || 'Unknown');

    // Lade Firmendaten für das Template
    let companyData = {};
    if (data.companyId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', data.companyId));
        if (userDoc.exists()) {
          companyData = userDoc.data();
        }
      } catch (error) {
        console.warn('Could not load company data:', error);
      }
    }

    return NextResponse.json({
      deliveryNote,
      companyData,
      success: true,
    });
  } catch (error) {
    console.error('❌ Error loading delivery note via API:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Lieferscheins' }, { status: 500 });
  }
}
