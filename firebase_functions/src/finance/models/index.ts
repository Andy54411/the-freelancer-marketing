// firebase_functions/src/finance/models/index.ts

// Re-export aller Models für einfache Imports

export * from './base.model';
export * from './invoice.model';
export * from './customer.model';
export * from './expense.model';
export * from './payment.model';

// Vereinfachte Model-Instanzen für Services
export { InvoiceModel } from './invoice.model';
export { CustomerModel } from './customer.model';
export { ExpenseModel } from './expense.model';
export { PaymentModel } from './payment.model';
