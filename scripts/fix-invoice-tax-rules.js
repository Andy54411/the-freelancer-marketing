#!/usr/bin/env node

/**
 * Script: fix-invoice-tax-rules.js
 * 
 * Aktualisiert alle Rechnungen in Firestore mit korrekten taxRule-Feldern
 * basierend auf vorhandenen Daten (vatRate, isSmallBusiness, etc.)
 * 
 * Verwendung:
 *   node scripts/fix-invoice-tax-rules.js <companyId>
 *   node scripts/fix-invoice-tax-rules.js --all  (alle Companies)
 *   node scripts/fix-invoice-tax-rules.js <companyId> --dry-run  (nur Vorschau)
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Initialize with service account from environment variable
let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

// Bereinige den Key - entferne umschliessende Anfuehrungszeichen und escaped Zeichen
serviceAccountKey = serviceAccountKey.trim();
if ((serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) ||
    (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'"))) {
  serviceAccountKey = serviceAccountKey.slice(1, -1);
}
serviceAccountKey = serviceAccountKey.replace(/\\"/g, '"');
serviceAccountKey = serviceAccountKey.replace(/\\\n/g, '\\n');

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  console.error('Fehler beim Parsen des Service Account Keys:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// TaxRuleType Enum (muss mit src/types/taxRules.ts uebereinstimmen)
const TaxRuleType = {
  DE_TAXABLE: 'DE_TAXABLE',
  DE_TAXABLE_REDUCED: 'DE_TAXABLE_REDUCED',
  DE_EXEMPT_4_USTG: 'DE_EXEMPT_4_USTG',
  DE_REVERSE_13B: 'DE_REVERSE_13B',
  EU_REVERSE_18B: 'EU_REVERSE_18B',
  EU_INTRACOMMUNITY_SUPPLY: 'EU_INTRACOMMUNITY_SUPPLY',
  EU_OSS: 'EU_OSS',
  NON_EU_EXPORT: 'NON_EU_EXPORT',
  NON_EU_OUT_OF_SCOPE: 'NON_EU_OUT_OF_SCOPE',
};

// TaxRuleLabel Mapping
const TaxRuleLabelMap = {
  [TaxRuleType.DE_TAXABLE]: 'Umsatzsteuerpflichtige Umsaetze (Regelsteuersatz 19%)',
  [TaxRuleType.DE_TAXABLE_REDUCED]: 'Umsatzsteuerpflichtige Umsaetze (ermaessigter Steuersatz 7%)',
  [TaxRuleType.DE_EXEMPT_4_USTG]: 'Steuerfreie Lieferung/Leistung gemaess Paragraph 4 UStG',
  [TaxRuleType.DE_REVERSE_13B]: 'Reverse Charge gemaess Paragraph 13b UStG (Steuerschuld des Leistungsempfaengers)',
  [TaxRuleType.EU_REVERSE_18B]: 'Reverse Charge gemaess Paragraph 18b UStG (EU-Unternehmer)',
  [TaxRuleType.EU_INTRACOMMUNITY_SUPPLY]: 'Innergemeinschaftliche Lieferung (steuerfrei nach Paragraph 4 Nr. 1b i.V.m. Paragraph 6a UStG)',
  [TaxRuleType.EU_OSS]: 'Fernverkauf ueber das OSS-Verfahren (Paragraph 18j UStG)',
  [TaxRuleType.NON_EU_EXPORT]: 'Steuerfreie Ausfuhrlieferung (Paragraph 4 Nr. 1a i.V.m. Paragraph 6 UStG)',
  [TaxRuleType.NON_EU_OUT_OF_SCOPE]: 'Nicht im Inland steuerbare sonstige Leistung (Paragraph 3a Abs. 2 UStG)',
};

/**
 * Bestimmt die TaxRule basierend auf vorhandenen Rechnungsdaten
 */
