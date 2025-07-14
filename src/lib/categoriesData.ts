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
  // ... (füge hier die restlichen Kategorien aus deiner Liste ein)
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
