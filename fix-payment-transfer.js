const Stripe = require('stripe');
const fs = require('fs');

// Load environment variables
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function checkAndFixPayment() {
  try {
    const paymentIntentId = 'pi_3RznbED5Lvjon30a0FVoQVCA';
    const connectAccountId = 'acct_1RoSL4DlTKEWRrRh';
    const netAmount = 38600; // 386€

    console.log('🔍 1. Checking Payment Intent Status...');
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log('📋 Payment Intent Details:');
    console.log('- Status:', paymentIntent.status);
    console.log('- Amount:', paymentIntent.amount, 'cents');
    console.log('- Amount Captured:', paymentIntent.amount_capturable);
    console.log('- Amount Received:', paymentIntent.amount_received);
    console.log('- Application Fee:', paymentIntent.application_fee_amount);
    
    if (paymentIntent.status !== 'succeeded') {
      console.log('❌ Payment Intent is not succeeded. Cannot transfer funds.');
      return;
    }

    console.log('\n🔍 2. Checking Platform Account Balance...');
    const balance = await stripe.balance.retrieve();
    
    console.log('📋 Platform Balance:');
    balance.available.forEach(bal => {
      console.log(`- Available: ${bal.amount} ${bal.currency}`);
    });
    balance.pending.forEach(bal => {
      console.log(`- Pending: ${bal.amount} ${bal.currency}`);
    });

    // Check if we have enough available balance
    const eurBalance = balance.available.find(b => b.currency === 'eur');
    const availableAmount = eurBalance ? eurBalance.amount : 0;
    
    console.log(`\n💰 Available EUR Balance: ${availableAmount} cents (${availableAmount/100}€)`);
    console.log(`💰 Transfer Amount Needed: ${netAmount} cents (${netAmount/100}€)`);

    if (availableAmount < netAmount) {
      console.log('\n❌ Insufficient funds for transfer.');
      
      // Check pending balance
      const eurPending = balance.pending.find(b => b.currency === 'eur');
      const pendingAmount = eurPending ? eurPending.amount : 0;
      
      if (pendingAmount >= netAmount) {
        console.log(`✅ Sufficient pending funds: ${pendingAmount} cents (${pendingAmount/100}€)`);
        console.log('💡 The funds are pending and will become available soon.');
        console.log('💡 In test mode, you can wait or use Stripe dashboard to expedite.');
      } else {
        console.log('❌ Even pending funds are insufficient.');
        console.log('💡 This suggests the payment wasn\'t properly captured to platform account.');
      }
      
      return;
    }

    console.log('\n💳 3. Creating Transfer to Connect Account...');
    const transfer = await stripe.transfers.create({
      amount: netAmount,
      currency: 'eur',
      destination: connectAccountId,
      description: `Order completion payout for order_1756079151320_sif5hrcdg`,
      metadata: {
        orderId: 'order_1756079151320_sif5hrcdg',
        paymentIntentId: paymentIntentId,
        transferReason: 'order_completion'
      }
    });

    console.log('✅ Transfer Created Successfully!');
    console.log('- Transfer ID:', transfer.id);
    console.log('- Amount:', transfer.amount, 'cents');
    console.log('- Destination:', transfer.destination);
    console.log('- Status:', transfer.status);

    console.log('\n🎉 Payment Issue Fixed!');
    console.log('💰 Funds should now be available in Connect Account');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Stripe Error Code:', error.code);
    }
    if (error.type) {
      console.error('Stripe Error Type:', error.type);
    }
  }
}

checkAndFixPayment();
