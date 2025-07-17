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
      'Reparatur',
      'WartungInstandhaltung',
      'Reparaturen im Haus',
      'Montageservice',
    ],
  },
  {
    title: 'Haushalt & Reinigung',
    subcategories: [
      'Reinigungskraft',
      'Haushaltshilfe',
      'Fensterputzer',
      'Umzugshelfer',
      'Entrümpelung',
      'Hausmeisterdienst',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung',
      'MöbelTransportieren',
      'Möbelmontage',
      'Gartenpflege',
      'Gärtner',
      'Landschaftsgärtner',
      'Baumpflege',
      'Archivierung',
      'Gartengestaltung',
      'Winterdienst',
    ],
  },
  {
    title: 'Transport & Logistik',
    subcategories: [
      'Umzug',
      'Fahrer',
      'Kurierdienst',
      'Transportdienstleistungen',
      'Lagerlogistik',
      'Frachtführer',
      'Speditionsdienstleistungen',
      'Kurierfahrer',
      'Frachtlogistik',
      'Logistik',
      'MöbelTransportieren',
      'Fahrunterricht',
      'Autowäsche',
    ],
  },
  {
    title: 'Hotel & Gastronomie',
    subcategories: ['Mietkoch', 'Mietkellner', 'Catering'],
  },
  {
    title: 'IT & Technik',
    subcategories: [
      'Webentwicklung',
      'Softwareentwicklung',
      'AppEntwicklung',
      'ITSupport',
      'Netzwerkadministration',
      'Datenbankentwicklung',
      'ITBeratung',
      'Webdesigner',
      'UXUIDesign',
      'Systemintegration',
      'CloudComputing',
      'Cybersecurity',
      'Softwareentwickler',
      'Computerkurse',
      'Datenerfassung',
      'TechnikService',
    ],
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
      'Übersetzer',
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
      'Coaching',
      'Weiterbildung',
      'Prüfungsvorbereitung',
      'Computerkurse',
      'Übersetzer',
      'Projektmanagement',
      'Qualitätskontrolle',
      'FitnessTraining',
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
    subcategories: [
      'Fotograf',
      'Videograf',
      'Grafiker',
      'Musiker',
      'Texter',
      'Graphikdesigner',
      'Dekoration',
      'DJService',
      'Schreibdienste',
    ],
  },
  {
    title: 'Event & Veranstaltung',
    subcategories: [
      'EventOrganisation',
      'Eventplanung',
      'Sicherheitsdienst',
      'DJService',
      'Musiker',
    ],
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
