const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const db = admin.firestore();

async function enrichProjectData() {
  console.log('🔧 Enriching project data with missing information...\n');

  const projectId = 'm4mXgYoSxli0UXwluLRD';
  const customerUid = 'pMcdifjaj0SFu7iqd93n3mCZHPk2';

  // 1. Get customer information
  console.log('1️⃣ Getting customer information...');
  const customerDoc = await db.collection('users').doc(customerUid).get();

  let customerName = 'Unbekannter Kunde';
  let customerType = 'user';

  if (customerDoc.exists) {
    const customerData = customerDoc.data();

    // Try different name fields
    customerName =
      customerData.name ||
      customerData.displayName ||
      customerData.firstName + ' ' + customerData.lastName ||
      customerData.email?.split('@')[0] ||
      'Unbekannter Kunde';

    customerType = customerData.user_type || 'user';

    console.log('✅ Customer found:', customerName, '(Type:', customerType + ')');
  } else {
    console.log('❌ Customer not found, using default name');
  }

  // 2. Create realistic budget information based on subcategoryData
  console.log('2️⃣ Creating budget estimation...');
  const subcategoryData = {
    subcategory: 'Mietkoch',
    serviceType: 'hotel',
    eventType: 'HP',
    guestCount: '4-6',
    cuisine: 'deutsch',
    duration: 'halbtag',
    accommodation: 'mit_übernachtung',
  };

  // Realistic pricing for Mietkoch services
  let estimatedBudget = 0;
  let budgetType = 'project';

  // Base price calculation
  const guestCount = 5; // Middle of 4-6
  const days = 5; // From 27.08 to 31.08

  if (subcategoryData.duration === 'halbtag') {
    estimatedBudget = guestCount * 80 * days; // 80€ per person per half day
  } else {
    estimatedBudget = guestCount * 120 * days; // 120€ per person per full day
  }

  // Add accommodation bonus
  if (subcategoryData.accommodation === 'mit_übernachtung') {
    estimatedBudget += 200 * days; // 200€ per night
  }

  console.log('💰 Estimated budget:', estimatedBudget, '€');

  // 3. Create meaningful timeline
  const timeline = `${days} Tage Mietkoch-Service für ${guestCount} Personen (${subcategoryData.duration})`;

  // 4. Update the project
  console.log('3️⃣ Updating project with enriched data...');

  const updateData = {
    customerName: customerName,
    customerType: customerType,
    budgetAmount: estimatedBudget,
    budgetType: budgetType,
    maxBudget: Math.round(estimatedBudget * 1.2), // 20% buffer
    timeline: timeline,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await db.collection('project_requests').doc(projectId).update(updateData);

  console.log('✅ Project updated successfully!');
  console.log('📊 Added data:');
  Object.entries(updateData).forEach(([key, value]) => {
    if (key !== 'updatedAt') {
      console.log(`   ${key}: ${value}`);
    }
  });

  // 5. Verify the update
  console.log('4️⃣ Verifying update...');
  const updatedDoc = await db.collection('project_requests').doc(projectId).get();
  const updatedData = updatedDoc.data();

  console.log('✅ Verification complete:');
  console.log('   Budget:', updatedData.budgetAmount, '€');
  console.log('   Customer:', updatedData.customerName);
  console.log('   Timeline:', updatedData.timeline);
}

enrichProjectData().catch(console.error);
