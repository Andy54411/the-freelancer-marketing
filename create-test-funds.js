const Stripe = require('stripe');
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function createTestFundsForPayout() {
  try {
    const providerId = '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const stripeAccountId = 'acct_1RoSL4DlTKEWRrRh';

    console.log('🎯 Erstelle verfügbare Funds für Payout-Test...');

    // Option 1: Versuche eine Mini-Zahlung zu erstellen um Balance zu haben
    console.log('\n💳 Option 1: Erstelle Test-Payment Intent...');

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 200000, // 2000 EUR
        currency: 'eur',
        automatic_payment_methods: {
          enabled: true,
        },
        application_fee_amount: 10000, // 100 EUR Platform Fee
        transfer_data: {
          destination: stripeAccountId,
        },
        metadata: {
          purpose: 'test_funds_for_payout',
          provider_id: providerId,
        },
      });

      console.log('✅ Payment Intent created:', paymentIntent.id);
      console.log('   Amount:', paymentIntent.amount / 100, 'EUR');
      console.log('   Status:', paymentIntent.status);

      // Simuliere erfolgreiche Zahlung (nur im Test-Modus möglich)
      if (paymentIntent.client_secret.includes('test')) {
        console.log('🧪 Test-Modus: Simuliere erfolgreiche Zahlung...');

        try {
          const confirmedPI = await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method: 'pm_card_visa', // Test-Karte
          });
          console.log('✅ Payment confirmed:', confirmedPI.status);
        } catch (confirmError) {
          console.log('ℹ️ Payment confirmation skipped (test environment)');
        }
      }
    } catch (paymentError) {
      console.log('⚠️ Payment Intent creation failed:', paymentError.message);
    }

    // Option 2: Prüfe ob wir direkt einen Test-Transfer machen können
    console.log('\n💰 Option 2: Versuche direkten Test-Transfer...');

    try {
      const transfer = await stripe.transfers.create({
        amount: 100000, // 1000 EUR
        currency: 'eur',
        destination: stripeAccountId,
        description: 'Test funds for payout functionality',
        metadata: {
          purpose: 'test_payout_funding',
          provider_id: providerId,
        },
      });

      console.log('✅ Transfer created:', transfer.id);
      console.log('   Amount:', transfer.amount / 100, 'EUR');
      console.log('   Status:', transfer.status);
    } catch (transferError) {
      console.log('⚠️ Direct transfer failed:', transferError.message);
    }

    // Option 3: Prüfe aktuelle Balance erneut
    console.log('\n📊 Updated Balance Check...');

    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    console.log('💰 Current Balance:');
    balance.available.forEach(bal => {
      console.log(`  Available: ${bal.amount / 100} ${bal.currency.toUpperCase()}`);
    });

    const availableEUR = balance.available.find(bal => bal.currency === 'eur');

    if (availableEUR && availableEUR.amount >= 132572) {
      console.log('\n🎉 Genug Funds verfügbar! Teste echten Payout...');

      const payout = await stripe.payouts.create(
        {
          amount: 132572, // 1325.72 EUR
          currency: 'eur',
          method: 'standard',
          statement_descriptor: 'Taskilo Test',
          description: 'Test Auszahlung für 2 abgeschlossene Aufträge',
          metadata: {
            provider_id: providerId,
            order_count: '2',
            test_payout: 'true',
          },
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      console.log('🚀 Payout created successfully!');
      console.log('   ID:', payout.id);
      console.log('   Amount:', payout.amount / 100, 'EUR');
      console.log('   Status:', payout.status);
      console.log(
        '   Arrival Date:',
        new Date(payout.arrival_date * 1000).toLocaleDateString('de-DE')
      );
    } else {
      console.log('\n❌ Immer noch nicht genug Funds verfügbar');
      console.log('💡 Lösung: Verwende Stripe Test-Dashboard um Balance hinzuzufügen');
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

createTestFundsForPayout();
