/**
 * SERVICE UPDATE PLAN for Firestore Migration
 * Von globalen Collections zu Company Subcollections
 */

export interface ServiceUpdate {
  serviceName: string;
  filePath: string;
  oldPattern: string;
  newPattern: string;
  status: 'pending' | 'completed' | 'in-progress';
  notes?: string;
}

export const SERVICE_UPDATES: ServiceUpdate[] = [
  // CUSTOMER SERVICE
  {
    serviceName: 'CustomerService',
    filePath: 'src/services/customerService.ts',
    oldPattern: "collection(db, 'customers')",
    newPattern: "collection(db, 'companies', companyId, 'customers')",
    status: 'completed',
    notes: 'Alle Methoden aktualisiert: getCustomers, getCustomer, addCustomer, updateCustomer, deleteCustomer, subscribeToCustomers'
  },

  // INVENTORY SERVICE
  {
    serviceName: 'InventoryService',
    filePath: 'src/services/inventoryService.ts',
    oldPattern: "collection(db, 'inventory')",
    newPattern: "collection(db, 'companies', companyId, 'inventory')",
    status: 'in-progress',
    notes: 'Teilweise aktualisiert - weitere Methoden benötigen Update'
  },

  // STOCK MOVEMENTS
  {
    serviceName: 'InventoryService (StockMovements)',
    filePath: 'src/services/inventoryService.ts',
    oldPattern: "collection(db, 'stockMovements')",
    newPattern: "collection(db, 'companies', companyId, 'stockMovements')",
    status: 'pending',
    notes: 'StockMovements Funktionen im InventoryService aktualisieren'
  },

  // TIME TRACKING SERVICE
  {
    serviceName: 'TimeTrackingService',
    filePath: 'src/services/timeTrackingService.ts',
    oldPattern: "collection(db, 'timeEntries')",
    newPattern: "collection(db, 'companies', companyId, 'timeEntries')",
    status: 'pending',
    notes: 'Alle TimeEntry-bezogenen Methoden'
  },

  // QUOTE SERVICE
  {
    serviceName: 'QuoteService',
    filePath: 'src/services/quoteService.ts',
    oldPattern: "collection(db, 'quotes')",
    newPattern: "collection(db, 'companies', companyId, 'quotes')",
    status: 'pending',
    notes: 'Angebots-Verwaltung zu Subcollections'
  },

  // FINANCE SERVICE (Expenses)
  {
    serviceName: 'FinanceService (Expenses)',
    filePath: 'src/services/financeService.ts',
    oldPattern: "collection(db, 'expenses')",
    newPattern: "collection(db, 'companies', companyId, 'expenses')",
    status: 'pending',
    notes: 'Ausgaben-Verwaltung'
  },

  // ORDER TIME TRACKING
  {
    serviceName: 'OrderTimeTracking',
    filePath: 'TBD - check where used',
    oldPattern: "collection(db, 'orderTimeTracking')",
    newPattern: "collection(db, 'companies', companyId, 'orderTimeTracking')",
    status: 'pending',
    notes: 'Auftrags-Zeiterfassung - Service-Datei finden'
  }
];

// COMPONENT UPDATES NEEDED
export const COMPONENT_UPDATES = [
  // Finance Components
  'src/components/finance/CustomerManager.tsx',
  'src/components/finance/CustomerDetailModal.tsx',
  'src/components/finance/SupplierManager.tsx',
  'src/components/finance/ProjectsComponent.tsx',
  'src/components/finance/ProjectDetailView.tsx',
  
  // Chart Components
  'src/components/chart-expenses-interactive.tsx',
  'src/components/chart-area-interactive.tsx',
  'src/components/section-cards.tsx',
  
  // Chat Components
  'src/components/chat/QuoteChat.tsx',
  
  // Other Components mit direkten Firestore-Calls
];

// FIRESTORE RULES UPDATES
export const FIRESTORE_RULES_UPDATES = `
// OLD RULES (beispiel)
match /customers/{customerId} {
  allow read, write: if request.auth != null && 
    resource.data.companyId == request.auth.uid;
}

// NEW RULES (subcollections)
match /companies/{companyId}/customers/{customerId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == companyId;
}

// Apply same pattern for:
// - /companies/{companyId}/inventory/{itemId}
// - /companies/{companyId}/stockMovements/{movementId}  
// - /companies/{companyId}/timeEntries/{entryId}
// - /companies/{companyId}/quotes/{quoteId}
// - /companies/{companyId}/expenses/{expenseId}
// - /companies/{companyId}/orderTimeTracking/{trackingId}
`;

// MIGRATION CHECKLIST
export const MIGRATION_CHECKLIST = [
  '✅ Migration Script erstellt',
  '✅ CustomerService komplett aktualisiert',
  '🔄 InventoryService teilweise aktualisiert',
  '❌ TimeTrackingService aktualisieren',
  '❌ QuoteService aktualisieren', 
  '❌ FinanceService (Expenses) aktualisieren',
  '❌ Alle Components mit direkten DB-Calls aktualisieren',
  '❌ Firestore Security Rules aktualisieren',
  '❌ Migration testen (Dry Run)',
  '❌ Backup erstellen',
  '❌ Echte Migration durchführen',
  '❌ Alle Features testen',
  '❌ Alte Collections löschen'
];

export function getNextPendingService(): ServiceUpdate | null {
  return SERVICE_UPDATES.find(service => service.status === 'pending') || null;
}

export function getCompletionPercentage(): number {
  const completed = SERVICE_UPDATES.filter(s => s.status === 'completed').length;
  return Math.round((completed / SERVICE_UPDATES.length) * 100);
}