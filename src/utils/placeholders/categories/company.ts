// Firmen-Platzhalter - Zentrale Implementierung
import { PlaceholderRegistry, PlaceholderContext } from '../types';

export const companyPlaceholders: PlaceholderRegistry = {
  // Basis Firmen-Informationen
  'FIRMENNAME': (context: PlaceholderContext) => 
    context.company?.companyName || context.company?.name || '',
    
  'FIRMENADRESSE': (context: PlaceholderContext) => {
    const company = context.company;
    if (!company) return '';
    
    const parts = [
      company.street,
      `${company.postalCode || ''} ${company.city || ''}`.trim(),
      company.country
    ].filter(Boolean);
    
    return parts.join(', ');
  },
  
  'FIRMENSTRASSE': (context: PlaceholderContext) => 
    context.company?.street || '',
    
  'FIRMENPLZ': (context: PlaceholderContext) => 
    context.company?.postalCode || '',
    
  'FIRMENORT': (context: PlaceholderContext) => 
    context.company?.city || '',
    
  'FIRMENLAND': (context: PlaceholderContext) => 
    context.company?.country || '',
  
  // Kontakt-Informationen
  'FIRMENTELEFON': (context: PlaceholderContext) => 
    context.company?.phone || '',
    
  'FIRMENEMAIL': (context: PlaceholderContext) => 
    context.company?.email || '',
    
  'FIRMENFAX': (context: PlaceholderContext) => 
    context.company?.fax || '',
    
  'FIRMENWEBSITE': (context: PlaceholderContext) => 
    context.company?.website || '',
  
  // Steuerliche Informationen - Standardisiert
  'UMSATZSTEUER_ID': (context: PlaceholderContext) => 
    context.company?.vatId || context.company?.umsatzsteuerId || context.company?.taxId || '',
    
  // Alternative Namen für Umsatzsteuer-ID (für Kompatibilität)
  'UMSATZSTEUERID': (context: PlaceholderContext) => 
    context.company?.vatId || context.company?.umsatzsteuerId || context.company?.taxId || '',
    
  'VAT_ID': (context: PlaceholderContext) => 
    context.company?.vatId || context.company?.umsatzsteuerId || context.company?.taxId || '',
    
  'STEUERNUMMER': (context: PlaceholderContext) => 
    context.company?.taxNumber || context.company?.steuernummer || '',
    
  'TAX_NUMBER': (context: PlaceholderContext) => 
    context.company?.taxNumber || context.company?.steuernummer || '',
  
  // Bankverbindung
  'FIRMENIBAN': (context: PlaceholderContext) => 
    context.company?.bankDetails?.iban || context.company?.iban || '',
    
  'FIRMENBIC': (context: PlaceholderContext) => 
    context.company?.bankDetails?.bic || context.company?.bic || '',
    
  'FIRMENBANK': (context: PlaceholderContext) => 
    context.company?.bankDetails?.bankName || context.company?.bankName || '',
    
  'FIRMENKONTOINHABER': (context: PlaceholderContext) => 
    context.company?.bankDetails?.accountHolder || context.company?.accountHolder || '',
  
  // Geschäftsführung und Registrierung
  'GESCHAEFTSFUEHRER': (context: PlaceholderContext) => 
    context.company?.ceo || context.company?.owner || '',
    
  'HANDELSREGISTER': (context: PlaceholderContext) => 
    context.company?.commercialRegister || '',
    
  'AMTSGERICHT': (context: PlaceholderContext) => 
    context.company?.court || '',
    
  'RECHTSFORM': (context: PlaceholderContext) => 
    context.company?.legalForm || '',
  
  // Zusätzliche Firmen-Felder
  'FIRMENBESCHREIBUNG': (context: PlaceholderContext) => 
    context.company?.description || '',
    
  'BRANCHE': (context: PlaceholderContext) => 
    context.company?.industry || '',
    
  'GRUENDUNGSJAHR': (context: PlaceholderContext) => 
    context.company?.foundedYear ? context.company.foundedYear.toString() : '',
    
  'MITARBEITERANZAHL': (context: PlaceholderContext) => 
    context.company?.employeeCount ? context.company.employeeCount.toString() : '',
  
  // Logo und Corporate Design
  'FIRMENLOGO': (context: PlaceholderContext) => 
    context.company?.logoUrl || '',
    
  'FIRMENFARBE': (context: PlaceholderContext) => 
    context.company?.brandColor || '',
  
  // Spezielle Formate für verschiedene Dokumente
  'FIRMENADRESSE_MEHRZEILIG': (context: PlaceholderContext) => {
    const company = context.company;
    if (!company) return '';
    
    const lines = [
      company.street,
      `${company.postalCode || ''} ${company.city || ''}`.trim(),
      company.country
    ].filter(Boolean);
    
    return lines.join('\n');
  },
  
  'FIRMENKONTAKT_KOMPLETT': (context: PlaceholderContext) => {
    const company = context.company;
    if (!company) return '';
    
    const contact: string[] = [];
    if (company.phone) contact.push(`Tel: ${company.phone}`);
    if (company.email) contact.push(`E-Mail: ${company.email}`);
    if (company.fax) contact.push(`Fax: ${company.fax}`);
    if (company.website) contact.push(`Web: ${company.website}`);
    
    return contact.join(', ');
  },
  
  'STEUERINFO_KOMPLETT': (context: PlaceholderContext) => {
    const company = context.company;
    if (!company) return '';
    
    const taxInfo: string[] = [];
    const vatId = company.vatId || company.umsatzsteuerId || company.taxId;
    const taxNumber = company.taxNumber || company.steuernummer;
    
    if (vatId) taxInfo.push(`USt-IdNr.: ${vatId}`);
    if (taxNumber) taxInfo.push(`Steuernr.: ${taxNumber}`);
    
    return taxInfo.join(', ');
  }
};

export default companyPlaceholders;