const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const WEBHOOK_ID = 'we_1RpiS7D5Lvjon30aa3RYOtbT';

(async () => {
  try {
    console.log('🔄 Füge Storage Subscription Events hinzu...\n');

    // Get current webhook
    const webhook = await stripe.webhookEndpoints.retrieve(WEBHOOK_ID);

    console.log('📡 Aktueller Webhook:');
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Events: ${webhook.enabled_events.length}\n`);

    // Add new events
    const newEvents = [
      ...webhook.enabled_events,
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ];

    // Remove duplicates
    const uniqueEvents = [...new Set(newEvents)];

    console.log(`📝 Neue Events (${uniqueEvents.length} total):`);
    uniqueEvents.forEach(event => {
      const isNew = !webhook.enabled_events.includes(event);
      console.log(`   ${isNew ? '🆕' : '  '} ${event}`);
    });

    // Update webhook
    await stripe.webhookEndpoints.update(WEBHOOK_ID, {
      enabled_events: uniqueEvents,
    });

    console.log('\n✅ Webhook erfolgreich aktualisiert!');
    console.log('🎉 Storage Subscription funktioniert jetzt automatisch!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
