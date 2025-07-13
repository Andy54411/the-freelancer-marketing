import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import PDFDocument from 'pdfkit';

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
  console.error("[API /generate-payout-invoice] Firebase initialization failed:", error);
}

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
}) : null;

export async function POST(request: NextRequest) {
  console.log("[API /generate-payout-invoice] POST request received");

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe-Konfiguration fehlt.' }, { status: 500 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Firebase-Konfiguration fehlt.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { firebaseUserId, payoutId } = body;

    if (!firebaseUserId || !payoutId) {
      return NextResponse.json({ error: 'Ungültige Parameter.' }, { status: 400 });
    }

    // Get Stripe Account ID and company info
    let stripeAccountId = null;
    let companyData = null;
    
    const userDoc = await db.collection('users').doc(firebaseUserId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      stripeAccountId = userData?.stripeAccountId;
      companyData = {
        name: userData?.companyName || userData?.displayName || 'Unbekanntes Unternehmen',
        address: userData?.address || 'Keine Adresse hinterlegt',
        taxId: userData?.taxId || 'Keine Steuernummer hinterlegt'
      };
    }

    if (!stripeAccountId) {
      const companyDoc = await db.collection('companies').doc(firebaseUserId).get();
      if (companyDoc.exists) {
        const companyDocData = companyDoc.data();
        stripeAccountId = companyDocData?.stripeAccountId;
        companyData = {
          name: companyDocData?.companyName || 'Unbekanntes Unternehmen',
          address: companyDocData?.address || 'Keine Adresse hinterlegt',
          taxId: companyDocData?.taxId || 'Keine Steuernummer hinterlegt'
        };
      }
    }

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Kein Stripe-Konto gefunden.' }, { status: 404 });
    }

    // Get payout details from Stripe
    const payout = await stripe.payouts.retrieve(
      payoutId,
      { stripeAccount: stripeAccountId }
    );

    if (!payout) {
      return NextResponse.json({ error: 'Auszahlung nicht gefunden.' }, { status: 404 });
    }

    // Generate PDF
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // PDF Header
    doc.fontSize(20).text('Taskilo - Auszahlungsbestätigung', 50, 50);
    doc.fontSize(12).text(`Rechnungsdatum: ${new Date().toLocaleDateString('de-DE')}`, 50, 80);
    
    // Company Info
    doc.fontSize(14).text('Empfänger:', 50, 120);
    doc.fontSize(12)
       .text(companyData?.name || 'Unbekanntes Unternehmen', 50, 140)
       .text(companyData?.address || 'Keine Adresse', 50, 155)
       .text(`Steuernummer: ${companyData?.taxId || 'Nicht verfügbar'}`, 50, 170);

    // Payout Details
    doc.fontSize(14).text('Auszahlungsdetails:', 50, 210);
    doc.fontSize(12)
       .text(`Auszahlungs-ID: ${payout.id}`, 50, 230)
       .text(`Betrag: ${(payout.amount / 100).toFixed(2)} ${payout.currency.toUpperCase()}`, 50, 245)
       .text(`Status: ${payout.status}`, 50, 260)
       .text(`Datum: ${new Date(payout.created * 1000).toLocaleDateString('de-DE')}`, 50, 275);

    if (payout.arrival_date) {
      doc.text(`Ankunftsdatum: ${new Date(payout.arrival_date * 1000).toLocaleDateString('de-DE')}`, 50, 290);
    }

    // Platform Fee Info
    const platformFee = payout.amount * 0.045; // 4.5% platform fee
    const grossAmount = payout.amount + platformFee;

    doc.fontSize(14).text('Gebührenaufschlüsselung:', 50, 330);
    doc.fontSize(12)
       .text(`Bruttobetrag: ${(grossAmount / 100).toFixed(2)} €`, 50, 350)
       .text(`Plattformgebühr (4,5%): -${(platformFee / 100).toFixed(2)} €`, 50, 365)
       .text(`Nettobetrag (ausgezahlt): ${(payout.amount / 100).toFixed(2)} €`, 50, 380);

    // Footer
    doc.fontSize(10)
       .text('Taskilo GmbH', 50, 500)
       .text('Diese Bestätigung dient als Nachweis für Ihre Auszahlung.', 50, 515)
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
    console.error("[API /generate-payout-invoice] Error:", error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: `Stripe Fehler: ${error.message}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Fehler beim Generieren der Rechnung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }, { status: 500 });
  }
}
