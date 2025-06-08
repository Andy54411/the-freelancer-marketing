// src/lib/types.ts

// Basierend auf dem Bedarf von AnbieterDetailsFetcher, OrderSummary und dem globalen Company-Typ
export interface AnbieterDetails {
  id: string;
  companyName?: string;
  profilePictureURL?: string; // In deiner global.d.ts war es profileImageUrl, aber Komponenten nutzten profilePictureURL
  hourlyRate?: number | string; // string für "Preis k.A." oder numerisch für Kalkulationen
  subCategory?: string;
  location?: string;            // z.B. Stadt
  taskRequiresCar?: boolean;
  estimatedDuration?: string;   // z.B. "2 Stunden"

  // Felder aus deinem global.d.ts Company-Beispiel, falls relevant
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  state?: string; // Bundesland
}

export interface TaskDetails {
  description: string;
  // Weitere auftragsspezifische Felder könnten hierhin
}

// Die Props für deine Checkout-Komponenten könnten auch hier zentralisiert werden,
// falls sie von mehreren Stellen benötigt oder referenziert werden.
// export interface OrderSummaryProps {
//   anbieterDetails: AnbieterDetails | null;
//   AngebotDetails: AngebotDetails | null;
//   dateFrom: string | null;
//   dateTo: string | null;
//   time: string | null;
// }

// export interface PaymentDetailsFormProps {
//   checkoutData?: Record<string, any>;
//   onCheckoutAttempted?: (error?: string) => void;
// }