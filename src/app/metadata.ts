import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Taskilo - Professionelle Dienstleister finden & buchen | Service-Marktplatz Deutschland',
  description:
    'Deutschlands führender Service-Marktplatz: Handwerker, IT-Experten, Consultants & mehr sicher buchen. Verifizierte Anbieter, flexible Zahlung, 100% Käuferschutz.',
  keywords: [
    'Dienstleister finden Deutschland',
    'Handwerker buchen',
    'Service Marktplatz',
    'B2B Services Deutschland',
    'Freelancer Plattform',
    'sichere Zahlung Stripe',
    'verifizierte Dienstleister',
    'Projektmanagement Tool',
    'Taskrabbit Alternative',
    'Fiverr Deutschland',
    'professionelle Services',
    'lokale Dienstleister',
    'Consulting Services',
    'IT Services Deutschland',
    'Handwerker Vermittlung',
  ],
  openGraph: {
    title: 'Taskilo - Deutschlands Service-Marktplatz für professionelle Dienstleistungen',
    description:
      'Handwerker, IT-Experten, Consultants & mehr sicher buchen. Verifizierte Anbieter, flexible Zahlung, 100% Käuferschutz.',
    url: 'https://taskilo.de',
    type: 'website',
    locale: 'de_DE',
    images: [
      {
        url: 'https://taskilo.de/images/og-homepage-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Taskilo - Service-Marktplatz für professionelle Dienstleistungen',
      },
    ],
  },
  alternates: {
    canonical: 'https://taskilo.de',
  },
};
