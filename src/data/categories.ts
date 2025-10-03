// Hauptkategorien und Subkategorien für Taskilo
export interface Category {
  id: string;
  title: string;
  subcategories: string[];
}

export const categories: Category[] = [
  {
    id: 'handwerk',
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
    id: 'haushalt',
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
    id: 'transport',
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
    id: 'it_digital',
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
      'Datenbankentwicklung',
      'IT-Beratung',
      'Webdesign',
      'UX/UI Design',
      'Systemintegration',
      'Cloud Computing',
    ],
  },
  {
    id: 'garten',
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
    id: 'wellness',
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
    id: 'gastronomie',
    title: 'Hotel & Gastronomie',
    subcategories: ['Mietkoch', 'Mietkellner', 'Catering'],
  },
  {
    id: 'marketing',
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
    id: 'finanzen',
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
    id: 'bildung',
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
    id: 'tiere',
    title: 'Tiere & Pflanzen',
    subcategories: ['Tierbetreuung', 'Hundetrainer', 'TierarztAssistenz', 'Tierpflege'],
  },
  {
    id: 'kreativ',
    title: 'Kreativ & Kunst',
    subcategories: ['Fotograf', 'Videograf', 'Grafiker', 'Musiker', 'Texter', 'Dekoration'],
  },
  {
    id: 'event',
    title: 'Event & Veranstaltung',
    subcategories: ['Eventplanung', 'Sicherheitsdienst', 'DJService', 'Musiker'],
  },
  {
    id: 'buero',
    title: 'Büro & Administration',
    subcategories: ['Telefonservice', 'Inventur', 'Recherche'],
  },
];

// Hilfsfunktion: Finde Kategorie anhand der Subkategorie
export const getCategoryBySubcategory = (subcategory: string): Category | null => {
  return categories.find(cat => cat.subcategories.includes(subcategory)) || null;
};

// Hilfsfunktion: Alle Subkategorien als Array
export const getAllSubcategories = (): string[] => {
  return categories.flatMap(cat => cat.subcategories);
};
