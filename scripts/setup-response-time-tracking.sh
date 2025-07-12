#!/bin/bash

# Response Time Tracking Setup Script
echo "🚀 Setting up Response Time Tracking System..."

# 1. Deploy Firestore Rules
echo "📋 Deploying Firestore rules..."
firebase deploy --only firestore:rules

# 2. Build and Deploy Cloud Functions
echo "⚡ Building and deploying Cloud Functions..."
cd firebase_functions
npm run build
cd ..
firebase deploy --only functions:checkOverdueResponses,functions:trackCustomerMessage,functions:trackProviderResponse

# 3. Create Firestore indexes
echo "🔍 Creating Firestore indexes..."
firebase deploy --only firestore:indexes

# 4. Test the system
echo "🧪 Testing Response Time Tracking..."

# Erstelle Test-Daten für Response Time Metrics
node -e "
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestMetric() {
  try {
    const testMetric = {
      providerId: 'test-provider-123',
      messageId: 'test-message-123',
      chatId: 'test-chat-123',
      customerMessageTime: admin.firestore.Timestamp.now(),
      guaranteeHours: 24,
      createdAt: admin.firestore.Timestamp.now(),
      isOverdue: false
    };

    await db.collection('responseTimeMetrics').add(testMetric);
    console.log('✅ Test Response Time Metric created successfully');
    
    // Erstelle Provider mit Response Time Garantie
    const testProvider = {
      companyName: 'Test Response Time Provider',
      responseTimeGuaranteeHours: 24,
      isActive: true,
      selectedCategory: 'IT',
      selectedSubcategory: 'Webentwicklung'
    };

    await db.collection('firma').doc('test-provider-123').set(testProvider);
    console.log('✅ Test Provider with Response Time Guarantee created');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

createTestMetric();
"

echo "✅ Response Time Tracking System setup complete!"
echo ""
echo "📊 Features enabled:"
echo "   • Automatic response time measurement"
echo "   • 24-hour guarantee monitoring"
echo "   • Real-time compliance tracking"
echo "   • Provider performance statistics"
echo "   • Overdue response alerts"
echo ""
echo "🔧 Manual testing:"
echo "   1. Send a message from company to provider"
echo "   2. Check Firebase Console > Firestore > responseTimeMetrics"
echo "   3. Respond as provider to complete the measurement"
echo ""
echo "⏰ Scheduled monitoring:"
echo "   • Overdue checks run every 15 minutes"
echo "   • Statistics update after each response"
echo "   • 30-day rolling window for metrics"
