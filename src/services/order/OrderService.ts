/**
 * Order Service
 * 
 * Verwaltet Domain- und E-Mail-Bestellungen
 * DSGVO-konform mit Firebase
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { z } from 'zod';
import { getINWXService } from '@/services/inwx';
import { getRevolutPaymentService } from '@/services/payment';
import { WebmailSubscriptionService } from '@/services/webmail/WebmailSubscriptionService';
import type { Order } from '@/services/inwx/types';
import { DomainContactSchema } from '@/services/inwx/types';

// Order creation schema
const CreateOrderSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().optional(),
  type: z.enum(['domain', 'mailbox', 'bundle']),
  
  // Domain
  domain: z.string().optional(),
  tld: z.string().optional(),
  period: z.number().min(1).max(10).optional(),
  
  // Mailbox
  email: z.string().email().optional(),
  quotaMB: z.number().optional(),
  
  // Contact (DSGVO)
  contact: DomainContactSchema.optional(),
  
  // Payment
  paymentMethod: z.enum(['revolut', 'sepa', 'invoice']),
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Pricing configuration
const PRICING = {
  mailbox: {
    monthly: 2.99,
    yearly: 29.90,
    setupFee: 0,
    includedStorageGB: 5,
    additionalStoragePerGB: 0.50,
  },
  vatRate: 19, // 19% MwSt
};

export class OrderService {
  private collectionPath = 'webmailOrders';

  /**
   * Create a new order
   */
  async createOrder(input: CreateOrderInput): Promise<{
    success: boolean;
    orderId?: string;
    paymentUrl?: string;
    sepaDetails?: {
      iban: string;
      bic: string;
      recipient: string;
      reference: string;
      amount: number;
    };
    error?: string;
  }> {
    // Validate input
    const validated = CreateOrderSchema.parse(input);

    // Calculate price
    const { priceNet, vatAmount, priceGross } = this.calculatePrice(validated);

    // Generate order ID
    const orderId = this.generateOrderId();

    // Create order document - serverTimestamp will be resolved by Firestore
    // Remove undefined values (Firebase doesn't allow undefined)
    const orderData: Record<string, unknown> = {
      id: orderId,
      userId: validated.userId,
      type: validated.type,
      priceNet,
      vatRate: PRICING.vatRate,
      vatAmount,
      priceGross,
      paymentStatus: 'pending',
      paymentMethod: validated.paymentMethod,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Add optional fields only if defined
    if (validated.companyId) orderData.companyId = validated.companyId;
    if (validated.domain) orderData.domain = validated.domain;
    if (validated.tld) orderData.tld = validated.tld;
    if (validated.period) orderData.period = validated.period;
    if (validated.email) orderData.email = validated.email;
    if (validated.quotaMB) orderData.quotaMB = validated.quotaMB;
    if (validated.contact) orderData.contact = validated.contact;

    // Save to Firebase
    await setDoc(doc(db, this.collectionPath, orderId), orderData);

    // Handle payment
    if (validated.paymentMethod === 'revolut') {
      const paymentService = getRevolutPaymentService();
      
      const paymentResult = await paymentService.createPayment({
        orderId,
        amount: priceGross,
        currency: 'EUR',
        description: this.getOrderDescription(validated),
        customerEmail: validated.contact?.email || '',
        customerName: validated.contact 
          ? `${validated.contact.firstname} ${validated.contact.lastname}` 
          : undefined,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/webmail/order/success?orderId=${orderId}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/webmail/order/cancel?orderId=${orderId}`,
      });

      if (!paymentResult.success) {
        await updateDoc(doc(db, this.collectionPath, orderId), {
          status: 'failed',
          paymentStatus: 'failed',
          updatedAt: serverTimestamp(),
        });
        return { success: false, error: paymentResult.error };
      }

      // Update order with payment ID
      await updateDoc(doc(db, this.collectionPath, orderId), {
        paymentId: paymentResult.paymentId,
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        orderId,
        paymentUrl: paymentResult.paymentUrl,
      };
    } else if (validated.paymentMethod === 'sepa') {
      const paymentService = getRevolutPaymentService();
      const sepaDetails = paymentService.getSepaPaymentDetails(orderId, priceGross);

      return {
        success: true,
        orderId,
        sepaDetails,
      };
    }

    // Invoice payment - order is pending manual verification
    return {
      success: true,
      orderId,
    };
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(orderId: string): Promise<boolean> {
    const orderRef = doc(db, this.collectionPath, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return false;
    }

    const order = orderSnap.data() as Order;

    // Update payment status
    await updateDoc(orderRef, {
      paymentStatus: 'paid',
      paymentDate: new Date().toISOString(),
      status: 'processing',
      updatedAt: serverTimestamp(),
    });

    // Create subscription for mailbox orders
    if (order.type === 'mailbox' || order.type === 'bundle') {
      await this.createSubscriptionForOrder(orderId, order);
    }

    // Process the order
    return this.processOrder(orderId);
  }

  /**
   * Create a subscription for mailbox orders
   */
  private async createSubscriptionForOrder(orderId: string, order: Order): Promise<void> {
    // Get user info for subscription
    const userRef = doc(db, 'users', order.userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;
    
    const customerEmail = userData?.email || order.email || '';
    const customerName = userData?.displayName || userData?.name || 'Kunde';
    
    // Use mailbox pricing for monthly billing
    const priceNet = order.type === 'mailbox' ? PRICING.mailbox.monthly : PRICING.mailbox.yearly;
    
    // Create subscription with first invoice (static method)
    await WebmailSubscriptionService.createSubscription({
      orderId,
      userId: order.userId,
      companyId: order.companyId,
      type: order.type === 'bundle' ? 'bundle' : 'mailbox',
      mailboxEmail: order.email,
      billingInterval: 'monthly',
      priceNet,
      customerEmail,
      customerName,
      customerAddress: {
        street: order.contact?.street || '',
        city: order.contact?.city || '',
        postalCode: order.contact?.postalCode || '',
        country: order.contact?.countryCode || 'DE',
      },
      paymentMethod: order.paymentMethod || 'invoice',
    });
  }

  /**
   * Process order (register domain or create mailbox)
   */
  async processOrder(orderId: string): Promise<boolean> {
    const orderRef = doc(db, this.collectionPath, orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return false;
    }

    const order = orderSnap.data() as Order;

    if (order.paymentStatus !== 'paid') {
      return false;
    }

    try {
      if (order.type === 'domain' && order.domain && order.contact) {
        // Register domain via INWX
        const inwxService = getINWXService();
        const result = await inwxService.registerDomain({
          domain: order.domain,
          period: order.period || 1,
          contact: order.contact,
          autoRenew: true,
        });

        if (!result.success) {
          await updateDoc(orderRef, {
            status: 'failed',
            updatedAt: serverTimestamp(),
          });
          return false;
        }

        await updateDoc(orderRef, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });

        return true;
      }

      if (order.type === 'mailbox' && order.email) {
        // Create mailbox via Hetzner API
        // TODO: Implement Hetzner mailbox creation
        await updateDoc(orderRef, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });

        return true;
      }

      return false;
    } catch {
      await updateDoc(orderRef, {
        status: 'failed',
        updatedAt: serverTimestamp(),
      });
      return false;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    const orderSnap = await getDoc(doc(db, this.collectionPath, orderId));
    if (!orderSnap.exists()) {
      return null;
    }
    return orderSnap.data() as Order;
  }

  /**
   * Get orders by user ID
   */
  async getOrdersByUser(userId: string): Promise<Order[]> {
    const q = query(
      collection(db, this.collectionPath),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Order);
  }

  /**
   * Calculate price for order
   */
  private calculatePrice(input: CreateOrderInput): {
    priceNet: number;
    vatAmount: number;
    priceGross: number;
  } {
    let priceNet = 0;

    if (input.type === 'domain' && input.tld) {
      const inwxService = getINWXService();
      const domainPrice = inwxService.getDomainPrice(input.tld);
      priceNet = domainPrice.yearly * (input.period || 1);
    }

    if (input.type === 'mailbox') {
      priceNet = PRICING.mailbox.yearly;
    }

    if (input.type === 'bundle' && input.tld) {
      const inwxService = getINWXService();
      const domainPrice = inwxService.getDomainPrice(input.tld);
      priceNet = (domainPrice.yearly * (input.period || 1)) + PRICING.mailbox.yearly;
    }

    const vatAmount = Math.round(priceNet * (PRICING.vatRate / 100) * 100) / 100;
    const priceGross = Math.round((priceNet + vatAmount) * 100) / 100;

    return { priceNet, vatAmount, priceGross };
  }

  /**
   * Generate order ID
   */
  private generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `WM-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get order description
   */
  private getOrderDescription(input: CreateOrderInput): string {
    if (input.type === 'domain') {
      return `Domain ${input.domain} (${input.period || 1} Jahr${(input.period || 1) > 1 ? 'e' : ''})`;
    }
    if (input.type === 'mailbox') {
      return `E-Mail Postfach ${input.email}`;
    }
    return `Webmail Bundle: ${input.domain} + ${input.email}`;
  }
}

// Singleton
let orderServiceInstance: OrderService | null = null;

export function getOrderService(): OrderService {
  if (!orderServiceInstance) {
    orderServiceInstance = new OrderService();
  }
  return orderServiceInstance;
}
