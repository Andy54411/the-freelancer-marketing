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

async function createAvailableBalanceForPayout() {
  try {
    const providerId = '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';
    const stripeAccountId = 'acct_1RoSL4DlTKEWRrRh';

    console.log('💳 Erstelle verfügbare Balance mit Test-Token...');

    // Schritt 1: Verwende Test-Token für Available Balance (tok_bypassPending)
    console.log('🔧 Verwende Test-Token tok_bypassPending für sofortige Available Balance...');

    // Schritt 2: Erstelle Charge mit Test-Token für Available Balance
    const charge = await stripe.charges.create({
      amount: 200000, // 2000 EUR
      currency: 'eur',
      source: 'tok_bypassPending', // Spezieller Test-Token für Available Balance
      description: 'Test charge for available balance - Payout test',
      metadata: {
        purpose: 'create_available_balance',
        provider_id: providerId,
      },
    });

    console.log('✅ Charge created:', charge.id);
    console.log('   Amount:', charge.amount / 100, 'EUR');
    console.log('   Status:', charge.status);
    console.log('   Paid:', charge.paid);

    // Schritt 3: Warte kurz und prüfe Balance
    console.log('\n⏳ Warte 3 Sekunden...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const balance = await stripe.balance.retrieve();

    console.log('\n💰 Platform Balance nach Charge:');
    balance.available.forEach(bal => {
      console.log(`  Available: ${bal.amount / 100} ${bal.currency.toUpperCase()}`);
    });

    const availableEUR = balance.available.find(bal => bal.currency === 'eur');

    if (availableEUR && availableEUR.amount >= 132572) {
      console.log('\n🎉 Platform hat genug Balance! Teste Transfer zum Provider...');

      // Schritt 4: Transfer zur Provider Account
      const transfer = await stripe.transfers.create({
        amount: 150000, // 1500 EUR (mehr als benötigt)
        currency: 'eur',
        destination: stripeAccountId,
        description: 'Test funds transfer for payout functionality',
        metadata: {
          purpose: 'payout_test_funding',
          provider_id: providerId,
        },
      });

      console.log('✅ Transfer to provider created:', transfer.id);
      console.log('   Amount:', transfer.amount / 100, 'EUR');

      // Schritt 5: Prüfe Provider Balance
      console.log('\n⏳ Warte 2 Sekunden für Transfer...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const providerBalance = await stripe.balance.retrieve({
        stripeAccount: stripeAccountId,
      });

      console.log('\n💰 Provider Balance nach Transfer:');
      providerBalance.available.forEach(bal => {
        console.log(`  Available: ${bal.amount / 100} ${bal.currency.toUpperCase()}`);
      });

      const providerEUR = providerBalance.available.find(bal => bal.currency === 'eur');

      if (providerEUR && providerEUR.amount >= 132572) {
        console.log('\n🚀 ERFOLG! Provider hat genug Funds. Teste echten Payout...');

        // Schritt 6: Echter Payout Test
        const payout = await stripe.payouts.create(
          {
            amount: 132572, // 1325.72 EUR
            currency: 'eur',
            method: 'standard',
            statement_descriptor: 'Taskilo Payout',
            description: 'Auszahlung für 2 abgeschlossene Aufträge',
            metadata: {
              provider_id: providerId,
              order_count: '2',
              orders: '4bMTQQzVWsHyKhkbkRRu,order_1756079151320_sif5hrcdg',
            },
          },
          {
            stripeAccount: stripeAccountId,
          }
        );

        console.log('\n🎉 PAYOUT ERFOLGREICH ERSTELLT!');
        console.log('   ID:', payout.id);
        console.log('   Amount:', payout.amount / 100, 'EUR');
        console.log('   Status:', payout.status);
        console.log('   Method:', payout.method);
        console.log(
          '   Arrival Date:',
          new Date(payout.arrival_date * 1000).toLocaleDateString('de-DE')
        );
        console.log('   Bank Account:', `****${payout.destination?.last4 || 'unknown'}`);

        // Schritt 7: Update Orders zu "payout_requested"
        console.log('\n📊 Update Orders Status...');

        const orderIds = ['4bMTQQzVWsHyKhkbkRRu', 'order_1756079151320_sif5hrcdg'];
        const batch = db.batch();

        for (const orderId of orderIds) {
          const orderRef = db.collection('auftraege').doc(orderId);
          batch.update(orderRef, {
            payoutStatus: 'payout_requested',
            payoutRequestedAt: new Date(),
            stripePayoutId: payout.id,
            updatedAt: new Date(),
          });
        }

        await batch.commit();
        console.log('✅ Orders updated to "payout_requested"');

        // Schritt 8: Erstelle Payout Log
        const payoutLogRef = db.collection('payout_logs').doc();
        await payoutLogRef.set({
          providerId: providerId,
          stripePayoutId: payout.id,
          amount: payout.amount,
          currency: 'EUR',
          orderIds: orderIds,
          orderCount: orderIds.length,
          requestedAt: new Date(),
          status: 'requested',
          method: 'bank_transfer',
          arrivalDate: new Date(payout.arrival_date * 1000),
          description: 'Auszahlung für 2 abgeschlossene Aufträge',
        });

        console.log('✅ Payout log created');

        console.log('\n🎯 KOMPLETTER PAYOUT-PROZESS ERFOLGREICH GETESTET!');
      } else {
        console.log('❌ Provider hat immer noch nicht genug Balance');
      }
    } else {
      console.log('❌ Platform hat nicht genug Balance');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    if (error.type) {
      console.error('   Type:', error.type);
    }
  } finally {
    process.exit(0);
  }
}

createAvailableBalanceForPayout();
