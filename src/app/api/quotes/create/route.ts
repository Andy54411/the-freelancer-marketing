import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';

export async function POST(request: NextRequest) {
  try {
    // Get auth token to identify the customer
    const authHeader = request.headers.get('authorization');
    let customerUid: string | null = null;
    let customerType = 'user'; // Default to B2C
    let isB2B = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        customerUid = decodedToken.uid;

        // Check if this user is a company (B2B) by checking companies collection
        if (customerUid) {
          const companyDoc = await db.collection('companies').doc(customerUid).get();
          if (companyDoc.exists) {
            isB2B = true;
            customerType = 'company';
            console.log(`📋 B2B Quote Request from company: ${customerUid}`);
          } else {
            console.log(`👤 B2C Quote Request from user: ${customerUid}`);
          }
        }
      } catch (authError) {
        console.error('Auth token verification failed:', authError);
        // Continue without customerUid for anonymous quotes
      }
    }

    const { providerId, quoteData } = await request.json();

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
      customerUid: customerUid, // Automatically determined from auth
      customerType: customerType, // 'user' for B2C, 'company' for B2B
      isB2B: isB2B, // Boolean flag for easy filtering
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
      const providerDoc = await db.collection('users').doc(providerId).get();
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        providerName = providerData?.companyName || 'Anbieter';
      }
    } catch (error) {}

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
      } catch (notificationError) {
        // Notifications-Fehler sollten die Quote-Erstellung nicht blockieren
      }
    }

    return NextResponse.json({
      success: true,
      quoteId,
      message: 'Angebots-Anfrage erfolgreich gesendet',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen der Angebots-Anfrage' },
      { status: 500 }
    );
  }
}
