// Test Script für B2B Webhook
// Erstellt ein PaymentIntent mit den richtigen B2B Metadaten

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createB2BTestPayment() {
  try {
    console.log('🧪 Creating B2B Test Payment...');

    // Erstelle PaymentIntent mit B2B Metadaten (genau wie die echte B2B API)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 75000, // €750.00
      currency: 'eur',
      payment_method: 'pm_card_visa', // Test Karte
      confirm: true,
      return_url: 'https://taskilo.de/test-return',

      // B2B-specific metadata (EXAKT wie in der echten B2B API)
      metadata: {
        paymentType: 'b2b_project', // Das ist der Schlüssel!
        projectId: 'test_project_' + Date.now(),
        projectTitle: 'Test B2B Service Buchung',
        projectDescription: 'Webhook Test für B2B Order Creation',
        customerFirebaseId: 'test_customer_' + Date.now(),
        providerFirebaseId: 'test_provider_' + Date.now(),
        platformFeeAmount: '3750', // 5% von 75000
        grossAmount: '75000',
        providerAmount: '71250',
        invoiceNumber: 'TEST-B2B-' + Date.now(),
        billingCompanyName: 'Taskilo Test GmbH',
      },

      description: 'B2B Test Payment für Webhook Testing',
    });

    console.log('✅ B2B Test Payment created:');
    console.log('PaymentIntent ID:', paymentIntent.id);
    console.log('Amount:', paymentIntent.amount / 100, 'EUR');
    console.log('Status:', paymentIntent.status);
    console.log('Metadata:', paymentIntent.metadata);

    console.log('\n🎯 Webhook sollte jetzt ausgelöst werden...');
    console.log('Event Type: payment_intent.succeeded');
    console.log('Expected: B2B Order Creation in auftraege collection');

    return paymentIntent;
  } catch (error) {
    console.error('❌ Error creating B2B test payment:', error.message);
    throw error;
  }
}

// Führe den Test aus
createB2BTestPayment()
  .then(() => {
    console.log('\n✅ B2B Test Payment completed successfully!');
    console.log('Check webhook logs and auftraege collection for new order.');
  })
  .catch(error => {
    console.error('❌ B2B Test failed:', error);
  });
