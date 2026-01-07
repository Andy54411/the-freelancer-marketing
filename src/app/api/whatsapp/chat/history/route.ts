import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { createIndexErrorResponse, parseFirestoreIndexError } from '@/lib/firestore-index-handler';

const postSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  phone: z.string().min(1, 'Telefonnummer erforderlich'),
  action: z.enum(['opened', 'closed', 'handled', 'assigned', 'tagged']),
  agent: z.string().min(1, 'Agent erforderlich'),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/whatsapp/chat/history
 * Lädt Chat-Historie für einen Chat
 */
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const phone = searchParams.get('phone');

    if (!companyId || !phone) {
      return NextResponse.json(
        { success: false, error: 'companyId und phone erforderlich' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    
    // Lade Historie ohne orderBy (vermeidet Index-Anforderung)
    const historySnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappChatHistory')
      .where('phone', '==', normalizedPhone)
      .limit(50)
      .get();

    // Sortiere im Code nach Datum (neueste zuerst)
    const history = historySnapshot.docs
      .map(doc => {
        const data = doc.data();
        const dateValue = data.date?.toDate?.() || data.date || new Date();
        return {
          id: doc.id,
          ...data,
          date: dateValue,
        };
      })
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return dateB - dateA; // Neueste zuerst
      })
      .slice(0, 20); // Limitiere auf 20 Einträge

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    // Prüfe auf Index-Fehler
    const indexError = parseFirestoreIndexError(error);
    if (indexError.isIndexError) {
      return NextResponse.json(createIndexErrorResponse(error), { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Historie',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/chat/history
 * Speichert einen Historie-Eintrag
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, phone, action, agent, tags } = postSchema.parse(body);

    const normalizedPhone = phone.replace(/\D/g, '');

    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappChatHistory')
      .add({
        phone: normalizedPhone,
        action,
        agent,
        tags: tags || [],
        date: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: 'Historie-Eintrag gespeichert',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
