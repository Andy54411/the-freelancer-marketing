/**
 * INWX Domain Registrar Types
 * DSGVO-konform (Deutsches Datenschutzrecht)
 */

import { z } from 'zod';

// DSGVO-konforme Kontaktdaten Schema
export const DomainContactSchema = z.object({
  // Pflichtfelder nach ICANN/DENIC
  type: z.enum(['person', 'org', 'role']).default('person'),
  
  // Persoenliche Daten
  firstname: z.string().min(1, 'Vorname ist erforderlich'),
  lastname: z.string().min(1, 'Nachname ist erforderlich'),
  
  // Firma (optional)
  organization: z.string().optional(),
  
  // Adresse
  street: z.string().min(1, 'Strasse ist erforderlich'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  postalCode: z.string().min(1, 'PLZ ist erforderlich'),
  countryCode: z.string().length(2, 'Ländercode muss 2 Zeichen haben').default('DE'),
  
  // Kontakt
  phone: z.string().min(1, 'Telefonnummer ist erforderlich'),
  email: z.string().email('Gültige E-Mail ist erforderlich'),
  
  // DSGVO Einwilligung
  privacyConsent: z.boolean().refine(val => val === true, {
    message: 'DSGVO-Einwilligung ist erforderlich',
  }),
  privacyConsentDate: z.string().datetime().optional(),
});

export type DomainContact = z.infer<typeof DomainContactSchema>;

// Domain Registrierungsanfrage
export const DomainRegisterRequestSchema = z.object({
  domain: z.string().min(1),
  period: z.number().min(1).max(10).default(1), // Jahre
  contact: DomainContactSchema,
  nameservers: z.array(z.string()).optional(),
  autoRenew: z.boolean().default(true),
});

export type DomainRegisterRequest = z.infer<typeof DomainRegisterRequestSchema>;

// Domain Registrierungsergebnis
export interface DomainRegisterResult {
  success: boolean;
  domain: string;
  orderId?: string;
  expirationDate?: string;
  status: string;
  error?: string;
}

// E-Mail Mailbox Konfiguration
export const MailboxRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
  quotaMB: z.number().min(100).max(50000).default(5000), // 5GB default
  domain: z.string().min(1),
});

export type MailboxRequest = z.infer<typeof MailboxRequestSchema>;

// Bestellung
export const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  companyId: z.string().optional(),
  
  // Produkt
  type: z.enum(['domain', 'mailbox', 'bundle']),
  
  // Domain-spezifisch
  domain: z.string().optional(),
  tld: z.string().optional(),
  period: z.number().optional(),
  
  // Mailbox-spezifisch
  email: z.string().optional(),
  quotaMB: z.number().optional(),
  
  // Preise (Netto)
  priceNet: z.number(),
  vatRate: z.number(), // 0 für Kleinunternehmer, 19 sonst
  vatAmount: z.number(),
  priceGross: z.number(),
  
  // Kontaktdaten (DSGVO)
  contact: DomainContactSchema.optional(),
  
  // Zahlung
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
  paymentMethod: z.enum(['revolut', 'sepa', 'invoice']),
  paymentId: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  
  // Status
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

// Preisliste
export interface ProductPricing {
  // Domains
  domains: Record<string, {
    yearly: number;
    setup: number;
  }>;
  
  // Mailboxen
  mailbox: {
    monthly: number;
    yearly: number;
    setupFee: number;
    includedStorageGB: number;
    additionalStoragePerGB: number;
  };
}

// INWX API Response Types
export interface INWXDomainInfo {
  domain: string;
  status: string;
  expirationDate: string;
  registrant: string;
  autoRenew: boolean;
  nameservers: string[];
}

export interface INWXContactInfo {
  id: number;
  type: string;
  name: string;
  organization?: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone: string;
  email: string;
}
