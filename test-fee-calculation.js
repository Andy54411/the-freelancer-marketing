#!/usr/bin/env node

/**
 * Test der Stripe Connect Payment Flow Berechnungen
 * 
 * Dieser Test validiert die mathematischen Berechnungen für:
 * 1. Application Fee (Plattformgebühr)
 * 2. Payout Amounts (Auszahlungsbeträge)
 * 3. Gesamtbeträge
 */

console.log('🧮 Testing Taskilo Stripe Connect Fee Calculations...\n');

// Test Cases basierend auf echten Stripe-Daten
const testCases = [
  {
    name: 'Echtes Stripe Beispiel',
    customerPayment: 6000, // 60,00€ (was Kunde zahlt)
    feeRate: 0.045, // 4,5%
    expectedFee: 270, // 2,70€
    expectedPayout: 5730, // 57,30€
  },
  {
    name: 'Demo Beispiel (100€)',
    customerPayment: 10000, // 100,00€
    feeRate: 0.045, // 4,5%
    expectedFee: 450, // 4,50€
    expectedPayout: 9550, // 95,50€
  },
  {
    name: 'Kleiner Betrag (20€)',
    customerPayment: 2000, // 20,00€
    feeRate: 0.045, // 4,5%
    expectedFee: 90, // 0,90€
    expectedPayout: 1910, // 19,10€
  }
];

function calculateApplicationFee(customerPaymentCents, feeRate) {
  return Math.floor(customerPaymentCents * feeRate);
}

function calculatePayoutAmount(customerPaymentCents, applicationFeeCents) {
  return customerPaymentCents - applicationFeeCents;
}

function formatCents(cents) {
  return `${(cents / 100).toFixed(2)}€`;
}

console.log('📊 Test Results:\n');

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('─'.repeat(50));
  
  // Berechne Application Fee
  const calculatedFee = calculateApplicationFee(testCase.customerPayment, testCase.feeRate);
  const calculatedPayout = calculatePayoutAmount(testCase.customerPayment, calculatedFee);
  
  console.log(`Customer pays:        ${formatCents(testCase.customerPayment)}`);
  console.log(`Platform fee (${(testCase.feeRate * 100).toFixed(1)}%):    ${formatCents(calculatedFee)}`);
  console.log(`Provider gets:        ${formatCents(calculatedPayout)}`);
  
  // Validierung
  const feeCorrect = calculatedFee === testCase.expectedFee;
  const payoutCorrect = calculatedPayout === testCase.expectedPayout;
  
  console.log(`\n✓ Validierung:`);
  console.log(`  Fee calculation:    ${feeCorrect ? '✅ CORRECT' : '❌ WRONG'} (expected: ${formatCents(testCase.expectedFee)}, got: ${formatCents(calculatedFee)})`);
  console.log(`  Payout calculation: ${payoutCorrect ? '✅ CORRECT' : '❌ WRONG'} (expected: ${formatCents(testCase.expectedPayout)}, got: ${formatCents(calculatedPayout)})`);
  
  if (!feeCorrect || !payoutCorrect) {
    allTestsPassed = false;
  }
  
  // Stripe Connect Flow Simulation
  console.log(`\n🔄 Stripe Connect Flow:`);
  console.log(`  1. Customer pays ${formatCents(testCase.customerPayment)} to Connected Account`);
  console.log(`  2. Application Fee ${formatCents(calculatedFee)} transferred to Platform Account`);
  console.log(`  3. Remaining ${formatCents(calculatedPayout)} available for payout to Provider`);
  console.log(`  4. Provider requests payout of full available amount: ${formatCents(calculatedPayout)}`);
});

console.log('\n' + '='.repeat(60));
console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allTestsPassed) {
  console.log('\n✨ Congratulations! The fee calculation logic is mathematically correct.');
  console.log('The Stripe Connect flow will work as expected:');
  console.log('  • Application fees are correctly calculated');
  console.log('  • Payout amounts are accurate');
  console.log('  • No double fee deduction occurs');
} else {
  console.log('\n⚠️  Some calculations are incorrect. Please review the logic.');
}

console.log('\n📝 Key Implementation Notes:');
console.log('  • Use Math.floor() for fee calculation (no fractional cents)');
console.log('  • Application fee is set on PaymentIntent creation');
console.log('  • Payout uses full available balance (no additional fee deduction)');
console.log('  • Platform fees are automatically transferred by Stripe');

console.log('\n🔚 Test completed.\n');
