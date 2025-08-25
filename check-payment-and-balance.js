require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

// Remove quotes from API key if present
let apiKey = process.env.STRIPE_SECRET_KEY;
if (apiKey && apiKey.startsWith('"') && apiKey.endsWith('"')) {
  apiKey = apiKey.slice(1, -1);
}

const stripe = new Stripe(apiKey, {
  apiVersion: '2024-06-20',
});

async function checkPaymentAndBalance() {
  try {
    const paymentIntentId = 'pi_3RznbED5Lvjon30a0FVoQVCA';
    const connectAccountId = 'acct_1RoSL4DlTKEWRrRh';

    console.log('🔍 Checking Payment Intent:', paymentIntentId);

    // 1. Check Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('💳 Payment Intent Status:', paymentIntent.status);
    console.log('💰 Payment Intent Amount:', paymentIntent.amount, 'cents');
    console.log('💳 Payment Intent Currency:', paymentIntent.currency);
    console.log('🏦 Application Fee:', paymentIntent.application_fee_amount || 'None');

    // 2. Check Connect Account Balance
    console.log('\n🏦 Checking Connect Account Balance...');
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectAccountId,
    });

    console.log('💰 Available Balance:', balance.available);
    console.log('⏳ Pending Balance:', balance.pending);

    // 3. Check existing transfers for this payment
    console.log('\n🔄 Checking existing transfers...');
    const transfers = await stripe.transfers.list({
      limit: 10,
    });

    const relatedTransfers = transfers.data.filter(
      transfer =>
        transfer.source_transaction === paymentIntentId ||
        transfer.metadata?.orderId === 'order_1756079151320_sif5hrcdg'
    );

    console.log('📋 Related Transfers:', relatedTransfers.length);
    relatedTransfers.forEach(transfer => {
      console.log(`- Transfer ${transfer.id}: ${transfer.amount} cents to ${transfer.destination}`);
    });

    // 4. Check charges for the payment intent
    console.log('\n💳 Checking charges...');
    const charges = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 5,
    });

    charges.data.forEach(charge => {
      console.log(`- Charge ${charge.id}: ${charge.amount} cents, Status: ${charge.status}`);
      if (charge.application_fee) {
        console.log(`  Application Fee: ${charge.application_fee} cents`);
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPaymentAndBalance();
