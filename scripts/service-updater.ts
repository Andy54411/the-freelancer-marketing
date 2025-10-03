/**
 * Automatisches Service-Update Script für Firestore Migration
 * Aktualisiert alle Services von globalen Collections zu Subcollections
 */

import fs from 'fs';
import path from 'path';

interface ServiceReplacement {
  oldPattern: RegExp;
  newPattern: (match: string, ...args: any[]) => string;
  description: string;
}

const SERVICE_REPLACEMENTS: ServiceReplacement[] = [
  // CUSTOMERS COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*customers\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'customers')",
    description: 'customers → companies/[id]/customers',
  },

  // INVENTORY COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*inventory\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'inventory')",
    description: 'inventory → companies/[id]/inventory',
  },

  // STOCK MOVEMENTS COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*stockMovements\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'stockMovements')",
    description: 'stockMovements → companies/[id]/stockMovements',
  },

  // TIME ENTRIES COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*timeEntries\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'timeEntries')",
    description: 'timeEntries → companies/[id]/timeEntries',
  },

  // QUOTES COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*quotes\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'quotes')",
    description: 'quotes → companies/[id]/quotes',
  },

  // EXPENSES COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*expenses\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'expenses')",
    description: 'expenses → companies/[id]/expenses',
  },

  // ORDER TIME TRACKING COLLECTION
  {
    oldPattern: /collection\(db,\s*['"]\s*orderTimeTracking\s*['"]\)/g,
    newPattern: () => "collection(db, 'companies', companyId, 'orderTimeTracking')",
    description: 'orderTimeTracking → companies/[id]/orderTimeTracking',
  },

  // DOC REFERENCES - CUSTOMERS
  {
    oldPattern: /doc\(db,\s*['"]\s*customers\s*['"],\s*([^)]+)\)/g,
    newPattern: (match, customerId) =>
      `doc(db, 'companies', companyId, 'customers', ${customerId})`,
    description: 'doc(db, customers, id) → doc(db, companies, companyId, customers, id)',
  },

  // DOC REFERENCES - INVENTORY
  {
    oldPattern: /doc\(db,\s*['"]\s*inventory\s*['"],\s*([^)]+)\)/g,
    newPattern: (match, itemId) => `doc(db, 'companies', companyId, 'inventory', ${itemId})`,
    description: 'doc(db, inventory, id) → doc(db, companies, companyId, inventory, id)',
  },

  // DOC REFERENCES - STOCK MOVEMENTS
  {
    oldPattern: /doc\(db,\s*['"]\s*stockMovements\s*['"],\s*([^)]+)\)/g,
    newPattern: (match, movementId) =>
      `doc(db, 'companies', companyId, 'stockMovements', ${movementId})`,
    description: 'doc(db, stockMovements, id) → doc(db, companies, companyId, stockMovements, id)',
  },

  // DOC REFERENCES - TIME ENTRIES
  {
    oldPattern: /doc\(db,\s*['"]\s*timeEntries\s*['"],\s*([^)]+)\)/g,
    newPattern: (match, entryId) => `doc(db, 'companies', companyId, 'timeEntries', ${entryId})`,
    description: 'doc(db, timeEntries, id) → doc(db, companies, companyId, timeEntries, id)',
  },

  // DOC REFERENCES - QUOTES
  {
    oldPattern: /doc\(db,\s*['"]\s*quotes\s*['"],\s*([^)]+)\)/g,
    newPattern: (match, quoteId) => `doc(db, 'companies', companyId, 'quotes', ${quoteId})`,
    description: 'doc(db, quotes, id) → doc(db, companies, companyId, quotes, id)',
  },

  // DOC REFERENCES - EXPENSES
  {
    oldPattern: /doc\(db,\s*['"]\s*expenses\s*['"],\s*([^)]+)\)/g,
    newPattern: (match, expenseId) => `doc(db, 'companies', companyId, 'expenses', ${expenseId})`,
    description: 'doc(db, expenses, id) → doc(db, companies, companyId, expenses, id)',
  },

  // WHERE CLAUSES - Remove companyId filters (no longer needed in subcollections)
  {
    oldPattern: /,\s*where\(['"]companyId['"],\s*[']==]+,\s*companyId\)/g,
    newPattern: () => '',
    description: 'Remove companyId where clauses (implicit in subcollections)',
  },
];

class ServiceUpdater {
  private dryRun: boolean;
  private logResults: boolean;

  constructor(dryRun = true, logResults = true) {
    this.dryRun = dryRun;
    this.logResults = logResults;
  }

  async updateFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    const appliedReplacements: string[] = [];

    // Apply all replacements
    for (const replacement of SERVICE_REPLACEMENTS) {
      const originalContent = content;

      if (typeof replacement.newPattern === 'function') {
        content = content.replace(replacement.oldPattern, replacement.newPattern);
      } else {
        content = content.replace(replacement.oldPattern, replacement.newPattern as string);
      }

      if (content !== originalContent) {
        hasChanges = true;
        appliedReplacements.push(replacement.description);
      }
    }

    if (hasChanges) {
      if (this.logResults) {
        console.log(`\n📝 ${path.basename(filePath)}:`);
        appliedReplacements.forEach(desc => console.log(`  ✅ ${desc}`));
      }

      if (!this.dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  💾 File updated: ${filePath}`);
      } else {
        console.log(`  🧪 DRY RUN: Would update ${filePath}`);
      }
    }
  }

  async updateServices(): Promise<void> {
    console.log(`🚀 Starting Service Update (DRY RUN: ${this.dryRun})`);
    console.log(`📅 ${new Date().toISOString()}\n`);

    const serviceFiles = [
      'src/services/customerService.ts',
      'src/services/inventoryService.ts',
      'src/services/timeTrackingService.ts',
      'src/services/quoteService.ts',
      'src/services/financeService.ts',
      'src/services/warehouseService.ts',
      'src/services/quoteInventoryService.ts',
    ];

    const componentFiles = [
      'src/components/finance/CustomerManager.tsx',
      'src/components/finance/CustomerDetailModal.tsx',
      'src/components/finance/SupplierManager.tsx',
      'src/components/finance/ProjectsComponent.tsx',
      'src/components/finance/ProjectDetailView.tsx',
      'src/components/chart-expenses-interactive.tsx',
      'src/components/chart-area-interactive.tsx',
      'src/components/section-cards.tsx',
      'src/components/chat/QuoteChat.tsx',
    ];

    // Update Services
    console.log('🔧 Updating Services:');
    for (const file of serviceFiles) {
      await this.updateFile(file);
    }

    // Update Components
    console.log('\n🎨 Updating Components:');
    for (const file of componentFiles) {
      await this.updateFile(file);
    }

    console.log(`\n✅ Service update completed!`);

    if (this.dryRun) {
      console.log(`\n⚠️  This was a DRY RUN. To apply changes, run with dryRun = false`);
    }
  }

  async findAllFirestoreUsages(): Promise<void> {
    console.log('🔍 Scanning for Firestore usage patterns...\n');

    const findInFile = (filePath: string, pattern: RegExp): string[] => {
      if (!fs.existsSync(filePath)) return [];

      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(pattern) || [];
      return matches;
    };

    const patterns = [
      /collection\(db,\s*['"][^'"]*['"]\)/g,
      /doc\(db,\s*['"][^'"]*['"],\s*[^)]+\)/g,
      /where\(['"]companyId['"],\s*['==]+,\s*[^)]+\)/g,
    ];

    const filesToScan = [
      ...fs
        .readdirSync('src/services')
        .filter(f => f.endsWith('.ts'))
        .map(f => `src/services/${f}`),
      ...this.findFilesRecursive('src/components', /\.(tsx|ts)$/),
    ];

    for (const file of filesToScan) {
      for (const pattern of patterns) {
        const matches = findInFile(file, pattern);
        if (matches.length > 0) {
          console.log(`📄 ${file}:`);
          matches.forEach(match => console.log(`  ${match}`));
          console.log('');
        }
      }
    }
  }

  private findFilesRecursive(dir: string, pattern: RegExp): string[] {
    let results: string[] = [];

    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        results = results.concat(this.findFilesRecursive(filePath, pattern));
      } else if (pattern.test(file)) {
        results.push(filePath);
      }
    }

    return results;
  }
}

// Usage
async function runServiceUpdate() {
  const updater = new ServiceUpdater(true, true); // DRY RUN first

  // 1. Scan for current usage
  await updater.findAllFirestoreUsages();

  // 2. Show what would be updated
  await updater.updateServices();

  // 3. Ask for confirmation
  const shouldProceed = confirm('\nDRY RUN completed. Proceed with actual updates?');

  if (shouldProceed) {
    const realUpdater = new ServiceUpdater(false, true);
    await realUpdater.updateServices();
  }
}

export { ServiceUpdater, runServiceUpdate };

// Run if called directly
if (typeof window !== 'undefined') {
  console.log('Service Updater loaded. Call runServiceUpdate() to start.');
}
