// src/app/api/admin/debug-transfers/route.ts
// 🎯 TRANSFER #yYE0eWLf SPECIFIC DEBUG API
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
    const transferId = searchParams.get('transferId') || 'yYE0eWLf'; // Default zu Ihrem Transfer
    const action = searchParams.get('action'); // 'analyze', 'fix', 'retry'

    const debugInfo: any = {
      transferId,
      action,
      analysis: {},
      solutions: [],
      timestamp: new Date().toISOString(),
    };

    // 🔍 SCHRITT 1: TRANSFER ANALYSIEREN
    console.log(`🔍 Analyzing transfer: ${transferId}`);

    // 1.1 Suche in failedTransfers Collection
    const failedTransferDoc = await db.collection('failedTransfers').doc(transferId).get();

    if (failedTransferDoc.exists) {
      const failedData = failedTransferDoc.data()!;
      debugInfo.analysis.failedTransfer = {
        found: true,
        status: failedData.status,
        error: failedData.error,
        amount: failedData.amount,
        orderId: failedData.orderId,
        paymentIntentId: failedData.paymentIntentId,
        providerStripeAccountId: failedData.providerStripeAccountId,
        created: failedData.createdAt,
        retryCount: failedData.retryCount || 0,
        fullData: failedData,
      };

      // 1.2 Connect Account Status prüfen
      if (failedData.providerStripeAccountId) {
        try {
          const connectAccount = await stripe.accounts.retrieve(failedData.providerStripeAccountId);
          const connectBalance = await stripe.balance.retrieve({
            stripeAccount: failedData.providerStripeAccountId,
          });

          debugInfo.analysis.connectAccount = {
            id: connectAccount.id,
            charges_enabled: connectAccount.charges_enabled,
            payouts_enabled: connectAccount.payouts_enabled,
            details_submitted: connectAccount.details_submitted,
            balance: {
              available: connectBalance.available,
              pending: connectBalance.pending,
              total_available_eur: connectBalance.available
                .filter(bal => bal.currency === 'eur')
                .reduce((sum, bal) => sum + bal.amount, 0),
            },
            capabilities: connectAccount.capabilities,
            requirements: connectAccount.requirements,
          };

          // 1.3 Kann der Transfer erfolgreich sein?
          const transferAmountCents = failedData.amount;
          const availableEurCents = connectBalance.available
            .filter(bal => bal.currency === 'eur')
            .reduce((sum, bal) => sum + bal.amount, 0);

          debugInfo.analysis.transferAnalysis = {
            transferAmount: transferAmountCents,
            availableBalance: availableEurCents,
            canTransfer: availableEurCents >= transferAmountCents,
            deficit: Math.max(0, transferAmountCents - availableEurCents),
          };
        } catch (accountError: any) {
          debugInfo.analysis.connectAccountError = accountError.message;
        }
      }

      // 1.4 Platform Balance prüfen
      try {
        const platformBalance = await stripe.balance.retrieve();
        debugInfo.analysis.platformBalance = {
          available: platformBalance.available,
          pending: platformBalance.pending,
          total_available_eur: platformBalance.available
            .filter(bal => bal.currency === 'eur')
            .reduce((sum, bal) => sum + bal.amount, 0),
        };
      } catch (balanceError: any) {
        debugInfo.analysis.platformBalanceError = balanceError.message;
      }

      // 1.5 Order Information
      if (failedData.orderId) {
        try {
          const orderDoc = await db.collection('auftraege').doc(failedData.orderId).get();
          if (orderDoc.exists) {
            const orderData = orderDoc.data()!;
            debugInfo.analysis.order = {
              id: failedData.orderId,
              status: orderData.status,
              timeTracking: orderData.timeTracking,
              paymentIntentId: orderData.paymentIntentId,
              totalAmount: orderData.totalAmount,
              currency: orderData.currency,
            };
          }
        } catch (orderError: any) {
          debugInfo.analysis.orderError = orderError.message;
        }
      }

      // 🎯 SCHRITT 2: LÖSUNGSVORSCHLÄGE GENERIEREN
      const errorMessage = failedData.error || '';

      if (errorMessage.includes('insufficient available funds')) {
        debugInfo.solutions.push({
          id: 'test_card_funding',
          type: 'IMMEDIATE_FIX',
          title: '💳 Test-Karte Funding (Sofortige Lösung)',
          description: 'Verwende Stripe Test-Karte 4000000000000077 um Connect Account aufzufüllen',
          steps: [
            '1. Erstelle Test-Payment mit Karte 4000000000000077',
            `2. Mindestbetrag: ${((failedData.amount || 0) / 100).toFixed(2)}€`,
            '3. Payment auf Connect Account ' + (failedData.providerStripeAccountId || 'UNKNOWN'),
            '4. Nach erfolgreichem Payment automatisch Transfer retry',
          ],
          testCard: '4000000000000077',
          requiredAmount: (failedData.amount || 0) / 100,
          connectAccount: failedData.providerStripeAccountId,
          automationPossible: true,
        });

        debugInfo.solutions.push({
          id: 'platform_transfer',
          type: 'ALTERNATIVE_FIX',
          title: '🔄 Platform-to-Connect Transfer',
          description: 'Transferiere Geld von Platform Account zu Connect Account',
          steps: [
            '1. Prüfe Platform Balance (verfügbar: ' +
              (debugInfo.analysis.platformBalance?.total_available_eur || 0) / 100 +
              '€)',
            `2. Transferiere ${((failedData.amount || 0) / 100).toFixed(2)}€ zu Connect Account`,
            '3. Warte auf Transfer-Completion',
            '4. Retry ursprünglichen Transfer',
          ],
          requiredPlatformBalance: failedData.amount || 0,
          canExecute:
            (debugInfo.analysis.platformBalance?.total_available_eur || 0) >=
            (failedData.amount || 0),
        });

        debugInfo.solutions.push({
          id: 'wait_for_real_payments',
          type: 'PRODUCTION_STRATEGY',
          title: '⏰ Warten auf echte Zahlungen',
          description: 'Lasse echte Kunden-Zahlungen das Connect Account auffüllen',
          steps: [
            '1. Warte auf echte Kunden-Zahlungen',
            '2. Payments landen automatisch auf Connect Account',
            '3. Transfer wird automatisch retry wenn Balance ausreicht',
            '4. Keine manuelle Intervention notwendig',
          ],
          timeline: 'Abhängig von Kunden-Aktivität',
          recommended: 'Für Production Environment',
        });
      }

      // 🎯 SCHRITT 3: AKTIONEN AUSFÜHREN (falls action Parameter)
      if (action === 'fix' && debugInfo.solutions.length > 0) {
        // Implementiere automatische Fix-Logik hier
        debugInfo.actionTaken = {
          type: 'analysis_only',
          message: 'Use specific action endpoints for automated fixes',
          availableActions: ['test-payment', 'platform-transfer', 'retry-transfer'],
        };
      }
    } else {
      debugInfo.analysis.failedTransfer = {
        found: false,
        message: `Transfer ${transferId} not found in failedTransfers collection`,
      };
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

// 🎯 POST: AKTIONEN AUSFÜHREN
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Stripe nicht konfiguriert' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { action, transferId = 'yYE0eWLf', ...params } = body;

    let result: any = {
      action,
      transferId,
      success: false,
      timestamp: new Date().toISOString(),
    };

    switch (action) {
      case 'retry_transfer':
        // Retry failed transfer
        const failedDoc = await db.collection('failedTransfers').doc(transferId).get();
        if (failedDoc.exists) {
          const failedData = failedDoc.data()!;

          try {
            const newTransfer = await stripe.transfers.create({
              amount: failedData.amount,
              currency: 'eur',
              destination: failedData.providerStripeAccountId,
              description: `Retry: Transfer ${transferId} - Auftrag ${failedData.orderId}`,
              metadata: {
                type: 'failed_transfer_retry',
                originalTransferId: transferId,
                orderId: failedData.orderId,
                paymentIntentId: failedData.paymentIntentId,
              },
            });

            // Update failed transfer status
            await db
              .collection('failedTransfers')
              .doc(transferId)
              .update({
                status: 'completed',
                retryTransferId: newTransfer.id,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                retryCount: (failedData.retryCount || 0) + 1,
              });

            result = {
              ...result,
              success: true,
              newTransferId: newTransfer.id,
              message: 'Transfer successfully retried',
            };
          } catch (retryError: any) {
            result = {
              ...result,
              error: retryError.message,
              message: 'Transfer retry failed',
            };
          }
        }
        break;

      case 'create_test_payment':
        // Erstelle Test-Payment um Connect Account aufzufüllen
        const { connectAccountId, amount } = params;

        try {
          // Hier würde normalerweise ein PaymentIntent für Test-Zwecke erstellt
          result = {
            ...result,
            success: true,
            message: 'Test payment creation would be implemented here',
            testCard: '4000000000000077',
            requiredAmount: amount,
            connectAccount: connectAccountId,
            note: 'Use Stripe Dashboard or test environment for actual test payments',
          };
        } catch (testError: any) {
          result = {
            ...result,
            error: testError.message,
          };
        }
        break;

      default:
        result = {
          ...result,
          error: 'Unknown action',
          availableActions: ['retry_transfer', 'create_test_payment'],
        };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Transfer action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
