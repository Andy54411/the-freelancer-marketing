import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('[WEBHOOK TEST] Request empfangen');
    console.log('[WEBHOOK TEST] Headers:', Object.fromEntries(req.headers.entries()));

    const body = await req.text();
    console.log('[WEBHOOK TEST] Body length:', body.length);
    console.log(
      '[WEBHOOK TEST] STRIPE_WEBHOOK_SECRET exists:',
      !!process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(
      '[WEBHOOK TEST] STRIPE_WEBHOOK_SECRET starts with:',
      process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10)
    );

    return NextResponse.json({
      success: true,
      message: 'Webhook test erfolgreich',
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[WEBHOOK TEST ERROR]', error);
    return NextResponse.json(
      {
        error: 'Webhook test fehlgeschlagen',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint - use POST',
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
  });
}
