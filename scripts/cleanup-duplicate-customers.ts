/**
 * Script: Doppelte Kunden bereinigen
 * 
 * Dieses Script:
 * 1. Findet alle Kunden mit gleicher E-Mail pro Company
 * 2. Behält den ältesten Eintrag (niedrigste createdAt oder Kundennummer)
 * 3. Löscht die Duplikate
 * 4. Setzt die customerNumberSequence in der Company korrekt
 * 
 * Ausführen: npx tsx scripts/cleanup-duplicate-customers.ts <companyId>
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Firebase Admin initialisieren mit Service Account Key aus ENV
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY nicht in .env.local gefunden');
  process.exit(1);
}

// Bereinige den Key - entferne escaped Quotes
serviceAccountKey = serviceAccountKey.trim();
if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

interface CustomerDoc {
  id: string;
  email?: string;
  name?: string;
  customerNumber?: string;
  createdAt?: admin.firestore.Timestamp;
}

async function cleanupDuplicateCustomers(companyId: string) {
  console.log(`\n=== Bereinige Kunden für Company: ${companyId} ===\n`);
  
  const customersRef = db.collection('companies').doc(companyId).collection('customers');
  const customersSnapshot = await customersRef.get();
  
  if (customersSnapshot.empty) {
    console.log('Keine Kunden gefunden.');
    return;
  }
  
  // Gruppiere Kunden nach E-Mail
  const customersByEmail: Map<string, CustomerDoc[]> = new Map();
  let highestNumber = 1000;
  
  customersSnapshot.forEach((doc) => {
    const data = doc.data();
    const customer: CustomerDoc = {
      id: doc.id,
      email: data.email,
      name: data.name,
      customerNumber: data.customerNumber,
      createdAt: data.createdAt,
    };
    
    // Extrahiere höchste Kundennummer
    if (customer.customerNumber) {
      const match = customer.customerNumber.match(/KD-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highestNumber) highestNumber = num;
      }
    }
    
    if (customer.email && customer.email.trim() !== '') {
      const normalizedEmail = customer.email.toLowerCase().trim();
      if (!customersByEmail.has(normalizedEmail)) {
        customersByEmail.set(normalizedEmail, []);
      }
      customersByEmail.get(normalizedEmail)!.push(customer);
    }
  });
  
  console.log(`Gefundene Kunden: ${customersSnapshot.size}`);
  console.log(`Höchste Kundennummer: KD-${highestNumber}`);
  
  // Finde und lösche Duplikate
  let deletedCount = 0;
  
  for (const [email, customers] of customersByEmail) {
    if (customers.length > 1) {
      console.log(`\nDuplikate für E-Mail "${email}":`);
      
      // Sortiere nach createdAt (älteste zuerst) oder Kundennummer
      customers.sort((a, b) => {
        // Bevorzuge niedrigere Kundennummer
        const aNum = a.customerNumber ? parseInt(a.customerNumber.replace(/\D/g, ''), 10) : Infinity;
        const bNum = b.customerNumber ? parseInt(b.customerNumber.replace(/\D/g, ''), 10) : Infinity;
        if (aNum !== bNum) return aNum - bNum;
        
        // Fallback: createdAt
        const aTime = a.createdAt?.toMillis() ?? Infinity;
        const bTime = b.createdAt?.toMillis() ?? Infinity;
        return aTime - bTime;
      });
      
      // Behalte den ersten (Original), lösche den Rest
      const [original, ...duplicates] = customers;
      console.log(`  Behalte: ${original.name} (${original.customerNumber}) - ID: ${original.id}`);
      
      for (const dup of duplicates) {
        console.log(`  Lösche:  ${dup.name} (${dup.customerNumber}) - ID: ${dup.id}`);
        await customersRef.doc(dup.id).delete();
        deletedCount++;
      }
    }
  }
  
  console.log(`\n${deletedCount} Duplikate gelöscht.`);
  
  // Setze customerNumberSequence korrekt
  console.log(`\nSetze customerNumberSequence auf ${highestNumber}...`);
  await db.collection('companies').doc(companyId).update({
    customerNumberSequence: highestNumber,
  });
  
  console.log('Fertig!');
}

async function main() {
  const companyId = process.argv[2];
  
  if (!companyId) {
    console.log('Verwendung: npx ts-node scripts/cleanup-duplicate-customers.ts <companyId>');
    console.log('Beispiel:   npx ts-node scripts/cleanup-duplicate-customers.ts LSeyPKLSCXTnyQd48Vuc6JLx7nH2');
    process.exit(1);
  }
  
  try {
    await cleanupDuplicateCustomers(companyId);
  } catch (error) {
    console.error('Fehler:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
