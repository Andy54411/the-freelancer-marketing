/**
 * Helper functions for category-specific features
 */

// Kategorien die Revisionen benötigen (Design/Entwicklung/Content-basiert)
const CATEGORIES_WITH_REVISIONS = [
  // IT & Digital - benötigen definitiv Revisionen
  'Webentwicklung',
  'App-Entwicklung',
  'Softwareentwicklung',

  // Kreativ & Kunst - benötigen Revisionen für Design-Arbeit
  'Fotograf',
  'Videograf',
  'Grafiker',
  'Texter',
  'Dekoration',

  // Marketing & Vertrieb - Content braucht oft Revisionen
  'OnlineMarketing',
  'Social Media Marketing',
  'ContentMarketing',
  'Marketingberater',

  // Event & Veranstaltung - Planung braucht oft Anpassungen
  'Eventplanung',
  'DJService',

  // Büro & Administration - Content-basierte Arbeit
  'Recherche',
];

/**
 * Prüft ob eine Kategorie Revisionen benötigt
 */
export function categoryNeedsRevisions(subcategory: string): boolean {
  if (!subcategory) return false;

  return CATEGORIES_WITH_REVISIONS.some(cat =>
    subcategory.toLowerCase().includes(cat.toLowerCase())
  );
}

/**
 * Gibt die Standard-Anzahl von Revisionen für verschiedene Paket-Typen zurück
 */
export function getDefaultRevisions(packageType: 'basic' | 'standard' | 'premium'): number {
  const defaultRevisions = {
    basic: 1,
    standard: 2,
    premium: 3,
  };

  return defaultRevisions[packageType];
}

/**
 * Liste aller Kategorien die Revisionen benötigen (für Dokumentation)
 */
export function getCategoriesWithRevisions(): string[] {
  return [...CATEGORIES_WITH_REVISIONS];
}
