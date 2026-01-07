/**
 * Taskilo Module & Seat Konfiguration
 * 
 * Definiert alle verfügbaren Module, Premium Add-ons und Seat-Preise
 * für das Taskilo Business Subscription-System.
 */

import { z } from 'zod';

// ============================================================================
// MODUL-DEFINITIONEN
// ============================================================================

/**
 * Basis-Module (im Taskilo Business für 29,99€/Monat enthalten)
 */
export const BASE_MODULES = {
  tasker: {
    id: 'tasker',
    name: 'Tasker',
    description: 'Aufträge, Posteingang, Bewertungen, Tasker-Level',
    sidebarKey: 'tasker',
    icon: 'ClipboardList',
  },
  calendar: {
    id: 'calendar',
    name: 'Kalender',
    description: 'Terminverwaltung und Planung',
    sidebarKey: 'calendar',
    icon: 'Calendar',
  },
  email: {
    id: 'email',
    name: 'E-Mail',
    description: 'E-Mail-Client mit Posteingang, Gesendet, Entwürfe',
    sidebarKey: 'email',
    icon: 'Send',
  },
  finance: {
    id: 'finance',
    name: 'Buchhaltung',
    description: 'GoBD-konforme Rechnungen, Angebote, E-Rechnung, DATEV',
    sidebarKey: 'finance',
    icon: 'Calculator',
  },
  partners: {
    id: 'partners',
    name: 'Geschäftspartner',
    description: 'CRM, Kunden- und Lieferantenverwaltung',
    sidebarKey: 'partners',
    icon: 'Users',
  },
  banking: {
    id: 'banking',
    name: 'Banking',
    description: 'Konten, Kassenbuch, Zahlungsabgleich',
    sidebarKey: 'banking',
    icon: 'Banknote',
  },
  inventory: {
    id: 'inventory',
    name: 'Lagerbestand',
    description: 'Inventar- und Bestandsverwaltung',
    sidebarKey: 'inventory',
    icon: 'Boxes',
  },
  personal: {
    id: 'personal',
    name: 'Personal',
    description: 'Mitarbeiter, Dienstplan, Urlaub, Zeiterfassung',
    sidebarKey: 'personal',
    icon: 'Users',
  },
  support: {
    id: 'support',
    name: 'Support',
    description: 'Hilfe und Support-Tickets',
    sidebarKey: 'support',
    icon: 'HelpCircle',
  },
  settings: {
    id: 'settings',
    name: 'Einstellungen',
    description: 'Firmeneinstellungen und Konfiguration',
    sidebarKey: 'settings',
    icon: 'Settings',
  },
} as const;

export type BaseModuleId = keyof typeof BASE_MODULES;

/**
 * Premium-Module (Zukauf-Add-ons)
 */
export const PREMIUM_MODULES = {
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Kundenkommunikation per WhatsApp, Team-Inbox, Automatisierungen',
    sidebarKey: 'whatsapp',
    icon: 'MessageCircle',
    price: {
      monthly: 14.99,
      yearly: 149.99, // ~17% Rabatt
    },
    priceNet: {
      monthly: 12.60, // 14.99 / 1.19
      yearly: 126.04,
    },
    trialDays: 7,
    features: [
      'WhatsApp Business API',
      'Team-Inbox für alle Mitarbeiter',
      'Automatische Antworten',
      'Vorlagen und Schnellantworten',
      'Nachrichtenhistorie',
      'Kundenzuordnung zu CRM',
    ],
  },
  advertising: {
    id: 'advertising',
    name: 'Taskilo Advertising',
    description: 'Google Ads, Meta Ads, LinkedIn Ads Management',
    sidebarKey: 'advertising',
    icon: 'TrendingUp',
    price: {
      monthly: 24.99,
      yearly: 249.99,
    },
    priceNet: {
      monthly: 21.00,
      yearly: 210.07,
    },
    trialDays: 7,
    features: [
      'Google Ads Integration',
      'Meta (Facebook/Instagram) Ads',
      'LinkedIn Ads',
      'Kampagnen-Dashboard',
      'Performance Analytics',
      'Automatische Optimierung',
      'Budget-Verwaltung',
    ],
  },
  recruiting: {
    id: 'recruiting',
    name: 'Recruiting',
    description: 'Stellenanzeigen, Bewerbermanagement, Karriereseite',
    sidebarKey: 'recruiting',
    icon: 'UserPlus',
    price: {
      monthly: 19.99,
      yearly: 199.99,
    },
    priceNet: {
      monthly: 16.80,
      yearly: 168.06,
    },
    trialDays: 7,
    features: [
      'Stellenanzeigen erstellen',
      'Multiposting auf Jobbörsen',
      'Bewerberdatenbank',
      'Bewerbungs-Pipeline',
      'Karriereseite (öffentlich)',
      'Automatische Benachrichtigungen',
      'Interview-Planung',
    ],
  },
  workspace: {
    id: 'workspace',
    name: 'Workspace Pro',
    description: 'Projekte, Aufgaben, Dokumente, Zeiterfassung',
    sidebarKey: 'workspace',
    icon: 'Briefcase',
    price: {
      monthly: 9.99,
      yearly: 99.99,
    },
    priceNet: {
      monthly: 8.39,
      yearly: 84.02,
    },
    trialDays: 7,
    features: [
      'Unbegrenzte Projekte',
      'Kanban-Board & Listen',
      'Gantt-Diagramme',
      'Aufgabenzuweisung',
      'Projekt-Zeiterfassung',
      'Dokumentenverwaltung',
      'Team-Zusammenarbeit',
    ],
  },
} as const;

