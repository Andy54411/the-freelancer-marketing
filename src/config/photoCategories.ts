/**
 * TASKILO PHOTO KATEGORIEN KONFIGURATION
 * ========================================
 * 
 * Zentrale Konfiguration für alle Foto-Kategorien.
 * MUSS mit taskilo-ki/src/ml/photo_classifier.py (PhotoCategory Enum) synchron sein!
 * 
 * Bei Änderungen hier AUCH in der KI aktualisieren:
 * 1. taskilo-ki/src/ml/photo_classifier.py - PhotoCategory Enum
 * 2. taskilo-ki/src/ml/photo_classifier.py - CATEGORY_DISPLAY_NAMES
 */

export interface PhotoCategoryConfig {
  key: string;           // Technischer Schlüssel (wie in DB gespeichert)
  display: string;       // Deutsche Anzeige
  group: CategoryGroup;  // Gruppierung für UI
  icon?: string;         // Optional: Lucide Icon Name
  aliases?: string[];    // Alternative Bezeichnungen für Suche
}

export type CategoryGroup = 
  | 'orte'      // Strand, Berge, Stadt, etc.
  | 'ereignisse' // Geburtstag, Hochzeit, etc.
  | 'objekte'   // Essen, Tiere, Autos, etc.
  | 'personen'  // Selfies, Gruppenfotos, etc.
  | 'spezial';  // Screenshots, Dokumente, etc.

/**
 * Alle verfügbaren Foto-Kategorien
 * Sortiert nach Gruppen für bessere Übersicht
 */
export const PHOTO_CATEGORIES: PhotoCategoryConfig[] = [
  // ========== ORTE/SZENEN ==========
  { key: 'strand', display: 'Strand & Meer', group: 'orte', icon: 'Umbrella', aliases: ['beach', 'meer', 'ozean', 'see'] },
  { key: 'berge', display: 'Berge', group: 'orte', icon: 'Mountain', aliases: ['mountain', 'alpen', 'gipfel'] },
  { key: 'wald', display: 'Wald & Natur', group: 'orte', icon: 'TreePine', aliases: ['forest', 'bäume', 'grün'] },
  { key: 'stadt', display: 'Stadt', group: 'orte', icon: 'Building2', aliases: ['city', 'urban', 'downtown'] },
  { key: 'zuhause', display: 'Zuhause', group: 'orte', icon: 'Home', aliases: ['home', 'wohnung', 'haus'] },
  { key: 'buero', display: 'Büro & Arbeit', group: 'orte', icon: 'Briefcase', aliases: ['office', 'work', 'arbeitsplatz'] },
  { key: 'restaurant', display: 'Restaurant & Café', group: 'orte', icon: 'UtensilsCrossed', aliases: ['cafe', 'bar', 'gastronomie'] },
  
  // ========== EREIGNISSE ==========
  { key: 'geburtstag', display: 'Geburtstage', group: 'ereignisse', icon: 'Cake', aliases: ['birthday', 'party', 'feier'] },
  { key: 'hochzeit', display: 'Hochzeiten', group: 'ereignisse', icon: 'Heart', aliases: ['wedding', 'heirat', 'braut'] },
  { key: 'weihnachten', display: 'Weihnachten', group: 'ereignisse', icon: 'Gift', aliases: ['christmas', 'xmas', 'heiligabend'] },
  { key: 'konzert', display: 'Konzerte & Events', group: 'ereignisse', icon: 'Music', aliases: ['concert', 'festival', 'show'] },
  { key: 'sport', display: 'Sport', group: 'ereignisse', icon: 'Trophy', aliases: ['fitness', 'training', 'spiel'] },
  { key: 'reise', display: 'Reisen', group: 'ereignisse', icon: 'Plane', aliases: ['travel', 'urlaub', 'vacation'] },
  
  // ========== OBJEKTE ==========
  { key: 'essen', display: 'Essen & Trinken', group: 'objekte', icon: 'UtensilsCrossed', aliases: ['food', 'meal', 'gericht'] },
  { key: 'tier', display: 'Tiere', group: 'objekte', icon: 'PawPrint', aliases: ['animal', 'pet', 'haustier'] },
  { key: 'hund', display: 'Hunde', group: 'objekte', icon: 'Dog', aliases: ['dog', 'welpe', 'puppy'] },
  { key: 'katze', display: 'Katzen', group: 'objekte', icon: 'Cat', aliases: ['cat', 'kitten', 'kätzchen'] },
  { key: 'auto', display: 'Autos & Fahrzeuge', group: 'objekte', icon: 'Car', aliases: ['car', 'vehicle', 'fahrzeug'] },
  { key: 'dokument', display: 'Dokumente', group: 'objekte', icon: 'FileText', aliases: ['document', 'papier', 'datei'] },
  
  // ========== PERSONEN ==========
  { key: 'selfie', display: 'Selfies', group: 'personen', icon: 'Camera', aliases: ['selbstportrait', 'ich'] },
  { key: 'gruppenfoto', display: 'Gruppenfotos', group: 'personen', icon: 'Users', aliases: ['group', 'team', 'freunde'] },
  { key: 'portrait', display: 'Portraits', group: 'personen', icon: 'User', aliases: ['porträt', 'gesicht', 'person'] },
  
  // ========== SPEZIAL ==========
  { key: 'screenshot', display: 'Screenshots', group: 'spezial', icon: 'Monitor', aliases: ['bildschirmfoto', 'screen'] },
  { key: 'kunst', display: 'Kunst', group: 'spezial', icon: 'Palette', aliases: ['art', 'gemälde', 'zeichnung'] },
  { key: 'natur', display: 'Natur', group: 'spezial', icon: 'Leaf', aliases: ['nature', 'landschaft', 'outdoor'] },
  { key: 'sonnenuntergang', display: 'Sonnenuntergänge', group: 'spezial', icon: 'Sunset', aliases: ['sunset', 'sunrise', 'himmel'] },
];

