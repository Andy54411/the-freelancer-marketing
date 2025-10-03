// API Route für DSGVO-konforme Newsletter-Abmeldung
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, unsubscribeToken } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Validierung der E-Mail-Adresse
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    // Finde den Subscriber in Firestore
    const subscriberQuery = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .get();

    if (subscriberQuery.empty) {
      return NextResponse.json(
        {
          error: 'E-Mail-Adresse nicht in der Newsletter-Liste gefunden',
        },
        { status: 404 }
      );
    }

    const subscriberDoc = subscriberQuery.docs[0];
    const subscriberData = subscriberDoc.data();

    // Optional: Token-Validierung für zusätzliche Sicherheit
    if (unsubscribeToken && subscriberData.unsubscribeToken !== unsubscribeToken) {
      return NextResponse.json(
        {
          error: 'Ungültiger Abmelde-Token',
        },
        { status: 403 }
      );
    }

    // DSGVO-konforme Abmeldung: Subscriber deaktivieren statt löschen
    await subscriberDoc.ref.update({
      subscribed: false,
      unsubscribedAt: admin.firestore.Timestamp.now(),
      unsubscribeReason: 'user_request',
    });

    return NextResponse.json({
      success: true,
      message: 'Sie wurden erfolgreich vom Newsletter abgemeldet.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler beim Abmelden',
      },
      { status: 500 }
    );
  }
}

// DSGVO Vollständige Löschung (nur für Admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const adminToken = request.headers.get('Authorization');

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse erforderlich' }, { status: 400 });
    }

    // Admin-Authentifizierung prüfen (vereinfacht - sollte mit richtigem Admin-System integriert werden)
    if (!adminToken || !adminToken.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Admin-Authentifizierung erforderlich' }, { status: 401 });
    }

    // Alle Subscriber-Daten für diese E-Mail löschen
    const subscriberQuery = await admin
      .firestore()
      .collection('newsletterSubscribers')
      .where('email', '==', email)
      .get();

    if (!subscriberQuery.empty) {
      // Lösche alle gefundenen Einträge
      const batch = admin.firestore().batch();
      subscriberQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `Alle Daten für ${email} wurden DSGVO-konform gelöscht.`,
        deletedRecords: subscriberQuery.docs.length,
      });
    } else {
      return NextResponse.json(
        {
          error: 'Keine Daten für diese E-Mail gefunden',
        },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Server-Fehler bei der Datenlöschung',
      },
      { status: 500 }
    );
  }
}
