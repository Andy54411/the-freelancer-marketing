import { Metadata } from 'next';

interface StructuredDataProps {
  type?: 'Organization' | 'WebSite' | 'Service' | 'LocalBusiness';
  data?: Record<string, any>;
}

export function generateStructuredData({
  type = 'Organization',
  data = {},
}: StructuredDataProps = {}) {
  const baseData = {
    '@context': 'https://schema.org',
  };

  switch (type) {
    case 'Organization':
      return {
        ...baseData,
        '@type': 'Organization',
        name: 'Taskilo',
        alternateName: 'The Freelancer Marketing Ltd.',
        legalName: 'The Freelancer Marketing Ltd.',
        url: 'https://taskilo.de',
        logo: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
        description:
          'Deutschlands führender Service-Marktplatz für professionelle Dienstleistungen. B2B und B2C Services sicher buchen.',
        foundingDate: '2024',
        industry: 'Service Marketplace',
        vatID: 'CY60058879W',
        taxID: 'CY60058879W',
        duns: 'HE 458650',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2',
          addressLocality: 'Paphos',
          postalCode: '8015',
          addressRegion: 'Paphos',
          addressCountry: 'CY',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: 'support@taskilo.de',
            url: 'https://taskilo.de/contact',
            availableLanguage: 'German',
          },
          {
            '@type': 'ContactPoint',
            contactType: 'sales',
            email: 'info@taskilo.de',
            availableLanguage: 'German',
          },
          {
            '@type': 'ContactPoint',
            contactType: 'legal',
            email: 'legal@taskilo.de',
            availableLanguage: 'German',
          },
        ],
        founder: [
          {
            '@type': 'Person',
            name: 'Andy Staudinger',
            jobTitle: 'Geschäftsführung',
          },
          {
            '@type': 'Person',
            name: 'Elisabeth Schröder',
          },
        ],
        brand: {
          '@type': 'Brand',
          name: 'Taskilo',
          logo: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
          trademark: 'DE 3020252302804',
        },
        sameAs: [
          'https://www.linkedin.com/company/taskilo',
          'https://twitter.com/taskilo_de',
          'https://www.facebook.com/taskilo',
        ],
        ...data,
      };

    case 'WebSite':
      return {
        ...baseData,
        '@type': 'WebSite',
        name: 'Taskilo',
        alternateName: 'Taskilo Service-Marktplatz',
        url: 'https://taskilo.de',
        description: 'Service-Marktplatz für professionelle Dienstleistungen in Deutschland',
        publisher: {
          '@type': 'Organization',
          name: 'Taskilo',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://taskilo.de/services?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'de-DE',
        ...data,
      };

    case 'Service':
      return {
        ...baseData,
        '@type': 'Service',
        serviceType: 'Professional Services Marketplace',
        provider: {
          '@type': 'Organization',
          name: 'Taskilo',
          url: 'https://taskilo.de',
        },
        areaServed: {
          '@type': 'Country',
          name: 'Germany',
        },
        audience: {
          '@type': 'Audience',
          audienceType: 'Businesses and Consumers',
        },
        category: [
          'Handwerk',
          'IT Services',
          'Consulting',
          'Haushaltsservices',
          'Marketing',
          'Transport',
        ],
        ...data,
      };

    case 'LocalBusiness':
      return {
        ...baseData,
        '@type': 'LocalBusiness',
        name: 'Taskilo',
        alternateName: 'The Freelancer Marketing Ltd.',
        image: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
        description: 'Service-Marktplatz für professionelle Dienstleistungen',
        url: 'https://taskilo.de',
        email: 'info@taskilo.de',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2',
          addressLocality: 'Paphos',
          postalCode: '8015',
          addressRegion: 'Paphos',
          addressCountry: 'CY',
        },
        openingHours: 'Mo-Fr 09:00-18:00',
        priceRange: '€€',
        paymentAccepted: ['Credit Card', 'SEPA', 'PayPal', 'Revolut'],
        currenciesAccepted: 'EUR',
        ...data,
      };

    default:
      return baseData;
  }
}

// React Component für strukturierte Daten
export function StructuredData({ type, data }: StructuredDataProps) {
  const structuredData = generateStructuredData({ type, data });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}
