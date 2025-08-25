const Stripe = require('stripe');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      process.env[key.trim()] = cleanValue;
    }
  });
}

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

try {
  admin.initializeApp({
    credential: admin.credential.cert('./firebase_functions/service-account.json'),
    databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  });
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

async function completeOrderWithStripe() {
  try {
    const orderId = 'order_1756079151320_sif5hrcdg';
    const orderRef = db.collection('auftraege').doc(orderId);
    const orderSnapshot = await orderRef.get();

    if (!orderSnapshot.exists) {
      console.log('❌ Order not found');
      return;
    }

    const orderData = orderSnapshot.data();

    // Calculate amounts
    const totalAmount = orderData.totalAmountPaidByBuyer || 40000;
    const platformFee =
      orderData.sellerCommissionInCents || orderData.applicationFeeAmountFromStripe || 1400;
    const companyNetAmount = totalAmount - platformFee;

    console.log('💳 Creating Stripe Transfer:');
    console.log('- Amount:', companyNetAmount, 'cents (', companyNetAmount / 100, '€)');
    console.log('- Destination:', orderData.anbieterStripeAccountId);
    console.log('- Payment Intent:', orderData.paymentIntentId);

    // Create Stripe Transfer
    const transfer = await stripe.transfers.create({
      amount: companyNetAmount,
      currency: 'eur',
      destination: orderData.anbieterStripeAccountId,
      transfer_group: `ORDER_${orderId}`,
      metadata: {
        orderId: orderId,
        customerUid: orderData.customerFirebaseUid,
        companyId: orderData.selectedAnbieterId,
        completedBy: 'customer',
        completedAt: new Date().toISOString(),
      },
    });

    console.log('✅ Stripe Transfer created:', transfer.id);

    // Update Order
    await orderRef.update({
      status: 'ABGESCHLOSSEN',
      completedAt: new Date(),
      completedBy: orderData.customerFirebaseUid,
      customerRating: 5,
      customerReview: 'Excellent service!',
      completionNotes: 'Perfect execution',
      stripeTransferId: transfer.id,
      payoutStatus: 'transferred',
      updatedAt: new Date(),
    });

    // Create Payout Entry
    const payoutRef = db.collection('payouts').doc();
    await payoutRef.set({
      orderId: orderId,
      providerId: orderData.selectedAnbieterId,
      customerId: orderData.customerFirebaseUid,
      amount: companyNetAmount,
      currency: 'EUR',
      status: 'transferred',
      stripeTransferId: transfer.id,
      createdAt: new Date(),
      orderCompletedAt: new Date(),
      stripeAccountId: orderData.anbieterStripeAccountId,
      description: `Auszahlung für Auftrag ${orderData.projectTitle || orderData.description}`,
      category: orderData.selectedCategory,
      subcategory: orderData.selectedSubcategory,
    });

    console.log('✅ Order completed successfully');
    console.log('✅ Payout created with transferred status');
    console.log('✅ Amount transferred to Stripe Connect account:', companyNetAmount / 100, '€');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.type) {
      console.error('Stripe Error Type:', error.type);
      console.error('Stripe Error Code:', error.code);
    }
  } finally {
    process.exit(0);
  }
}

completeOrderWithStripe();
