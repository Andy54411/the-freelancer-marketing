#!/usr/bin/env tsx

/**
 * Firebase Cleanup Script für Testing - Force Mode
 * 
 * WARNUNG: Dieses Script löscht ALLE Daten!
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = join(__dirname, '../firebase_functions/service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const auth = getAuth();

async function deleteCollection(collectionPath: string): Promise<number> {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.limit(500).get();
  
  if (snapshot.empty) {
    return 0;
  }

  let deleted = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    deleted++;
  });
  
  await batch.commit();
  
  if (snapshot.size === 500) {
    const moreDeleted = await deleteCollection(collectionPath);
    return deleted + moreDeleted;
  }
  
  return deleted;
}

async function deleteSubcollections(parentPath: string, subcollectionName: string): Promise<number> {
  const parentRef = db.collection(parentPath);
  const parentDocs = await parentRef.listDocuments();
  
  let totalDeleted = 0;
  
  for (const parentDoc of parentDocs) {
    const subcollectionPath = `${parentPath}/${parentDoc.id}/${subcollectionName}`;
    const deleted = await deleteCollection(subcollectionPath);
    totalDeleted += deleted;
  }
  
  return totalDeleted;
}

async function deleteAllAuthUsers(): Promise<number> {
  let deleted = 0;
  let nextPageToken: string | undefined;
  
  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    
    if (listResult.users.length > 0) {
      const uids = listResult.users.map(user => user.uid);
      await auth.deleteUsers(uids);
      deleted += uids.length;
      console.log(`  Gelöscht: ${deleted} Auth-Benutzer...`);
    }
    
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);
  
  return deleted;
}

async function main() {
  console.log('\n🔄 Starte Firebase Bereinigung...\n');

  try {
    // 1. Firebase Auth Benutzer löschen
    console.log('1️⃣  Lösche Firebase Auth Benutzer...');
    const authDeleted = await deleteAllAuthUsers();
    console.log(`   ✅ ${authDeleted} Auth-Benutzer gelöscht\n`);

    // 2. Users Collection löschen
    console.log('2️⃣  Lösche /users Collection...');
    const usersDeleted = await deleteCollection('users');
    console.log(`   ✅ ${usersDeleted} User-Dokumente gelöscht\n`);

    // 3. Companies Subcollections löschen
    console.log('3️⃣  Lösche Companies Subcollections...');
    const subcollections = [
      'customers', 'invoices', 'expenses', 'quotes', 'orders', 
      'emailConfigs', 'numberSequences', 'settings', 'team',
      'bankAccounts', 'products', 'services', 'documents',
      'notifications', 'chatMessages', 'appointments'
    ];
    
    let subcollectionsDeleted = 0;
    for (const sub of subcollections) {
      const deleted = await deleteSubcollections('companies', sub);
      if (deleted > 0) {
        console.log(`   - ${sub}: ${deleted} Dokumente`);
        subcollectionsDeleted += deleted;
      }
    }
    console.log(`   ✅ ${subcollectionsDeleted} Subcollection-Dokumente gelöscht\n`);

    // 4. Companies Collection löschen
    console.log('4️⃣  Lösche /companies Collection...');
    const companiesDeleted = await deleteCollection('companies');
    console.log(`   ✅ ${companiesDeleted} Company-Dokumente gelöscht\n`);

    // 5. Escrows Collection löschen
    console.log('5️⃣  Lösche /escrows Collection...');
    const escrowsDeleted = await deleteCollection('escrows');
    console.log(`   ✅ ${escrowsDeleted} Escrow-Dokumente gelöscht\n`);

    // 6. Weitere Collections
    console.log('6️⃣  Lösche weitere Collections...');
    const otherCollections = ['orders', 'quotes', 'chats', 'notifications'];
    let otherDeleted = 0;
    for (const coll of otherCollections) {
      const deleted = await deleteCollection(coll);
      if (deleted > 0) {
        console.log(`   - ${coll}: ${deleted} Dokumente`);
        otherDeleted += deleted;
      }
    }
    console.log(`   ✅ ${otherDeleted} weitere Dokumente gelöscht\n`);

    // Zusammenfassung
    const total = authDeleted + usersDeleted + companiesDeleted + subcollectionsDeleted + escrowsDeleted + otherDeleted;
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ BEREINIGUNG ABGESCHLOSSEN - ${total} Einträge gelöscht`);
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
