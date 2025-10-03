import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    return NextResponse.json({
      success: true,
      message: 'Webhook test erfolgreich',
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
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
