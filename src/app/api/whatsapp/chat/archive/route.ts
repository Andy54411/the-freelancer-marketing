import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { z } from 'zod';

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  customerId: z.string().min(1, 'Customer ID erforderlich'),
});

/**
 * POST /api/whatsapp/chat/archive
 * 
 * Archiviert einen WhatsApp-Chat (versteckt ihn aus der Hauptliste)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, customerId } = requestSchema.parse(body);

    // Erstelle oder aktualisiere Archiv-Eintrag
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappArchivedChats')
      .doc(customerId)
      .set({
        customerId,
        archivedAt: new Date().toISOString(),
        archivedBy: 'user', // TODO: Add actual user ID from auth
      });

    return NextResponse.json({
      success: true,
      message: 'Chat erfolgreich archiviert',
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
        error: 'Fehler beim Archivieren des Chats',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