export type PremiumModuleId = keyof typeof PREMIUM_MODULES;
export type ModuleId = BaseModuleId | PremiumModuleId;

/**
 * Rabattstaffel für mehrere Module
 * 
 * Wenn ein Unternehmen mehrere Premium-Module bucht, erhält es einen Rabatt
 * auf die Gesamtsumme der Einzelpreise.
 */
export const MODULE_DISCOUNT_TIERS = {
  1: { discountPercent: 0, label: 'Einzelmodul' },
  2: { discountPercent: 10, label: '2 Module' },
  3: { discountPercent: 20, label: '3 Module' },
  4: { discountPercent: 28, label: 'Komplett-Bundle', useFixedPrice: true },
} as const;

/**
 * Berechnet den Gesamtpreis für eine Auswahl von Modulen mit Rabatt
 */
export function calculateModulePrice(moduleIds: PremiumModuleId[], billingInterval: 'monthly' | 'yearly' = 'monthly'): {
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  pricePerModule: { id: PremiumModuleId; name: string; price: number }[];
} {
  const count = moduleIds.length;
  
  // Alle 4 Module = fester Bundle-Preis
  if (count === 4) {
    const bundlePrice = MODULE_BUNDLE.price[billingInterval];
    const originalPrice = moduleIds.reduce((sum, id) => sum + PREMIUM_MODULES[id].price[billingInterval], 0);
    return {
      originalPrice: Math.round(originalPrice * 100) / 100,
      discountPercent: 28,
      discountAmount: Math.round((originalPrice - bundlePrice) * 100) / 100,
      finalPrice: bundlePrice,
      pricePerModule: moduleIds.map(id => ({
        id,
        name: PREMIUM_MODULES[id].name,
        price: PREMIUM_MODULES[id].price[billingInterval],
      })),
    };
  }
  
  // 1-3 Module = Rabattstaffel
  const tier = MODULE_DISCOUNT_TIERS[count as 1 | 2 | 3] || MODULE_DISCOUNT_TIERS[1];
  const originalPrice = moduleIds.reduce((sum, id) => sum + PREMIUM_MODULES[id].price[billingInterval], 0);
  const discountAmount = Math.round(originalPrice * (tier.discountPercent / 100) * 100) / 100;
  const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;
  
  return {
    originalPrice: Math.round(originalPrice * 100) / 100,
    discountPercent: tier.discountPercent,
    discountAmount,
    finalPrice,
    pricePerModule: moduleIds.map(id => ({
      id,
      name: PREMIUM_MODULES[id].name,
      price: PREMIUM_MODULES[id].price[billingInterval],
    })),
  };
}

/**
 * Gibt die minimalen und maximalen Preise für eine Modul-Anzahl zurück
 */
export function getModulePriceRange(moduleCount: 1 | 2 | 3 | 4, billingInterval: 'monthly' | 'yearly' = 'monthly'): {
  minPrice: number;
  maxPrice: number;
  discountPercent: number;
} {
  if (moduleCount === 4) {
    return {
      minPrice: MODULE_BUNDLE.price[billingInterval],
      maxPrice: MODULE_BUNDLE.price[billingInterval],
      discountPercent: 28,
    };
  }
  
  // Sortiere Module nach Preis
  const sortedModules = Object.values(PREMIUM_MODULES).sort(
    (a, b) => a.price[billingInterval] - b.price[billingInterval]
  );
  
  const tier = MODULE_DISCOUNT_TIERS[moduleCount];
  const discountMultiplier = 1 - (tier.discountPercent / 100);
  
  // Günstigste Kombination
  const cheapest = sortedModules.slice(0, moduleCount);
  const minOriginal = cheapest.reduce((sum, m) => sum + m.price[billingInterval], 0);
  const minPrice = Math.round(minOriginal * discountMultiplier * 100) / 100;
  
  // Teuerste Kombination
  const expensive = sortedModules.slice(-moduleCount);
  const maxOriginal = expensive.reduce((sum, m) => sum + m.price[billingInterval], 0);
  const maxPrice = Math.round(maxOriginal * discountMultiplier * 100) / 100;
  
  return {
    minPrice,
    maxPrice,
    discountPercent: tier.discountPercent,
  };
}

