import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db as adminDb } from '@/firebase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Cache duration: 3 minutes (balance data changes frequently)
const CACHE_DURATION = 3 * 60 * 1000;

export async function GET(request: NextRequest, context: { params: Promise<{ uid: string }> }) {
  try {
    const params = await context.params;
    const { uid } = params;
    const forceRefresh = request.nextUrl.searchParams.get('force') === 'true';

    if (!uid) {
      return NextResponse.json({ error: 'Fehlende Company UID' }, { status: 400 });
    }

    // Hole Company-Daten
    const companyDoc = await adminDb.collection('companies').doc(uid).get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company nicht gefunden' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    // Try multiple possible locations for the Stripe account ID
    const connectedAccountId =
      companyData?.stripe?.connectedAccountId ||
      companyData?.stripeAccountId ||
      companyData?.connectedAccountId ||
      companyData?.stripe?.accountId;

    console.log('🔍 Debug Stripe Account:', {
      uid,
      hasCompanyData: !!companyData,
      stripeObject: companyData?.stripe,
      stripeAccountId: companyData?.stripeAccountId,
      connectedAccountId: companyData?.connectedAccountId,
      finalAccountId: connectedAccountId,
    });

    if (!connectedAccountId) {
      return NextResponse.json(
        {
          error: 'Kein Stripe Connected Account gefunden',
          debug: {
            availableKeys: companyData ? Object.keys(companyData) : [],
            stripeKeys: companyData?.stripe ? Object.keys(companyData.stripe) : [],
          },
        },
        { status: 400 }
      );
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheDoc = await adminDb
        .collection('stripe_cache')
        .doc(`balance_${connectedAccountId}`)
        .get();

      if (cacheDoc.exists) {
        const cachedData = cacheDoc.data();
        if (cachedData && cachedData.updated_at) {
          const cacheAge = Date.now() - cachedData.updated_at.toMillis();

          if (cacheAge < CACHE_DURATION) {
            console.log('🎯 Returning cached balance for', connectedAccountId);
            return NextResponse.json({
              success: true,
              balance: cachedData.balance,
              cached: true,
              cache_age_seconds: Math.round(cacheAge / 1000),
            });
          }
        }
      }
    }

    console.log('🔄 Fetching fresh balance from Stripe for', connectedAccountId);

    // Hole aktuellen Stripe Balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectedAccountId,
    });

    // Formatiere Response
    const balanceData = {
      available: balance.available.map(item => ({
        amount: item.amount,
        currency: item.currency,
        amountEuro: item.amount / 100,
      })),
      pending: balance.pending.map(item => ({
        amount: item.amount,
        currency: item.currency,
        amountEuro: item.amount / 100,
      })),
      connectReserved:
        balance.connect_reserved?.map(item => ({
          amount: item.amount,
          currency: item.currency,
          amountEuro: item.amount / 100,
        })) || [],
      instantAvailable:
        balance.instant_available?.map(item => ({
          amount: item.amount,
          currency: item.currency,
          amountEuro: item.amount / 100,
        })) || [],
      connectedAccountId,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    await adminDb.collection('stripe_cache').doc(`balance_${connectedAccountId}`).set({
      balance: balanceData,
      updated_at: new Date(),
      stripe_account_id: connectedAccountId,
    });

    return NextResponse.json({
      success: true,
      balance: balanceData,
      cached: false,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Stripe Balance:', error);

    // Return specific error information
    if (error instanceof Error) {
      if (error.message.includes('No such account')) {
        return NextResponse.json(
          { error: 'Stripe Account nicht gefunden oder nicht verbunden' },
          { status: 404 }
        );
      }

      if (error.message.includes('permission')) {
        return NextResponse.json(
          { error: 'Keine Berechtigung für diesen Stripe Account' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen des Kontostand',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
