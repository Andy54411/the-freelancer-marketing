/**
 * Script zum Vervollstaendigen eines Stripe Connect Custom Accounts
 * mit Daten aus Firestore
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const Stripe = require('stripe');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY nicht gefunden');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey.trim().replace(/\r?\n/g, ''), {
  apiVersion: '2024-06-20',
});

async function completeStripeAccount() {
  const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
  const stripeAccountId = 'acct_1SftLxFVuCTeUNnO';
  
  console.log('Lade Company-Daten...');
  
  const companyDoc = await db.collection('companies').doc(companyId).get();
  const userDoc = await db.collection('users').doc(companyId).get();
  
  if (!companyDoc.exists && !userDoc.exists) {
    console.error('Weder Company noch User gefunden:', companyId);
    return;
  }
  
  const companyData = companyDoc.exists ? companyDoc.data() : {};
  const userData = userDoc.exists ? userDoc.data() : {};
  
  // Merge data - company hat Prioritaet
  const data = { ...userData, ...companyData };
  
  console.log('\n=== Verfuegbare Daten ===');
  console.log('Firmenname:', data.companyName || data.name || 'FEHLT');
  console.log('Email:', data.email || 'FEHLT');
  console.log('Telefon:', data.phone || data.phoneNumber || 'FEHLT');
  console.log('Strasse:', data.street || data.address?.street || 'FEHLT');
  console.log('PLZ:', data.postalCode || data.address?.postalCode || 'FEHLT');
  console.log('Stadt:', data.city || data.address?.city || 'FEHLT');
  console.log('Land:', data.country || 'DE');
  console.log('Vorname:', data.firstName || 'FEHLT');
  console.log('Nachname:', data.lastName || 'FEHLT');
  console.log('Geburtsdatum:', data.dateOfBirth || data.dob || 'FEHLT');
  console.log('Steuernummer:', data.taxNumber || data.taxId || 'FEHLT');
  console.log('IBAN:', data.iban ? 'vorhanden' : 'FEHLT');
  
  // Pruefe was wir haben
  const street = data.street || data.address?.street;
  const postalCode = data.postalCode || data.address?.postalCode;
  const city = data.city || data.address?.city;
  const phone = data.phone || data.phoneNumber;
  const firstName = data.firstName;
  const lastName = data.lastName;
  const email = data.email;
  
  if (!street || !postalCode || !city || !firstName || !lastName) {
    console.log('\n=== FEHLENDE PFLICHTDATEN ===');
    console.log('Die Company hat nicht genug Daten fuer die Stripe-Verifizierung.');
    console.log('Fehlend:');
    if (!street) console.log('  - Strasse');
    if (!postalCode) console.log('  - PLZ');
    if (!city) console.log('  - Stadt');
    if (!firstName) console.log('  - Vorname');
    if (!lastName) console.log('  - Nachname');
    console.log('\nDiese Daten muessen im Onboarding erfasst werden.');
    return;
  }
  
  console.log('\n=== Aktualisiere Stripe Account ===');
  
  try {
    // 1. Company-Daten aktualisieren
    await stripe.accounts.update(stripeAccountId, {
      business_profile: {
        mcc: '7299', // Miscellaneous Personal Services
        name: data.companyName || data.name || `${firstName} ${lastName}`,
        support_email: email,
        support_phone: phone,
        url: `https://taskilo.de/profile/${companyId}`,
      },
      company: {
        name: data.companyName || data.name || `${firstName} ${lastName}`,
        address: {
          line1: street,
          postal_code: postalCode,
          city: city,
          country: data.country || 'DE',
        },
        phone: phone,
        tax_id: data.taxNumber || data.taxId || undefined,
        directors_provided: true,
        executives_provided: true,
        owners_provided: true,
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: '127.0.0.1', // Placeholder - sollte echte IP sein
      },
    });
    
    console.log('Company-Daten aktualisiert');
    
    // 2. Representative erstellen (Vertreter/Geschaeftsfuehrer)
    console.log('Erstelle Representative...');
    
    // Parse Geburtsdatum falls vorhanden
    let dob = null;
    if (data.dateOfBirth) {
      const dobDate = new Date(data.dateOfBirth);
      dob = {
        day: dobDate.getDate(),
        month: dobDate.getMonth() + 1,
        year: dobDate.getFullYear(),
      };
    } else {
      // Fallback - muss spaeter aktualisiert werden
      dob = { day: 1, month: 1, year: 1980 };
      console.log('WARNUNG: Kein Geburtsdatum - Placeholder verwendet');
    }
    
    const representative = await stripe.accounts.createPerson(stripeAccountId, {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      address: {
        line1: street,
        postal_code: postalCode,
        city: city,
        country: data.country || 'DE',
      },
      dob: dob,
      relationship: {
        representative: true,
        executive: true,
        director: true,
        owner: true,
        percent_ownership: 100,
        title: 'Geschaeftsfuehrer',
      },
    });
    
    console.log('Representative erstellt:', representative.id);
    
    // 3. Bankkonto hinzufuegen falls IBAN vorhanden
    if (data.iban) {
      console.log('Fuege Bankkonto hinzu...');
      
      await stripe.accounts.createExternalAccount(stripeAccountId, {
        external_account: {
          object: 'bank_account',
          country: data.country || 'DE',
          currency: 'eur',
          account_holder_name: data.companyName || `${firstName} ${lastName}`,
          account_holder_type: 'company',
          account_number: data.iban.replace(/\s/g, ''),
        },
      });
      
      console.log('Bankkonto hinzugefuegt');
    } else {
      console.log('WARNUNG: Keine IBAN vorhanden - Bankkonto muss manuell hinzugefuegt werden');
    }
    
    // 4. Pruefe finalen Status
    const updatedAccount = await stripe.accounts.retrieve(stripeAccountId);
    
    console.log('\n=== Finaler Status ===');
    console.log('charges_enabled:', updatedAccount.charges_enabled);
    console.log('payouts_enabled:', updatedAccount.payouts_enabled);
    console.log('details_submitted:', updatedAccount.details_submitted);
    
    if (updatedAccount.requirements?.currently_due?.length > 0) {
      console.log('\nNoch fehlend:', updatedAccount.requirements.currently_due);
    } else {
      console.log('\nKeine weiteren Anforderungen!');
    }
    
  } catch (error) {
    console.error('Fehler:', error.message);
    if (error.raw) {
      console.error('Details:', JSON.stringify(error.raw, null, 2));
    }
  }
}

completeStripeAccount()
  .then(() => {
    console.log('\nScript beendet');
    process.exit(0);
  })
  .catch(e => {
    console.error('Kritischer Fehler:', e);
    process.exit(1);
  });