/**
 * Bundle: Alle Premium-Module
 */
export const MODULE_BUNDLE = {
  id: 'all-premium',
  name: 'Alle Premium-Module',
  description: 'WhatsApp, Advertising, Recruiting und Workspace Pro im Bundle',
  price: {
    monthly: 49.99, // statt 69.96€ (28% Rabatt)
    yearly: 499.99, // statt 699.96€
  },
  priceNet: {
    monthly: 42.01,
    yearly: 420.16,
  },
  savings: {
    monthly: 19.97, // Ersparnis pro Monat
    yearly: 199.97,
  },
  trialDays: 7,
  includes: ['whatsapp', 'advertising', 'recruiting', 'workspace'] as PremiumModuleId[],
};

// ============================================================================
// SEAT-KONFIGURATION
// ============================================================================

/**
 * Nutzer-Seat Konfiguration
 */
export const SEAT_CONFIG = {
  includedInBusiness: 1, // Im Business-Abo enthalten (Inhaber)
  pricePerSeat: {
    monthly: 5.99,
    yearly: 59.99, // ~17% Rabatt
  },
  priceNetPerSeat: {
    monthly: 5.03, // 5.99 / 1.19
    yearly: 50.41,
  },
  maxSeats: 100, // Maximale Anzahl zusätzlicher Seats
  minSeats: 0,
};

// ============================================================================
// HELPER-FUNKTIONEN
// ============================================================================

/**
 * Gibt alle Module zurück (Basis + Premium)
 */
export function getAllModules() {
  return {
    ...BASE_MODULES,
    ...PREMIUM_MODULES,
  };
}

/**
 * Prüft ob ein Modul ein Basis-Modul ist
 */
export function isBaseModule(moduleId: string): moduleId is BaseModuleId {
  return moduleId in BASE_MODULES;
}

/**
 * Prüft ob ein Modul ein Premium-Modul ist
 */
export function isPremiumModule(moduleId: string): moduleId is PremiumModuleId {
  return moduleId in PREMIUM_MODULES;
}

/**
 * Gibt das Modul-Objekt zurück
 */
export function getModule(moduleId: ModuleId) {
  if (isBaseModule(moduleId)) {
    return BASE_MODULES[moduleId];
  }
  if (isPremiumModule(moduleId)) {
    return PREMIUM_MODULES[moduleId];
  }
  return null;
}

/**
 * Gibt den Preis eines Premium-Moduls zurück
 */
export function getModulePrice(
  moduleId: PremiumModuleId,
  interval: 'monthly' | 'yearly' = 'monthly',
  net = false
) {
  const module = PREMIUM_MODULES[moduleId];
  if (!module) return 0;
  return net ? module.priceNet[interval] : module.price[interval];
}

/**
 * Berechnet den Gesamtpreis für ausgewählte Module
 */
export function calculateModulesPrice(
  moduleIds: PremiumModuleId[],
  interval: 'monthly' | 'yearly' = 'monthly',
  net = false
): { total: number; useBundle: boolean; bundleSavings: number } {
  // Prüfe ob alle Bundle-Module enthalten sind
  const bundleModules = new Set(MODULE_BUNDLE.includes);
  const selectedModules = new Set(moduleIds);
  const hasAllBundleModules = MODULE_BUNDLE.includes.every(m => selectedModules.has(m));
  
  if (hasAllBundleModules && moduleIds.length === MODULE_BUNDLE.includes.length) {
    // Nutze Bundle-Preis
    const bundlePrice = net ? MODULE_BUNDLE.priceNet[interval] : MODULE_BUNDLE.price[interval];
    const individualPrice = MODULE_BUNDLE.includes.reduce(
      (sum, id) => sum + getModulePrice(id, interval, net),
      0
    );
    return {
      total: bundlePrice,
      useBundle: true,
      bundleSavings: individualPrice - bundlePrice,
    };
  }
  
  // Einzelpreise berechnen
  const total = moduleIds.reduce(
    (sum, id) => sum + getModulePrice(id, interval, net),
    0
  );
  
  return {
    total,
    useBundle: false,
    bundleSavings: 0,
  };
}

/**
 * Berechnet den Preis für zusätzliche Seats
 */
