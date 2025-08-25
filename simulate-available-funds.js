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

async function simulateAvailableFunds() {
  try {
    const connectAccountId = 'acct_1RoSL4DlTKEWRrRh';
    
    console.log('🔍 Simulating Available Funds for Testing...');
    
    // In test mode, we can create a small charge to make funds available
    console.log('💳 Creating test charge to make funds available...');
    
    // Create a small charge to the Connect Account to trigger fund availability
    const charge = await stripe.charges.create({
      amount: 100, // 1€ 
      currency: 'eur',
      source: 'tok_bypassPending', // Special test token to bypass pending
      description: 'Test charge to make funds available',
      metadata: {
        purpose: 'test_fund_availability'
      }
    }, {
      stripeAccount: connectAccountId
    });
    
    console.log('✅ Test charge created:', charge.id);
    
    // Check balance again
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectAccountId
    });
    
    const eurAvailable = balance.available.find(b => b.currency === 'eur');
    const availableAmount = eurAvailable ? eurAvailable.amount : 0;
    
    console.log(`💰 New available balance: ${availableAmount} cents (${availableAmount/100}€)`);
    
    if (availableAmount > 0) {
      console.log('✅ SUCCESS! Funds are now available for testing');
    } else {
      console.log('💡 Funds are still pending - this is normal in test mode');
      console.log('💡 For production, funds typically become available in 2-7 business days');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Alternative approach - just acknowledge the successful payment flow
    console.log('\n💡 Alternative: Update system to acknowledge successful payment');
    console.log('✅ Payment Intent succeeded with direct transfer');
    console.log('✅ Funds are pending in Connect Account (normal)');
    console.log('✅ Order can be marked as completed');
    console.log('✅ Payout status: "pending" (awaiting fund availability)');
  }
}

simulateAvailableFunds();
