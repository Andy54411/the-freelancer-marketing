import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

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

    // Verwende Firebase Admin SDK für server-seitigen Zugriff
    const docRef = db.collection('deliveryNotes').doc(deliveryNoteId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('❌ Delivery note not found:', deliveryNoteId);
      return NextResponse.json({ error: 'Lieferschein nicht gefunden' }, { status: 404 });
    }

    const data = docSnap.data()!;
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
    let companyData: any = {};
    if (data.companyId) {
      try {
        // Versuche erst companies Collection
        const companyDoc = await db.collection('companies').doc(data.companyId).get();
        if (companyDoc.exists) {
          companyData = companyDoc.data()!;
          console.log('✅ Company data loaded from companies collection');
        } else {
          // Fallback: users Collection
          const userDoc = await db.collection('users').doc(data.companyId).get();
          if (userDoc.exists) {
            companyData = userDoc.data()!;
            console.log('✅ Company data loaded from users collection');
          }
        }
        
        // Debug: Log welche profilePictureURL gefunden wurde
        const profileUrl = companyData.profilePictureURL || companyData.profilePictureFirebaseUrl;
        console.log('🖼️ Profile picture URL found:', profileUrl);
        
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
