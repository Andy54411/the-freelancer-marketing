/**
 * Script zum Neu-Erstellen eines Stripe Connect Accounts für eine Company
 * 
 * Verwendung: node scripts/recreate-stripe-account.js
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Stripe = require('stripe');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Stripe initialisieren
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY nicht gefunden in Umgebungsvariablen');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey.trim().replace(/\r?\n/g, ''), {
  apiVersion: '2024-06-20',
});

async function recreateStripeAccount() {
  const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
  
  console.log('Lade Company-Daten...');
  
  const companyDoc = await db.collection('companies').doc(companyId).get();
  
  if (!companyDoc.exists) {
    console.error('Company nicht gefunden:', companyId);
    return;
  }
  
  const companyData = companyDoc.data();
  console.log('Company gefunden:', companyData.companyName || companyData.name);
  console.log('Email:', companyData.email);
  console.log('Altes stripeAccountId:', companyData.stripeAccountId || 'keins');
  
  // Neues Stripe Connect Account erstellen
  console.log('\nErstelle neues Stripe Connect Account...');
  
  try {
    const account = await stripe.accounts.create({
      type: 'custom',
      country: companyData.country || 'DE',
      email: companyData.email,
      business_type: 'company',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: companyData.companyName || companyData.name || 'Unbekannt',
        support_email: companyData.email,
        url: `https://taskilo.de/profile/${companyId}`,
      },
      metadata: {
        firebaseUserId: companyId,
        accountType: 'firma',
        createdFor: 'B2B_payments',
        createdAt: new Date().toISOString(),
        recreatedFrom: companyData.stripeAccountId || 'none',
      },
    });
    
    console.log('Neues Stripe Account erstellt:', account.id);
    console.log('Account Status:', {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
    
    // Firestore aktualisieren
    console.log('\nAktualisiere Firestore...');
    
    await db.collection('companies').doc(companyId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
      stripeAccountRecreatedAt: admin.firestore.Timestamp.now(),
      stripeAccountPreviousId: companyData.stripeAccountId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('Firestore aktualisiert mit neuem stripeAccountId:', account.id);
    
    // Prüfe ob auch users Collection aktualisiert werden muss
    const userDoc = await db.collection('users').doc(companyId).get();
    if (userDoc.exists) {
      await db.collection('users').doc(companyId).update({
        stripeAccountId: account.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('Users Collection auch aktualisiert');
    }
    
    console.log('\n=== ERFOLG ===');
    console.log('Neues Stripe Account:', account.id);
    console.log('\nWICHTIG: Das Account muss noch verifiziert werden!');
    console.log('Capabilities Status:');
    console.log('  - card_payments:', account.capabilities?.card_payments || 'pending');
    console.log('  - transfers:', account.capabilities?.transfers || 'pending');
    
    if (!account.charges_enabled) {
      console.log('\nDas Account ist noch nicht für Zahlungen aktiviert.');
      console.log('Weitere Informationen können erforderlich sein.');
      
      // Prüfe was noch fehlt
      if (account.requirements) {
        console.log('\nFehlende Anforderungen:');
        if (account.requirements.currently_due?.length > 0) {
          console.log('  Currently due:', account.requirements.currently_due);
        }
        if (account.requirements.eventually_due?.length > 0) {
          console.log('  Eventually due:', account.requirements.eventually_due);
        }
      }
    }
    
  } catch (error) {
    console.error('Fehler beim Erstellen des Stripe Accounts:', error.message);
    if (error.raw) {
      console.error('Stripe Error Details:', error.raw);
    }
  }
}

recreateStripeAccount()
  .then(() => {
    console.log('\nScript beendet');
    process.exit(0);
  })
  .catch(e => {
    console.error('Kritischer Fehler:', e);
    process.exit(1);
  });
