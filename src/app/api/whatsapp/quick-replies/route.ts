/**
 * WhatsApp Quick Replies API
 * 
 * Verwaltet Schnellantworten für häufige Fragen
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const quickReplySchema = z.object({
  id: z.string().optional(),
  shortcut: z.string().min(1).max(20), // z.B. "/preis" oder "/öffnungszeiten"
  title: z.string().min(1).max(50),
  content: z.string().min(1).max(4096),
  category: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    defaultValue: z.string().optional(),
  })).optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'video']),
    mediaId: z.string().optional(),
    url: z.string().optional(),
    filename: z.string().optional(),
  })).optional(),
  usageCount: z.number().default(0),
});

const requestSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  quickReply: quickReplySchema.optional(),
  quickReplies: z.array(quickReplySchema).optional(),
});

// GET - Alle Schnellantworten abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    const snapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappQuickReplies')
      .get();

    let quickReplies: Array<{ id: string; shortcut?: string; title?: string; content?: string; category?: string; usageCount?: number; [key: string]: unknown }> = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Suche filtern
    if (search) {
      const searchLower = search.toLowerCase();
      quickReplies = quickReplies.filter(qr => 
        qr.shortcut?.toLowerCase().includes(searchLower) ||
        qr.title?.toLowerCase().includes(searchLower) ||
        qr.content?.toLowerCase().includes(searchLower)
      );
    }

    // Nach Nutzung sortieren (meistgenutzt zuerst)
    quickReplies.sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));

    // Kategorien extrahieren
    const categories = [...new Set(quickReplies.map(qr => qr.category).filter(Boolean))];

    return NextResponse.json({
      success: true,
      quickReplies,
      categories,
      total: quickReplies.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST - Schnellantwort erstellen/aktualisieren
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = requestSchema.parse(body);

    if (validated.quickReplies) {
      // Bulk-Update
      const batch = db.batch();
      
      for (const qr of validated.quickReplies) {
        const ref = qr.id 
          ? db.collection('companies').doc(validated.companyId).collection('whatsappQuickReplies').doc(qr.id)
          : db.collection('companies').doc(validated.companyId).collection('whatsappQuickReplies').doc();
        
        batch.set(ref, {
          ...qr,
          id: ref.id,
          updatedAt: new Date(),
        }, { merge: true });
      }

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${validated.quickReplies.length} Schnellantworten gespeichert`,
      });
    } else if (validated.quickReply) {
      const qr = validated.quickReply;
      
      // Prüfe ob Shortcut bereits existiert
      const existingSnapshot = await db
        .collection('companies')
        .doc(validated.companyId)
        .collection('whatsappQuickReplies')
        .where('shortcut', '==', qr.shortcut)
        .get();

      if (!existingSnapshot.empty && !qr.id) {
        return NextResponse.json({
          success: false,
          error: 'Dieser Shortcut wird bereits verwendet',
        }, { status: 400 });
      }

      const ref = qr.id 
        ? db.collection('companies').doc(validated.companyId).collection('whatsappQuickReplies').doc(qr.id)
        : db.collection('companies').doc(validated.companyId).collection('whatsappQuickReplies').doc();

      await ref.set({
        ...qr,
        id: ref.id,
        createdAt: qr.id ? undefined : new Date(),
        updatedAt: new Date(),
      }, { merge: true });

      return NextResponse.json({
        success: true,
        quickReplyId: ref.id,
        message: 'Schnellantwort gespeichert',
      });
    }

    return NextResponse.json({ success: false, error: 'Keine Schnellantwort angegeben' }, { status: 400 });
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

// PATCH - Nutzungszähler erhöhen
export async function PATCH(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const { companyId, quickReplyId } = body;

    if (!companyId || !quickReplyId) {
      return NextResponse.json({ success: false, error: 'companyId und quickReplyId erforderlich' }, { status: 400 });
    }

    const ref = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappQuickReplies')
      .doc(quickReplyId);

    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Schnellantwort nicht gefunden' }, { status: 404 });
    }

    const currentCount = doc.data()?.usageCount || 0;
    await ref.update({
      usageCount: currentCount + 1,
      lastUsedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      usageCount: currentCount + 1,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Aktualisieren',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// DELETE - Schnellantwort löschen
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const quickReplyId = searchParams.get('quickReplyId');

    if (!companyId || !quickReplyId) {
      return NextResponse.json({ success: false, error: 'companyId und quickReplyId erforderlich' }, { status: 400 });
    }

    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappQuickReplies')
      .doc(quickReplyId)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Schnellantwort gelöscht',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Löschen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
