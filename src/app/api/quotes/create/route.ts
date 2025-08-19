import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
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
      status: 'pending', // pending, reviewed, quoted, accepted, declined
      createdAt: new Date(),
      updatedAt: new Date(),

      // Projektdaten
      projectTitle: quoteData.projectTitle,
      projectDescription: quoteData.projectDescription,
      projectCategory: quoteData.projectCategory,
      projectSubcategory: quoteData.projectSubcategory,
      location: quoteData.location,
      postalCode: quoteData.postalCode,
      preferredStartDate: quoteData.preferredStartDate,
      estimatedDuration: quoteData.estimatedDuration,
      budgetRange: quoteData.budgetRange,
      urgency: quoteData.urgency,

      // Kundendaten
      customerName: quoteData.customerName,
      customerEmail: quoteData.customerEmail,
      customerPhone: quoteData.customerPhone,
      additionalNotes: quoteData.additionalNotes,

      // Metadaten
      source: 'website',
      platform: 'taskilo',
    };

    // In quotes Collection speichern mit Firebase Admin
    await db.collection('quotes').doc(quoteId).set(quoteRequest);

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
