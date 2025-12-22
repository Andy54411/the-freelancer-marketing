import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrderService } from '@/services/order';
import { DomainContactSchema } from '@/services/inwx/types';

const MailboxOrderSchema = z.object({
  email: z.string().email('Gueltige E-Mail-Adresse erforderlich'),
  domain: z.string().min(1, 'Domain ist erforderlich'),
  quotaMB: z.number().min(1000).max(50000).default(5000), // 5GB default
  contact: DomainContactSchema,
  paymentMethod: z.enum(['revolut', 'sepa']).default('revolut'),
  userId: z.string().min(1, 'User ID ist erforderlich'),
  companyId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = MailboxOrderSchema.parse(body);

    // Vollstaendige E-Mail
    const fullEmail = validated.email.includes('@')
      ? validated.email
      : `${validated.email}@${validated.domain}`;

    const orderService = getOrderService();
    
    const result = await orderService.createOrder({
      userId: validated.userId,
      companyId: validated.companyId,
      type: 'mailbox',
      email: fullEmail,
      quotaMB: validated.quotaMB,
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
