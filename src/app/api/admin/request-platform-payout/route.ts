import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

// Firebase Admin Setup
let db: any;

try {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (serviceAccountKey && serviceAccountKey !== 'undefined') {
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      // Extract project ID from service account if not set in environment
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
    } else {
      console.warn('Firebase service account key not available in request-platform-payout');
    }
  } else {
    db = getFirestore();
  }
} catch (error) {
  console.error('Firebase Admin initialization error in request-platform-payout:', error);
  db = null;
}

// Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const { amount, adminUserId } = await req.json();

    // Validierung
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Ungültiger Auszahlungsbetrag' 
        },
        { status: 400 }
      );
    }

    // Überprüfe verfügbares Guthaben
    const balance = await stripe.balance.retrieve();
    const eurBalance = balance.available.find(b => b.currency === 'eur');
    
    if (!eurBalance || eurBalance.amount < amount) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Nicht genügend Guthaben verfügbar. Verfügbar: €${(eurBalance?.amount || 0) / 100}` 
        },
        { status: 400 }
      );
    }

    // Erstelle Auszahlung
    const payout = await stripe.payouts.create({
      amount: amount,
      currency: 'eur',
      description: 'Platform fees payout - Taskilo Admin',
      metadata: {
        admin_user_id: adminUserId,
        payout_type: 'platform_fees'
      }
    });

    // Protokolliere in Firestore
    if (db) {
      await db.collection('platform_payouts').add({
        stripePayoutId: payout.id,
        amount: amount,
        currency: 'eur',
        status: payout.status,
        requestedBy: adminUserId,
        requestedAt: Math.floor(Date.now() / 1000),
        metadata: {
          arrival_date: payout.arrival_date,
          description: payout.description
        }
      });
    }

    console.log(`Platform payout requested: ${payout.id} for €${amount / 100} by admin ${adminUserId}`);

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        arrival_date: payout.arrival_date
      },
      message: `Auszahlung von €${amount / 100} erfolgreich beantragt`
    });

  } catch (error) {
    console.error('Error requesting platform payout:', error);
    
    // Spezifische Stripe-Fehler
    if (error instanceof Error && error.message.includes('insufficient_funds')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Nicht genügend Guthaben für die Auszahlung verfügbar' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Fehler beim Beantragen der Plattform-Auszahlung' 
      },
      { status: 500 }
    );
  }
}
