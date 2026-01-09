/**
 * DSGVO Data Subject Requests API
 * 
 * Verwaltet Betroffenenanfragen (Auskunft, Löschung, Berichtigung)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

// GET - Anfragen abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    let query = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappDSGVORequests')
      .limit(100);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        status: data.status,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString(),
        completedAt: data.completedAt?.toDate?.()?.toISOString(),
        notes: data.notes,
        processedBy: data.processedBy,
      };
    });

    // Client-seitige Sortierung
    requests.sort((a, b) => {
      const dateA = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
      const dateB = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden der Anfragen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST - Neue Anfrage erstellen
const requestSchema = z.object({
  companyId: z.string().min(1),
  type: z.enum(['export', 'deletion', 'correction']),
  contactPhone: z.string().min(1),
  contactName: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = requestSchema.parse(body);

    const requestData = {
      type: validated.type,
      contactPhone: validated.contactPhone,
      contactName: validated.contactName || null,
      status: 'pending',
      requestedAt: new Date(),
      notes: validated.notes || null,
      completedAt: null,
      processedBy: null,
    };

    const docRef = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappDSGVORequests')
      .add(requestData);

    // Aktivität loggen
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .add({
        type: 'dsgvo_request_created',
        targetPhone: validated.contactPhone,
        description: `DSGVO-Anfrage (${validated.type}) erstellt`,
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      requestId: docRef.id,
      message: 'Anfrage erfolgreich erstellt',
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
      error: 'Fehler beim Erstellen der Anfrage',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// PATCH - Anfrage bearbeiten
const updateSchema = z.object({
  companyId: z.string().min(1),
  requestId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'process']),
  notes: z.string().optional(),
  processedBy: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const requestRef = db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappDSGVORequests')
      .doc(validated.requestId);

    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ success: false, error: 'Anfrage nicht gefunden' }, { status: 404 });
    }

    const requestData = requestDoc.data();
    let newStatus: string;

    switch (validated.action) {
      case 'approve':
        newStatus = 'completed';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'process':
        newStatus = 'processing';
        break;
      default:
        newStatus = 'pending';
    }

    await requestRef.update({
      status: newStatus,
      completedAt: validated.action !== 'process' ? new Date() : null,
      notes: validated.notes || requestData?.notes,
      processedBy: validated.processedBy || null,
      updatedAt: new Date(),
    });

    // Aktivität loggen
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .add({
        type: `dsgvo_request_${validated.action}ed`,
        targetPhone: requestData?.contactPhone,
        description: `DSGVO-Anfrage ${validated.action === 'approve' ? 'genehmigt' : validated.action === 'reject' ? 'abgelehnt' : 'in Bearbeitung'}`,
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: `Anfrage ${validated.action === 'approve' ? 'genehmigt' : validated.action === 'reject' ? 'abgelehnt' : 'in Bearbeitung'}`,
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
      error: 'Fehler beim Bearbeiten der Anfrage',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
