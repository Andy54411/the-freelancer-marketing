// Kunden-Platzhalter - Zentrale Implementierung
import { PlaceholderRegistry, PlaceholderContext } from '../types';

export const customerPlaceholders: PlaceholderRegistry = {
  // Basis Kunden-Informationen
  'KUNDENNAME': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer) return '';
    
    // Für Firmenkunden
    if (customer.companyName) return customer.companyName;
    
    // Für Privatkunden
    const firstName = customer.firstName || customer.vorname || '';
    const lastName = customer.lastName || customer.nachname || '';
    return `${firstName} ${lastName}`.trim();
  },
  
  'KUNDENVORNAME': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.firstName || customer?.vorname || '';
  },
  
  'KUNDENNACHNAME': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.lastName || customer?.nachname || '';
  },
  
  'KUNDENFIRMA': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.companyName || customer?.company || '';
  },
  
  // Kunden-Adresse
  'KUNDENADRESSE': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer) return '';
    
    const parts: string[] = [];
    if (customer.street) parts.push(customer.street);
    
    const cityLine = `${customer.postalCode || ''} ${customer.city || ''}`.trim();
    if (cityLine) parts.push(cityLine);
    
    if (customer.country) parts.push(customer.country);
    
    return parts.join(', ');
  },
  
  'KUNDENSTRASSE': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.street || customer?.address?.street || '';
  },
  
  'KUNDENPLZ': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.postalCode || customer?.address?.postalCode || '';
  },
  
  'KUNDENORT': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.city || customer?.address?.city || '';
  },
  
  'KUNDENLAND': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.country || customer?.address?.country || '';
  },
  
  // Kunden-Kontakt
  'KUNDENTELEFON': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.phone || customer?.telefon || '';
  },
  
  'KUNDENEMAIL': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.email || customer?.emailAddress || '';
  },
  
  'KUNDENFAX': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.fax || '';
  },
  
  'KUNDENMOBIL': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.mobile || customer?.handy || '';
  },
  
  // Kunden-Identifikation
  'KUNDENNUMMER': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.customerNumber || customer?.id || '';
  },
  
  'KUNDEN_ID': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.id || customer?.customerId || '';
  },
  
  // Steuerliche Informationen
  'KUNDEN_UMSATZSTEUER_ID': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.vatId || customer?.umsatzsteuerId || '';
  },
  
  'KUNDEN_STEUERNUMMER': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    return customer?.taxNumber || customer?.steuernummer || '';
  },
  
  // Ansprechpartner (für B2B-Kunden)
  'ANSPRECHPARTNER': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer?.contactPersons?.length) return '';
    
    const contact = customer.contactPersons[0];
    return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  },
  
  'ANSPRECHPARTNER_VORNAME': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer?.contactPersons?.length) return '';
    return customer.contactPersons[0].firstName || '';
  },
  
  'ANSPRECHPARTNER_NACHNAME': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer?.contactPersons?.length) return '';
    return customer.contactPersons[0].lastName || '';
  },
  
  'ANSPRECHPARTNER_EMAIL': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer?.contactPersons?.length) return '';
    return customer.contactPersons[0].email || '';
  },
  
  'ANSPRECHPARTNER_TELEFON': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer?.contactPersons?.length) return '';
    return customer.contactPersons[0].phone || '';
  },
  
  // Zusätzliche Kunden-Informationen
  'KUNDENTYP': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer) return '';
    return customer.companyName ? 'Geschäftskunde' : 'Privatkunde';
  },
  
  'KUNDE_SEIT': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer?.createdAt) return '';
    
    const date = customer.createdAt.toDate ? customer.createdAt.toDate() : new Date(customer.createdAt);
    return date.toLocaleDateString('de-DE');
  },
  
  // Mehrzeilige Formate
  'KUNDENADRESSE_MEHRZEILIG': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer) return '';
    
    const lines: string[] = [];
    
    // Name/Firma
    if (customer.companyName) {
      lines.push(customer.companyName);
    } else {
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      if (fullName) lines.push(fullName);
    }
    
    // Ansprechpartner bei Firmen
    if (customer.companyName && customer.contactPersons?.length) {
      const contact = customer.contactPersons[0];
      const contactName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      if (contactName) lines.push(`z.Hd. ${contactName}`);
    }
    
    // Adresse
    if (customer.street) lines.push(customer.street);
    
    const cityLine = `${customer.postalCode || ''} ${customer.city || ''}`.trim();
    if (cityLine) lines.push(cityLine);
    
    if (customer.country) lines.push(customer.country);
    
    return lines.join('\n');
  },
  
  'KUNDENKONTAKT_KOMPLETT': (context: PlaceholderContext) => {
    const customer = context.selectedCustomer || context.customer;
    if (!customer) return '';
    
    const contact: string[] = [];
    if (customer.phone) contact.push(`Tel: ${customer.phone}`);
    if (customer.mobile) contact.push(`Mobil: ${customer.mobile}`);
    if (customer.email) contact.push(`E-Mail: ${customer.email}`);
    if (customer.fax) contact.push(`Fax: ${customer.fax}`);
    
    return contact.join(', ');
  }
};

export default customerPlaceholders;