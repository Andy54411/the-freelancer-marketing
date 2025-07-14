// src/lib/categories.ts

export type Category = {
  title: string;
  subcategories: string[];
};

export const categories: Category[] = [
  {
    title: 'Handwerk',
    subcategories: [
      'Tischler',
      'Klempner',
      'Maler & Lackierer',
      'Elektriker',
      'Heizungsbau & Sanitär',
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
      'Fenster- & Türenbauer',
    ],
  },
  {
    title: 'Haushalt & Reinigung',
    subcategories: [
      'Reinigungskraft',
      'Garten und Landschaftspflege',
      'Haushaltshilfe',
      'Fensterputzer',
      'Umzugshelfer',
      'Entrümpelung',
      'Hausmeisterdienste',
      'Teppichreinigung',
      'Bodenreinigung',
      'Hausreinigung',
    ],
  },
  {
    title: 'Transport & Logistik',
    subcategories: [
      'Möbelmontage',
      'Umzugshelfer',
      'Fahrer',
      'Kurierdienste',
      'Transportdienstleistungen',
      'Lagerlogistik',
      'Frachtführer',
      'Speditionsdienstleistungen',
      'Kurierfahrer',
      'Frachtlogistik',
    ],
  },
  {
    title: 'Hotel & Gastronomie',
    subcategories: ['Mietkoch', 'Mietkellner'],
  },
  {
    title: 'IT & Technik',
    subcategories: [
      'Webentwicklung',
      'Softwareentwicklung',
      'App-Entwicklung',
      'IT-Support',
      'Netzwerkadministration',
      'Datenbankentwicklung',
      'IT-Beratung',
      'Webdesign',
      'UX/UI Design',
      'Systemintegration',
      'Cloud Computing',
      'Cybersecurity',
    ],
  },
  {
    title: 'Marketing & Vertrieb',
    subcategories: ['Online Marketing', 'Social Media Marketing', 'Content Marketing'],
  },
  {
    title: 'Finanzen & Recht',
    subcategories: [
      'Buchhaltung',
      'Steuerberatung (freiberuflich)',
      'Rechtsberatung (freiberuflich)',
      'Finanzberatung',
      'Versicherungsberatung',
      'Übersetzungen (juristisch/wirtschaftlich)',
      'Lektorat (juristisch/wirtschaftlich)',
    ],
  },
  {
    title: 'Gesundheit & Wellness',
    subcategories: [
      'Physiotherapie (selbstständig)',
      'Ergotherapie (selbstständig)',
      'Heilpraktiker',
      'Coaching (Gesundheit/Wellness)',
      'Yoga-Lehrer',
      'Pilates-Lehrer',
      'Massage-Therapeut',
      'Ernährungsberatung',
    ],
  },
  {
    title: 'Bildung & Nachhilfe',
    subcategories: [
      'Nachhilfelehrer (verschiedene Fächer)',
      'Sprachlehrer',
      'Dozenten (freiberuflich)',
      'Trainer (Soft Skills etc.)',
      'Musikunterricht',
      'Kunstunterricht',
    ],
  },
  {
    title: 'Kunst & Kultur',
    subcategories: [
      'Musiker (freiberuflich)',
      'Künstler (freiberuflich)',
      'Fotografen',
      'Videografen',
      'Texter (kreativ)',
      'Lektoren (Belletristik)',
      'Übersetzer (literarisch)',
      'Grafikdesigner (künstlerisch)',
    ],
  },
  {
    title: 'Veranstaltungen & Events',
    subcategories: [
      'Eventplanung',
      'Catering (klein)',
      'DJ (freiberuflich)',
      'Fotografen (Event)',
      'Videografen (Event)',
      'Servicekräfte (Mietbasis)',
    ],
  },
  {
    title: 'Tiere & Pflanzen',
    subcategories: [
      'Tierbetreuung (Hundesitter etc.)',
      'Gartenpflege',
      'Landschaftsgärtner (klein)',
      'Hundetrainer (freiberuflich)',
    ],
  },
];
