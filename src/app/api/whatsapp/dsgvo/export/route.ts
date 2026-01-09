/**
 * DSGVO Data Export API
 * 
 * Art. 15 DSGVO - Recht auf Auskunft
 * Exportiert alle personenbezogenen Daten eines Kontakts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const exportSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  contactPhone: z.string().min(1, 'Kontakt-Telefonnummer erforderlich'),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = exportSchema.parse(body);

    // Sammle alle Daten des Kontakts
    const exportData: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      contactPhone: validated.contactPhone,
      data: {},
    };

    // 1. Kontaktdaten
    const contactsSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappContacts')
      .where('phone', '==', validated.contactPhone)
      .get();

    if (!contactsSnapshot.empty) {
      const contactData = contactsSnapshot.docs[0].data();
      exportData.data = {
        ...(exportData.data as Record<string, unknown>),
        contact: {
          name: contactData.name,
          phone: contactData.phone,
          email: contactData.email,
          createdAt: contactData.createdAt?.toDate?.()?.toISOString(),
          lastContactAt: contactData.lastContactAt?.toDate?.()?.toISOString(),
          tags: contactData.tags,
          notes: contactData.notes,
        },
      };
    }

    // 2. Nachrichtenverlauf
    const messagesSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappMessages')
      .where('phone', '==', validated.contactPhone)
      .limit(1000)
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        direction: data.direction,
        content: data.content,
        timestamp: data.timestamp?.toDate?.()?.toISOString(),
        status: data.status,
      };
    });

    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      messages: {
        count: messages.length,
        items: messages,
      },
    };

    // 3. Einwilligungen
    const consentsSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappConsents')
      .where('contactPhone', '==', validated.contactPhone)
      .get();

    const consents = consentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        type: data.consentType,
        given: data.consentGiven,
        date: data.consentDate?.toDate?.()?.toISOString(),
        source: data.source,
      };
    });

    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      consents,
    };

    // 4. Aktivitätsprotokoll
    const activitiesSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .where('targetPhone', '==', validated.contactPhone)
      .limit(500)
      .get();

    const activities = activitiesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        type: data.type,
        description: data.description,
        timestamp: data.timestamp?.toDate?.()?.toISOString(),
      };
    });

    exportData.data = {
      ...(exportData.data as Record<string, unknown>),
      activityLog: activities,
    };

    // Logge den Export
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .add({
        type: 'dsgvo_export',
        targetPhone: validated.contactPhone,
        description: `DSGVO-Datenexport für ${validated.contactPhone} durchgeführt`,
        timestamp: new Date(),
      });

    // Erstelle JSON-Export
    const jsonString = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dsgvo-export-${validated.contactPhone}-${new Date().toISOString().split('T')[0]}.json"`,
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
      error: 'Fehler beim Exportieren der Daten',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
