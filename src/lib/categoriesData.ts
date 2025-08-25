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
    title: 'Haushalt',
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
    title: 'Transport',
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
    title: 'IT & Digital',
    subcategories: [
      'Webentwicklung',
      'App-Entwicklung',
      'IT-Support',
      'Systemadministration',
      'Cybersecurity',
      'Softwareentwicklung',
      'Datenanalyse',
      'Cloud Services',
      'Netzwerktechnik',
    ],
  },
  {
    title: 'Garten',
    subcategories: [
      'Gartenpflege',
      'Landschaftsgärtner',
      'Rasenpflege',
      'Heckenschnitt',
      'Baumpflege',
      'Gartenplanung',
      'Bewässerungsanlagen',
    ],
  },
  {
    title: 'Wellness',
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
    subcategories: ['Tierbetreuung', 'Hundetrainer', 'TierarztAssistenz', 'Tierpflege'],
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

  return null;
}
