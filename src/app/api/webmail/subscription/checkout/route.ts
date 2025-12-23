/**
 * Start Revolut Subscription Checkout
 * 
 * Startet den Checkout-Flow für ein Webmail-Abo
 * Gibt eine Checkout-URL zurück zu der der Nutzer weitergeleitet wird
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebmailSubscriptionService } from '@/services/webmail/WebmailSubscriptionService';
import { z } from 'zod';

const CheckoutRequestSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().optional(),
  planId: z.enum(['promail', 'businessmail']),
  billingInterval: z.enum(['monthly', 'yearly']),
  customerEmail: z.string().email(),
  customerName: z.string().min(2),
  customerAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(2),
  }),
  domain: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parseResult = CheckoutRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ungültige Anfrage',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Starte Revolut Checkout
    const result = await WebmailSubscriptionService.startRevolutCheckout({
      userId: data.userId,
      companyId: data.companyId,
      planId: data.planId,
      billingInterval: data.billingInterval,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      domain: data.domain,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: result.subscriptionId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Interner Fehler',
      },
      { status: 500 }
    );
  }
}
