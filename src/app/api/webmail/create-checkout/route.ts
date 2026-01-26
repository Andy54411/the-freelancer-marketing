import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  company: z.string().min(1),
  domain: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  plan: z.enum(['monthly', 'yearly']),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validierung
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Daten', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Revolut Merchant API Aufruf über Hetzner Proxy
    const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
    const WEBMAIL_API_SECRET = process.env.WEBMAIL_API_SECRET;

    if (!WEBMAIL_API_SECRET) {
      console.error('WEBMAIL_API_SECRET nicht gesetzt');
      return NextResponse.json(
        { success: false, error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      );
    }

    const response = await fetch(`${WEBMAIL_API_URL}/api/revolut/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBMAIL_API_SECRET,
      },
      body: JSON.stringify({
        customer: {
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
        },
        amount: Math.round(data.amount * 100), // Cent
        currency: data.currency,
        description: `Taskilo Webmail ${data.plan === 'yearly' ? 'Jährlich' : 'Monatlich'} - ${data.domain}`,
        metadata: {
          company: data.company,
          domain: data.domain,
          username: data.username,
          plan: data.plan,
          type: 'webmail_subscription',
        },
        successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/webmail/register/business/success?domain=${data.domain}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/webmail/register/business/checkout?${new URLSearchParams(body).toString()}`,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Revolut Checkout Error:', result);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Checkout-Erstellung fehlgeschlagen' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      checkoutId: result.checkoutId,
    });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
