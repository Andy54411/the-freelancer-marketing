// Saubere Admin Newsletter API mit Resend und Firestore
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, getDocs, doc, deleteDoc, addDoc, query, where } from 'firebase/firestore';

// Resend-Client lazy initialisieren - NUR zur Runtime mit dynamic import
async function getResendClient() {
  const { Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist nicht gesetzt');
  }
  return new Resend(apiKey);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Spezifische Datentypen abrufen
    if (type === 'subscribers') {
      try {
        // Echte Daten aus Firestore laden
        const subscribersRef = collection(db, 'newsletterSubscribers');
        const subscribersSnapshot = await getDocs(subscribersRef);

        const subscribers = subscribersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Zeitstempel zu JavaScript Dates konvertieren
          subscribedAt: doc.data().subscribedAt?.toDate() || new Date(),
          confirmedAt: doc.data().confirmedAt?.toDate() || null,
          consentTimestamp: doc.data().consentTimestamp?.toDate() || null,
          dataRetentionUntil: doc.data().dataRetentionUntil?.toDate() || null,
        }));

        return NextResponse.json({
          success: true,
          subscribers,
          count: subscribers.length,
        });
      } catch (error) {
        console.error('Fehler beim Laden der Abonnenten:', error);
        return NextResponse.json({
          success: false,
          subscribers: [],
          error: 'Fehler beim Laden der Abonnenten',
        });
      }
    }

    if (type === 'campaigns') {
      // Für Kampagnen erstmal leeres Array, da wir noch keine Kampagnen-Collection haben
      return NextResponse.json({
        success: true,
        campaigns: [],
        count: 0,
      });
    }

    // Standard-Info wenn kein spezifischer Type angefragt wird
    return NextResponse.json({
      success: true,
      message: 'Admin Newsletter API - Powered by Resend',
      service: 'Resend Only',
      status: 'Clean - No Google/Gmail dependencies',
      features: [
        'Newsletter versenden',
        'Abonnenten verwalten',
        'E-Mail-Templates',
        'Delivery-Tracking',
      ],
      config: {
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'VORHANDEN ✅' : 'FEHLT ❌',
        from_domain: 'taskilo.de',
        limits: '3.000 E-Mails/Monat kostenlos',
      },
    });
  } catch (error) {
    console.error('Admin Newsletter GET Fehler:', error);
    return NextResponse.json({ error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, recipients, subject, content, type, data } = body;

    // Neuen Abonnenten hinzufügen
    if (type === 'subscriber' && data) {
      try {
        const { email, name } = data;

        if (!email) {
          return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich' }, { status: 400 });
        }

        // Prüfen ob E-Mail bereits existiert
        const subscribersRef = collection(db, 'newsletterSubscribers');
        const existingQuery = query(subscribersRef, where('email', '==', email));
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
          return NextResponse.json(
            { error: 'E-Mail-Adresse bereits registriert' },
            { status: 400 }
          );
        }

        // Neuen Abonnenten erstellen
        const newSubscriber = {
          email,
          name: name || '',
          subscribed: true,
          subscribedAt: new Date(),
          confirmedAt: new Date(),
          consentGiven: true,
          consentTimestamp: new Date(),
          source: 'admin',
          preferences: ['general'],
          dataRetentionUntil: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 Jahre
          unsubscribeToken:
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15),
        };

        const docRef = await addDoc(subscribersRef, newSubscriber);

        return NextResponse.json({
          success: true,
          message: 'Abonnent erfolgreich hinzugefügt',
          id: docRef.id,
        });
      } catch (error) {
        console.error('Fehler beim Hinzufügen des Abonnenten:', error);
        return NextResponse.json(
          { error: 'Fehler beim Hinzufügen des Abonnenten' },
          { status: 500 }
        );
      }
    }

    // Newsletter versenden
    if (action === 'send') {
      if (!recipients || recipients.length === 0) {
        return NextResponse.json({ error: 'Empfänger erforderlich' }, { status: 400 });
      }

      console.log(`📧 Admin Newsletter-Versand an ${recipients.length} Empfänger`);

      const resend = await getResendClient();

      // Newsletter über Resend versenden
      const results: { recipient: string; success: boolean; error?: string; messageId?: string }[] =
        [];
      for (const recipient of recipients) {
        try {
          const { data, error } = await resend.emails.send({
            from: 'Taskilo Newsletter <newsletter@taskilo.de>',
            to: [recipient],
            subject: subject || 'Taskilo Newsletter',
            html: content || '<h1>Newsletter von Taskilo</h1><p>Vielen Dank für Ihr Interesse!</p>',
          });

          if (error) {
            results.push({ recipient, success: false, error: error.message });
          } else {
            results.push({ recipient, success: true, messageId: data?.id });
          }
        } catch (emailError) {
          results.push({
            recipient,
            success: false,
            error: emailError instanceof Error ? emailError.message : 'Unbekannter Fehler',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(
        `✅ Admin Newsletter versendet: ${successCount}/${recipients.length} erfolgreich`
      );

      return NextResponse.json({
        success: true,
        message: `Newsletter versendet: ${successCount}/${recipients.length} erfolgreich`,
        results,
        service: 'Taskilo',
      });
    }

    return NextResponse.json(
      { error: 'Unbekannte Aktion oder fehlende Parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin Newsletter POST Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interner Server-Fehler',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type === 'subscriber' && id) {
      try {
        // Abonnenten aus Firestore löschen
        const subscriberRef = doc(db, 'newsletterSubscribers', id);
        await deleteDoc(subscriberRef);

        return NextResponse.json({
          success: true,
          message: 'Abonnent erfolgreich gelöscht',
        });
      } catch (error) {
        console.error('Fehler beim Löschen des Abonnenten:', error);
        return NextResponse.json({ error: 'Fehler beim Löschen des Abonnenten' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ungültige Parameter für DELETE-Anfrage' }, { status: 400 });
  } catch (error) {
    console.error('Admin Newsletter DELETE Fehler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Interner Server-Fehler',
      },
      { status: 500 }
    );
  }
}