/**
 * Kategorie-Gruppen mit deutschen Labels
 */
export const CATEGORY_GROUPS: Record<CategoryGroup, string> = {
  orte: 'Orte & Szenen',
  ereignisse: 'Ereignisse',
  objekte: 'Objekte',
  personen: 'Personen',
  spezial: 'Spezial',
};

/**
 * Hilfsfunktionen
 */

/** Alle Kategorien als einfaches Array für Dropdowns */
export function getCategoryOptions(): Array<{ key: string; display: string }> {
  return PHOTO_CATEGORIES.map(c => ({ key: c.key, display: c.display }));
}

/** Kategorien nach Gruppe gruppiert */
export function getCategoriesByGroup(): Record<CategoryGroup, PhotoCategoryConfig[]> {
  return PHOTO_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) {
      acc[cat.group] = [];
    }
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<CategoryGroup, PhotoCategoryConfig[]>);
}

/** Kategorie-Anzeigename für Schlüssel */
export function getCategoryDisplayName(key: string): string {
  const cat = PHOTO_CATEGORIES.find(c => c.key === key);
  return cat?.display ?? key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/** Kategorie-Schlüssel für Anzeigename */
export function getCategoryKey(display: string): string | undefined {
  const cat = PHOTO_CATEGORIES.find(
    c => c.display.toLowerCase() === display.toLowerCase() ||
         c.aliases?.some(a => a.toLowerCase() === display.toLowerCase())
  );
  return cat?.key;
}

/** Prüft ob Kategorie gültig ist */
export function isValidCategory(key: string): boolean {
  return PHOTO_CATEGORIES.some(c => c.key === key);
}

/** Findet ähnliche Kategorien basierend auf Alias-Suche */
export function findCategoryByAlias(searchTerm: string): PhotoCategoryConfig | undefined {
  const term = searchTerm.toLowerCase();
  return PHOTO_CATEGORIES.find(
    c => c.key === term ||
         c.display.toLowerCase().includes(term) ||
         c.aliases?.some(a => a.includes(term))
  );
}