function determineTaxRule(invoice) {
  // Wenn bereits taxRule vorhanden und gueltig, behalten
  if (invoice.taxRule && Object.values(TaxRuleType).includes(invoice.taxRule)) {
    return {
      taxRule: invoice.taxRule,
      taxRuleType: invoice.taxRule,
      taxRuleLabel: TaxRuleLabelMap[invoice.taxRule] || undefined,
    };
  }

  // Wenn taxRuleType vorhanden und gueltig
  if (invoice.taxRuleType && Object.values(TaxRuleType).includes(invoice.taxRuleType)) {
    return {
      taxRule: invoice.taxRuleType,
      taxRuleType: invoice.taxRuleType,
      taxRuleLabel: TaxRuleLabelMap[invoice.taxRuleType] || undefined,
    };
  }

  const vatRate = invoice.vatRate ?? invoice.taxRate ?? 19;
  const isSmallBusiness = invoice.isSmallBusiness === true || invoice.kleinunternehmer === 'ja';
  
  // Kleinunternehmer -> Paragraph 19 UStG (steuerbefreit)
  if (isSmallBusiness || vatRate === 0) {
    // Pruefen ob es Reverse Charge sein koennte (Kundenland nicht DE)
    const customerCountry = invoice.customerCountry || 
                           invoice.customerAddress?.country || 
                           invoice.customer?.address?.country ||
                           'Deutschland';
    
    const isEU = ['Oesterreich', 'Frankreich', 'Italien', 'Spanien', 'Niederlande', 'Belgien', 
                  'Polen', 'Tschechien', 'Portugal', 'Griechenland', 'Schweden', 'Daenemark',
                  'Finnland', 'Irland', 'Luxemburg', 'Ungarn', 'Rumaenien', 'Bulgarien',
                  'Kroatien', 'Slowenien', 'Slowakei', 'Estland', 'Lettland', 'Litauen',
                  'Malta', 'Zypern', 'Austria', 'France', 'Italy', 'Spain', 'Netherlands',
                  'Belgium', 'Poland', 'Czech Republic', 'Portugal', 'Greece', 'Sweden',
                  'Denmark', 'Finland', 'Ireland', 'Luxembourg', 'Hungary', 'Romania',
                  'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia',
                  'Lithuania', 'Malta', 'Cyprus'].includes(customerCountry);
    
    const isGermany = ['Deutschland', 'Germany', 'DE'].includes(customerCountry);
    
    if (isSmallBusiness) {
      // Kleinunternehmer ist immer DE_EXEMPT_4_USTG
      return {
        taxRule: TaxRuleType.DE_EXEMPT_4_USTG,
        taxRuleType: TaxRuleType.DE_EXEMPT_4_USTG,
        taxRuleLabel: TaxRuleLabelMap[TaxRuleType.DE_EXEMPT_4_USTG],
        isSmallBusiness: true,
      };
    }
    
    if (isEU && !isGermany) {
      // EU-Kunde mit 0% -> wahrscheinlich Reverse Charge
      return {
        taxRule: TaxRuleType.EU_REVERSE_18B,
        taxRuleType: TaxRuleType.EU_REVERSE_18B,
        taxRuleLabel: TaxRuleLabelMap[TaxRuleType.EU_REVERSE_18B],
      };
    }
    
    if (!isGermany && !isEU) {
      // Nicht-EU -> Export
      return {
        taxRule: TaxRuleType.NON_EU_EXPORT,
        taxRuleType: TaxRuleType.NON_EU_EXPORT,
        taxRuleLabel: TaxRuleLabelMap[TaxRuleType.NON_EU_EXPORT],
      };
    }
    
    // Deutschland mit 0% -> Paragraph 4 UStG
    return {
      taxRule: TaxRuleType.DE_EXEMPT_4_USTG,
      taxRuleType: TaxRuleType.DE_EXEMPT_4_USTG,
      taxRuleLabel: TaxRuleLabelMap[TaxRuleType.DE_EXEMPT_4_USTG],
    };
  }

  // 7% -> Ermaessigter Steuersatz
  if (vatRate === 7) {
    return {
      taxRule: TaxRuleType.DE_TAXABLE_REDUCED,
      taxRuleType: TaxRuleType.DE_TAXABLE_REDUCED,
      taxRuleLabel: TaxRuleLabelMap[TaxRuleType.DE_TAXABLE_REDUCED],
    };
  }

  // 19% oder andere -> Regelsteuersatz
  return {
    taxRule: TaxRuleType.DE_TAXABLE,
    taxRuleType: TaxRuleType.DE_TAXABLE,
    taxRuleLabel: TaxRuleLabelMap[TaxRuleType.DE_TAXABLE],
  };
}

