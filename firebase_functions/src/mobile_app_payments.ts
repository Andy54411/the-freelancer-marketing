// /Users/andystaudinger/Tasko/firebase_functions/src/mobile_app_payments.ts
import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { getStripeInstance } from './helpers';
import { defineSecret } from 'firebase-functions/params';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

interface CreateB2CPaymentData {
  providerId: string;
  serviceTitle: string;
  serviceDescription: string;
  amount: number; // in cents
  currency: string;
  metadata?: Record<string, string>;
}

interface CreateB2BPaymentData {
  providerId: string;
  projectTitle: string;
  projectDescription: string;
  totalAmount: number; // in cents
  milestones: Array<{
    title: string;
    description: string;
    amount: number;
    dueDate: string;
  }>;
  currency: string;
  metadata?: Record<string, string>;
}

interface CreateHourlyPaymentData {
  providerId: string;
  orderId: string;
  hoursWorked: number;
  hourlyRate: number; // in EUR
  currency: string;
  timeEntries?: Record<string, any>;
}

/**
 * Mobile App B2C Payment Creation
 * Erstellt Payment Intent für Festpreis-Services (Handwerker, Reinigung, etc.)
 */
export const createB2CPayment = onCall(
  { 
    secrets: [STRIPE_SECRET_KEY],
    enforceAppCheck: false,
    concurrency: 1, // Nur eine Instanz gleichzeitig
    timeoutSeconds: 120 // 2 Minuten Timeout
  },
  async (request: CallableRequest<CreateB2CPaymentData>) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    let idempotencyKey: string = '';
    let lockDoc: any = null;
    let db: any = null;
    
    try {
      const { providerId, serviceTitle, serviceDescription, amount, currency, metadata } = request.data;
      const customerId = request.auth?.uid;

      logger.info('[Mobile] Creating B2C Payment', {
        requestId,
        providerId,
        serviceTitle,
        amount,
        currency,
        customerId,
        timestamp: new Date().toISOString()
      });

      if (!customerId) {
        throw new Error('User must be authenticated');
      }

      if (!providerId || !serviceTitle || !amount || amount <= 0) {
        throw new Error('Missing required payment data');
      }

      db = getFirestore();

      // DOPPELTE IDEMPOTENZ-PRÜFUNG: Lock-basiert für PaymentIntents
      idempotencyKey = `${customerId}_${providerId}_${amount}_${Math.floor(startTime / 30000)}`; // 30-Sekunden Fenster
      lockDoc = db.collection('payment_locks').doc(idempotencyKey);
      
      // 1. Lock-basierte Prüfung für PaymentIntent Duplikate
      try {
        await db.runTransaction(async (transaction: any) => {
          const lockSnapshot = await transaction.get(lockDoc);
          
          if (lockSnapshot.exists) {
            const lockData = lockSnapshot.data()!;
            const timeDiff = Date.now() - lockData.createdAt.toMillis();
            
            if (timeDiff < 120000) { // 2 Minuten Lock
              logger.warn('[Mobile] Payment locked - duplicate request detected', { 
                requestId,
                idempotencyKey,
                existingLockTime: lockData.createdAt.toDate(),
                timeDiff 
              });
              throw new Error('Payment already in progress - please wait');
            }
          }
          
          // Lock erstellen
          transaction.set(lockDoc, {
            createdAt: new Date(),
            customerId,
            providerId,
            amount,
            requestId
          });
        });
        
        logger.info('[Mobile] Payment lock acquired', { requestId, idempotencyKey });
        
      } catch (lockError: any) {
        if (lockError?.message?.includes('Payment already in progress')) {
          throw lockError;
        }
        logger.warn('[Mobile] Lock creation failed, continuing with payment creation', { requestId, error: lockError?.message || 'Unknown error' });
      }

      const stripe = getStripeInstance(STRIPE_SECRET_KEY.value());

      // 1. Provider-Daten laden
      const providerDoc = await db.collection('companies').doc(providerId).get();
      if (!providerDoc.exists) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const providerData = providerDoc.data()!;
      const stripeAccountId = providerData.stripeAccountId;

      if (!stripeAccountId) {
        throw new Error('Provider has no Stripe account connected');
      }

      // 2. Platform-Gebühr berechnen (4.5% für B2C)
      const platformFeeRate = 0.045; // 4.5%
      const platformFeeAmount = Math.round(amount * platformFeeRate);

      // 3. Customer-Daten laden oder erstellen
      let stripeCustomerId: string;
      
      try {
        // Customer-Daten aus Firestore laden
        const customerDoc = await db.collection('users').doc(customerId).get();
        const customerData = customerDoc.data();
        
        // Neuen Stripe Customer erstellen (oder existierenden verwenden)
        const customer = await stripe.customers.create({
          email: customerData?.email || `${customerId}@taskilo.de`,
          name: customerData?.name || customerData?.firstName || 'Taskilo Customer',
          metadata: {
            firebaseUid: customerId,
            platform: 'mobile_app'
          }
        });
        
        stripeCustomerId = customer.id;
        logger.info('[Mobile] Stripe customer created', { customerId, stripeCustomerId });
        
      } catch (customerError) {
        // Fallback: Payment Intent ohne Customer erstellen
        logger.warn('[Mobile] Customer creation failed, proceeding without customer', { error: customerError });
        stripeCustomerId = '';
      }

      // 4. Payment Intent erstellen
      const paymentIntentData: any = {
        amount: amount,
        currency: currency.toLowerCase(),
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          type: 'mobile_b2c_payment',
          providerId,
          customerId,
          serviceTitle,
          serviceDescription,
          platformType: 'mobile_app',
          ...metadata
        },
        description: `Taskilo Mobile: ${serviceTitle}`,
      };

      // Nur Customer ID hinzufügen wenn verfügbar
      if (stripeCustomerId) {
        paymentIntentData.customer = stripeCustomerId;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      logger.info('[Mobile] B2C Payment Intent created - Auftrag wird durch Webhook erstellt', {
        requestId,
        paymentIntentId: paymentIntent.id,
        amount,
        platformFee: platformFeeAmount,
        processingTime: Date.now() - startTime,
        note: 'Order will be created by Stripe webhook when payment succeeds'
      });

      // Lock cleanup bei erfolgreichem Abschluss
      try {
        await lockDoc.delete();
        logger.info('[Mobile] Payment lock released successfully', { requestId, idempotencyKey });
      } catch (cleanupError) {
        logger.warn('[Mobile] Lock cleanup failed (non-critical)', { requestId, error: cleanupError });
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount,
        platformFee: platformFeeAmount,
        providerAmount: amount - platformFeeAmount,
        note: 'Order will be created by Stripe webhook when payment succeeds'
      };

    } catch (error: any) {
      logger.error('[Mobile] B2C Payment creation failed', { 
        requestId, 
        error: error?.message || error,
        processingTime: Date.now() - startTime 
      });
      
      // Lock cleanup bei Fehler
      try {
        if (idempotencyKey) {
          await db.collection('payment_locks').doc(idempotencyKey).delete();
          logger.info('[Mobile] Payment lock released after error', { requestId, idempotencyKey });
        }
      } catch (cleanupError) {
        logger.warn('[Mobile] Lock cleanup failed after error (non-critical)', { requestId, error: cleanupError });
      }
      
      throw new Error(`B2C Payment creation failed: ${error?.message || error}`);
    }
  }
);

