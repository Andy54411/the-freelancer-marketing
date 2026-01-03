/**
 * Script: Doppelte Kunden bereinigen
 * 
 * Dieses Script:
 * 1. Findet alle Kunden mit gleicher E-Mail pro Company
 * 2. Behält den ältesten Eintrag (niedrigste Kundennummer)
 * 3. Löscht die Duplikate
 * 4. Setzt die customerNumberSequence in der Company korrekt
 * 
 * Ausführen: node scripts/cleanup-duplicate-customers.js <companyId>
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Initialize with service account from environment variable
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

// Bereinige den Key - entferne umschließende Anführungszeichen und escaped Zeichen
serviceAccountKey = serviceAccountKey.trim();
// Entferne umschließende Anführungszeichen
if ((serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) ||
    (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'"))) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
// Ersetze escaped Quotes
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
// KRITISCH: Backslash + echtes Newline -> \n (JSON escape sequence)
serviceAccountKey = serviceAccountKey.replace(/\\\n/g, '\\n');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error('Fehler beim Parsen des Service Account Keys:', e.message);
  console.error('Key Start:', serviceAccountKey.substring(0, 100));
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function cleanupDuplicateCustomers(companyId) {
  console.log(`\n=== Bereinige Kunden für Company: ${companyId} ===\n`);
  
  const customersRef = db.collection('companies').doc(companyId).collection('customers');
  const customersSnapshot = await customersRef.get();
  
  if (customersSnapshot.empty) {
    console.log('Keine Kunden gefunden.');
    return;
  }
  
  // Gruppiere Kunden nach E-Mail
  const customersByEmail = new Map();
  let highestNumber = 1000;
  
  customersSnapshot.forEach((doc) => {
    const data = doc.data();
    const customer = {
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
      customersByEmail.get(normalizedEmail).push(customer);
    }
  });
  
  console.log(`Gefundene Kunden: ${customersSnapshot.size}`);
  console.log(`Höchste Kundennummer: KD-${highestNumber}`);
  
  // Finde und lösche Duplikate
  let deletedCount = 0;
  
  for (const [email, customers] of customersByEmail) {
    if (customers.length > 1) {
      console.log(`\nDuplikate für E-Mail "${email}":`);
      
      // Sortiere nach Kundennummer (niedrigste zuerst)
      customers.sort((a, b) => {
        const aNum = a.customerNumber ? parseInt(a.customerNumber.replace(/\D/g, ''), 10) : Infinity;
        const bNum = b.customerNumber ? parseInt(b.customerNumber.replace(/\D/g, ''), 10) : Infinity;
        return aNum - bNum;
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
    console.log('Verwendung: node scripts/cleanup-duplicate-customers.js <companyId>');
    console.log('Beispiel:   node scripts/cleanup-duplicate-customers.js LSeyPKLSCXTnyQd48Vuc6JLx7nH2');
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
