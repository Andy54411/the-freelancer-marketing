/**
 * DSGVO Consent Management API
 * 
 * Verwaltet Einwilligungen für WhatsApp-Kommunikation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

// GET - Einwilligungen abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const contactPhone = searchParams.get('contactPhone');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    let query = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConsents')
      .where('archived', '!=', true)
      .limit(500);

    if (contactPhone) {
      query = query.where('contactPhone', '==', contactPhone);
    }

    const snapshot = await query.get();

    const consents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        consentType: data.consentType,
        consentGiven: data.consentGiven,
        consentDate: data.consentDate?.toDate?.()?.toISOString(),
        source: data.source,
        ipAddress: data.ipAddress,
        revokedAt: data.revokedAt?.toDate?.()?.toISOString(),
      };
    });

    return NextResponse.json({ success: true, consents });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden der Einwilligungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST - Neue Einwilligung erfassen
const consentSchema = z.object({
  companyId: z.string().min(1),
  contactPhone: z.string().min(1),
  contactName: z.string().optional(),
  consentType: z.enum(['marketing', 'transactional', 'support']),
  consentGiven: z.boolean(),
  source: z.enum(['opt-in', 'opt-out', 'manual', 'api']),
  ipAddress: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = consentSchema.parse(body);

    // Prüfe ob bereits eine Einwilligung existiert
    const existingSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappConsents')
      .where('contactPhone', '==', validated.contactPhone)
      .where('consentType', '==', validated.consentType)
      .where('archived', '!=', true)
      .get();

    // Alte Einwilligung archivieren
    if (!existingSnapshot.empty) {
      const batch = db.batch();
      for (const doc of existingSnapshot.docs) {
        batch.update(doc.ref, {
          archived: true,
          archivedAt: new Date(),
          archivedReason: 'Neue Einwilligung erfasst',
        });
      }
      await batch.commit();
    }

    // Neue Einwilligung erstellen
    const consentData = {
      contactPhone: validated.contactPhone,
      contactName: validated.contactName || null,
      consentType: validated.consentType,
      consentGiven: validated.consentGiven,
      consentDate: new Date(),
      source: validated.source,
      ipAddress: validated.ipAddress || null,
      archived: false,
      createdAt: new Date(),
    };

    const docRef = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappConsents')
      .add(consentData);

    // Aktivität loggen
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .add({
        type: validated.consentGiven ? 'consent_given' : 'consent_revoked',
        targetPhone: validated.contactPhone,
        description: `${validated.consentType}-Einwilligung ${validated.consentGiven ? 'erteilt' : 'widerrufen'}`,
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      consentId: docRef.id,
      message: validated.consentGiven ? 'Einwilligung erfasst' : 'Widerruf erfasst',
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
      error: 'Fehler beim Speichern der Einwilligung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
