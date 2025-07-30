// src/app/api/admin/debug-transfers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase/server';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })
  : null;

export async function GET(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const paymentIntentId = searchParams.get('paymentIntentId');
    const connectAccountId = searchParams.get('connectAccountId');

    if (!orderId && !paymentIntentId && !connectAccountId) {
      return NextResponse.json(
        { success: false, error: 'orderId, paymentIntentId, or connectAccountId required' },
        { status: 400 }
      );
    }

    const debugInfo: any = {
      searchCriteria: { orderId, paymentIntentId, connectAccountId },
      results: {},
    };

    // 1. Suche in Firestore nach dem Auftrag
    if (orderId) {
      try {
        const orderDoc = await db.collection('auftraege').doc(orderId).get();
        if (orderDoc.exists) {
          const orderData = orderDoc.data()!;
          debugInfo.results.orderData = {
            exists: true,
            status: orderData.status,
            timeTracking: orderData.timeTracking,
            paymentIntentId: orderData.paymentIntentId,
          };
        } else {
          debugInfo.results.orderData = { exists: false };
        }
      } catch (error) {
        debugInfo.results.orderData = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // 2. TARGET-OPTIMIERTE SUCHE für PaymentMethod py_1Rqa49DQHCYn2bzRViL4QRX0
    if (paymentIntentId) {
      try {
        let stripeObjectFound = false;

        // SMART TARGET: Bekannte Connect Accounts für bestimmte PaymentMethod-Patterns zuerst durchsuchen
        const knownTargetAccounts: { [key: string]: string[] } = {
          // PaymentMethods die typischerweise auf bestimmten Connect Accounts sind
          py_1Rqa4: ['acct_1RXvRUD5Lvjon30a'], // Bekannte Andy Staudinger PaymentMethods (verkürzt für besseren Match)
          py_1RqZ: ['acct_1RXvRUD5Lvjon30a'], // Weitere aus demselben Zeitraum
          py_1RqY: ['acct_1RXvRUD5Lvjon30a'], // Pattern-basierte Zuordnung
          py_1RqW: ['acct_1RXvRUD5Lvjon30a'],
          py_1RqV: ['acct_1RXvRUD5Lvjon30a'],
          py_1RqU: ['acct_1RXvRUD5Lvjon30a'],
          py_1RqT: ['acct_1RXvRUD5Lvjon30a'],
        };

        // DEBUGGING: Zeige alle verfügbaren Patterns und die gesuchte ID
        console.log(`🔍 PATTERN SEARCH für: ${paymentIntentId}`);
        console.log(`📋 Verfügbare Patterns:`, Object.keys(knownTargetAccounts));

        // Prüfe ob PaymentMethod einem bekannten Pattern entspricht
        let targetAccounts: string[] = [];
        for (const [pattern, accounts] of Object.entries(knownTargetAccounts)) {
          console.log(`🧪 Testing Pattern "${pattern}" gegen "${paymentIntentId}"`);
          if (paymentIntentId.startsWith(pattern)) {
            targetAccounts = accounts;
            console.log(`🎯 PATTERN MATCH: ${paymentIntentId} entspricht Pattern ${pattern}`);
            break;
          }
        }

        // Durchsuche bekannte Target Accounts falls Pattern gefunden
        if (targetAccounts.length > 0) {
          console.log(`🎯 TARGET SEARCH für ${paymentIntentId} auf ${targetAccounts.join(', ')}`);

          for (const targetAccount of targetAccounts) {
            if (stripeObjectFound) break;

            try {
              const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntentId, {
                stripeAccount: targetAccount,
              });
              debugInfo.results.paymentIntent = {
                id: paymentMethod.id,
                type: 'PaymentMethod',
                type_detail: paymentMethod.type,
                created: new Date(paymentMethod.created * 1000).toISOString(),
                metadata: paymentMethod.metadata,
                customer: paymentMethod.customer,
                account: targetAccount,
                searchStrategy: 'PATTERN_TARGET_HIT',
                matchedPattern: Object.keys(knownTargetAccounts).find(p =>
                  paymentIntentId.startsWith(p)
                ),
              };
              stripeObjectFound = true;
              console.log(`✅ PATTERN TARGET HIT: PaymentMethod gefunden auf ${targetAccount}!`);
              break;
            } catch (targetError) {
              console.log(`Pattern target ${targetAccount} failed, trying next...`);
              continue;
            }
          }
        }

        // Fallback: Zuerst versuchen wir es auf dem Haupt-Account (nur falls nicht schon gefunden)
        if (!stripeObjectFound) {
          try {
            if (paymentIntentId.startsWith('pi_')) {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
              debugInfo.results.paymentIntent = {
                id: paymentIntent.id,
                type: 'PaymentIntent',
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                metadata: paymentIntent.metadata,
                created: new Date(paymentIntent.created * 1000).toISOString(),
                account: 'main',
              };
              stripeObjectFound = true;
            } else if (paymentIntentId.startsWith('py_')) {
              const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntentId);
              debugInfo.results.paymentIntent = {
                id: paymentMethod.id,
                type: 'PaymentMethod',
                type_detail: paymentMethod.type,
                created: new Date(paymentMethod.created * 1000).toISOString(),
                metadata: paymentMethod.metadata,
                customer: paymentMethod.customer,
                account: 'main',
              };
              stripeObjectFound = true;
            }
          } catch (mainError) {
            console.log('Object not found on main account, trying connect accounts...');
          }
        }

        // Falls immer noch nicht gefunden: Nur minimal 2 Connect Accounts für Performance
        if (!stripeObjectFound) {
          console.log('Fallback: Mini Connect Account Suche (nur 2 Accounts)...');

          try {
            const connectAccounts = await stripe.accounts.list({
              limit: 2, // Minimal für Performance - verhindert Timeout
            });

            for (const account of connectAccounts.data) {
              if (stripeObjectFound) break;

              try {
                if (paymentIntentId.startsWith('py_')) {
                  const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntentId, {
                    stripeAccount: account.id,
                  });
                  debugInfo.results.paymentIntent = {
                    id: paymentMethod.id,
                    type: 'PaymentMethod',
                    type_detail: paymentMethod.type,
                    created: new Date(paymentMethod.created * 1000).toISOString(),
                    metadata: paymentMethod.metadata,
                    customer: paymentMethod.customer,
                    account: account.id,
                    account_email: account.email,
                  };
                  stripeObjectFound = true;
                  console.log(`✅ Found PaymentMethod on ${account.id}`);
                  break;
                }
              } catch (connectError) {
                continue;
              }
            }
          } catch (connectAccountsError) {
            console.log('Error listing connect accounts:', connectAccountsError);
          }
        }

        // Falls immer noch nicht gefunden
        if (!stripeObjectFound) {
          debugInfo.results.paymentIntent = {
            error: 'Object not found on main account or connect accounts',
            searchedId: paymentIntentId,
            detectedType: paymentIntentId.startsWith('py_') ? 'PaymentMethod' : 'Unknown',
            searchStrategy: 'main account + 2 connect accounts (performance optimized)',
          };
        }
      } catch (error) {
        debugInfo.results.paymentIntent = {
          error: error instanceof Error ? error.message : 'Error searching for Stripe object',
          searchedId: paymentIntentId,
        };
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
    });
  } catch (error) {
    console.error('Debug transfers error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
