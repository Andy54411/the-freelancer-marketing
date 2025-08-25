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

async function createTransfer() {
  try {
    const paymentIntentId = 'pi_3RznbED5Lvjon30a0FVoQVCA';
    const connectAccountId = 'acct_1RoSL4DlTKEWRrRh';
    const orderId = 'order_1756079151320_sif5hrcdg';

    // Calculate net amount (400€ - 14€ platform fee = 386€)
    const totalAmount = 40000; // 400€
    const platformFee = 1400; // 14€
    const netAmount = totalAmount - platformFee; // 386€

    console.log('💰 Creating transfer:');
    console.log('- Total Payment:', totalAmount, 'cents (400€)');
    console.log('- Platform Fee:', platformFee, 'cents (14€)');
    console.log('- Net Amount to Transfer:', netAmount, 'cents (386€)');
    console.log('- Destination Account:', connectAccountId);

    // Create the transfer
    const transfer = await stripe.transfers.create({
      amount: netAmount,
      currency: 'eur',
      destination: connectAccountId,
      transfer_group: `ORDER_${orderId}`,
      metadata: {
        orderId: orderId,
        paymentIntentId: paymentIntentId,
        customerUid: 'pMcdifjaj0SFu7iqd93n3mCZHPk2',
        companyId: '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1',
        completedBy: 'customer',
        completedAt: new Date().toISOString(),
      },
    });

    console.log('✅ Transfer created successfully!');
    console.log('🆔 Transfer ID:', transfer.id);
    console.log('💰 Amount transferred:', transfer.amount, 'cents');
    console.log('🏦 To account:', transfer.destination);
    console.log('📅 Created at:', new Date(transfer.created * 1000).toISOString());

    // Check updated balance
    console.log('\n🏦 Checking updated Connect Account balance...');
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectAccountId,
    });

    console.log('💰 New Available Balance:', balance.available);
    console.log('⏳ New Pending Balance:', balance.pending);
  } catch (error) {
    console.error('❌ Transfer Error:', error.message);
    if (error.code) {
      console.error('🔍 Error Code:', error.code);
    }
  }
}

createTransfer();
