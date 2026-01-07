import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { createIndexErrorResponse, parseFirestoreIndexError } from '@/lib/firestore-index-handler';

const postSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  phone: z.string().min(1, 'Telefonnummer erforderlich'),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  })),
  syncToCustomer: z.boolean().optional().default(true), // Synchronisiere zu Kundenprofil
});

/**
 * GET /api/whatsapp/chat/tags
 * Lädt Tags für einen Chat
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
    
    const tagDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappChatTags')
      .doc(normalizedPhone)
      .get();

    if (!tagDoc.exists) {
      return NextResponse.json({ success: true, tags: [] });
    }

    return NextResponse.json({
      success: true,
      tags: tagDoc.data()?.tags || [],
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
        error: 'Fehler beim Laden der Tags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/chat/tags
 * Speichert Tags für einen Chat
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
    const { companyId, phone, tags, syncToCustomer } = postSchema.parse(body);

    const normalizedPhone = phone.replace(/\D/g, '');

    // Speichere WhatsApp Chat Tags
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappChatTags')
      .doc(normalizedPhone)
      .set({
        phone: normalizedPhone,
        tags,
        updatedAt: new Date(),
      });

    // Synchronisiere Tags zum Kundenprofil wenn aktiviert
    if (syncToCustomer !== false) {
      // Finde Kunde anhand Telefonnummer
      const phoneVariants = [
        phone,
        `+${normalizedPhone}`,
        normalizedPhone,
        `+49${normalizedPhone.slice(-10)}`,
        `0${normalizedPhone.slice(-10)}`,
        normalizedPhone.slice(-10),
      ];

      let customerId: string | null = null;
      
      for (const phoneVariant of phoneVariants) {
        const customersSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('customers')
          .where('phone', '==', phoneVariant)
          .limit(1)
          .get();

        if (!customersSnapshot.empty) {
          customerId = customersSnapshot.docs[0].id;
          break;
        }
      }

      // Wenn Kunde gefunden, Tags synchronisieren
      if (customerId) {
        const tagNames = tags.map(t => t.name);
        
        // Hole aktuelle Kunden-Tags
        const customerDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('customers')
          .doc(customerId)
          .get();
        
        const existingTags: string[] = customerDoc.data()?.tags || [];
        
        // Füge neue WhatsApp-Tags hinzu (ohne Duplikate)
        const mergedTags = [...new Set([...existingTags, ...tagNames])];
        
        await db
          .collection('companies')
          .doc(companyId)
          .collection('customers')
          .doc(customerId)
          .update({
            tags: mergedTags,
            updatedAt: FieldValue.serverTimestamp(),
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tags gespeichert',
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
        error: 'Fehler beim Speichern der Tags',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
