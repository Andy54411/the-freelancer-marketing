/**
 * Script to create NEW Stripe Products for Storage Plans
 * Run: node scripts/create-storage-products-stripe.js
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const storagePlans = [
  {
    id: '1gb',
    name: '1 GB Speicher',
    description: 'Kleine Unternehmen - 1 GB Cloud-Speicher',
    storage: 1,
    price: 0.99,
  },
  {
    id: '10gb',
    name: '10 GB Speicher',
    description: 'Wachsende Teams - 10 GB Cloud-Speicher (Beliebt)',
    storage: 10,
    price: 2.99,
  },
  {
    id: '30gb',
    name: '30 GB Speicher',
    description: 'Große Datenmengen - 30 GB Cloud-Speicher',
    storage: 30,
    price: 5.99,
  },
  {
    id: '50gb',
    name: '50 GB Speicher',
    description: 'Unternehmen - 50 GB Cloud-Speicher',
    storage: 50,
    price: 9.99,
  },
  {
    id: '100gb',
    name: '100 GB Speicher',
    description: 'Große Unternehmen - 100 GB Cloud-Speicher',
    storage: 100,
    price: 14.99,
  },
  {
    id: 'unlimited',
    name: 'Unlimited Speicher',
    description: 'Ohne Limite - Unbegrenzter Cloud-Speicher',
    storage: 'unlimited',
    price: 19.9,
  },
];

async function createStorageProducts() {
  console.log('🚀 Creating Stripe Products for Storage Plans...\n');

  const results = [];

  for (const plan of storagePlans) {
    try {
      console.log(`Creating product: ${plan.name}...`);

      // Create Product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          type: 'storage',
          storage_id: plan.id,
          storage_gb: plan.storage,
        },
      });

      console.log(`✅ Product created: ${product.id}`);

      // Create Price (recurring monthly)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price * 100), // Convert to cents
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
        metadata: {
          storage_id: plan.id,
          storage_gb: plan.storage,
        },
      });

      console.log(`✅ Price created: ${price.id}`);
      console.log(`   Amount: €${plan.price}/month\n`);

      results.push({
        id: plan.id,
        name: plan.name,
        storage: plan.storage,
        price: plan.price,
        productId: product.id,
        priceId: price.id,
      });
    } catch (error) {
      console.error(`❌ Error creating ${plan.name}:`, error.message);
    }
  }

  console.log('\n✅ All products created!\n');
  console.log('=== PRICE IDs FOR CODE ===\n');

  results.forEach(result => {
    console.log(`  {`);
    console.log(`    id: '${result.id}',`);
    console.log(`    name: '${result.name}',`);
    console.log(
      `    storage: ${result.storage === 'unlimited' ? 'Number.MAX_SAFE_INTEGER' : result.storage + ' * 1024 * 1024 * 1024'},`
    );
    console.log(`    price: ${result.price},`);
    console.log(`    priceId: '${result.priceId}',`);
    console.log(`  },`);
  });

  console.log('\n✅ Copy these Price IDs to StorageUpgradeModal.tsx');
}

createStorageProducts().catch(console.error);
