const { readFileSync } = require('fs');

// Test Firebase Service Account
try {
  const serviceAccountPath = '/Users/andystaudinger/Tasko/firebase_functions/service-account.json';
  const serviceAccountJson = readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  console.log('✅ Service Account File loaded successfully');
  console.log('Project ID:', serviceAccount.project_id);
  console.log('Client Email:', serviceAccount.client_email);
  
  // Test API Call direkt
  console.log('\n🧪 Testing Payout API...');
  
  // Simuliere eine einfache GET Request ohne Firebase
  const testData = {
    availableAmount: 0,
    currency: 'EUR',
    orderCount: 0,
    orders: []
  };
  
  console.log('✅ API Response Simulation:', JSON.stringify(testData, null, 2));
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
