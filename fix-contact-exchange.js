const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase_functions/service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'taskilo-dev'
  });
}

const db = admin.firestore();

async function triggerContactExchange() {
  try {
    console.log('🔍 Suche nach Quote: quote_1756320622873_zuv5lwk04');
    
    const quoteRef = db.collection('quotes').doc('quote_1756320622873_zuv5lwk04');
    const quoteDoc = await quoteRef.get();
    
    if (!quoteDoc.exists) {
      console.log('❌ Quote nicht gefunden!');
      return;
    }
    
    const quoteData = quoteDoc.data();
    console.log('📋 Aktueller Quote Status:', quoteData.status);
    console.log('💳 Payment Info:', quoteData.payment);
    console.log('🤝 Contact Exchange Info:', quoteData.contactExchange);
    
    // MANUELL KONTAKTAUSTAUSCH TRIGGERN
    console.log('🎯 Starte manuellen Kontaktaustausch...');
    
    const customerUid = quoteData.customerUid;
    const providerUid = quoteData.providerId || quoteData.providerUid;
    
    console.log(`👤 Customer UID: ${customerUid}`);
    console.log(`🏢 Provider UID: ${providerUid}`);
    
    // 1. Lade Customer Daten (B2B = companies, B2C = users)
    let customerData = null;
    let customerType = '';
    
    try {
      const customerCompanyDoc = await db.collection('companies').doc(customerUid).get();
      if (customerCompanyDoc.exists) {
        customerData = customerCompanyDoc.data();
        customerType = 'company';
        console.log(`✅ Customer gefunden (companies): ${customerData.companyName || customerData.ownerName}`);
      } else {
        const customerUserDoc = await db.collection('users').doc(customerUid).get();
        if (customerUserDoc.exists) {
          customerData = customerUserDoc.data();
          customerType = 'user';
          console.log(`✅ Customer gefunden (users): ${customerData.firstName} ${customerData.lastName}`);
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Customer Daten:', error);
    }
    
    // 2. Lade Provider Daten (meist companies)
    let providerData = null;
    let providerType = '';
    
    try {
      const providerCompanyDoc = await db.collection('companies').doc(providerUid).get();
      if (providerCompanyDoc.exists) {
        providerData = providerCompanyDoc.data();
        providerType = 'company';
        console.log(`✅ Provider gefunden (companies): ${providerData.companyName || providerData.ownerName}`);
      } else {
        const providerUserDoc = await db.collection('users').doc(providerUid).get();
        if (providerUserDoc.exists) {
          providerData = providerUserDoc.data();
          providerType = 'user';
          console.log(`✅ Provider gefunden (users): ${providerData.firstName} ${providerData.lastName}`);
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Provider Daten:', error);
    }
    
    if (!customerData || !providerData) {
      console.log('❌ Customer oder Provider Daten nicht gefunden!');
      return;
    }
    
    // 3. Erstelle Kontaktaustausch Daten
    const customerContact = {
      uid: customerUid,
      type: customerType,
      name: customerType === 'company' 
        ? (customerData.companyName || customerData.ownerName || 'Unbekanntes Unternehmen')
        : `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
      email: customerData.email || customerData.ownerEmail || '',
      phone: customerData.phone || customerData.companyPhoneNumber || '',
      address: customerType === 'company' 
        ? `${customerData.companyStreet || ''}, ${customerData.companyCity || ''} ${customerData.companyPostalCode || ''}`.trim()
        : `${customerData.street || ''}, ${customerData.city || ''} ${customerData.postalCode || ''}`.trim(),
    };
    
    const providerContact = {
      uid: providerUid,
      type: providerType,
      name: providerType === 'company' 
        ? (providerData.companyName || providerData.ownerName || 'Unbekanntes Unternehmen')
        : `${providerData.firstName || ''} ${providerData.lastName || ''}`.trim(),
      email: providerData.email || providerData.ownerEmail || '',
      phone: providerData.phone || providerData.companyPhoneNumber || '',
      address: providerType === 'company' 
        ? `${providerData.companyStreet || ''}, ${providerData.companyCity || ''} ${providerData.companyPostalCode || ''}`.trim()
        : `${providerData.street || ''}, ${providerData.city || ''} ${providerData.postalCode || ''}`.trim(),
    };
    
    console.log('👤 Customer Kontakt:', customerContact);
    console.log('🏢 Provider Kontakt:', providerContact);
    
    // 4. UPDATE QUOTE MIT KONTAKTAUSTAUSCH
    const updateData = {
      status: 'contacts_exchanged',
      'contactExchange.status': 'completed',
      'contactExchange.completedAt': new Date().toISOString(),
      'contactExchange.contactsExchanged': true,
      'contactExchange.exchangeReason': 'payment_completed',
      'contactExchange.customerContact': customerContact,
      'contactExchange.providerContact': providerContact,
      'payment.status': 'paid',
      'payment.paidAt': new Date().toISOString(),
    };
    
    await quoteRef.update(updateData);
    console.log('✅ Quote erfolgreich aktualisiert!');
    
    // 5. UPDATE PROPOSALS
    try {
      const proposalsSnapshot = await db
        .collection('quotes')
        .doc('quote_1756320622873_zuv5lwk04')
        .collection('proposals')
        .get();
      
      if (!proposalsSnapshot.empty) {
        const batch = db.batch();
        proposalsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'contacts_exchanged',
            acceptedAt: new Date().toISOString(),
            paymentComplete: true,
            contactsExchanged: true,
            contactExchangeAt: new Date().toISOString(),
          });
        });
        await batch.commit();
        console.log(`✅ Updated ${proposalsSnapshot.size} proposal(s) to contacts_exchanged status`);
      }
    } catch (error) {
      console.error('❌ Fehler beim Update der Proposals:', error);
    }
    
    console.log('🎉 KONTAKTAUSTAUSCH ERFOLGREICH ABGESCHLOSSEN!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

triggerContactExchange();
