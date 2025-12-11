// Einheitliches Jobfinder-Format (kompatibel mit Flutter App und Cloud Function)
export interface JobfinderData {
  id?: string;
  userId: string;
  name: string;
  
  // Suchkriterien
  searchTerm?: string;
  location?: string;
  radiusKm?: number;
  category?: string;
  jobType?: string;
  
  // Benachrichtigungen
  pushNotification: boolean;
  emailNotification: boolean;
  
  // Status
  active: boolean;
  matchCount: number;
  lastNotifiedAt?: string | null;
  
  // Timestamps
  createdAt: Date | { _seconds: number; _nanoseconds: number };
  updatedAt?: Date | { _seconds: number; _nanoseconds: number };
}

// Legacy Web-Format (für alte Einträge)
export interface LegacyJobfinderData {
  jobGroups?: string[];
  location?: string;
  radius?: string;
  searchPhrase?: string;
  industries?: string[];
  categories?: string[];
  michelin?: string[];
  gaultMillau?: string[];
  ranks?: string[];
  employment?: string[];
  language?: string;
  salary?: string;
  email?: string;
  active: boolean;
  createdAt?: Date | { _seconds: number; _nanoseconds: number };
}

// Konvertiert Legacy-Format zu neuem Format
export function convertLegacyToNewFormat(legacy: LegacyJobfinderData, userId: string): JobfinderData {
  // Versuche einen sinnvollen Namen zu generieren
  let name = 'Mein Jobfinder';
  if (legacy.location) {
    name = `Jobfinder ${legacy.location}`;
  }
  
  // Konvertiere employment array zu jobType string
  let jobType: string | undefined;
  if (legacy.employment && legacy.employment.length > 0) {
    const employmentMap: Record<string, string> = {
      '1': 'Vollzeit',
      '4': 'Teilzeit',
      '6': 'Aushilfe',
      '2': 'Ausbildung',
      '5': 'Trainee / Praktikum',
      '7': 'Freiberuflich',
      '3': 'Saisonvertrag',
    };
    jobType = employmentMap[legacy.employment[0]];
  }
  
  return {
    userId,
    name,
    searchTerm: legacy.searchPhrase || undefined,
    location: legacy.location || undefined,
    radiusKm: legacy.radius ? parseInt(legacy.radius, 10) : 50,
    category: undefined, // Legacy format hat keine direkte Kategorie
    jobType,
    pushNotification: true,
    emailNotification: !!legacy.email,
    active: legacy.active,
    matchCount: 0,
    lastNotifiedAt: null,
    createdAt: legacy.createdAt || new Date(),
  };
}

// Prüft ob ein Eintrag das neue Format hat
export function isNewFormat(data: JobfinderData | LegacyJobfinderData): data is JobfinderData {
  return 'name' in data && 'pushNotification' in data;
}
