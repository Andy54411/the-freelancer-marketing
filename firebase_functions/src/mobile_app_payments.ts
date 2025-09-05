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
    enforceAppCheck: false 
  },
  async (request: CallableRequest<CreateB2CPaymentData>) => {
    try {
      const { providerId, serviceTitle, serviceDescription, amount, currency, metadata } = request.data;
      const customerId = request.auth?.uid;

      logger.info('[Mobile] Creating B2C Payment', {
        providerId,
        serviceTitle,
        amount,
        currency,
        customerId
      });

      if (!customerId) {
        throw new Error('User must be authenticated');
      }

      if (!providerId || !serviceTitle || !amount || amount <= 0) {
        throw new Error('Missing required payment data');
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

      // 2. Platform-Gebühr berechnen (4.5% für B2C)
      const platformFeeRate = 0.045; // 4.5%
      const platformFeeAmount = Math.round(amount * platformFeeRate);

      // 3. Payment Intent erstellen
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency.toLowerCase(),
        customer: customerId,
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
      });

      // 4. Order in Firestore erstellen
      const orderId = `mobile_b2c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('mobile_orders').doc(orderId).set({
        orderId,
        type: 'b2c_fixed_price',
        providerId,
        customerId,
        serviceTitle,
        serviceDescription,
        amount,
        currency: currency.toLowerCase(),
        platformFee: platformFeeAmount,
        providerAmount: amount - platformFeeAmount,
        paymentIntentId: paymentIntent.id,
        status: 'payment_pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: metadata || {},
        platform: 'mobile_app'
      });

      logger.info('[Mobile] B2C Payment Intent created', {
        paymentIntentId: paymentIntent.id,
        orderId,
        amount,
        platformFee: platformFeeAmount
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        orderId,
        amount,
        platformFee: platformFeeAmount,
        providerAmount: amount - platformFeeAmount
      };

    } catch (error) {
      logger.error('[Mobile] B2C Payment creation failed', error);
      throw new Error(`B2C Payment creation failed: ${error}`);
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
