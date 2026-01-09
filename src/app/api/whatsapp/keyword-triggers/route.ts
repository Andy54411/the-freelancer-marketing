/**
 * WhatsApp Keyword Triggers API
 * 
 * Verwaltet automatische Antworten basierend auf Schlüsselwörtern
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const triggerSchema = z.object({
  id: z.string().optional(),
  keywords: z.array(z.string().min(1)).min(1),
  matchType: z.enum(['exact', 'contains', 'startsWith', 'endsWith', 'regex']),
  caseSensitive: z.boolean().default(false),
  response: z.object({
    type: z.enum(['text', 'template', 'interactive']),
    content: z.string().min(1),
    templateId: z.string().optional(),
    buttons: z.array(z.object({
      id: z.string(),
      title: z.string(),
    })).optional(),
  }),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  conditions: z.object({
    onlyFirstMessage: z.boolean().optional(),
    onlyDuringBusinessHours: z.boolean().optional(),
    onlyOutsideBusinessHours: z.boolean().optional(),
    maxTriggersPerDay: z.number().optional(),
  }).optional(),
});

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  triggers: z.array(triggerSchema).optional(),
  trigger: triggerSchema.optional(),
});

// GET - Alle Triggers abrufen
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

    const snapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappKeywordTriggers')
      .get();

    const triggers: Array<{ id: string; priority?: number; [key: string]: unknown }> = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sortiere nach Priorität (höher = zuerst)
    triggers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return NextResponse.json({
      success: true,
      triggers,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST - Trigger erstellen/aktualisieren
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = requestSchema.parse(body);

    if (validated.triggers) {
      // Bulk-Update
      const batch = db.batch();
      
      for (const trigger of validated.triggers) {
        const ref = trigger.id 
          ? db.collection('companies').doc(validated.companyId).collection('whatsappKeywordTriggers').doc(trigger.id)
          : db.collection('companies').doc(validated.companyId).collection('whatsappKeywordTriggers').doc();
        
        batch.set(ref, {
          ...trigger,
          id: ref.id,
          updatedAt: new Date(),
        }, { merge: true });
      }

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${validated.triggers.length} Trigger gespeichert`,
      });
    } else if (validated.trigger) {
      // Einzelner Trigger
      const trigger = validated.trigger;
      const ref = trigger.id 
        ? db.collection('companies').doc(validated.companyId).collection('whatsappKeywordTriggers').doc(trigger.id)
        : db.collection('companies').doc(validated.companyId).collection('whatsappKeywordTriggers').doc();

      await ref.set({
        ...trigger,
        id: ref.id,
        updatedAt: new Date(),
      }, { merge: true });

      return NextResponse.json({
        success: true,
        triggerId: ref.id,
        message: 'Trigger gespeichert',
      });
    }

    return NextResponse.json({ success: false, error: 'Keine Trigger angegeben' }, { status: 400 });
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

// DELETE - Trigger löschen
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const triggerId = searchParams.get('triggerId');

    if (!companyId || !triggerId) {
      return NextResponse.json({ success: false, error: 'companyId und triggerId erforderlich' }, { status: 400 });
    }

    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappKeywordTriggers')
      .doc(triggerId)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Trigger gelöscht',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Löschen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
