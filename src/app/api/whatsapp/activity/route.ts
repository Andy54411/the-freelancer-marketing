import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/whatsapp/activity
 * Speichert WhatsApp-Aktivitäten im Kundenprofil für Mitarbeiter-Nachverfolgung
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
    const { companyId, customerId, phone, activityType, title, description, userId, userName, metadata } = body;

    if (!companyId || !phone) {
      return NextResponse.json(
        { success: false, error: 'companyId und phone erforderlich' },
        { status: 400 }
      );
    }

    // Wenn keine customerId vorhanden, versuche Kunde anhand Telefonnummer zu finden
    let resolvedCustomerId = customerId;
    
    if (!resolvedCustomerId) {
      const normalizedPhone = phone.replace(/\D/g, '');
      const phoneVariants = [
        phone,
        `+${normalizedPhone}`,
        normalizedPhone,
        `+49${normalizedPhone.slice(-10)}`,
        `0${normalizedPhone.slice(-10)}`,
        normalizedPhone.slice(-10),
      ];

      for (const phoneVariant of phoneVariants) {
        const customersSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('customers')
          .where('phone', '==', phoneVariant)
          .limit(1)
          .get();

        if (!customersSnapshot.empty) {
          resolvedCustomerId = customersSnapshot.docs[0].id;
          break;
        }
      }
    }

    // Wenn Kunde gefunden, Aktivität speichern
    if (resolvedCustomerId) {
      const activityData = {
        type: 'whatsapp',
        activityType: activityType || 'message', // message, document_sent, invoice_sent, call
        title: title || 'WhatsApp-Nachricht',
        description: description || '',
        phone,
        userId: userId || null,
        user: userName || 'System',
        timestamp: FieldValue.serverTimestamp(),
        metadata: metadata || {},
      };

      await db
        .collection('companies')
        .doc(companyId)
        .collection('customers')
        .doc(resolvedCustomerId)
        .collection('activities')
        .add(activityData);

      return NextResponse.json({
        success: true,
        message: 'Aktivität erfolgreich gespeichert',
        customerId: resolvedCustomerId,
      });
    }

    // Kein Kunde gefunden - trotzdem Erfolg melden (Aktivität wird nicht gespeichert)
    return NextResponse.json({
      success: true,
      message: 'Kein Kunde zu dieser Telefonnummer gefunden',
      customerId: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern der Aktivität',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
