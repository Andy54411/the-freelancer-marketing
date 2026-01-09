/**
 * WhatsApp Message Scheduling API
 * 
 * POST - Nachricht planen
 * GET - Geplante Nachrichten abrufen
 * DELETE - Geplante Nachricht stornieren
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

// Zod Schemas
const scheduleMessageSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  recipientPhone: z.string().min(1, 'Empfänger-Telefonnummer erforderlich'),
  recipientName: z.string().optional(),
  message: z.string().min(1, 'Nachricht erforderlich').max(4096),
  scheduledAt: z.string().refine(val => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date > new Date();
  }, 'Gültiger zukünftiger Zeitpunkt erforderlich'),
  templateId: z.string().optional(),
  templateVariables: z.record(z.string()).optional(),
});

const getScheduledSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  status: z.enum(['pending', 'sent', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const cancelScheduledSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  scheduleId: z.string().min(1, 'Schedule ID erforderlich'),
});

// POST - Nachricht planen
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = scheduleMessageSchema.parse(body);

    const scheduleData = {
      recipientPhone: validated.recipientPhone,
      recipientName: validated.recipientName || null,
      message: validated.message,
      scheduledAt: new Date(validated.scheduledAt),
      templateId: validated.templateId || null,
      templateVariables: validated.templateVariables || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      lastAttemptAt: null,
      sentAt: null,
      error: null,
    };

    const docRef = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappScheduledMessages')
      .add(scheduleData);

    return NextResponse.json({
      success: true,
      scheduleId: docRef.id,
      scheduledAt: validated.scheduledAt,
      message: 'Nachricht erfolgreich geplant',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Fehler beim Planen der Nachricht',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// GET - Geplante Nachrichten abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    
    const validated = getScheduledSchema.parse({
      companyId: searchParams.get('companyId'),
      status: searchParams.get('status'),
      limit: searchParams.get('limit') || '50',
    });

    let query = db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappScheduledMessages')
      .orderBy('scheduledAt', 'asc')
      .limit(validated.limit);

    if (validated.status) {
      query = query.where('status', '==', validated.status);
    }

    const snapshot = await query.get();

    const scheduledMessages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        recipientPhone: data.recipientPhone,
        recipientName: data.recipientName,
        message: data.message,
        scheduledAt: data.scheduledAt?.toDate?.()?.toISOString(),
        status: data.status,
        templateId: data.templateId,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        sentAt: data.sentAt?.toDate?.()?.toISOString(),
        error: data.error,
      };
    });

    // Gruppiere nach Status
    const pending = scheduledMessages.filter(m => m.status === 'pending');
    const sent = scheduledMessages.filter(m => m.status === 'sent');
    const failed = scheduledMessages.filter(m => m.status === 'failed');

    return NextResponse.json({
      success: true,
      scheduledMessages,
      counts: {
        pending: pending.length,
        sent: sent.length,
        failed: failed.length,
        total: scheduledMessages.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden der geplanten Nachrichten',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// DELETE - Geplante Nachricht stornieren
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const scheduleId = searchParams.get('scheduleId');

    const validated = cancelScheduledSchema.parse({ companyId, scheduleId });

    // Prüfe ob Nachricht noch pending ist
    const scheduleDoc = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappScheduledMessages')
      .doc(validated.scheduleId)
      .get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Geplante Nachricht nicht gefunden',
      }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data();

    if (scheduleData?.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Nur ausstehende Nachrichten können storniert werden',
      }, { status: 400 });
    }

    // Setze Status auf cancelled
    await scheduleDoc.ref.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Geplante Nachricht storniert',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Fehler beim Stornieren der Nachricht',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
