const Stripe = require('stripe');
const admin = require('firebase-admin');
const { readFileSync } = require('fs');
const path = require('path');

// Load environment variables
const envPath = '.env.local';
if (require('fs').existsSync(envPath)) {
  const envContent = require('fs').readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  envLines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(
    readFileSync('/Users/andystaudinger/Tasko/firebase_functions/service-account.json', 'utf8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (error) {
  console.error('Firebase init failed:', error);
  process.exit(1);
}

const db = admin.firestore();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function checkStripeAccountBalance() {
  try {
    const providerId = '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

    console.log('🔍 Prüfe Stripe Account Balance für Provider:', providerId);

    // 1. Hole Provider's Stripe Account ID
    const userRef = db.collection('users').doc(providerId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.log('❌ Provider not found');
      return;
    }

    const userData = userSnap.data();
    const stripeAccountId = userData.stripeAccountId;

    console.log('🏦 Stripe Account ID:', stripeAccountId);

    if (!stripeAccountId) {
      console.log('❌ No Stripe Account ID found');
      return;
    }

    // 2. Prüfe Stripe Account Balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    console.log('\n💰 Stripe Account Balance:');
    balance.available.forEach(bal => {
      console.log(`  Available: ${bal.amount / 100} ${bal.currency.toUpperCase()}`);
    });

    balance.pending.forEach(bal => {
      console.log(`  Pending: ${bal.amount / 100} ${bal.currency.toUpperCase()}`);
    });

    // 3. Prüfe ob genug für Payout da ist
    const availableEUR = balance.available.find(bal => bal.currency === 'eur');
    const requiredAmount = 132572; // 1325.72 EUR in cents

    console.log(`\n🎯 Required for payout: ${requiredAmount / 100} EUR`);
    console.log(`💳 Available in account: ${availableEUR ? availableEUR.amount / 100 : 0} EUR`);

    if (!availableEUR || availableEUR.amount < requiredAmount) {
      console.log('❌ Insufficient funds for payout');
      console.log('💡 Lösung: Erst echte Payments empfangen oder Test mit kleinerem Betrag');
    } else {
      console.log('✅ Sufficient funds available');
    }

    // 4. Prüfe Account Details
    const account = await stripe.accounts.retrieve(stripeAccountId);

    console.log('\n🏛️ Account Info:');
    console.log('  Business Type:', account.business_type);
    console.log('  Country:', account.country);
    console.log('  Payouts Enabled:', account.payouts_enabled);
    console.log('  Charges Enabled:', account.charges_enabled);

    if (account.external_accounts?.data?.length > 0) {
      const bankAccount = account.external_accounts.data[0];
      console.log('  Bank Account:', `****${bankAccount.last4} (${bankAccount.bank_name})`);
    } else {
      console.log('  ❌ No bank account connected');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  } finally {
    process.exit(0);
  }
}

checkStripeAccountBalance();
