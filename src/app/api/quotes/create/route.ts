import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';

export async function POST(request: NextRequest) {
  try {
    const { providerId, quoteData, customerUid } = await request.json();

    if (!providerId || !quoteData) {
      return NextResponse.json(
        { error: 'Provider ID und Quote-Daten sind erforderlich' },
        { status: 400 }
      );
    }

    // Eindeutige Quote-ID generieren
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Quote-Anfrage in Firestore speichern (Firebase Admin)
    const quoteRequest = {
      id: quoteId,
      providerId,
      customerUid: customerUid || null, // Customer UID für Notifications
      status: 'pending', // pending, reviewed, quoted, accepted, declined
      createdAt: new Date(),
      updatedAt: new Date(),

      // Projektdaten
      projectTitle: quoteData.projectTitle,
      projectDescription: quoteData.projectDescription,
      ...(quoteData.projectCategory && { projectCategory: quoteData.projectCategory }),
      ...(quoteData.projectSubcategory && { projectSubcategory: quoteData.projectSubcategory }),
      ...(quoteData.location && { location: quoteData.location }),
      ...(quoteData.postalCode && { postalCode: quoteData.postalCode }),
      ...(quoteData.preferredStartDate && { preferredStartDate: quoteData.preferredStartDate }),
      ...(quoteData.estimatedDuration && { estimatedDuration: quoteData.estimatedDuration }),
      budgetRange: quoteData.budgetRange,
      ...(quoteData.urgency && { urgency: quoteData.urgency }),

      // Kundendaten
      customerName: quoteData.customerName,
      customerEmail: quoteData.customerEmail,
      ...(quoteData.customerPhone && { customerPhone: quoteData.customerPhone }),
      ...(quoteData.additionalNotes && { additionalNotes: quoteData.additionalNotes }),

      // Metadaten
      source: 'website',
      platform: 'taskilo',
    };

    // In quotes Collection speichern mit Firebase Admin
    await db.collection('quotes').doc(quoteId).set(quoteRequest);

    // Provider-Namen für Notifications abrufen
    let providerName = 'Anbieter';
    try {
      const providerDoc = await db.collection('companies').doc(providerId).get();
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        providerName = providerData?.companyName || 'Anbieter';
      }
    } catch (error) {
      console.log('Provider name not found, using default');
    }

    // Bell-Notifications senden (nur wenn customerUid verfügbar)
    if (customerUid) {
      try {
        await QuoteNotificationService.createNewQuoteRequestNotifications(
          quoteId,
          customerUid,
          providerId,
          {
            customerName: quoteData.customerName,
            providerName: providerName,
            subcategory: quoteData.projectSubcategory || quoteData.projectTitle,
            budget: quoteData.budgetRange || { min: 0, max: 0, currency: 'EUR' },
            urgency: quoteData.urgency,
            description: quoteData.projectDescription,
          }
        );
        console.log(`✅ Quote-Request-Notifications gesendet für Quote ${quoteId}`);
      } catch (notificationError) {
        console.error('❌ Fehler bei Quote-Notifications:', notificationError);
        // Notifications-Fehler sollten die Quote-Erstellung nicht blockieren
      }
    }

    return NextResponse.json({
      success: true,
      quoteId,
      message: 'Angebots-Anfrage erfolgreich gesendet',
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Angebots-Anfrage:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen der Angebots-Anfrage' },
      { status: 500 }
    );
  }
}
