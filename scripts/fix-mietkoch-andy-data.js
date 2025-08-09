/**
 * DATA RECOVERY SCRIPT: Fix Mietkoch Andy Data Loss
 *
 * PROBLEM: Onboarding system overwrote existing registration data with null values
 * SOLUTION: Restore corrupted fields from existing step data
 *
 * Company: Mietkoch Andy (0Rj5vGkBjeXrzZKBr4cFfV0jRuw1)
 * Issue Date: 9. August 2025
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('../firebase_functions/service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'tilvo-f142f',
  });
}

const db = admin.firestore();

async function fixMietkochAndyData() {
  const companyUid = '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1';

  console.log('🔧 Starting data recovery for Mietkoch Andy...');

  try {
    // Get current user document
    const userDoc = await db.collection('users').doc(companyUid).get();
    if (!userDoc.exists) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();
    console.log('📊 Current data loaded, analyzing...');

    // RECOVERY DATA MAPPING from existing step data
    const recoveryData = {
      // FIX 1: Restore company register from step3 data
      companyRegisterForBackend: userData.step3?.companyRegister || null,

      // FIX 2: Restore tax number (currently empty in step3.taxNumber)
      // We'll set it to null for now, admin can update later
      taxNumberForBackend: userData.step3?.taxNumber || null,

      // FIX 3: Restore representative title based on legal form
      actualRepresentativeTitle:
        userData.step2?.legalForm === 'GmbH'
          ? 'Geschäftsführer'
          : userData.step2?.legalForm === 'AG'
            ? 'Vorstand'
            : userData.step2?.legalForm === 'Einzelunternehmen'
              ? 'Inhaber'
              : null,

      // FIX 4: Preserve existing phone numbers (they're still correct)
      companyPhoneNumber: userData.companyPhoneNumberForBackend || userData.step1?.phoneNumber,

      // FIX 5: Ensure website has proper protocol
      companyWebsiteForBackend: userData.step2?.website?.startsWith('http')
        ? userData.step2?.website
        : `https://${userData.step2?.website?.replace('https//', '')}`,

      // FIX 6: Restore manager data based on legal form requirement
      managerData:
        userData.step2?.legalForm === 'GmbH'
          ? {
              firstName: userData.step1?.firstName || userData.firstName,
              lastName: userData.step1?.lastName || userData.lastName,
              position: 'Geschäftsführer',
              email: userData.email,
              phone: userData.phoneNumber,
              dateOfBirth: userData.step1?.dateOfBirth || userData.dateOfBirth,
              address: userData.step1?.personalStreet || userData.personalStreet,
              city: userData.step1?.personalCity || userData.personalCity,
              postalCode: userData.step1?.personalPostalCode || userData.personalPostalCode,
              country: userData.step1?.personalCountry || userData.personalCountry || 'DE',
            }
          : null,

      // FIX 7: Update timestamp
      lastDataRecovery: admin.firestore.FieldValue.serverTimestamp(),
      dataRecoveryReason: 'Onboarding system overwrote registration data - restored from step data',
    };

    console.log('🔄 Applying recovery data:', recoveryData);

    // Apply the fixes
    await db.collection('users').doc(companyUid).update(recoveryData);

    // Also update the companies collection if it exists
    const companyDoc = await db.collection('companies').doc(companyUid).get();
    if (companyDoc.exists) {
      const companyRecoveryData = {
        // Ensure website is properly formatted
        companyWebsite: recoveryData.companyWebsiteForBackend,
        companyPhoneNumber: recoveryData.companyPhoneNumber,
        lastDataRecovery: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('companies').doc(companyUid).update(companyRecoveryData);
      console.log('✅ Companies collection also updated');
    }

    console.log('✅ Data recovery completed successfully!');
    console.log('📋 Summary of fixes:');
    console.log('   • Restored company register from step3 data');
    console.log('   • Set appropriate representative title for GmbH');
    console.log('   • Fixed website URL format');
    console.log('   • Added manager data for GmbH legal form');
    console.log('   • Preserved existing phone numbers');

    // Verify the fixes
    const updatedDoc = await db.collection('users').doc(companyUid).get();
    const updatedData = updatedDoc.data();

    console.log('\n🔍 VERIFICATION:');
    console.log('companyRegisterForBackend:', updatedData.companyRegisterForBackend);
    console.log('actualRepresentativeTitle:', updatedData.actualRepresentativeTitle);
    console.log('companyWebsiteForBackend:', updatedData.companyWebsiteForBackend);
    console.log('managerData:', updatedData.managerData ? 'RESTORED' : 'NULL');
  } catch (error) {
    console.error('❌ Data recovery failed:', error);
    throw error;
  }
}

// Run the recovery if called directly
if (require.main === module) {
  fixMietkochAndyData()
    .then(() => {
      console.log('🎉 Recovery script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Recovery script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMietkochAndyData };
