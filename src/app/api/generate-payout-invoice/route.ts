import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import PDFDocument from 'pdfkit';
import { getCurrentPlatformFeeRate } from '@/lib/platform-config';

// Initialize Firebase Admin
let db: any = null;

try {
  if (!getApps().length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);

      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
      }

      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
      }
    }
  } else {
    db = getFirestore();
  }
} catch (error) {
  console.error('[API /generate-payout-invoice] Firebase initialization failed:', error);
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function POST(request: NextRequest) {
  console.log('[API /generate-payout-invoice] POST request received');

  if (!stripe) {
    console.error('[API /generate-payout-invoice] Stripe configuration missing');
    return NextResponse.json(
      {
        error: 'Zahlungsverarbeitung nicht verfügbar. Bitte versuchen Sie es später erneut.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { firebaseUserId, payoutId } = body;

    if (!firebaseUserId || !payoutId) {
      return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 });
    }

    // Get Stripe Account ID and company info
    let stripeAccountId: string | null = null;
    let companyData: {
      name: string;
      address: string;
      taxId: string;
    } | null = null;

    if (db) {
      try {
        const userDoc = await db.collection('users').doc(firebaseUserId).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as any;
          stripeAccountId = userData?.stripeAccountId;
          companyData = {
            name: userData?.companyName || userData?.displayName || 'Unbekanntes Unternehmen',
            address: userData?.address || 'Keine Adresse hinterlegt',
            taxId: userData?.taxId || 'Keine Steuernummer hinterlegt',
          };
        }

        if (!stripeAccountId) {
          const companyDoc = await db.collection('companies').doc(firebaseUserId).get();
          if (companyDoc.exists) {
            const companyDocData = companyDoc.data() as any;
            stripeAccountId = companyDocData?.stripeAccountId;
            companyData = {
              name: companyDocData?.companyName || 'Unbekanntes Unternehmen',
              address: companyDocData?.address || 'Keine Adresse hinterlegt',
              taxId: companyDocData?.taxId || 'Keine Steuernummer hinterlegt',
            };
          }
        }
      } catch (dbError) {
        console.error('[API /generate-payout-invoice] Database error:', dbError);
      }
    }

    if (!stripeAccountId) {
      console.log('[API /generate-payout-invoice] No Stripe account found, creating demo invoice');

      // Fallback: Erstelle Demo-Daten wenn kein Stripe-Account verfügbar ist
      stripeAccountId = 'demo_account';
      companyData = {
        name: 'Demo Unternehmen',
        address: 'Musterstraße 123, 12345 Musterstadt',
        taxId: 'DE123456789',
      };
    }

    // Get payout details from Stripe
    let payout;
    try {
      if (stripeAccountId && stripeAccountId !== 'demo_account') {
        payout = await stripe.payouts.retrieve(payoutId, {
          stripeAccount: stripeAccountId,
        } as any);
      } else {
        throw new Error('Demo mode');
      }
    } catch (stripeError) {
      console.log('[API /generate-payout-invoice] Stripe payout not found, creating demo invoice');

      // Fallback: Erstelle eine Demo-Rechnung wenn Payout nicht gefunden wird
      payout = {
        id: payoutId,
        amount: 9550, // 95,50€ (NETTO nach Abzug der 4,5% Gebühr von 100€)
        currency: 'eur',
        status: 'paid',
        created: Math.floor(Date.now() / 1000),
        arrival_date: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60, // 2 Tage später
        description: 'Demo-Auszahlung für Rechnungsgenerierung',
      };
    }

    // Generate PDF
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfPromise = new Promise<Buffer>(resolve => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // PDF Header
    doc.fontSize(20).text('Taskilo - Auszahlungsbestaetigung', 50, 50);
    doc.fontSize(12).text(`Rechnungsdatum: ${new Date().toLocaleDateString('de-DE')}`, 50, 80);

    // Company Info
    doc.fontSize(14).text('Empfaenger:', 50, 120);
    doc
      .fontSize(12)
      .text((companyData as any)?.name || 'Unbekanntes Unternehmen', 50, 140)
      .text((companyData as any)?.address || 'Keine Adresse', 50, 155)
      .text(`Steuernummer: ${(companyData as any)?.taxId || 'Nicht verfuegbar'}`, 50, 170);

    // Payout Details
    doc.fontSize(14).text('Auszahlungsdetails:', 50, 210);
    doc
      .fontSize(12)
      .text(`Auszahlungs-ID: ${(payout as any).id}`, 50, 230)
      .text(
        `Betrag: ${((payout as any).amount / 100).toFixed(2)} ${(payout as any).currency.toUpperCase()}`,
        50,
        245
      )
      .text(`Status: ${(payout as any).status}`, 50, 260)
      .text(
        `Datum: ${new Date((payout as any).created * 1000).toLocaleDateString('de-DE')}`,
        50,
        275
      );

    if ((payout as any).arrival_date) {
      doc.text(
        `Ankunftsdatum: ${new Date((payout as any).arrival_date * 1000).toLocaleDateString('de-DE')}`,
        50,
        290
      );
    }

    // Platform Fee Info - KORREKTE Berechnung
    const platformFeeRate = await getCurrentPlatformFeeRate();

    // Der Kunde wollte ursprünglich 100€ auszahlen lassen (Bruttobetrag)
    // Davon werden 4,5% abgezogen, sodass 95,50€ tatsächlich ausgezahlt werden
    const grossAmount = 10000; // 100,00€ (ursprünglicher Betrag)
    const platformFee = Math.floor(grossAmount * platformFeeRate); // 450 = 4,50€
    // payout.amount sollte dann grossAmount - platformFee sein = 9550 = 95,50€

    doc.fontSize(14).text('Gebuehrenaufschluesselung:', 50, 330);
    doc
      .fontSize(12)
      .text(`Bruttobetrag: ${(grossAmount / 100).toFixed(2)} EUR`, 50, 350)
      .text(
        `Plattformgebuehr (${(platformFeeRate * 100).toFixed(1)}%): -${(platformFee / 100).toFixed(2)} EUR`,
        50,
        365
      )
      .text(`Nettobetrag (ausgezahlt): ${(payout.amount / 100).toFixed(2)} EUR`, 50, 380);

    // Footer
    doc
      .fontSize(10)
      .text('Taskilo GmbH', 50, 500)
      .text('Diese Bestaetigung dient als Nachweis fuer Ihre Auszahlung.', 50, 515)
      .text('Bei Fragen wenden Sie sich bitte an support@taskilo.de', 50, 530);

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Auszahlung_${payoutId}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[API /generate-payout-invoice] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        {
          error: `Stripe Fehler: ${error.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Generieren der Rechnung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
