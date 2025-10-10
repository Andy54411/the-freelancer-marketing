#!/usr/bin/env node

/**
 * Update Company Storage (Company-wide)
 *
 * Updates storage limit for a company (not per customer)
 *
 * Usage:
 *   node scripts/update-company-storage.js <companyId> <storageGB>
 *
 * Example:
 *   node scripts/update-company-storage.js LLc8PX1VYHfpoFknk8o51LAOfSA2 5
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { credential } = require('firebase-admin');

// Initialize Firebase Admin
try {
  initializeApp({
    credential: credential.applicationDefault(),
  });
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

const db = getFirestore();

async function updateCompanyStorage(companyId, storageGB) {
  try {
    console.log(`\n🔄 Updating storage for company: ${companyId}`);
    console.log(`📦 New storage limit: ${storageGB} GB\n`);

    const storageBytes = storageGB * 1024 * 1024 * 1024;
    const planId = `${storageGB}gb`;

    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      console.error(`❌ Company ${companyId} not found!`);
      return;
    }

    // Update storage limit and initialize usage
    await companyRef.update({
      storageLimit: storageBytes,
      storagePlanId: planId,
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: new Date(),
      manuallyUpdated: true,
      // Initialize usage object
      usage: {
        storageUsed: 450560, // 440 KB
        firestoreUsed: 0,
        totalUsed: 450560,
        lastUpdate: new Date(),
        stats: {
          totalFiles: 1,
          totalDocuments: 0,
        },
      },
    });

    console.log('✅ Storage limit updated successfully!\n');

    // Show updated info
    const updatedDoc = await companyRef.get();
    const data = updatedDoc.data();

    console.log('📊 Updated Company Storage Info:');
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Company Name: ${data.companyName || 'N/A'}`);
    console.log(`   Storage Limit: ${(data.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`   Plan ID: ${data.storagePlanId || 'N/A'}`);
    console.log(`   Subscription Status: ${data.subscriptionStatus || 'N/A'}`);
    console.log(`   Stripe Subscription ID: ${data.stripeSubscriptionId || 'N/A'}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('\n❌ Usage: node scripts/update-company-storage.js <companyId> <storageGB>\n');
  console.log('Example:');
  console.log('  node scripts/update-company-storage.js LLc8PX1VYHfpoFknk8o51LAOfSA2 5\n');
  process.exit(1);
}

const [companyId, storageGB] = args;

if (isNaN(storageGB) || storageGB <= 0) {
  console.error('❌ Storage GB must be a positive number');
  process.exit(1);
}

updateCompanyStorage(companyId, parseFloat(storageGB))
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
