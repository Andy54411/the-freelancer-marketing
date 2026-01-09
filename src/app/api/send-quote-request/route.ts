import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';

/**
 * API Route zum Senden von Angebotsanfragen über das Dashboard
 * POST /api/send-quote-request
 */
export async function POST(request: NextRequest, companyId: string) {
  try {
    const body = await request.json();
    const { providerId, customerUid, projectData, customerInfo } = body;

    if (!providerId || !customerUid || !projectData) {
      return NextResponse.json(
        { error: 'Provider ID, Customer UID und Projektdaten sind erforderlich' },
        { status: 400 }
      );
    }

    // Eindeutige Quote-ID generieren
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const quoteId = `quote_${timestamp}_${randomSuffix}`;

    // Quote-Anfrage in Firestore speichern
    const quoteRequest = {
      id: quoteId,
      providerId,
      customerUid: customerUid, // Wichtig für Notifications
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),

      // Projektdaten
      projectTitle: projectData.title,
      projectDescription: projectData.description,
      projectCategory: projectData.category,
      projectSubcategory: projectData.subcategory,
      location: projectData.location,
      postalCode: projectData.postalCode,
      ...(projectData.preferredStartDate && { preferredStartDate: projectData.preferredStartDate }),
      ...(projectData.estimatedDuration && { estimatedDuration: projectData.estimatedDuration }),
      budgetRange: projectData.budgetRange,
      urgency: projectData.urgency,

      // Kundendaten
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      additionalNotes: projectData.additionalNotes,

      // Metadaten
      source: 'dashboard',
      platform: 'taskilo',
      sentViaNotificationSystem: true, // Flag für neue Bell-Notifications
    };

    // In quotes Collection speichern
    await db!
      .collection('companies')
      .doc(companyId)
      .collection('quotes')
      .doc(quoteId)
      .set(quoteRequest);

    // Provider-Namen für Notifications abrufen
    let providerName = 'Anbieter';
    try {
      const providerDoc = await db!.collection('users').doc(providerId).get();
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        providerName = providerData?.companyName || 'Anbieter';
      }
    } catch {}

    // Bell-Notifications senden
    try {
      await QuoteNotificationService.createNewQuoteRequestNotifications(
        quoteId,
        customerUid,
        providerId,
        {
          customerName: customerInfo.name,
          providerName: providerName,
          subcategory: projectData.subcategory || projectData.title,
          budget: projectData.budgetRange || { min: 0, max: 0, currency: 'EUR' },
          urgency: projectData.urgency,
          description: projectData.description,
        }
      );
    } catch {
      // Notifications-Fehler sollten die Quote-Erstellung nicht blockieren
    }

    return NextResponse.json({
      success: true,
      quoteId,
      message: 'Angebotsanfrage erfolgreich gesendet',
      notificationsSent: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler beim Senden der Angebotsanfrage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
