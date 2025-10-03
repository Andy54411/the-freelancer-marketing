'use client';

import { useMemo } from 'react';

export interface DocumentTranslations {
  // Document types
  invoice: string;
  quote: string;
  offer: string;
  deliveryNote: string;
  order: string;
  
  // Labels
  recipient: string;
  documentDetails: string;
  invoiceNumber: string;
  quoteNumber: string;
  orderNumber: string;
  deliveryNoteNumber: string;
  date: string;
  dueDate: string;
  validUntil: string;
  
  // Table headers
  position: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  vatRate: string;
  articleNumber: string;
  total: string;
  amount: string;
  
  // Totals
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  
  // Units
  piece: string;
  hour: string;
  kilogram: string;
  meter: string;
  
  // Footer texts
  thankYou: string;
  paymentTerms: string;
  bankDetails: string;
  contactInfo: string;
  
  // QR Codes
  qrCodePayment: string;
  sepaTransfer: string;
  
  // Page info
  page: string;
  of: string;
  
  // Customer info
  customerNumber: string;
  contact: string;
  vatId: string;
  
  // Tax information
  taxTreatment: string;
  
  // Footer text replacements
  inReminder: string;
  asQuote: string;
  inInvoice: string;
  bestRegards: string;
  
  // Standard texts
  dearCustomer: string;
  quoteIntroduction: string;
  quoteClosing: string;
  taxableRevenue: string;
}

