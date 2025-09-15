// Hauptexport für das zentrale Platzhalter-System
export * from './types';
export * from './placeholderEngine';
export * from './aliases';

// Kategorie-spezifische Exports
export { default as dateTimePlaceholders } from './categories/dateTime';
export { default as companyPlaceholders } from './categories/company';
export { default as customerPlaceholders } from './categories/customer';
export { default as invoicePlaceholders } from './categories/invoice';
export { default as quotePlaceholders } from './categories/quote';

// Haupt-Engine als Default Export
export { default } from './placeholderEngine';