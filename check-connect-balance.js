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

async function checkConnectAccountBalance() {
  try {
    const connectAccountId = 'acct_1RoSL4DlTKEWRrRh';
    
    console.log('🔍 Checking Connect Account Balance...');
    console.log('Connect Account ID:', connectAccountId);
    
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectAccountId
    });
    
    console.log('\n📋 Connect Account Balance:');
    console.log('Available Balances:');
    balance.available.forEach(bal => {
      console.log(`- ${bal.amount} ${bal.currency.toUpperCase()} (${bal.amount/100}€)`);
    });
    
    console.log('\nPending Balances:');
    balance.pending.forEach(bal => {
      console.log(`- ${bal.amount} ${bal.currency.toUpperCase()} (${bal.amount/100}€)`);
    });
    
    // Calculate total EUR balance
    const eurAvailable = balance.available.find(b => b.currency === 'eur');
    const eurPending = balance.pending.find(b => b.currency === 'eur');
    
    const availableEur = eurAvailable ? eurAvailable.amount : 0;
    const pendingEur = eurPending ? eurPending.amount : 0;
    const totalEur = availableEur + pendingEur;
    
    console.log('\n💰 Summary:');
    console.log(`Available EUR: ${availableEur} cents (${availableEur/100}€)`);
    console.log(`Pending EUR: ${pendingEur} cents (${pendingEur/100}€)`);
    console.log(`Total EUR: ${totalEur} cents (${totalEur/100}€)`);
    
    // Check if our expected 386€ is there
    const expectedAmount = 38600; // 386€
    
    if (availableEur >= expectedAmount) {
      console.log('\n✅ SUCCESS! Connect Account has sufficient available funds!');
      console.log(`✅ Expected ${expectedAmount/100}€, found ${availableEur/100}€ available`);
      console.log('💡 The payment flow worked correctly - money is already with the provider!');
    } else if (totalEur >= expectedAmount) {
      console.log('\n⏳ PENDING: Connect Account has sufficient total funds but they are pending');
      console.log(`✅ Expected ${expectedAmount/100}€, found ${totalEur/100}€ total`);
      console.log('💡 Funds are processing and will become available soon');
    } else {
      console.log('\n❌ INSUFFICIENT: Connect Account does not have expected funds');
      console.log(`❌ Expected ${expectedAmount/100}€, found ${totalEur/100}€ total`);
    }
    
  } catch (error) {
    console.error('❌ Error checking Connect Account balance:', error.message);
    if (error.code) {
      console.error('Stripe Error Code:', error.code);
    }
  }
}

checkConnectAccountBalance();
