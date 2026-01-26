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
  employees: z.string().optional(),
  region: z.string().optional(),
  trialDays: z.number().default(14),
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

    // Success URL mit allen Parametern für die Weiterleitung
    const successParams = new URLSearchParams({
      company: data.company,
      domain: data.domain,
      email: data.email,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      plan: data.plan,
      amount: String(data.amount),
      employees: data.employees || '',
      region: data.region || 'Deutschland',
      payment: 'completed',
    });

    // Revolut Subscription API über Hetzner Proxy
    const WEBMAIL_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
    const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY;

    if (!WEBMAIL_API_KEY) {
      console.error('WEBMAIL_API_KEY nicht gesetzt');
      return NextResponse.json(
        { success: false, error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      );
    }

    // Nutze die neue Subscription API mit 14-Tage Trial
    const response = await fetch(`${WEBMAIL_API_URL}/api/revolut/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WEBMAIL_API_KEY,
      },
      body: JSON.stringify({
        customerEmail: data.email,
        customerName: `${data.firstName} ${data.lastName}`,
        plan: data.plan,
        domain: data.domain,
        company: data.company,
        successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/webmail/register/business/organization?${successParams.toString()}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/webmail/register/business/checkout?${successParams.toString()}`,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Revolut Subscription Error:', result);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Subscription-Erstellung fehlgeschlagen' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      subscriptionId: result.subscriptionId,
      customerId: result.customerId,
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