export function calculateSeatsPrice(
  additionalSeats: number,
  interval: 'monthly' | 'yearly' = 'monthly',
  net = false
): number {
  if (additionalSeats <= 0) return 0;
  const pricePerSeat = net 
    ? SEAT_CONFIG.priceNetPerSeat[interval] 
    : SEAT_CONFIG.pricePerSeat[interval];
  return Math.round(additionalSeats * pricePerSeat * 100) / 100;
}

/**
 * Berechnet den Gesamtpreis für ein Unternehmen
 */
export function calculateTotalPrice(config: {
  businessPlan: boolean;
  modules: PremiumModuleId[];
  additionalSeats: number;
  interval: 'monthly' | 'yearly';
  net?: boolean;
}): {
  businessPrice: number;
  modulesPrice: number;
  seatsPrice: number;
  total: number;
  useBundle: boolean;
  bundleSavings: number;
} {
  const net = config.net ?? false;
  
  // Business-Plan Preis
  const businessPrice = config.businessPlan
    ? (config.interval === 'monthly' 
        ? (net ? 25.20 : 29.99) 
        : (net ? 252.09 : 299.99))
    : 0;
  
  // Module
  const modulesResult = calculateModulesPrice(config.modules, config.interval, net);
  
  // Seats
  const seatsPrice = calculateSeatsPrice(config.additionalSeats, config.interval, net);
  
  return {
    businessPrice,
    modulesPrice: modulesResult.total,
    seatsPrice,
    total: Math.round((businessPrice + modulesResult.total + seatsPrice) * 100) / 100,
    useBundle: modulesResult.useBundle,
    bundleSavings: modulesResult.bundleSavings,
  };
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ModuleIdSchema = z.enum([
  'tasker', 'calendar', 'email', 'finance', 'partners', 
  'banking', 'inventory', 'personal', 'support', 'settings',
  'whatsapp', 'advertising', 'recruiting', 'workspace',
]);

export const PremiumModuleIdSchema = z.enum([
  'whatsapp', 'advertising', 'recruiting', 'workspace',
]);

export const CompanyModulesSchema = z.object({
  // Basis-Module (immer true bei Business)
  tasker: z.boolean().default(true),
  calendar: z.boolean().default(true),
  email: z.boolean().default(true),
  finance: z.boolean().default(true),
  partners: z.boolean().default(true),
  banking: z.boolean().default(true),
  inventory: z.boolean().default(true),
  personal: z.boolean().default(true),
  support: z.boolean().default(true),
  settings: z.boolean().default(true),
  
  // Premium-Module (Zukauf)
  whatsapp: z.boolean().default(false),
  advertising: z.boolean().default(false),
  recruiting: z.boolean().default(false),
  workspace: z.boolean().default(false),
});

export type CompanyModules = z.infer<typeof CompanyModulesSchema>;

export const CompanySeatsSchema = z.object({
  included: z.number().default(1),
  additional: z.number().default(0),
  used: z.number().default(1),
  pricePerSeat: z.number().default(SEAT_CONFIG.pricePerSeat.monthly),
});

export type CompanySeats = z.infer<typeof CompanySeatsSchema>;

// ============================================================================
// DEFAULT-WERTE
// ============================================================================

/**
 * Standard-Module für neues Business-Abo
 */
export const DEFAULT_COMPANY_MODULES: CompanyModules = {
  // Basis-Module (im Business enthalten)
  tasker: true,
  calendar: true,
  email: true,
  finance: true,
  partners: true,
  banking: true,
  inventory: true,
  personal: true,
  support: true,
  settings: true,
  
  // Premium-Module (nicht freigeschaltet)
  whatsapp: false,
  advertising: false,
  recruiting: false,
  workspace: false,
};

/**
 * Standard-Seats für neues Business-Abo
 */
export const DEFAULT_COMPANY_SEATS: CompanySeats = {
  included: SEAT_CONFIG.includedInBusiness,
  additional: 0,
  used: 1, // Inhaber
  pricePerSeat: SEAT_CONFIG.pricePerSeat.monthly,
};

/**
 * Modul-zu-Sidebar-Key Mapping für CompanySidebar
 */
export const MODULE_SIDEBAR_MAPPING: Record<ModuleId, string> = {
  tasker: 'tasker',
  calendar: 'calendar',
  email: 'email',
  finance: 'finance',
  partners: 'partners',
  banking: 'banking',
  inventory: 'inventory',
  personal: 'personal',
  support: 'support',
  settings: 'settings',
  whatsapp: 'whatsapp',
  advertising: 'advertising',
  recruiting: 'recruiting',
  workspace: 'workspace',
};
