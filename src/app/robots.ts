import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/services',
          '/providers',
          '/about',
          '/contact',
          '/impressum',
          '/datenschutz',
          '/agb',
          '/terms',
          '/blog',
          '/features',
          '/register',
          '/login',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
          '/admin/',
          '/tmp/',
          '/test/',
          '/_next/',
          '/firebase/',
          '/*.json',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/'],
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'AhrefsBot',
        disallow: ['/'],
      },
      {
        userAgent: 'MJ12bot',
        disallow: ['/'],
      },
      {
        userAgent: 'SemrushBot',
        disallow: ['/'],
      },
    ],
    sitemap: 'https://taskilo.de/sitemap.xml',
  };
}
