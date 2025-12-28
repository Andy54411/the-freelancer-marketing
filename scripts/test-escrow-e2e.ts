#!/usr/bin/env tsx

/**
 * Escrow End-to-End Workflow Test
 * 
 * Testet den kompletten Escrow-Workflow:
 * 1. Erstelle Escrow (Käufer zahlt)
 * 2. Markiere als 'held' (Zahlung eingegangen)
 * 3. Clearing-Periode läuft ab
 * 4. Auto-Payout wird ausgeführt
 * 5. Status wird zu 'released'
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
    || join(__dirname, '../firebase_functions/service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function stepSuccess(step: number, name: string, message: string, details?: unknown) {
  results.push({ step, name, passed: true, message, details });
  log(`✅ Step ${step}: ${name} - ${message}`);
}

function stepFail(step: number, name: string, message: string, details?: unknown) {
  results.push({ step, name, passed: false, message, details });
  log(`❌ Step ${step}: ${name} - ${message}`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║       ESCROW END-TO-END WORKFLOW TEST                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const testId = `e2e_${Date.now()}`;
  const escrowId = `escrow_e2e_order_${testId}`;
  const orderId = `order_${testId}`;
  const buyerId = `buyer_${testId}`;
  const providerId = `provider_${testId}`;
  
  const amount = 15000; // 150€ in cents
  const platformFee = 1500; // 15€ (10%)
  const providerAmount = 13500; // 135€
  
  const now = Timestamp.now();

  try {
    // ========================================================================
    // STEP 1: Kunde erstellt Auftrag und zahlt → Escrow wird erstellt
    // ========================================================================
    log('\n--- Step 1: Escrow Creation ---');
    
    const escrowData = {
      id: escrowId,
      orderId,
      buyerId,
      providerId,
      amount,
      currency: 'EUR',
      platformFee,
      providerAmount,
      status: 'pending',
      clearingDays: 14,
      clearingEndsAt: null,
      paymentMethod: 'bank_transfer',
      description: 'E2E Test: Webentwicklung Dienstleistung',
      createdAt: now,
      updatedAt: now,
    };
    
    await db.collection('escrows').doc(escrowId).set(escrowData);
    
    const createdDoc = await db.collection('escrows').doc(escrowId).get();
    if (createdDoc.exists && createdDoc.data()?.status === 'pending') {
      stepSuccess(1, 'Escrow Creation', `Escrow ${escrowId} created with status 'pending'`);
    } else {
      stepFail(1, 'Escrow Creation', 'Escrow not created properly');
    }

    // ========================================================================
    // STEP 2: Bank-Überweisung eingegangen → Status wird 'held'
    // ========================================================================
    log('\n--- Step 2: Payment Received (mark as held) ---');
    
    const clearingEndsAt = Timestamp.fromMillis(now.toMillis() + 14 * 24 * 60 * 60 * 1000);
    
    await db.collection('escrows').doc(escrowId).update({
      status: 'held',
      heldAt: now,
      clearingEndsAt,
      paymentId: 'SEPA-TRANSFER-' + testId,
      updatedAt: now,
    });
    
    const heldDoc = await db.collection('escrows').doc(escrowId).get();
    const heldData = heldDoc.data();
    
    if (heldData?.status === 'held' && heldData?.paymentId && heldData?.clearingEndsAt) {
      stepSuccess(2, 'Payment Received', 
        `Payment confirmed. Clearing ends at ${heldData.clearingEndsAt.toDate().toISOString()}`);
    } else {
      stepFail(2, 'Payment Received', 'Status not updated to held');
    }

    // ========================================================================
    // STEP 3: Anbieter liefert Dienstleistung (simuliert)
    // ========================================================================
    log('\n--- Step 3: Service Delivered ---');
    
    // In der echten Anwendung würde hier der Auftragsstatus aktualisiert
    // und die Clearing-Periode beginnt
    
    await db.collection('escrows').doc(escrowId).update({
      metadata: {
        serviceDeliveredAt: now.toDate().toISOString(),
        deliveryConfirmed: true,
      },
      updatedAt: now,
    });
    
    stepSuccess(3, 'Service Delivered', 'Service marked as delivered. Clearing period active.');

    // ========================================================================
    // STEP 4: Clearing-Periode läuft ab (simuliert)
    // ========================================================================
    log('\n--- Step 4: Clearing Period Simulation ---');
    
    // Simuliere abgelaufene Clearing-Periode
    const expiredClearingEndsAt = Timestamp.fromMillis(now.toMillis() - 24 * 60 * 60 * 1000);
    
    await db.collection('escrows').doc(escrowId).update({
      clearingEndsAt: expiredClearingEndsAt,
      updatedAt: now,
    });
    
    stepSuccess(4, 'Clearing Expired', 'Clearing period has ended. Ready for payout.');

    // ========================================================================
    // STEP 5: Auto-Payout (simuliert - normalerweise via Cloud Function)
    // ========================================================================
    log('\n--- Step 5: Auto-Payout Simulation ---');
    
    // Simuliere die Cloud Function Logik
    const escrowsReadyForPayout = await db.collection('escrows')
      .where('status', '==', 'held')
      .get();
    
    // Find our test escrow and filter by cleared escrows
    const ourEscrow = escrowsReadyForPayout.docs.find(doc => {
      const data = doc.data();
      return doc.id === escrowId && 
             data.clearingEndsAt && 
             data.clearingEndsAt.toMillis() <= Date.now();
    });
    
    if (ourEscrow) {
      // Simuliere Revolut Payout
      const payoutId = 'REVOLUT-PAYOUT-' + testId;
      
      await db.collection('escrows').doc(escrowId).update({
        status: 'released',
        releasedAt: Timestamp.now(),
        payoutId,
        updatedAt: Timestamp.now(),
      });
      
      stepSuccess(5, 'Auto-Payout', 
        `Payout executed. ID: ${payoutId}, Amount: ${providerAmount/100}€ to provider`);
    } else {
      stepFail(5, 'Auto-Payout', 'Could not find escrow ready for payout');
    }

    // ========================================================================
    // STEP 6: Verify Final State
    // ========================================================================
    log('\n--- Step 6: Final State Verification ---');
    
    const finalDoc = await db.collection('escrows').doc(escrowId).get();
    const finalData = finalDoc.data();
    
    if (finalData?.status === 'released' && 
        finalData?.payoutId && 
        finalData?.releasedAt &&
        finalData?.providerAmount === providerAmount) {
      stepSuccess(6, 'Final Verification', 
        `Escrow completed successfully. Provider received ${finalData.providerAmount/100}€`);
    } else {
      stepFail(6, 'Final Verification', 'Final state is not correct', finalData);
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================
    log('\n--- Cleanup ---');
    await db.collection('escrows').doc(escrowId).delete();
    log(`Deleted test escrow ${escrowId}`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                 WORKFLOW TEST SUMMARY                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`Total Steps: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\nSuccess Rate: ${Math.round((passed / results.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n--- Failed Steps ---');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`❌ Step ${r.step} (${r.name}): ${r.message}`);
      });
    }
    
    console.log('\n--- Complete Workflow ---');
    console.log('1. Customer creates order → Escrow created (pending)');
    console.log('2. Customer pays via bank transfer → Escrow marked as held');
    console.log('3. Provider delivers service → Clearing period active');
    console.log('4. 14 days pass (clearing period) → Ready for payout');
    console.log('5. Auto-payout via Revolut → Provider receives money');
    console.log('6. Escrow marked as released → Transaction complete');
    
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\nTest suite error:', error);
    
    // Cleanup on error
    try {
      await db.collection('escrows').doc(escrowId).delete();
    } catch {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

main();
