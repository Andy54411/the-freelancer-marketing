// src/app/api/admin/debug-transfer-issue/route.ts
// 🚀 TRANSFER PROBLEM SOLVER - für fehlgeschlagene Transfers
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, admin } from '@/firebase/server';

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
    const transferId = searchParams.get('transferId');
    const orderId = searchParams.get('orderId');
    const connectAccountId = searchParams.get('connectAccountId');

    if (!transferId && !orderId && !connectAccountId) {
      return NextResponse.json(
        { success: false, error: 'transferId, orderId, or connectAccountId required' },
        { status: 400 }
      );
    }

    const debugInfo: any = {
      searchCriteria: { transferId, orderId, connectAccountId },
      results: {},
      solutions: [],
      recommendations: [],
    };

    // 🔍 1. ANALYSIERE FAILED TRANSFER
    if (transferId) {
      try {
        console.log(`🔍 Analyzing failed transfer: ${transferId}`);

        // Suche in failedTransfers Collection
        const failedTransferDoc = await db.collection('failedTransfers').doc(transferId).get();

        if (failedTransferDoc.exists) {
          const failedData = failedTransferDoc.data()!;
          debugInfo.results.failedTransfer = {
            exists: true,
            data: failedData,
            status: failedData.status,
            error: failedData.error,
            amount: failedData.amount,
            orderId: failedData.orderId,
            providerStripeAccountId: failedData.providerStripeAccountId,
            retryCount: failedData.retryCount || 0,
          };

          // Analysiere den Fehler und gebe spezifische Lösungen
          const errorMessage = failedData.error || '';

          if (errorMessage.includes('insufficient available funds')) {
            debugInfo.solutions.push({
              type: 'INSUFFICIENT_FUNDS',
              title: '💰 Unzureichende Gelder im Connect Account',
              description: 'Der Connect Account hat nicht genügend Guthaben für den Transfer',
              steps: [
                'Option 1: Test-Zahlung durchführen um Connect Account aufzufüllen',
                'Option 2: Warten bis echte Zahlungen das Guthaben auffüllen',
                'Option 3: Transfer-Retry nach Guthaben-Auffüllung',
                'Option 4: Platform-Guthaben direkt zum Connect Account transferieren',
              ],
              note: 'Verschiedene Test-Karten stehen für unterschiedliche Szenarien zur Verfügung',
            });

            debugInfo.recommendations.push(
              'IMMEDIATE_ACTION: Test-Zahlung durchführen um Connect Account aufzufüllen'
            );
          }

          if (errorMessage.includes('account')) {
            debugInfo.solutions.push({
              type: 'ACCOUNT_ISSUE',
              title: '🏦 Connect Account Problem',
              description: 'Problem mit dem Connect Account Setup',
              steps: [
                'Connect Account Status überprüfen',
                'charges_enabled und payouts_enabled validieren',
                'Account Onboarding-Status kontrollieren',
                'Bei Bedarf Account-Link für Updates erstellen',
              ],
            });
          }

          // Prüfe Connect Account Status
          const connectAccountId = failedData.providerStripeAccountId;
          if (connectAccountId) {
            try {
              const connectAccount = await stripe.accounts.retrieve(connectAccountId);
              debugInfo.results.connectAccount = {
                id: connectAccount.id,
                charges_enabled: connectAccount.charges_enabled,
                payouts_enabled: connectAccount.payouts_enabled,
                created: connectAccount.created ? new Date(connectAccount.created * 1000).toISOString() : null,
                country: connectAccount.country,
                email: connectAccount.email,
                type: connectAccount.type,
                requirements: {
                  currently_due: connectAccount.requirements?.currently_due || [],
                  errors: connectAccount.requirements?.errors || [],
                  past_due: connectAccount.requirements?.past_due || [],
                },
              };

              // Account-spezifische Lösungen
              if (!connectAccount.charges_enabled) {
                debugInfo.solutions.push({
                  type: 'CHARGES_DISABLED',
                  title: '⚠️ Charges nicht aktiviert',
                  description: 'Der Connect Account kann keine Zahlungen empfangen',
                  steps: [
                    'Account Onboarding abschließen',
                    'Fehlende Informationen ergänzen',
                    'Account-Verifizierung durchlaufen',
                  ],
                });
              }

              if (!connectAccount.payouts_enabled) {
                debugInfo.solutions.push({
                  type: 'PAYOUTS_DISABLED',
                  title: '⚠️ Payouts nicht aktiviert',
                  description: 'Der Connect Account kann keine Auszahlungen empfangen',
                  steps: [
                    'Bankkonto-Informationen vervollständigen',
                    'Identitätsverifizierung abschließen',
                    'Steuerliche Informationen bereitstellen',
                  ],
                });
              }

              // Balance des Connect Accounts prüfen
              try {
                const balance = await stripe.balance.retrieve({
                  stripeAccount: connectAccountId,
                });

                debugInfo.results.connectAccountBalance = {
                  available: balance.available,
                  pending: balance.pending,
                  total_available: balance.available.reduce((sum, bal) => sum + bal.amount, 0),
                  total_pending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0),
                  currency: balance.available[0]?.currency || 'eur',
                };

                const totalAvailable = balance.available.reduce((sum, bal) => sum + bal.amount, 0);
                const requiredAmount = failedData.amount;

                if (totalAvailable < requiredAmount) {
                  debugInfo.solutions.push({
                    type: 'BALANCE_TOO_LOW',
                    title: '💸 Guthaben zu niedrig',
                    description: `Verfügbar: €${(totalAvailable / 100).toFixed(2)}, Benötigt: €${(requiredAmount / 100).toFixed(2)}`,
                    steps: [
                      `Fehlende Summe: €${((requiredAmount - totalAvailable) / 100).toFixed(2)}`,
                      'Test-Zahlung durchführen um Guthaben aufzufüllen',
                      'Oder warten bis echte Zahlungen eingehen',
                      'Transfer dann erneut versuchen',
                    ],
                    deficit: requiredAmount - totalAvailable,
                    deficitFormatted: `€${((requiredAmount - totalAvailable) / 100).toFixed(2)}`,
                  });
                } else {
                  debugInfo.recommendations.push(
                    'GOOD_NEWS: Ausreichend Guthaben vorhanden - Transfer sollte möglich sein'
                  );
                }
              } catch (balanceError: any) {
                debugInfo.results.connectAccountBalance = {
                  error: balanceError.message,
                  note: 'Konnte Balance nicht abrufen - möglicherweise Berechtigungsproblem',
                };
              }
            } catch (accountError: any) {
              debugInfo.results.connectAccount = {
                error: accountError.message,
                note: 'Connect Account konnte nicht abgerufen werden',
              };
            }
          }
        } else {
          debugInfo.results.failedTransfer = {
            exists: false,
            note: `Transfer ID ${transferId} nicht in failedTransfers gefunden`,
          };
        }
      } catch (error) {
        debugInfo.results.failedTransfer = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // 🔍 2. AUFTRAG-ANALYSE (wenn orderId gegeben)
    if (orderId) {
      try {
        const orderDoc = await db.collection('auftraege').doc(orderId).get();
        if (orderDoc.exists) {
          const orderData = orderDoc.data()!;
          debugInfo.results.orderData = {
            exists: true,
            status: orderData.status,
            anbieterStripeAccountId: orderData.anbieterStripeAccountId,
            paymentIntentId: orderData.paymentIntentId,
            timeTracking: orderData.timeTracking
              ? {
                status: orderData.timeTracking.status,
                billingData: orderData.timeTracking.billingData,
                entryCount: orderData.timeTracking.timeEntries?.length || 0,
                transferredEntries:
                  orderData.timeTracking.timeEntries?.filter(
                    (entry: any) => entry.status === 'transferred'
                  )?.length || 0,
              }
              : null,
          };

          // Suche nach verwandten failed transfers für diesen Auftrag
          const relatedFailedTransfersQuery = await db
            .collection('failedTransfers')
            .where('orderId', '==', orderId)
            .get();

          debugInfo.results.relatedFailedTransfers = relatedFailedTransfersQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          debugInfo.results.orderData = { exists: false };
        }
      } catch (error) {
        debugInfo.results.orderData = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // 🔍 3. PLATFORM BALANCE CHECK
    try {
      const platformBalance = await stripe.balance.retrieve();
      debugInfo.results.platformBalance = {
        available: platformBalance.available,
        pending: platformBalance.pending,
        total_available: platformBalance.available.reduce((sum, bal) => sum + bal.amount, 0),
        total_pending: platformBalance.pending.reduce((sum, bal) => sum + bal.amount, 0),
        currency: platformBalance.available[0]?.currency || 'eur',
      };

      const totalPlatformAvailable = platformBalance.available.reduce(
        (sum, bal) => sum + bal.amount,
        0
      );

      if (totalPlatformAvailable > 0) {
        debugInfo.solutions.push({
          type: 'PLATFORM_FUNDS_AVAILABLE',
          title: '🏛️ Platform-Guthaben verfügbar',
          description: `Platform hat €${(totalPlatformAvailable / 100).toFixed(2)} verfügbar`,
          steps: [
            'Platform-Guthaben kann für Transfer verwendet werden',
            'Direct Transfer von Platform zu Connect Account möglich',
            'Alternative: Manual Transfer Script verwenden',
          ],
          platformBalance: totalPlatformAvailable,
          platformBalanceFormatted: `€${(totalPlatformAvailable / 100).toFixed(2)}`,
        });
      }
    } catch (error) {
      debugInfo.results.platformBalance = {
        error: error instanceof Error ? error.message : 'Could not retrieve platform balance',
      };
    }

    // 🎯 FINALE EMPFEHLUNGEN
    debugInfo.finalRecommendations = [
      {
        priority: 'HIGH',
        action: 'IMMEDIATE_TEST_PAYMENT',
        description: 'Führe Test-Zahlung durch um Connect Account Guthaben aufzufüllen',
        details: {
          note: 'Verschiedene Test-Karten verfügbar je nach gewünschtem Szenario',
          purpose: 'Adds available balance to Connect Account',
          documentation: 'https://stripe.com/docs/testing',
        },
      },
      {
        priority: 'MEDIUM',
        action: 'RETRY_TRANSFER',
        description: 'Nach Guthaben-Auffüllung Transfer erneut versuchen',
        details: {
          endpoint: '/api/admin/retry-failed-transfers',
          method: 'POST',
          payload: transferId ? { transferIds: [transferId] } : null,
        },
      },
      {
        priority: 'LOW',
        action: 'MONITOR_STATUS',
        description:
          'Connect Account Status überwachen und bei Problemen Account-Updates durchführen',
        details: {
          checkPoints: ['charges_enabled', 'payouts_enabled', 'requirements'],
        },
      },
    ];

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      transferId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug transfer issue error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// 🚀 POST: AUTOMATED PROBLEM SOLVING
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { transferId, action, orderId } = body;

    if (!transferId && !orderId) {
      return NextResponse.json(
        { success: false, error: 'transferId or orderId required' },
        { status: 400 }
      );
    }

    const results: any = {
      action,
      transferId,
      orderId,
      steps: [],
      success: false,
    };

    switch (action) {
      case 'CREATE_TEST_PAYMENT':
        results.steps.push({
          step: 'CREATE_TEST_PAYMENT',
          status: 'INFO',
          message: 'Test-Zahlung muss manuell durchgeführt werden',
          details: {
            note: 'Verschiedene Test-Karten stehen zur Verfügung',
            purpose: 'Fügt Guthaben zum Connect Account hinzu',
            documentation: 'https://stripe.com/docs/testing',
          },
        });
        break;

      case 'RETRY_TRANSFER':
        if (transferId) {
          try {
            // Implementiere Transfer-Retry Logic (verwende existierende API)
            const retryResponse = await fetch('/api/admin/retry-failed-transfers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transferIds: [transferId] }),
            });

            const retryData = await retryResponse.json();

            results.steps.push({
              step: 'RETRY_TRANSFER',
              status: retryData.success ? 'SUCCESS' : 'ERROR',
              message: retryData.success
                ? 'Transfer retry erfolgreich'
                : 'Transfer retry fehlgeschlagen',
              details: retryData,
            });

            results.success = retryData.success;
          } catch (retryError) {
            results.steps.push({
              step: 'RETRY_TRANSFER',
              status: 'ERROR',
              message: retryError instanceof Error ? retryError.message : 'Retry failed',
            });
          }
        }
        break;

      case 'CHECK_ACCOUNT_STATUS':
        if (orderId) {
          try {
            // Hole Connect Account ID vom Auftrag
            const orderDoc = await db.collection('auftraege').doc(orderId).get();
            if (orderDoc.exists) {
              const orderData = orderDoc.data()!;
              const connectAccountId = orderData.anbieterStripeAccountId;

              if (connectAccountId) {
                const account = await stripe.accounts.retrieve(connectAccountId);

                results.steps.push({
                  step: 'CHECK_ACCOUNT_STATUS',
                  status:
                    account.charges_enabled && account.payouts_enabled ? 'SUCCESS' : 'WARNING',
                  message: `Account Status: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`,
                  details: {
                    id: account.id,
                    charges_enabled: account.charges_enabled,
                    payouts_enabled: account.payouts_enabled,
                    requirements: account.requirements,
                  },
                });

                results.success = account.charges_enabled && account.payouts_enabled;
              } else {
                results.steps.push({
                  step: 'CHECK_ACCOUNT_STATUS',
                  status: 'ERROR',
                  message: 'Kein Connect Account ID im Auftrag gefunden',
                });
              }
            }
          } catch (error) {
            results.steps.push({
              step: 'CHECK_ACCOUNT_STATUS',
              status: 'ERROR',
              message: error instanceof Error ? error.message : 'Account check failed',
            });
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Transfer issue solver error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
