import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alle Services & Dienstleistungen - Handwerker bis Consultants | Taskilo',
  description:
    'Entdecken Sie über 100 professionelle Dienstleistungen auf Taskilo: Handwerk, IT, Marketing, Haushalt, Garten und mehr. Qualifizierte Anbieter in Ihrer Nähe finden.',
  keywords: [
    'Services',
    'Dienstleistungen',
    'Handwerker Services',
    'IT Services',
    'Marketing Services',
    'Haushaltsservices',
    'Garten Services',
    'Transport Services',
    'Consulting Services',
    'Freelancer Services',
    'B2B Dienstleistungen',
    'B2C Services',
    'professionelle Services',
    'Service Kategorien',
    'Taskilo Services',
  ],
  openGraph: {
    title: 'Alle Services & Dienstleistungen - Von Handwerk bis Consulting',
    description:
      'Über 100 professionelle Services auf Taskilo: Handwerker, IT-Experten, Consultants und mehr. Qualifizierte Anbieter sicher buchen.',
    url: 'https://taskilo.de/services',
    type: 'website',
    images: [
      {
        url: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
        width: 1200,
        height: 630,
        alt: 'Taskilo Services - Professionelle Dienstleistungen',
      },
    ],
  },
  alternates: {
    canonical: 'https://taskilo.de/services',
  },
  robots: {
    index: true,
    follow: true,
  },
};