/**
 * Mobile App B2B Payment Creation
 * Erstellt Setup Intent für B2B-Projekte mit Meilenstein-System
 */
export const createB2BPayment = onCall(
  { 
    secrets: [STRIPE_SECRET_KEY],
    enforceAppCheck: false 
  },
  async (request: CallableRequest<CreateB2BPaymentData>) => {
    try {
      const { providerId, projectTitle, projectDescription, totalAmount, milestones, currency, metadata } = request.data;
      const customerId = request.auth?.uid;

      logger.info('[Mobile] Creating B2B Payment', {
        providerId,
        projectTitle,
        totalAmount,
        milestonesCount: milestones.length,
        customerId
      });

      if (!customerId) {
        throw new Error('User must be authenticated');
      }

      if (!providerId || !projectTitle || !totalAmount || totalAmount <= 0) {
        throw new Error('Missing required B2B payment data');
      }

      const db = getFirestore();
      const stripe = getStripeInstance(STRIPE_SECRET_KEY.value());

      // 1. Provider-Daten laden
      const providerDoc = await db.collection('companies').doc(providerId).get();
      if (!providerDoc.exists) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const providerData = providerDoc.data()!;
      const stripeAccountId = providerData.stripeAccountId;

      if (!stripeAccountId) {
        throw new Error('Provider has no Stripe account connected');
      }

      // 2. Platform-Gebühr berechnen (3.5% für B2B)
      const platformFeeRate = 0.035; // 3.5%
      const platformFeeAmount = Math.round(totalAmount * platformFeeRate);

      // 3. Setup Intent erstellen (für zukünftige Zahlungen)
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          type: 'mobile_b2b_project',
          providerId,
          customerId,
          projectTitle,
          platformType: 'mobile_app',
          ...metadata
        }
      });

      // 4. Projekt in Firestore erstellen
      const projectId = `mobile_b2b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('mobile_projects').doc(projectId).set({
        projectId,
        type: 'b2b_milestone_project',
        providerId,
        customerId,
        projectTitle,
        projectDescription,
        totalAmount,
        currency: currency.toLowerCase(),
        platformFee: platformFeeAmount,
        providerAmount: totalAmount - platformFeeAmount,
        setupIntentId: setupIntent.id,
        milestones: milestones.map((milestone, index) => ({
          ...milestone,
          milestoneId: `${projectId}_milestone_${index + 1}`,
          status: 'pending',
          paymentIntentId: null
        })),
        status: 'setup_pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: metadata || {},
        platform: 'mobile_app'
      });

      logger.info('[Mobile] B2B Setup Intent created', {
        setupIntentId: setupIntent.id,
        projectId,
        totalAmount,
        platformFee: platformFeeAmount
      });

      return {
        success: true,
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        projectId,
        totalAmount,
        platformFee: platformFeeAmount,
        providerAmount: totalAmount - platformFeeAmount,
        milestones: milestones.length
      };

    } catch (error) {
      logger.error('[Mobile] B2B Payment creation failed', error);
      throw new Error(`B2B Payment creation failed: ${error}`);
    }
  }
);

/**
 * Mobile App Hourly Payment Creation
 * Erstellt Payment Intent für Stundenabrechnung
 */
export const createHourlyPayment = onCall(
  { 
    secrets: [STRIPE_SECRET_KEY],
    enforceAppCheck: false 
  },
  async (request: CallableRequest<CreateHourlyPaymentData>) => {
    try {
      const { providerId, orderId, hoursWorked, hourlyRate, currency, timeEntries } = request.data;
      const customerId = request.auth?.uid;

      logger.info('[Mobile] Creating Hourly Payment', {
        providerId,
        orderId,
        hoursWorked,
        hourlyRate,
        customerId
      });

      if (!customerId) {
        throw new Error('User must be authenticated');
      }

      if (!providerId || !orderId || !hoursWorked || !hourlyRate || hoursWorked <= 0 || hourlyRate <= 0) {
        throw new Error('Missing required hourly payment data');
      }

      const db = getFirestore();
      const stripe = getStripeInstance(STRIPE_SECRET_KEY.value());

      // 1. Provider-Daten laden
      const providerDoc = await db.collection('companies').doc(providerId).get();
      if (!providerDoc.exists) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const providerData = providerDoc.data()!;
      const stripeAccountId = providerData.stripeAccountId;

      if (!stripeAccountId) {
        throw new Error('Provider has no Stripe account connected');
      }

      // 2. Betrag berechnen (in Cents)
      const totalAmountEur = hoursWorked * hourlyRate;
      const totalAmountCents = Math.round(totalAmountEur * 100);

      // 3. Platform-Gebühr berechnen (4.5% für Stunden-Services)
      const platformFeeRate = 0.045; // 4.5%
      const platformFeeAmount = Math.round(totalAmountCents * platformFeeRate);

      // 4. Payment Intent erstellen
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmountCents,
        currency: currency.toLowerCase(),
        customer: customerId,
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          type: 'mobile_hourly_payment',
          providerId,
          customerId,
          orderId,
          hoursWorked: hoursWorked.toString(),
          hourlyRate: hourlyRate.toString(),
          platformType: 'mobile_app'
        },
        description: `Taskilo Mobile Stundenabrechnung: ${hoursWorked}h × €${hourlyRate}/h`,
      });

      // 5. Billing-Eintrag in Firestore erstellen
      const billingId = `mobile_hourly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('mobile_hourly_billings').doc(billingId).set({
        billingId,
        type: 'hourly_payment',
        providerId,
        customerId,
        orderId,
        hoursWorked,
        hourlyRate,
        totalAmountEur,
        totalAmountCents,
        currency: currency.toLowerCase(),
        platformFee: platformFeeAmount,
        providerAmount: totalAmountCents - platformFeeAmount,
        paymentIntentId: paymentIntent.id,
        timeEntries: timeEntries || {},
        status: 'payment_pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: 'mobile_app'
      });

      logger.info('[Mobile] Hourly Payment Intent created', {
        paymentIntentId: paymentIntent.id,
        billingId,
        totalAmountCents,
        platformFee: platformFeeAmount
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        billingId,
        orderId,
        totalAmount: totalAmountCents,
        totalAmountEur,
        platformFee: platformFeeAmount,
        providerAmount: totalAmountCents - platformFeeAmount,
        hoursWorked,
        hourlyRate
      };

    } catch (error) {
      logger.error('[Mobile] Hourly Payment creation failed', error);
      throw new Error(`Hourly Payment creation failed: ${error}`);
    }
  }
);
