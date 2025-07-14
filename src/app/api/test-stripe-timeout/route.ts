import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe Initialisierung
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Timeout Wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('💳 [Stripe Timeout Test] Started at:', new Date().toISOString());

  try {
    // Test 1: Stripe Client Check
    console.log('⏱️ [Step 1] Checking Stripe client...');
    const stepStart = Date.now();
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    console.log(`✅ [Step 1] Stripe key available: ${hasStripeKey} (${Date.now() - stepStart}ms)`);

    if (!hasStripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    // Test 2: Stripe Balance API mit verschiedenen Timeouts
    console.log('⏱️ [Step 2] Testing Stripe balance API with 20s timeout...');
    const step2Start = Date.now();

    const balanceOperation = async () => {
      const balance = await stripe.balance.retrieve();
      return balance;
    };

    const balance = await withTimeout(balanceOperation(), 20000);
    console.log(`✅ [Step 2] Stripe balance retrieved (${Date.now() - step2Start}ms)`);

    // Test 3: Stripe Account List mit Timeout
    console.log('⏱️ [Step 3] Testing Stripe accounts list with 15s timeout...');
    const step3Start = Date.now();

    const accountsOperation = async () => {
      const accounts = await stripe.accounts.list({ limit: 1 });
      return accounts.data.length;
    };

    const accountCount = await withTimeout(accountsOperation(), 15000);
    console.log(
      `✅ [Step 3] Stripe accounts checked: ${accountCount} (${Date.now() - step3Start}ms)`
    );

    const totalTime = Date.now() - startTime;
    console.log(`🎉 [Stripe Timeout Test] All tests completed in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Stripe operations completed successfully',
      timing: {
        totalTime: totalTime,
        steps: {
          stripeCheck: 'fast',
          balanceApi: 'completed within 20s timeout',
          accountsList: 'completed within 15s timeout',
        },
      },
      tests: {
        hasStripeKey: hasStripeKey,
        balanceAvailable: balance.available.length,
        balancePending: balance.pending.length,
        accountsChecked: accountCount,
      },
    });
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [Stripe Timeout Test] Error after', totalTime, 'ms:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timing: {
          totalTime: totalTime,
          failedAt: totalTime,
        },
        message: 'Stripe operation failed or timed out',
      },
      { status: 500 }
    );
  }
}
