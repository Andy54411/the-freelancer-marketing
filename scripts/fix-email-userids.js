const admin = require('firebase-admin');
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

async function fix() {
  const companyId = 'jcGLTdv9D9VV2PpZZPkBjzbrrIx2';
  const mitarbeiterUserId = '8IyAY0TOvrfjM3CBhN7kaQzMpdC3';
  const mitarbeiterEmail = 'the.freelancer.crew1@gmail.com';
  
  // 1. Lösche alte emailConfig ohne userId
  console.log('🗑️ Lösche alte emailConfig ohne userId...');
  const oldConfig = await db
    .collection('companies')
    .doc(companyId)
    .collection('emailConfigs')
    .doc('gmail_jcGLTdv9D9VV2PpZZPkBjzbrrIx2_1763421118176')
    .delete();
  console.log('✅ Alte emailConfig gelöscht');
  
  // 2. Alle E-Mails im Cache, die dem Mitarbeiter gehören, mit userId aktualisieren
  console.log('\n🔄 Aktualisiere E-Mails im Cache mit userId...');
  const cacheRef = db.collection('companies').doc(companyId).collection('emailCache');
  
  // Finde alle E-Mails ohne userId
  const emailsWithoutUserId = await cacheRef.where('userId', '==', null).limit(500).get();
  console.log(`📧 E-Mails ohne userId: ${emailsWithoutUserId.size}`);
  
  // Finde auch E-Mails die einfach kein userId Feld haben
  const allEmails = await cacheRef.limit(500).get();
  console.log(`📧 Alle E-Mails im Cache: ${allEmails.size}`);
  
  let updated = 0;
  const batch = db.batch();
  
  for (const doc of allEmails.docs) {
    const data = doc.data();
    // Wenn die E-Mail vom Mitarbeiter ist (basierend auf der E-Mail-Adresse im Doc-ID)
    if (doc.id.startsWith(mitarbeiterEmail)) {
      if (!data.userId) {
        batch.update(doc.ref, { userId: mitarbeiterUserId });
        updated++;
      }
    }
  }
  
  if (updated > 0) {
    await batch.commit();
    console.log(`✅ ${updated} E-Mails mit userId aktualisiert`);
  } else {
    console.log('ℹ️ Keine E-Mails zum Aktualisieren gefunden');
  }
  
  // 3. Überprüfe das Ergebnis
  console.log('\n📊 Ergebnis:');
  const configsAfter = await db.collection('companies').doc(companyId).collection('emailConfigs').get();
  console.log('EmailConfigs:');
  configsAfter.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  - ${data.email} -> userId: ${data.userId}`);
  });
}

fix().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
