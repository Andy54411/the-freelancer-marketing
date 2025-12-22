import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrderService } from '@/services/order';
import { DomainContactSchema } from '@/services/inwx/types';

const DomainOrderSchema = z.object({
  domain: z.string().min(1, 'Domain ist erforderlich'),
  tld: z.string().min(1, 'TLD ist erforderlich'),
  period: z.number().min(1).max(10).default(1),
  contact: DomainContactSchema,
  paymentMethod: z.enum(['revolut', 'sepa']).default('revolut'),
  userId: z.string().min(1, 'User ID ist erforderlich'),
  companyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = DomainOrderSchema.parse(body);

    // Vollstaendige Domain
    const fullDomain = validated.domain.includes('.')
      ? validated.domain
      : `${validated.domain}${validated.tld.startsWith('.') ? validated.tld : `.${validated.tld}`}`;

    const orderService = getOrderService();
    
    const result = await orderService.createOrder({
      userId: validated.userId,
      companyId: validated.companyId,
      type: 'domain',
      domain: fullDomain,
      tld: validated.tld,
      period: validated.period,
      contact: validated.contact,
      paymentMethod: validated.paymentMethod,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      paymentUrl: result.paymentUrl,
      sepaDetails: result.sepaDetails,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validierungsfehler', details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: 'Bestellung fehlgeschlagen', details: message },
      { status: 500 }
    );
  }
}