const translations: Record<string, DocumentTranslations> = {
  'de': {
    // Document types
    invoice: 'Rechnung',
    quote: 'Angebot',
    offer: 'Angebot',
    deliveryNote: 'Lieferschein',
    order: 'Auftrag',
    
    // Labels
    recipient: 'Empfänger',
    documentDetails: 'Dokumentdetails',
    invoiceNumber: 'Rechnungsnummer',
    quoteNumber: 'Angebotsnummer',
    orderNumber: 'Auftragsnummer',
    deliveryNoteNumber: 'Lieferscheinnummer',
    date: 'Datum',
    dueDate: 'Fälligkeitsdatum',
    validUntil: 'Gültig bis',
    
    // Table headers
    position: 'Pos.',
    description: 'Beschreibung',
    quantity: 'Menge',
    unitPrice: 'Einzelpreis',
    discount: 'Rabatt',
    vatRate: 'MwSt.',
    articleNumber: 'Art.-Nr.',
    total: 'Gesamtpreis',
    amount: 'Betrag',
    
    // Totals
    subtotal: 'Zwischensumme',
    vatAmount: 'MwSt.',
    totalAmount: 'Gesamtbetrag',
    
    // Units
    piece: 'Stk.',
    hour: 'Std.',
    kilogram: 'kg',
    meter: 'm',
    
    // Footer texts
    thankYou: 'Vielen Dank für Ihr Vertrauen!',
    paymentTerms: 'Zahlungsbedingungen',
    bankDetails: 'Bankverbindung',
    contactInfo: 'Kontaktinformationen',
    
    // QR Codes
    qrCodePayment: 'QR-Code für Zahlung',
    sepaTransfer: 'SEPA-Überweisung',
    
    // Page info
    page: 'Seite',
    of: 'von',
    
    // Customer info
    customerNumber: 'Kundennummer',
    contact: 'Kontakt',
    vatId: 'USt-IdNr.',
    
    // Tax information
    taxTreatment: 'Steuerliche Behandlung',
    
    // Footer text replacements
    inReminder: 'in Mahnung',
    asQuote: 'als Angebot',
    inInvoice: 'in Rechnung',
    bestRegards: 'Mit freundlichen Grüßen',
    
    // Standard texts
    dearCustomer: 'Sehr geehrte Damen und Herren',
    quoteIntroduction: 'vielen Dank für Ihre Anfrage! Hiermit unterbreiten wir Ihnen gerne unser Angebot für die folgenden Leistungen:',
    quoteClosing: 'Dieses Angebot ist gültig bis {date}. Bei Annahme unseres Angebots erstellen wir Ihnen gerne eine entsprechende Rechnung. Für Rückfragen stehen wir Ihnen jederzeit zur Verfügung.',
    taxableRevenue: 'Steuerpflichtiger Umsatz (Regelsteuersatz 19 %, § 1 Abs. 1 Nr. 1 i.V.m. § 12 Abs. 1 UStG)',
  },
  
  'en': {
    // Document types
    invoice: 'Invoice',
    quote: 'Quote',
    offer: 'Offer',
    deliveryNote: 'Delivery Note',
    order: 'Order',
    
    // Labels
    recipient: 'Recipient',
    documentDetails: 'Document Details',
    invoiceNumber: 'Invoice Number',
    quoteNumber: 'Quote Number',
    orderNumber: 'Order Number',
    deliveryNoteNumber: 'Delivery Note Number',
    date: 'Date',
    dueDate: 'Due Date',
    validUntil: 'Valid Until',
    
    // Table headers
    position: 'Pos.',
    description: 'Description',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    vatRate: 'VAT',
    articleNumber: 'Art. No.',
    total: 'Total',
    amount: 'Amount',
    
    // Totals
    subtotal: 'Subtotal',
    vatAmount: 'VAT',
    totalAmount: 'Total Amount',
    
    // Units
    piece: 'pcs.',
    hour: 'hrs.',
    kilogram: 'kg',
    meter: 'm',
    
    // Footer texts
    thankYou: 'Thank you for your trust!',
    paymentTerms: 'Payment Terms',
    bankDetails: 'Bank Details',
    contactInfo: 'Contact Information',
    
    // QR Codes
    qrCodePayment: 'QR Code for Payment',
    sepaTransfer: 'SEPA Transfer',
    
    // Page info
    page: 'Page',
    of: 'of',
    
    // Customer info
    customerNumber: 'Customer Number',
    contact: 'Contact',
    vatId: 'VAT ID',
    
    // Tax information
    taxTreatment: 'Tax Treatment',
    
    // Footer text replacements
    inReminder: 'in reminder',
    asQuote: 'as quote',
    inInvoice: 'in invoice',
    bestRegards: 'Best regards',
    
    // Standard texts
    dearCustomer: 'Dear Sir or Madam',
    quoteIntroduction: 'thank you for your inquiry! We are pleased to submit our quote for the following services:',
    quoteClosing: 'This quote is valid until {date}. Upon acceptance of our quote, we will be happy to issue you a corresponding invoice. Please feel free to contact us if you have any questions.',
    taxableRevenue: 'Taxable revenue (standard rate 19%, § 1 para. 1 no. 1 in conjunction with § 12 para. 1 VAT Act)',
  },
  
  // Weitere Sprachen hier minimiert für bessere Performance
  'fr': {
    invoice: 'Facture',
    quote: 'Devis',
    offer: 'Offre',
    deliveryNote: 'Bon de livraison',
    order: 'Commande',
    recipient: 'Destinataire',
    documentDetails: 'Détails du document',
    invoiceNumber: 'Numéro de facture',
    quoteNumber: 'Numéro de devis',
    orderNumber: 'Numéro de commande',
    deliveryNoteNumber: 'Numéro de bon de livraison',
    date: 'Date',
    dueDate: 'Date d\'échéance',
    validUntil: 'Valide jusqu\'au',
    position: 'Pos.',
    description: 'Description',
    quantity: 'Quantité',
    unitPrice: 'Prix unitaire',
    discount: 'Remise',
    vatRate: 'TVA',
    articleNumber: 'Réf.',
    total: 'Total',
    amount: 'Montant',
    subtotal: 'Sous-total',
    vatAmount: 'TVA',
    totalAmount: 'Montant total',
    piece: 'pièces',
    hour: 'heures',
    kilogram: 'kg',
    meter: 'm',
    thankYou: 'Merci pour votre confiance!',
    paymentTerms: 'Conditions de paiement',
    bankDetails: 'Coordonnées bancaires',
    contactInfo: 'Informations de contact',
    qrCodePayment: 'QR Code pour paiement',
    sepaTransfer: 'Virement SEPA',
    page: 'Page',
    of: 'de',
    customerNumber: 'Numéro client',
    contact: 'Contact',
    vatId: 'N° TVA',
    taxTreatment: 'Traitement fiscal',
    inReminder: 'en rappel',
    asQuote: 'comme devis',
    inInvoice: 'en facture',
    bestRegards: 'Meilleures salutations',
    
    // Standard texts
    dearCustomer: 'Mesdames et Messieurs',
    quoteIntroduction: 'merci pour votre demande! Nous avons le plaisir de vous soumettre notre devis pour les services suivants:',
    quoteClosing: 'Ce devis est valable jusqu\'au {date}. En cas d\'acceptation de notre devis, nous vous établirons volontiers une facture correspondante. Nous restons à votre disposition pour toute question.',
    taxableRevenue: 'Chiffre d\'affaires imposable (taux normal 19%, § 1 al. 1 n° 1 en liaison avec § 12 al. 1 TVA)',
  },
};

export const useDocumentTranslation = (language: string = 'de') => {
  const t = useMemo(() => {
    const lang = translations[language] || translations['de'];
    return (key: keyof DocumentTranslations): string => {
      return lang[key] || translations['de'][key] || key;
    };
  }, [language]);

  return { t };
};