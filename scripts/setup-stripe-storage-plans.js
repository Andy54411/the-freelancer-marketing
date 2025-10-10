#!/usr/bin/env node

/**
 * Stripe Storage Plans Setup Script
 *
 * This script creates the storage subscription products in Stripe
 * and updates the StorageUpgradeModal.tsx file with the actual Price IDs.
 *
 * Usage: node scripts/setup-stripe-storage-plans.js
 */

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const STORAGE_PLANS = [
  {
    id: '1gb',
    name: '1 GB Dokumentenspeicher',
    description: 'Kleine Unternehmen',
    price: 0.99,
    storage: 1,
  },
  {
    id: '10gb',
    name: '10 GB Dokumentenspeicher',
    description: 'Wachsende Teams',
    price: 2.99,
    storage: 10,
  },
  {
    id: '30gb',
    name: '30 GB Dokumentenspeicher',
    description: 'Große Datenmengen',
    price: 5.99,
    storage: 30,
  },
  {
    id: '50gb',
    name: '50 GB Dokumentenspeicher',
    description: 'Unternehmen',
    price: 9.99,
    storage: 50,
  },
  {
    id: '100gb',
    name: '100 GB Dokumentenspeicher',
    description: 'Große Unternehmen',
    price: 14.99,
    storage: 100,
  },
  {
    id: 'unlimited',
    name: 'Unlimited Dokumentenspeicher',
    description: 'Ohne Limite',
    price: 19.9,
    storage: 999999, // Symbolisch für unlimited
  },
];

async function createStripeProducts() {
  console.log('🚀 Starting Stripe Storage Plans Setup...\n');

  const priceIds = {};

  for (const plan of STORAGE_PLANS) {
    console.log(`📦 Creating product: ${plan.name}...`);

    try {
      // Create Product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          storage_gb: plan.storage.toString(),
          plan_id: plan.id,
          type: 'storage_subscription',
        },
      });

      console.log(`   ✅ Product created: ${product.id}`);

      // Create Price (Recurring)
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price * 100), // Convert to cents
        currency: 'eur',
        recurring: {
          interval: 'month',
        },
        metadata: {
          storage_gb: plan.storage.toString(),
          plan_id: plan.id,
        },
      });

      console.log(`   ✅ Price created: ${price.id}`);
      console.log(`   💶 Amount: €${plan.price}/month\n`);

      priceIds[plan.id] = price.id;
    } catch (error) {
      console.error(`   ❌ Error creating ${plan.name}:`, error.message);
    }
  }

  return priceIds;
}

async function updateModalFile(priceIds) {
  console.log('📝 Updating StorageUpgradeModal.tsx...\n');

  const filePath = path.join(
    __dirname,
    '..',
    'src',
    'components',
    'storage',
    'StorageUpgradeModal.tsx'
  );

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace placeholder Price IDs with actual ones
  const replacements = [
    { old: "priceId: 'price_PLACEHOLDER_1GB'", new: `priceId: '${priceIds['1gb']}'` },
    { old: "priceId: 'price_PLACEHOLDER_10GB'", new: `priceId: '${priceIds['10gb']}'` },
    { old: "priceId: 'price_PLACEHOLDER_30GB'", new: `priceId: '${priceIds['30gb']}'` },
    { old: "priceId: 'price_PLACEHOLDER_50GB'", new: `priceId: '${priceIds['50gb']}'` },
    { old: "priceId: 'price_PLACEHOLDER_100GB'", new: `priceId: '${priceIds['100gb']}'` },
    { old: "priceId: 'price_PLACEHOLDER_UNLIMITED'", new: `priceId: '${priceIds['unlimited']}'` },
  ];

  replacements.forEach(({ old, new: newValue }) => {
    if (content.includes(old)) {
      content = content.replace(old, newValue);
      console.log(`   ✅ Replaced: ${old} → ${newValue}`);
    }
  });

  // Remove TODO comments
  content = content.replace(/ \/\/ TODO: Replace with real Stripe Price ID/g, '');

  fs.writeFileSync(filePath, content, 'utf8');

  console.log('\n✅ StorageUpgradeModal.tsx updated successfully!\n');
}

async function displaySummary(priceIds) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Stripe Storage Plans Setup Complete!\n');
  console.log('📋 Created Price IDs:');
  Object.entries(priceIds).forEach(([planId, priceId]) => {
    const plan = STORAGE_PLANS.find(p => p.id === planId);
    console.log(`   ${plan.storage} GB (${plan.id}): ${priceId}`);
  });

  console.log('\n🔗 Next Steps:');
  console.log('   1. Set up Stripe Webhook:');
  console.log('      URL: https://taskilo.de/api/storage/webhook');
  console.log('      Events: checkout.session.completed,');
  console.log('              customer.subscription.updated,');
  console.log('              customer.subscription.deleted');
  console.log('\n   2. Add Webhook Secret to .env.local:');
  console.log('      STRIPE_WEBHOOK_SECRET="whsec_..."');
  console.log('\n   3. Test the subscription flow in the app');
  console.log('\n📖 Full documentation: docs/STORAGE_SUBSCRIPTION_SETUP.md');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  try {
    // Check if Stripe key is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Error: STRIPE_SECRET_KEY not found in .env.local');
      process.exit(1);
    }

    // Create products and prices
    const priceIds = await createStripeProducts();

    // Update the modal file
    await updateModalFile(priceIds);

    // Display summary
    await displaySummary(priceIds);

    console.log('🎉 All done! Your storage subscription system is ready.\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
