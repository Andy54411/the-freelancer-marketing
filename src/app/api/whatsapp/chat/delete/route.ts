import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { z } from 'zod';

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  phone: z.string().min(1, 'Telefonnummer erforderlich'),
});

/**
 * DELETE /api/whatsapp/chat/delete
 * 
 * Löscht alle WhatsApp-Nachrichten eines Chats anhand der Telefonnummer
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, phone } = requestSchema.parse(body);

    // Normalisiere Telefonnummer (nur Ziffern)
    const normalizedPhone = phone.replace(/\D/g, '');

    // Hole alle Nachrichten für diese Telefonnummer
    const messagesRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappMessages');

    // Hole alle Nachrichten und filtere nach Telefonnummer
    const allMessagesSnapshot = await messagesRef.get();
    
    // Lösche alle Nachrichten in Batches
    const batch = db.batch();
    let deleteCount = 0;

    allMessagesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const msgPhone = (data.customerPhone || '').replace(/\D/g, '');
      
      // Prüfe ob die Telefonnummer übereinstimmt
      if (msgPhone === normalizedPhone || 
          msgPhone.endsWith(normalizedPhone) || 
          normalizedPhone.endsWith(msgPhone)) {
        batch.delete(doc.ref);
        deleteCount++;
      }
    });

    if (deleteCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `${deleteCount} Nachrichten gelöscht`,
      deletedCount: deleteCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validierungsfehler', details: error.errors[0]?.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Löschen des Chats',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