/**
 * Aktualisiert Rechnungen fuer eine Company
 */
async function fixInvoicesForCompany(companyId, dryRun = false) {
  console.log(`\nVerarbeite Company: ${companyId}`);
  console.log('='.repeat(60));

  const invoicesRef = db.collection('companies').doc(companyId).collection('invoices');
  const snapshot = await invoicesRef.get();

  if (snapshot.empty) {
    console.log('  Keine Rechnungen gefunden.');
    return { total: 0, updated: 0, skipped: 0 };
  }

  let total = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    total++;
    const invoice = doc.data();
    const invoiceNumber = invoice.invoiceNumber || invoice.number || doc.id;

    // Bestimme korrekte TaxRule
    const taxRuleData = determineTaxRule(invoice);

    // Pruefen ob Update noetig
    const needsUpdate = 
      invoice.taxRule !== taxRuleData.taxRule ||
      invoice.taxRuleType !== taxRuleData.taxRuleType ||
      !invoice.taxRuleLabel;

    if (!needsUpdate) {
      skipped++;
      continue;
    }

    console.log(`\n  Rechnung: ${invoiceNumber}`);
    console.log(`    Aktuell: taxRule=${invoice.taxRule || 'FEHLT'}, vatRate=${invoice.vatRate}, isSmallBusiness=${invoice.isSmallBusiness}`);
    console.log(`    Neu:     taxRule=${taxRuleData.taxRule}, taxRuleType=${taxRuleData.taxRuleType}`);

    if (!dryRun) {
      await doc.ref.update({
        taxRule: taxRuleData.taxRule,
        taxRuleType: taxRuleData.taxRuleType,
        taxRuleLabel: taxRuleData.taxRuleLabel || null,
        ...(taxRuleData.isSmallBusiness !== undefined && { isSmallBusiness: taxRuleData.isSmallBusiness }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`    -> AKTUALISIERT`);
    } else {
      console.log(`    -> (dry-run) Wuerde aktualisiert werden`);
    }

    updated++;
  }

  console.log(`\n  Zusammenfassung fuer ${companyId}:`);
  console.log(`    Gesamt: ${total}, Aktualisiert: ${updated}, Uebersprungen: ${skipped}`);

  return { total, updated, skipped };
}

/**
 * Hauptfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Verwendung:');
    console.log('  node scripts/fix-invoice-tax-rules.js <companyId>');
    console.log('  node scripts/fix-invoice-tax-rules.js <companyId> --dry-run');
    console.log('  node scripts/fix-invoice-tax-rules.js --all');
    console.log('  node scripts/fix-invoice-tax-rules.js --all --dry-run');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const processAll = args.includes('--all');

  if (dryRun) {
    console.log('\n*** DRY-RUN MODUS - Keine Aenderungen werden gespeichert ***\n');
  }

  let companies = [];

  if (processAll) {
    console.log('Lade alle Companies...');
    const companiesSnap = await db.collection('companies').get();
    companies = companiesSnap.docs.map(doc => doc.id);
    console.log(`${companies.length} Companies gefunden.`);
  } else {
    const companyId = args.find(arg => !arg.startsWith('--'));
    if (!companyId) {
      console.error('Bitte eine Company-ID angeben oder --all verwenden.');
      process.exit(1);
    }
    companies = [companyId];
  }

  let totalStats = { total: 0, updated: 0, skipped: 0 };

  for (const companyId of companies) {
    const stats = await fixInvoicesForCompany(companyId, dryRun);
    totalStats.total += stats.total;
    totalStats.updated += stats.updated;
    totalStats.skipped += stats.skipped;
  }

  console.log('\n' + '='.repeat(60));
  console.log('GESAMTERGEBNIS:');
  console.log(`  Companies: ${companies.length}`);
  console.log(`  Rechnungen gesamt: ${totalStats.total}`);
  console.log(`  Aktualisiert: ${totalStats.updated}`);
  console.log(`  Uebersprungen: ${totalStats.skipped}`);
  
  if (dryRun) {
    console.log('\n*** Dies war ein Dry-Run - keine Aenderungen wurden gespeichert ***');
    console.log('Fuehren Sie ohne --dry-run aus, um die Aenderungen zu speichern.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fehler:', err);
  process.exit(1);
});
