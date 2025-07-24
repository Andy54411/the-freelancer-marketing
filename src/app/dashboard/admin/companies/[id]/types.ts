/**
 * Definiert die detaillierte und kombinierte Datenstruktur für die Firmendetailseite.
 * Diese Schnittstelle vereint Daten aus den 'users'- und 'companies'-Collections
 * und sorgt für Typsicherheit im gesamten Admin-Dashboard.
 */
export interface CompanyDetailData {
  id: string;
  documents: { name: string; url: string }[];

  // Kerninformationen
  companyName?: string;
  email?: string;
  status?: 'active' | 'locked' | 'deactivated' | 'unknown';
  user_type?: 'firma' | 'kunde';
  createdAt?: string; // ISO 8601 String
  updatedAt?: string; // ISO 8601 String

  // Ansprechpartner
  firstName?: string;
  lastName?: string;
  phoneNumber?: string; // Persönliche Telefonnummer

  // Firmendetails & Adresse
  legalForm?: string;
  companyStreet?: string;
  companyHouseNumber?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyCountry?: string;
  companyPhoneNumber?: string; // Geschäftliche Telefonnummer
  companyWebsite?: string;
  description?: string;

  // Profil-URLs
  taskiloProfileUrl?: string;

  // Stripe-Integration
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripeAccountError?: string | null;

  // Erlaubt zusätzliche, nicht explizit definierte Felder aus Firestore
  [key: string]: any;
}
