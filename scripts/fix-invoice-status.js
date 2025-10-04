// Script to fix invoice status for locked invoices
// Run this once to fix existing invoices that are locked but still show as "draft"

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin (if not already initialized)
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'tilvo-f142f'
  });
}

const db = getFirestore();

async function fixInvoiceStatuses() {
  console.log('🔧 Starting invoice status fix...');
  
  try {
    // Get all companies
    const companiesSnapshot = await db.collection('companies').get();
    
    let totalFixed = 0;
    let totalProcessed = 0;
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      console.log(`\n📊 Processing company: ${companyId}`);
      
      // Get all invoices for this company
      const invoicesSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('invoices')
        .get();
      
      console.log(`   Found ${invoicesSnapshot.docs.length} invoices`);
      
      for (const invoiceDoc of invoicesSnapshot.docs) {
        const invoiceData = invoiceDoc.data();
        const invoiceId = invoiceDoc.id;
        totalProcessed++;
        
        // Check if invoice is locked but still has draft status
        const isLocked = invoiceData.gobdStatus?.isLocked === true || invoiceData.isLocked === true;
        const isDraft = invoiceData.status === 'draft';
        
        if (isLocked && isDraft) {
          console.log(`   🔒 Fixing locked draft invoice: ${invoiceData.invoiceNumber || invoiceId}`);
          
          // Determine new status based on context
          let newStatus = 'finalized';
          let statusField = { finalizedAt: new Date() };
          
          // If there are email-related fields or audit trail mentions email, set to 'sent'
          const auditTrail = invoiceData.gobdStatus?.auditTrail || [];
          const hasEmailActivity = auditTrail.some(entry => 
            entry.reason?.includes('E-Mail') || entry.action?.includes('email')
          );
          
          if (hasEmailActivity) {
            newStatus = 'sent';
            statusField = { sentAt: new Date() };
          }
          
          // Update the invoice status
          await db
            .collection('companies')
            .doc(companyId)
            .collection('invoices')
            .doc(invoiceId)
            .update({
              status: newStatus,
              ...statusField,
              updatedAt: new Date(),
              // Add migration flag
              _statusFixedAt: new Date(),
              _statusFixedReason: 'Migration: Fixed locked draft status'
            });
          
          console.log(`   ✅ Updated ${invoiceData.invoiceNumber || invoiceId} to "${newStatus}"`);
          totalFixed++;
        }
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`   📊 Total invoices processed: ${totalProcessed}`);
    console.log(`   🔧 Total invoices fixed: ${totalFixed}`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  fixInvoiceStatuses()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixInvoiceStatuses };