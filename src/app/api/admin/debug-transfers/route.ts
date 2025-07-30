// src/app/api/admin/debug-transfers/route.ts
// 🚀 BESTE LÖSUNG: Events API + Database Mapping für optimale Performance
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

    // 🎯 BESTE LÖSUNG: INTELLIGENTE PAYMENT-SUCHE
    // 1. Events API für effiziente Suche
    // 2. Database Mapping als Fallback
    // 3. Dynamic Search nur als letzte Option
    if (paymentIntentId) {
      try {
        let stripeObjectFound = false;
        const searchResults: any[] = [];
        let searchStrategy = '';

        // 🔥 STRATEGIE 1: STRIPE EVENTS API - Modernste Lösung
        console.log('🚀 STRATEGIE 1: Events API Search...');
        try {
          const eventResults = await searchWithStripeEvents(paymentIntentId, stripe);
          if (eventResults.found && eventResults.data) {
            debugInfo.results.paymentIntent = eventResults.data;
            searchStrategy = 'EVENTS_API_SUCCESS';
            stripeObjectFound = true;
            searchResults.push({
              strategy: 'events_api',
              success: true,
              found: true,
              account: eventResults.data.account,
            });
            console.log(`✅ EVENTS API SUCCESS! Found on account: ${eventResults.data.account}`);
          } else {
            searchResults.push({
              strategy: 'events_api',
              success: false,
              reason: 'not_found_in_recent_events',
            });
          }
        } catch (eventsError: any) {
          searchResults.push({
            strategy: 'events_api',
            success: false,
            error: eventsError.message,
          });
          console.log('Events API failed, trying Database Mapping...');
        }

        // 🔥 STRATEGIE 2: DATABASE MAPPING - Backup Lösung
        if (!stripeObjectFound) {
          console.log('🔥 STRATEGIE 2: Database Mapping Search...');
          try {
            const dbResults = await searchWithDatabaseMapping(paymentIntentId, db, stripe);
            if (dbResults.found && dbResults.data) {
              debugInfo.results.paymentIntent = dbResults.data;
              searchStrategy = 'DATABASE_MAPPING_SUCCESS';
              stripeObjectFound = true;
              searchResults.push({
                strategy: 'database_mapping',
                success: true,
                found: true,
                account: dbResults.data.account,
              });
              console.log(
                `✅ DATABASE MAPPING SUCCESS! Found on account: ${dbResults.data.account}`
              );
            } else {
              searchResults.push({
                strategy: 'database_mapping',
                success: false,
                reason: 'not_found_in_database',
              });
            }
          } catch (dbError: any) {
            searchResults.push({
              strategy: 'database_mapping',
              success: false,
              error: dbError.message,
            });
            console.log('Database Mapping failed, trying Dynamic Search...');
          }
        }

        // 🔥 STRATEGIE 3: DYNAMIC SEARCH - Fallback für Edge Cases
        if (!stripeObjectFound) {
          console.log('🔥 STRATEGIE 3: Dynamic Search (Fallback)...');
          const dynamicResults = await searchWithDynamicIteration(paymentIntentId, stripe);

          if (dynamicResults.found && dynamicResults.data) {
            debugInfo.results.paymentIntent = dynamicResults.data;
            searchStrategy = 'DYNAMIC_SEARCH_SUCCESS';
            stripeObjectFound = true;
          } else {
            debugInfo.results.paymentIntent = {
              error: 'Object not found with any strategy',
              searchedId: paymentIntentId,
              detectedType: paymentIntentId.startsWith('py_')
                ? 'PaymentMethod'
                : paymentIntentId.startsWith('pi_')
                  ? 'PaymentIntent'
                  : 'Unknown',
              searchStrategy: 'ALL_STRATEGIES_FAILED',
            };
          }

          searchResults.push(...dynamicResults.searchResults);
        }

        // 🔥 STRATEGIE 2: DATABASE MAPPING - Backup Lösung
        if (!stripeObjectFound) {
          console.log('� STRATEGIE 2: Database Mapping Search...');
          try {
            const dbResults = await searchWithDatabaseMapping(paymentIntentId, db, stripe);
            if (dbResults.found) {
              debugInfo.results.paymentIntent = dbResults.data;
              searchStrategy = 'DATABASE_MAPPING_SUCCESS';
              stripeObjectFound = true;
              searchResults.push({
                strategy: 'database_mapping',
                success: true,
                found: true,
                account: dbResults.data.account,
              });
              console.log(
                `✅ DATABASE MAPPING SUCCESS! Found on account: ${dbResults.data.account}`
              );
            } else {
              searchResults.push({
                strategy: 'database_mapping',
                success: false,
                reason: 'not_found_in_database',
              });
            }
          } catch (dbError: any) {
            searchResults.push({
              strategy: 'database_mapping',
              success: false,
              error: dbError.message,
            });
            console.log('Database Mapping failed, trying Dynamic Search...');
          }
        }

        // 🔥 STRATEGIE 3: DYNAMIC SEARCH - Fallback für Edge Cases
        if (!stripeObjectFound) {
          console.log('🔥 STRATEGIE 3: Dynamic Search (Fallback)...');
          const dynamicResults = await searchWithDynamicIteration(paymentIntentId, stripe);

          if (dynamicResults.found) {
            debugInfo.results.paymentIntent = dynamicResults.data;
            searchStrategy = 'DYNAMIC_SEARCH_SUCCESS';
            stripeObjectFound = true;
          } else {
            debugInfo.results.paymentIntent = {
              error: 'Object not found with any strategy',
              searchedId: paymentIntentId,
              detectedType: paymentIntentId.startsWith('py_')
                ? 'PaymentMethod'
                : paymentIntentId.startsWith('pi_')
                  ? 'PaymentIntent'
                  : 'Unknown',
              searchStrategy: 'ALL_STRATEGIES_FAILED',
            };
          }

          searchResults.push(...dynamicResults.searchResults);
        }

        // Debug-Informationen hinzufügen
        debugInfo.results.searchResults = searchResults;
        debugInfo.results.searchStrategy = searchStrategy;
        debugInfo.results.totalStrategiesUsed = searchResults.filter(r => r.strategy).length;
      } catch (error) {
        debugInfo.results.paymentIntent = {
          error: error instanceof Error ? error.message : 'Error in intelligent search',
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

// 🚀 INTELLIGENTE SUCHFUNKTIONEN - BESTE LÖSUNG

// Type definitions for better TypeScript support
interface SearchResult {
  found: boolean;
  data?: any;
  error?: string;
}

// 🔥 STRATEGIE 1: STRIPE EVENTS API - Modernste & Schnellste Lösung
async function searchWithStripeEvents(paymentId: string, stripe: Stripe): Promise<SearchResult> {
  try {
    console.log('🔍 Events API: Searching recent events...');

    // Suche nach relevanten Events in den letzten 30 Tagen
    const events = await stripe.events.list({
      limit: 100,
      created: {
        gte: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30 Tage zurück
      },
      types: [
        'payment_intent.created',
        'payment_intent.succeeded',
        'payment_method.attached',
        'setup_intent.succeeded',
      ],
    });

    for (const event of events.data) {
      const eventObject = event.data.object as any;

      // PaymentIntent gefunden
      if (eventObject.id === paymentId && event.type.includes('payment_intent')) {
        const account = event.account || 'main';

        // Vollständige Daten abrufen
        let fullObject;
        if (account === 'main') {
          fullObject = await stripe.paymentIntents.retrieve(paymentId);
        } else {
          fullObject = await stripe.paymentIntents.retrieve(paymentId, {
            stripeAccount: account,
          });
        }

        return {
          found: true,
          data: {
            id: fullObject.id,
            type: 'PaymentIntent',
            status: fullObject.status,
            amount: fullObject.amount,
            currency: fullObject.currency,
            metadata: fullObject.metadata,
            created: new Date(fullObject.created * 1000).toISOString(),
            account: account,
            searchStrategy: 'EVENTS_API_PAYMENT_INTENT',
          },
        };
      }

      // PaymentMethod gefunden
      if (eventObject.payment_method === paymentId || eventObject.id === paymentId) {
        const account = event.account || 'main';

        // Vollständige PaymentMethod-Daten abrufen
        try {
          let paymentMethod;
          if (account === 'main') {
            paymentMethod = await stripe.paymentMethods.retrieve(paymentId);
          } else {
            paymentMethod = await stripe.paymentMethods.retrieve(paymentId, {
              stripeAccount: account,
            });
          }

          return {
            found: true,
            data: {
              id: paymentMethod.id,
              type: 'PaymentMethod',
              type_detail: paymentMethod.type,
              created: new Date(paymentMethod.created * 1000).toISOString(),
              metadata: paymentMethod.metadata,
              customer: paymentMethod.customer,
              account: account,
              searchStrategy: 'EVENTS_API_PAYMENT_METHOD',
            },
          };
        } catch (pmError) {
          // PaymentMethod nicht direkt abrufbar, aber Event gefunden
          return {
            found: true,
            data: {
              id: paymentId,
              type: 'PaymentMethod',
              account: account,
              searchStrategy: 'EVENTS_API_REFERENCED',
              note: 'Found via event reference but could not retrieve full object',
            },
          };
        }
      }
    }

    return { found: false };
  } catch (error) {
    console.error('Events API error:', error);
    return { found: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 🔥 STRATEGIE 2: DATABASE MAPPING - Schneller Fallback
async function searchWithDatabaseMapping(
  paymentId: string,
  db: any,
  stripe: Stripe
): Promise<SearchResult> {
  try {
    console.log('🔍 Database Mapping: Searching Firestore...');

    // Suche in Aufträgen nach PaymentIntent-Referenzen
    const ordersQuery = await db
      .collection('auftraege')
      .where('paymentIntentId', '==', paymentId)
      .limit(5)
      .get();

    if (!ordersQuery.empty) {
      for (const orderDoc of ordersQuery.docs) {
        const orderData = orderDoc.data();
        const providerAccountId = orderData.providerStripeAccountId;

        if (providerAccountId) {
          try {
            // Versuche PaymentIntent auf Provider Account zu finden
            if (paymentId.startsWith('pi_')) {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentId, {
                stripeAccount: providerAccountId,
              });

              return {
                found: true,
                data: {
                  id: paymentIntent.id,
                  type: 'PaymentIntent',
                  status: paymentIntent.status,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  metadata: paymentIntent.metadata,
                  created: new Date(paymentIntent.created * 1000).toISOString(),
                  account: providerAccountId,
                  searchStrategy: 'DATABASE_MAPPING_ORDER_MATCH',
                  orderId: orderDoc.id,
                },
              };
            } else if (paymentId.startsWith('py_')) {
              const paymentMethod = await stripe.paymentMethods.retrieve(paymentId, {
                stripeAccount: providerAccountId,
              });

              return {
                found: true,
                data: {
                  id: paymentMethod.id,
                  type: 'PaymentMethod',
                  type_detail: paymentMethod.type,
                  created: new Date(paymentMethod.created * 1000).toISOString(),
                  metadata: paymentMethod.metadata,
                  customer: paymentMethod.customer,
                  account: providerAccountId,
                  searchStrategy: 'DATABASE_MAPPING_ORDER_MATCH',
                  orderId: orderDoc.id,
                },
              };
            }
          } catch (accountError) {
            // Nicht auf diesem Account gefunden, weitermachen
            continue;
          }
        }
      }
    }

    // Suche in Stripe-Account-Mappings (falls vorhanden)
    try {
      const accountMappingDoc = await db.collection('stripe_mappings').doc(paymentId).get();
      if (accountMappingDoc.exists) {
        const mappingData = accountMappingDoc.data()!;
        const accountId = mappingData.accountId;

        // Direct retrieval mit gemapptem Account
        if (paymentId.startsWith('pi_')) {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentId, {
            stripeAccount: accountId,
          });

          return {
            found: true,
            data: {
              id: paymentIntent.id,
              type: 'PaymentIntent',
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              metadata: paymentIntent.metadata,
              created: new Date(paymentIntent.created * 1000).toISOString(),
              account: accountId,
              searchStrategy: 'DATABASE_MAPPING_DIRECT',
            },
          };
        } else if (paymentId.startsWith('py_')) {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentId, {
            stripeAccount: accountId,
          });

          return {
            found: true,
            data: {
              id: paymentMethod.id,
              type: 'PaymentMethod',
              type_detail: paymentMethod.type,
              created: new Date(paymentMethod.created * 1000).toISOString(),
              metadata: paymentMethod.metadata,
              customer: paymentMethod.customer,
              account: accountId,
              searchStrategy: 'DATABASE_MAPPING_DIRECT',
            },
          };
        }
      }
    } catch (mappingError) {
      // Kein Mapping vorhanden
    }

    return { found: false };
  } catch (error) {
    console.error('Database Mapping error:', error);
    return { found: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 🔥 STRATEGIE 3: DYNAMIC SEARCH - Fallback für Edge Cases
async function searchWithDynamicIteration(
  paymentId: string,
  stripe: Stripe
): Promise<{ found: boolean; data: any; searchResults: any[] }> {
  try {
    console.log('🔍 Dynamic Search: Last resort iteration...');
    const searchResults: any[] = [];
    let stripeObjectFound = false;
    let foundData: any = null;

    // 1. Main Account versuchen
    try {
      if (paymentId.startsWith('pi_')) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
        foundData = {
          id: paymentIntent.id,
          type: 'PaymentIntent',
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
          created: new Date(paymentIntent.created * 1000).toISOString(),
          account: 'main',
          searchStrategy: 'DYNAMIC_MAIN_ACCOUNT',
        };
        stripeObjectFound = true;
      } else if (paymentId.startsWith('py_')) {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentId);
        foundData = {
          id: paymentMethod.id,
          type: 'PaymentMethod',
          type_detail: paymentMethod.type,
          created: new Date(paymentMethod.created * 1000).toISOString(),
          metadata: paymentMethod.metadata,
          customer: paymentMethod.customer,
          account: 'main',
          searchStrategy: 'DYNAMIC_MAIN_ACCOUNT',
        };
        stripeObjectFound = true;
      }

      searchResults.push({ strategy: 'main_account', success: true, found: true });
    } catch (mainError: any) {
      searchResults.push({
        strategy: 'main_account',
        success: false,
        error: mainError.message,
      });
    }

    // 2. Connect Accounts (begrenzt auf 20 für Performance)
    if (!stripeObjectFound) {
      try {
        const connectAccounts = await stripe.accounts.list({ limit: 20 });

        for (const account of connectAccounts.data) {
          if (stripeObjectFound) break;

          try {
            if (paymentId.startsWith('py_')) {
              const paymentMethod = await stripe.paymentMethods.retrieve(paymentId, {
                stripeAccount: account.id,
              });
              foundData = {
                id: paymentMethod.id,
                type: 'PaymentMethod',
                type_detail: paymentMethod.type,
                created: new Date(paymentMethod.created * 1000).toISOString(),
                metadata: paymentMethod.metadata,
                customer: paymentMethod.customer,
                account: account.id,
                account_email: account.email,
                searchStrategy: 'DYNAMIC_CONNECT_ACCOUNT',
              };
              stripeObjectFound = true;
              searchResults.push({
                strategy: 'connect_account',
                account: account.id,
                success: true,
                found: true,
              });
              break;
            } else if (paymentId.startsWith('pi_')) {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentId, {
                stripeAccount: account.id,
              });
              foundData = {
                id: paymentIntent.id,
                type: 'PaymentIntent',
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                metadata: paymentIntent.metadata,
                created: new Date(paymentIntent.created * 1000).toISOString(),
                account: account.id,
                account_email: account.email,
                searchStrategy: 'DYNAMIC_CONNECT_ACCOUNT',
              };
              stripeObjectFound = true;
              searchResults.push({
                strategy: 'connect_account',
                account: account.id,
                success: true,
                found: true,
              });
              break;
            }
          } catch (connectError: any) {
            searchResults.push({
              strategy: 'connect_account',
              account: account.id,
              success: false,
              error: connectError.message,
            });
            continue;
          }
        }
      } catch (accountsError: any) {
        searchResults.push({
          strategy: 'connect_accounts_list',
          success: false,
          error: accountsError.message,
        });
      }
    }

    return {
      found: stripeObjectFound,
      data: foundData,
      searchResults,
    };
  } catch (error) {
    console.error('Dynamic Search error:', error);
    return {
      found: false,
      data: null,
      searchResults: [
        {
          strategy: 'dynamic_search',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
    };
  }
}
