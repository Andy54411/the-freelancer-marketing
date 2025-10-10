const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });

    console.log('📡 Gefundene Webhooks:\n');

    webhooks.data.forEach((webhook, i) => {
      console.log(`${i + 1}. Webhook ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events (${webhook.enabled_events.length}):`);
      webhook.enabled_events.forEach(event => {
        const isStorageEvent = [
          'checkout.session.completed',
          'customer.subscription.updated',
          'customer.subscription.deleted',
        ].includes(event);
        const marker = isStorageEvent ? '✅' : '  ';
        console.log(`     ${marker} ${event}`);
      });
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Storage Subscription Events Status:');

    const allEvents = webhooks.data.flatMap(w => w.enabled_events);
    const hasCheckoutCompleted = allEvents.includes('checkout.session.completed');
    const hasSubUpdated = allEvents.includes('customer.subscription.updated');
    const hasSubDeleted = allEvents.includes('customer.subscription.deleted');

    console.log(`   checkout.session.completed: ${hasCheckoutCompleted ? '✅ JA' : '❌ FEHLT'}`);
    console.log(`   customer.subscription.updated: ${hasSubUpdated ? '✅ JA' : '❌ FEHLT'}`);
    console.log(`   customer.subscription.deleted: ${hasSubDeleted ? '✅ JA' : '❌ FEHLT'}`);

    if (!hasCheckoutCompleted || !hasSubUpdated || !hasSubDeleted) {
      console.log('\n⚠️  STORAGE SUBSCRIPTION EVENTS FEHLEN!');
      console.log('   → Webhook funktioniert NICHT automatisch');
      console.log('   → Füge die Events in Stripe Dashboard hinzu\n');
    } else {
      console.log('\n✅ Alle Storage Events konfiguriert!');
      console.log('   → Webhook funktioniert automatisch\n');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
