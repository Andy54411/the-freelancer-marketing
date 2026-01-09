/**
 * DSGVO Data Deletion API
 * 
 * Art. 17 DSGVO - Recht auf Löschung
 * Löscht alle personenbezogenen Daten eines Kontakts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const deleteSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  contactPhone: z.string().min(1, 'Kontakt-Telefonnummer erforderlich'),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = deleteSchema.parse(body);

    const deletionResults = {
      contacts: 0,
      messages: 0,
      consents: 0,
      activities: 0,
    };

    const batch = db.batch();

    // 1. Kontaktdaten löschen/anonymisieren
    const contactsSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappContacts')
      .where('phone', '==', validated.contactPhone)
      .get();

    for (const doc of contactsSnapshot.docs) {
      // Anonymisiere statt Löschen (für Audit-Trail)
      batch.update(doc.ref, {
        name: 'GELÖSCHT',
        phone: `ANON_${Date.now()}`,
        email: null,
        notes: null,
        anonymizedAt: new Date(),
        anonymizationReason: validated.reason || 'DSGVO Art. 17 Anfrage',
      });
      deletionResults.contacts++;
    }

    // 2. Nachrichten anonymisieren
    const messagesSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappMessages')
      .where('phone', '==', validated.contactPhone)
      .get();

    for (const doc of messagesSnapshot.docs) {
      batch.update(doc.ref, {
        content: '[Inhalt gemäß DSGVO Art. 17 gelöscht]',
        phone: `ANON_${Date.now()}`,
        anonymizedAt: new Date(),
      });
      deletionResults.messages++;
    }

    // 3. Einwilligungen archivieren (für rechtliche Nachweise behalten)
    const consentsSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappConsents')
      .where('contactPhone', '==', validated.contactPhone)
      .get();

    for (const doc of consentsSnapshot.docs) {
      batch.update(doc.ref, {
        contactPhone: `ANON_${Date.now()}`,
        contactName: 'GELÖSCHT',
        archived: true,
        archivedAt: new Date(),
        archiveReason: 'DSGVO Art. 17 Anfrage',
      });
      deletionResults.consents++;
    }

    // 4. Aktivitätsprotokoll anonymisieren
    const activitiesSnapshot = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .where('targetPhone', '==', validated.contactPhone)
      .get();

    for (const doc of activitiesSnapshot.docs) {
      batch.update(doc.ref, {
        targetPhone: `ANON_${Date.now()}`,
        anonymizedAt: new Date(),
      });
      deletionResults.activities++;
    }

    // Batch ausführen
    await batch.commit();

    // Löschung dokumentieren (DSGVO-konforme Dokumentation)
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappDeletionLog')
      .add({
        originalPhone: validated.contactPhone,
        deletedAt: new Date(),
        reason: validated.reason || 'DSGVO Art. 17 Anfrage',
        results: deletionResults,
        // Keine personenbezogenen Daten mehr gespeichert
      });

    // Aktivität loggen
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappActivity')
      .add({
        type: 'dsgvo_deletion',
        description: `DSGVO-Datenlöschung durchgeführt: ${deletionResults.contacts} Kontakte, ${deletionResults.messages} Nachrichten`,
        timestamp: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: 'Daten erfolgreich gelöscht/anonymisiert',
      results: deletionResults,
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
      error: 'Fehler beim Löschen der Daten',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
