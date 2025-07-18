// /Users/andystaudinger/Taskilo/src/lib/categoriesData.ts

export interface Category {
  title: string;
  subcategories: string[];
}

export const categories: Category[] = [
  {
    title: 'Handwerk',
    subcategories: [
      'Tischler',
      'Klempner',
      'Maler & Lackierer',
      'Elektriker',
      'HeizungSanitär',
      'Fliesenleger',
      'Dachdecker',
      'Maurer',
      'Trockenbauer',
      'Schreiner',
      'Zimmerer',
      'Bodenleger',
      'Glaser',
      'Schlosser',
      'Metallbauer',
      'FensterTürenbau',
      'Heizung',
      'Autoreparatur',
      'Montageservice',
      'Umzugshelfer',
    ],
  },
  {
    title: 'Haushalt & Reinigung',
    subcategories: [
      'Reinigungskraft',
      'Haushaltshilfe',
      'Fensterputzer',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung',
    ],
  },
  {
    title: 'Transport & Logistik',
    subcategories: [
      'Fahrer',
      'Kurierdienst',
      'Transportdienstleistungen',
      'Lagerlogistik',
      'Logistik',
      'MöbelTransportieren',
    ],
  },
  {
    title: 'Hotel & Gastronomie',
    subcategories: ['Mietkoch', 'Mietkellner', 'Catering'],
  },
  {
    title: 'Marketing & Vertrieb',
    subcategories: [
      'OnlineMarketing',
      'Social Media Marketing',
      'ContentMarketing',
      'Marketingberater',
      'Marktforschung',
    ],
  },
  {
    title: 'Finanzen & Recht',
    subcategories: [
      'Buchhaltung',
      'Steuerberatung',
      'Rechtsberatung',
      'Finanzberatung',
      'Versicherungsberatung',
      'Rechnungswesen',
      'Unternehmensberatung',
      'Verwaltung',
    ],
  },
  {
    title: 'Bildung & Unterstützung',
    subcategories: [
      'Nachhilfe',
      'Nachhilfelehrer',
      'Sprachunterricht',
      'Musikunterricht',
      'Übersetzer',
      'Kinderbetreuung',
    ],
  },
  {
    title: 'Tiere & Pflanzen',
    subcategories: [
      'Tierbetreuung',
      'Gartenpflege',
      'Landschaftsgärtner',
      'Hundetrainer',
      'TierarztAssistenz',
      'Tierpflege',
    ],
  },
  {
    title: 'Gesundheit & Wellness',
    subcategories: [
      'Massage',
      'Physiotherapie',
      'Ernährungsberatung',
      'Kosmetik',
      'Friseur',
      'FitnessTraining',
      'Seniorenbetreuung',
    ],
  },
  {
    title: 'Kreativ & Kunst',
    subcategories: ['Fotograf', 'Videograf', 'Grafiker', 'Musiker', 'Texter', 'Dekoration'],
  },
  {
    title: 'Event & Veranstaltung',
    subcategories: ['Eventplanung', 'Sicherheitsdienst', 'DJService', 'Musiker'],
  },
  {
    title: 'Büro & Administration',
    subcategories: ['Telefonservice', 'Inventur', 'Recherche'],
  },
];

export function findCategoryBySubcategory(subcategoryName: string): string | null {
  if (!subcategoryName) return null;
  for (const category of categories) {
    if (category.subcategories.some(sub => sub.toLowerCase() === subcategoryName.toLowerCase())) {
      return category.title;
    }
  }
  console.warn(`[categoriesData] No main category found for subcategory: ${subcategoryName}`);
  return null;
}
