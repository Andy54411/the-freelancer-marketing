// Tag-zu-Service Mapping für intelligente Navigation
// Jeder Service-Tag führt zu einer spezifischen Unterkategorie mit Filtern

export interface ServiceTagMapping {
  category: string;
  subcategory: string;
  filters?: string[];
  searchTerms?: string;
  description?: string;
}

export const SERVICE_TAG_MAPPING: Record<string, ServiceTagMapping> = {
  // ===== MÖBELMONTAGE =====
  'IKEA Möbel aufbauen': {
    category: 'Handwerk',
    subcategory: 'Montageservice',
    filters: ['ikea', 'möbel', 'aufbau', 'montage'],
    searchTerms: 'IKEA Möbel Montage Aufbau',
    description: 'Professioneller IKEA Möbel-Aufbau',
  },
  Küchenmontage: {
    category: 'Handwerk',
    subcategory: 'Montageservice',
    filters: ['küche', 'montage', 'einbau', 'küchenzeile'],
    searchTerms: 'Küche Montage Einbau Küchenzeile',
    description: 'Komplette Küchenmontage und -einbau',
  },

  // ===== MIETKÖCHE =====
  Hochzeitsköche: {
    category: 'Hotel & Gastronomie',
    subcategory: 'Mietkoch',
    filters: ['hochzeit', 'event', 'catering', 'feier'],
    searchTerms: 'Hochzeit Koch Catering Event',
    description: 'Professionelle Köche für Hochzeiten und Events',
  },
  'Privat-Dinner': {
    category: 'Hotel & Gastronomie',
    subcategory: 'Mietkoch',
    filters: ['privat', 'dinner', 'zuhause', 'gourmet'],
    searchTerms: 'Privat Dinner Koch Zuhause',
    description: 'Private Köche für exklusive Dinner',
  },

  // ===== ELEKTRIKARBEITEN =====
  'Lampen installieren': {
    category: 'Handwerk',
    subcategory: 'Elektriker',
    filters: ['lampe', 'beleuchtung', 'installation', 'licht'],
    searchTerms: 'Lampe Installation Elektriker Beleuchtung',
    description: 'Professionelle Lampen- und Lichtinstallation',
  },
  'Steckdosen erneuern': {
    category: 'Handwerk',
    subcategory: 'Elektriker',
    filters: ['steckdose', 'elektrik', 'renovierung', 'austausch'],
    searchTerms: 'Steckdose Elektrik Renovierung',
    description: 'Steckdosen-Austausch und Elektrorenovierung',
  },

  // ===== REPARATUREN =====
  'Wasserhahn reparieren': {
    category: 'Handwerk',
    subcategory: 'Klempner',
    filters: ['wasserhahn', 'sanitär', 'reparatur', 'bad'],
    searchTerms: 'Wasserhahn Klempner Sanitär Reparatur',
    description: 'Wasserhahn-Reparaturen und Sanitärarbeiten',
  },
  'Wände streichen': {
    category: 'Handwerk',
    subcategory: 'Maler & Lackierer',
    filters: ['streichen', 'farbe', 'renovierung', 'wand'],
    searchTerms: 'Wände streichen Maler Renovierung',
    description: 'Professionelle Malerarbeiten und Wandgestaltung',
  },

  // ===== UMZUG =====
  Wohnungsumzug: {
    category: 'Transport',
    subcategory: 'Umzugshelfer',
    filters: ['umzug', 'wohnung', 'transport', 'möbel'],
    searchTerms: 'Wohnung Umzug Transport Möbel',
    description: 'Komplette Wohnungsumzüge mit Profis',
  },
  'Möbel transportieren': {
    category: 'Transport',
    subcategory: 'Umzugshelfer',
    filters: ['möbel', 'transport', 'lieferung', 'sperrig'],
    searchTerms: 'Möbel Transport Lieferung',
    description: 'Sicherer Möbeltransport und Lieferservice',
  },

  // ===== BELIEBTE SERVICES =====
  Reinigungsservice: {
    category: 'Haushalt',
    subcategory: 'Reinigungskraft',
    filters: ['reinigung', 'putzen', 'haushalt', 'sauber'],
    searchTerms: 'Reinigung Putzen Haushalt',
    description: 'Professionelle Reinigungsdienste',
  },
  Gartenarbeiten: {
    category: 'Garten',
    subcategory: 'Gartenpflege',
    filters: ['garten', 'pflege', 'landschaft', 'rasen'],
    searchTerms: 'Garten Pflege Landschaft Rasen',
    description: 'Gartenpflege und Landschaftsarbeiten',
  },
};

// Helper-Funktion für URL-Generierung
export const generateServiceUrl = (mapping: ServiceTagMapping): string => {
  const { category, subcategory, filters, searchTerms } = mapping;

  // URL-Safe Konvertierung
  const categorySlug = category
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'und')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');

  const subcategorySlug = subcategory
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'und')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');

  // Base URL
  let url = `/services/${categorySlug}/${subcategorySlug}`;

  // Query Parameter hinzufügen
  const params = new URLSearchParams();

  if (searchTerms) {
    params.set('search', searchTerms);
  }

  if (filters && filters.length > 0) {
    params.set('filters', filters.join(','));
  }

  // Tag-basierte Navigation markieren
  params.set('from', 'tag');

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  return url;
};

// Helper für Tag-Lookup
export const getTagMapping = (tag: string): ServiceTagMapping | null => {
  return SERVICE_TAG_MAPPING[tag] || null;
};

// Alle verfügbaren Tags
export const getAllServiceTags = (): string[] => {
  return Object.keys(SERVICE_TAG_MAPPING);
};

// Tags nach Kategorie gruppiert
export const getTagsByCategory = (): Record<string, string[]> => {
  const result: Record<string, string[]> = {};

  Object.entries(SERVICE_TAG_MAPPING).forEach(([tag, mapping]) => {
    const category = mapping.category;
    if (!result[category]) {
      result[category] = [];
    }
    result[category].push(tag);
  });

  return result;
};
