const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase_functions/service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'tilvo-f142f', // Production project
});

const db = getFirestore(app);

/**
 * Migration: Move proposals from array in quote document to subcollection
 * quotes/{quoteId}/proposals/{proposalId}
 */
async function migrateProposalsToSubcollections() {
  console.log('🔄 Starting migration: proposals array → subcollections');

  let processedQuotes = 0;
  let migratedProposals = 0;
  const errors = [];

  try {
    // Get all quotes that have proposals array
    const quotesSnapshot = await db.collection('quotes').where('proposals', '!=', null).get();

    console.log(`📊 Found ${quotesSnapshot.docs.length} quotes with proposals to migrate`);

    for (const quoteDoc of quotesSnapshot.docs) {
      const quoteId = quoteDoc.id;
      const quoteData = quoteDoc.data();

      try {
        console.log(`\n🔧 Processing quote: ${quoteId}`);

        if (!quoteData.proposals || !Array.isArray(quoteData.proposals)) {
          console.log(`⚠️ No valid proposals array found in quote ${quoteId}`);
          continue;
        }

        const proposals = quoteData.proposals;
        console.log(`  📝 Found ${proposals.length} proposals to migrate`);

        // Create proposals in subcollection
        const batch = db.batch();
        let batchCount = 0;

        for (const proposal of proposals) {
          if (!proposal.companyUid) {
            console.log(`⚠️ Proposal missing companyUid, skipping:`, proposal);
            continue;
          }

          // Create unique proposal ID (use companyUid for consistency)
          const proposalId = proposal.companyUid;
          const proposalRef = db
            .collection('quotes')
            .doc(quoteId)
            .collection('proposals')
            .doc(proposalId);

          // Prepare proposal data with metadata
          const proposalData = {
            ...proposal,
            createdAt: proposal.submittedAt ? new Date(proposal.submittedAt) : new Date(),
            updatedAt: new Date(),
            migratedAt: new Date(),
            migratedFrom: 'proposals_array',
          };

          batch.set(proposalRef, proposalData);
          batchCount++;
          migratedProposals++;

          console.log(`    ✅ Prepared proposal for company: ${proposal.companyUid}`);

          // Commit batch every 500 operations (Firestore limit)
          if (batchCount >= 450) {
            await batch.commit();
            console.log(`    📦 Committed batch of ${batchCount} proposals`);
            batchCount = 0;
          }
        }

        // Commit remaining proposals in batch
        if (batchCount > 0) {
          await batch.commit();
          console.log(`    📦 Committed final batch of ${batchCount} proposals`);
        }

        // Remove proposals array from quote document
        await quoteDoc.ref.update({
          proposals: FieldValue.delete(),
          // Add migration metadata
          proposalsMigratedAt: new Date(),
          proposalsInSubcollection: true,
        });

        console.log(`  ✅ Removed proposals array from quote ${quoteId}`);
        processedQuotes++;
      } catch (error) {
        console.error(`❌ Error processing quote ${quoteId}:`, error);
        errors.push({ quoteId, error: error.message });
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Statistics:`);
    console.log(`  - Processed quotes: ${processedQuotes}`);
    console.log(`  - Migrated proposals: ${migratedProposals}`);
    console.log(`  - Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => {
        console.log(`  - Quote ${error.quoteId}: ${error.error}`);
      });
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }

  process.exit(0);
}

// Verify subcollection structure
async function verifyMigration() {
  console.log('🔍 Verifying migration results...');

  try {
    // Check a few quotes to verify subcollections
    const quotesSnapshot = await db
      .collection('quotes')
      .where('proposalsInSubcollection', '==', true)
      .limit(5)
      .get();

    for (const quoteDoc of quotesSnapshot.docs) {
      const quoteId = quoteDoc.id;
      const proposalsSnapshot = await quoteDoc.ref.collection('proposals').get();

      console.log(
        `✅ Quote ${quoteId}: ${proposalsSnapshot.docs.length} proposals in subcollection`
      );

      // Verify no proposals array exists
      const quoteData = quoteDoc.data();
      if (quoteData.proposals) {
        console.log(`⚠️ Quote ${quoteId} still has proposals array!`);
      }
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run migration
console.log('🚀 Starting proposals migration to subcollections...');
console.log('📊 Target: quotes/{quoteId}/proposals/{proposalId}');
console.log('');

migrateProposalsToSubcollections().then(() => verifyMigration());
