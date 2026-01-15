import { db } from '../src/firebase/server';

async function cleanupAndFixGmailConfigs() {
  const companyId = 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2';
  const cleanup = process.argv.includes('--cleanup');
  
  console.log('🔍 Checking Gmail config for company:', companyId);
  if (cleanup) {
    console.log('🧹 CLEANUP MODE AKTIVIERT - Duplikate werden gelöscht!');
  }
  console.log('-------------------------------------------');
  
  if (!db) {
    console.log('❌ Firestore nicht initialisiert!');
    return;
  }
  
  // Check emailConfigs subcollection
  const emailConfigsSnapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('emailConfigs')
    .get();
  
  if (emailConfigsSnapshot.empty) {
    console.log('❌ Keine emailConfigs gefunden!');
    return;
  }
  
  console.log(`✅ ${emailConfigsSnapshot.size} emailConfig(s) gefunden:\n`);
  
  // Gruppiere nach userId
  const configsByUser = new Map<string, typeof emailConfigsSnapshot.docs>();
  
  emailConfigsSnapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const userId = data.userId || 'unknown';
    
    console.log(`--- Config ${index + 1} (ID: ${doc.id}) ---`);
    console.log('Provider:', data.provider);
    console.log('Email:', data.email);
    console.log('userId:', userId);
    console.log('isActive:', data.isActive);
    console.log('status:', data.status || 'NICHT GESETZT');
    console.log('Has tokens.access_token:', !!data.tokens?.access_token);
    console.log('Has tokens.refresh_token:', !!data.tokens?.refresh_token);
    console.log('createdAt:', data.createdAt);
    console.log('updatedAt:', data.updatedAt);
    console.log('');
    
    if (!configsByUser.has(userId)) {
      configsByUser.set(userId, []);
    }
    configsByUser.get(userId)!.push(doc);
  });
  
  // Finde Duplikate
  console.log('\n--- Duplikat-Analyse ---');
  for (const [userId, configs] of configsByUser.entries()) {
    if (configs.length > 1) {
      console.log(`⚠️ User ${userId} hat ${configs.length} Configs!`);
      
      // Sortiere nach updatedAt (neueste zuerst)
      configs.sort((a, b) => {
        const dateA = new Date(a.data().updatedAt || a.data().createdAt || 0).getTime();
        const dateB = new Date(b.data().updatedAt || b.data().createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      const keep = configs[0];
      const toDelete = configs.slice(1);
      
      console.log(`   ✅ Behalte: ${keep.id} (neueste)`);
      toDelete.forEach(d => console.log(`   🗑️  Löschen: ${d.id}`));
      
      if (cleanup) {
        // Lösche Duplikate
        for (const doc of toDelete) {
          await db!
            .collection('companies')
            .doc(companyId)
            .collection('emailConfigs')
            .doc(doc.id)
            .delete();
          console.log(`   ✅ Gelöscht: ${doc.id}`);
        }
        
        // Setze status auf 'connected' falls nicht gesetzt
        const keepData = keep.data();
        if (!keepData.status || keepData.status !== 'connected') {
          await db!
            .collection('companies')
            .doc(companyId)
            .collection('emailConfigs')
            .doc(keep.id)
            .update({ 
              status: 'connected',
              updatedAt: new Date().toISOString()
            });
          console.log(`   ✅ Status aktualisiert: ${keep.id} → connected`);
        }
      }
    } else {
      // Einzelne Config - prüfe ob status gesetzt ist
      const config = configs[0];
      const data = config.data();
      if (!data.status || data.status !== 'connected') {
        console.log(`⚠️ User ${userId} Config hat keinen status!`);
        if (cleanup) {
          await db!
            .collection('companies')
            .doc(companyId)
            .collection('emailConfigs')
            .doc(config.id)
            .update({ 
              status: 'connected',
              updatedAt: new Date().toISOString()
            });
          console.log(`   ✅ Status aktualisiert: ${config.id} → connected`);
        }
      } else {
        console.log(`✅ User ${userId} hat 1 Config mit status: ${data.status}`);
      }
    }
  }
  
  if (!cleanup && configsByUser.size > 0) {
    console.log('\n💡 Um Duplikate zu bereinigen, führe aus:');
    console.log('   pnpm exec tsx scripts/check-gmail-config.ts --cleanup');
  }
}

cleanupAndFixGmailConfigs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
