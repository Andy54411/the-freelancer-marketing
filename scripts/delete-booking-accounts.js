/**
 * Script zum Löschen aller Buchungskonten für eine bestimmte Company
 * Verwendung: node scripts/delete-booking-accounts.js [companyUid]
 */

import { BookingAccountService } from '../src/services/bookingAccountService.js';

const companyUid = process.argv[2];

if (!companyUid) {
  console.error('Fehler: Company UID ist erforderlich');
  console.log('Verwendung: node scripts/delete-booking-accounts.js [companyUid]');
  process.exit(1);
}

async function deleteBookingAccounts() {
  try {
    console.log(`Lösche alle Buchungskonten für Company: ${companyUid}`);
    
    // Zuerst anzeigen, welche Konten gelöscht werden
    const accounts = await BookingAccountService.getBookingAccounts(companyUid);
    console.log(`Gefundene Buchungskonten (${accounts.length}):`);
    accounts.forEach(account => {
      console.log(`- ${account.number}: ${account.name} (${account.type})`);
    });
    
    if (accounts.length === 0) {
      console.log('Keine Buchungskonten gefunden.');
      return;
    }
    
    // Bestätigung abwarten
    console.log('\nLösche alle Buchungskonten in 3 Sekunden...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Löschen
    await BookingAccountService.deleteAllBookingAccounts(companyUid);
    console.log('✅ Alle Buchungskonten wurden erfolgreich gelöscht');
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Buchungskonten:', error);
    process.exit(1);
  }
}

deleteBookingAccounts();