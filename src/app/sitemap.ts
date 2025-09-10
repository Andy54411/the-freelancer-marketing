import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://taskilo.de';

  // Statische Seiten
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/register/company`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register/user`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/agb`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  // Service-Kategorien (basierend auf categoriesData)
  const serviceCategories = [
    'handwerk',
    'haushalt',
    'transport',
    'it-digital',
    'garten',
    'wellness',
    'hotel-gastronomie',
    'marketing-vertrieb',
    'finanzen-recht',
    'bildung-unterstuetzung',
    'tiere-pflanzen',
    'kreativ-kunst',
    'event-veranstaltung',
    'buero-administration',
  ];

  const categoryPages = serviceCategories.map(category => ({
    url: `${baseUrl}/services/${category}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Blog-Seiten
  const blogPages = [
    'wann-elektriker',
    'kaeufer-schutz-garantie',
    'steuer-grundlagen',
    'umzugscheckliste',
    'renovierungsfehler',
    'verifizierungsprozess',
    'kundenkommunikation',
    'perfektes-angebot',
  ].map(slug => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...blogPages];
}
