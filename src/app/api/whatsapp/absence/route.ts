/**
 * WhatsApp Absence/Auto-Reply API
 * 
 * Verwaltet Abwesenheitsnotizen und automatische Antworten
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const absenceSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  enabled: z.boolean(),
  type: z.enum(['vacation', 'sick', 'meeting', 'custom']),
  startDate: z.string().optional(), // ISO String
  endDate: z.string().optional(),
  message: z.string().min(1, 'Abwesenheitsnachricht erforderlich'),
  includeReturnDate: z.boolean().default(true),
  alternativeContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  autoReplyOnce: z.boolean().default(true), // Nur einmal pro Kontakt antworten
  excludeContacts: z.array(z.string()).optional(), // Telefonnummern die keine Auto-Reply bekommen
});

// GET - Abwesenheitseinstellungen abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    const doc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappSettings')
      .doc('absence')
      .get();

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        absence: {
          enabled: false,
          type: 'custom',
          message: 'Vielen Dank für Ihre Nachricht. Ich bin derzeit abwesend und werde mich nach meiner Rückkehr bei Ihnen melden.',
          includeReturnDate: true,
          autoReplyOnce: true,
        },
        isActive: false,
      });
    }

    const data = doc.data();

    // Prüfe ob Abwesenheit gerade aktiv ist
    const now = new Date();
    let isActive = data?.enabled || false;

    if (isActive && data?.startDate && data?.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      isActive = now >= start && now <= end;
    }

    return NextResponse.json({
      success: true,
      absence: data,
      isActive,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST - Abwesenheitseinstellungen speichern
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = absenceSchema.parse(body);

    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappSettings')
      .doc('absence')
      .set({
        ...validated,
        updatedAt: new Date(),
      }, { merge: true });

    // Wenn aktiviert, setze Auto-Reply-Tracking zurück
    if (validated.enabled) {
      await db
        .collection('companies')
        .doc(validated.companyId)
        .collection('whatsappSettings')
        .doc('absenceReplies')
        .set({
          repliedTo: [],
          resetAt: new Date(),
        });
    }

    return NextResponse.json({
      success: true,
      message: validated.enabled ? 'Abwesenheit aktiviert' : 'Abwesenheit deaktiviert',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validierungsfehler', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Speichern',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// DELETE - Abwesenheit deaktivieren
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappSettings')
      .doc('absence')
      .update({
        enabled: false,
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: 'Abwesenheit deaktiviert',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Deaktivieren',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
