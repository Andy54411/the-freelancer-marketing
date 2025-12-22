/**
 * Revolut Subscription Webhook Handler
 * 
 * Verarbeitet Subscription Events:
 * - SUBSCRIPTION_ACTIVATED: Zahlung erfolgreich, Subscription aktivieren
 * - SUBSCRIPTION_PAYMENT_COMPLETED: Monatliche Zahlung erfolgreich
 * - SUBSCRIPTION_CANCELLED: Subscription gekuendigt
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { WebmailSubscriptionService } from '@/services/webmail/WebmailSubscriptionService';
import { z } from 'zod';

const RevolutEventSchema = z.object({
  event: z.string(),
  order_id: z.string().optional(),
  subscription_id: z.string().optional(),
  customer_id: z.string().optional(),
  external_reference: z.string().optional(), // Unsere Subscription ID
  timestamp: z.string(),
});

async function findSubscriptionByRevolutId(revolutSubscriptionId: string) {
  const subscriptionsQuery = query(
    collection(db, 'webmailSubscriptions'),
    where('revolutSubscriptionId', '==', revolutSubscriptionId)
  );
  
  const snapshot = await getDocs(subscriptionsQuery);
  if (snapshot.empty) {
    return null;
  }
  
  return { id: snapshot.docs[0].id, ref: snapshot.docs[0].ref, data: snapshot.docs[0].data() };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const parseResult = RevolutEventSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const event = parseResult.data;

    switch (event.event) {
      case 'SUBSCRIPTION_ACTIVATED': {
        // Subscription wurde aktiviert (erste Zahlung erfolgreich)
        if (!event.subscription_id) break;
        
        const sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (sub) {
          await updateDoc(sub.ref, {
            status: 'active',
            activatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_COMPLETED': {
        // Monatliche Zahlung erfolgreich
        if (!event.subscription_id) break;
        
        const sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (sub) {
          // Berechne Abrechnungsperiode (1. des Monats bis Ende des Monats)
          const now = new Date();
          const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          // Erstelle Rechnung fuer diese Periode
          await WebmailSubscriptionService.createInvoiceForSubscription(sub.id, periodStart, periodEnd);
          
          await updateDoc(sub.ref, {
            lastPaymentAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        break;
      }

      case 'SUBSCRIPTION_PAYMENT_FAILED': {
        // Zahlung fehlgeschlagen
        if (!event.subscription_id) break;
        
        const sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (sub) {
          await updateDoc(sub.ref, {
            paymentFailedAt: serverTimestamp(),
            status: 'payment_failed',
            updatedAt: serverTimestamp(),
          });
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        // Subscription gekuendigt
        if (!event.subscription_id) break;
        
        const sub = await findSubscriptionByRevolutId(event.subscription_id);
        if (sub) {
          await updateDoc(sub.ref, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        break;
      }
    }

    return NextResponse.json({ success: true, event: event.event });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}
