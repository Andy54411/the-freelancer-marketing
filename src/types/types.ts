// src/lib/types.ts

/**
 * Basis-Typ für Anbieterinformationen
 * Wird z. B. in AnbieterDetailsFetcher, OrderSummary etc. verwendet
 */
export interface AnbieterDetails {
  id: string;
  companyName?: string;
  profilePictureURL?: string; // Wird bevorzugt verwendet in Komponenten
  hourlyRate?: number | string; // Zahl oder "Preis k.A."
  subCategory?: string;
  location?: string;
  taskRequiresCar?: boolean;
  estimatedDuration?: string;

  // Erweiterte Adressinformationen – optional
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  state?: string;
}

/**
 * Details zu einem Auftrag / einer Buchung
 */
export interface TaskDetails {
  description: string;
  // Füge hier bei Bedarf weitere Felder hinzu, z. B. Kategorie, Tags etc.
}

/**
 * Props für Order-Zusammenfassung im Checkout-Prozess
 */
export interface OrderSummaryProps {
  anbieterDetails: AnbieterDetails | null;
  angebotDetails: AngebotDetails | null; // Hinweis: AngebotDetails muss definiert werden
  dateFrom: string | null;
  dateTo: string | null;
  time: string | null;
}

/**
 * Props für Zahlungsformular-Komponente (Stripe Checkout)
 */
export interface PaymentDetailsFormProps {
  checkoutData?: Record<string, any>;
  onCheckoutAttempted?: (error?: string) => void;
}

// Beispiel-Typ zur Vervollständigung, falls du ihn noch brauchst
export interface AngebotDetails {
  price: number;
  description?: string;
  // etc.
}
