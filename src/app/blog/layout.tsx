import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Taskilo Hilfe & FAQ - Alles über die Service-Plattform | Taskilo',
  description:
    'Umfassende FAQ und Informationen zu Taskilo. Erfahren Sie alles über sichere Zahlungen, geprüfte Dienstleister, Preise und Support. Kostenlose Registrierung für Kunden und Anbieter.',
  keywords: [
    'Taskilo FAQ',
    'Taskilo Hilfe',
    'Service Plattform',
    'Dienstleister finden',
    'Handwerker buchen',
    'sichere Zahlung',
    'Stripe Connect',
    'Haushaltsservices',
    'digitale Services',
    'B2B Services',
    'Freelancer Plattform',
    'Deutschland Service',
    'Taskilo Support',
    'Online Dienstleistungen',
  ],
  authors: [{ name: 'Taskilo Team' }],
  creator: 'Taskilo',
  publisher: 'Taskilo',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://taskilo.de'),
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Taskilo Hilfe & FAQ - Umfassende Informationen zur Service-Plattform',
    description:
      'Finden Sie Antworten auf alle Fragen zu Taskilo. Von der Registrierung bis zur Abrechnung - alles erklärt. Sichere Zahlungen, geprüfte Dienstleister, transparente Preise.',
    url: 'https://taskilo.de/blog',
    siteName: 'Taskilo',
    images: [
      {
        url: 'https://taskilo.de/images/og-blog.jpg',
        width: 1200,
        height: 630,
        alt: 'Taskilo FAQ und Hilfe - Service-Plattform für Deutschland',
      },
    ],
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taskilo Hilfe & FAQ - Service-Plattform Deutschland',
    description:
      'Umfassende FAQ zu Taskilo: Zahlungen, Sicherheit, Dienstleister, Support und mehr. Alles was Sie wissen müssen.',
    creator: '@taskilo_de',
    images: ['https://taskilo.de/images/twitter-blog.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Business',
  classification: 'Service Platform',
  other: {
    'google-site-verification': 'your-google-verification-code',
    'msvalidate.01': 'your-bing-verification-code',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Structured Data for FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Wie funktioniert Taskilo?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Taskilo ist eine Plattform, die Kunden mit qualifizierten Dienstleistern verbindet. Kunden können Services buchen, Preise vergleichen und sichere Zahlungen abwickeln. Dienstleister können ihr Profil erstellen, Services anbieten und Aufträge verwalten.',
                },
              },
              {
                '@type': 'Question',
                name: 'Ist die Registrierung kostenlos?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Ja, die Registrierung ist sowohl für Kunden als auch für Dienstleister völlig kostenlos. Sie zahlen nur, wenn Sie einen Service buchen oder erfolgreich einen Auftrag abschließen.',
                },
              },
              {
                '@type': 'Question',
                name: 'Wie funktionieren die Zahlungen?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Alle Zahlungen laufen sicher über Stripe. Bei Festpreisprojekten wird das Geld treuhänderisch verwaltet und erst nach erfolgreicher Leistungserbringung freigegeben. Bei Stundenprojekten erfolgt die Abrechnung nach genehmigten Stunden.',
                },
              },
              {
                '@type': 'Question',
                name: 'Ist mein Geld sicher?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Ja, absolut. Wir verwenden ein Treuhandsystem (Escrow). Ihr Geld wird sicher verwahrt und erst nach erfolgreicher Leistungserbringung und Ihrer Freigabe an den Dienstleister übertragen.',
                },
              },
            ],
          }),
        }}
      />

      {/* Breadcrumb Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://taskilo.de',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Hilfe & FAQ',
                item: 'https://taskilo.de/blog',
              },
            ],
          }),
        }}
      />

      {/* Organization Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Taskilo',
            url: 'https://taskilo.de',
            logo: 'https://taskilo.de/images/logo.png',
            description:
              'Deutschlands moderne Service-Plattform für Dienstleistungen aller Art. Sicher, transparent und zuverlässig.',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '+49-30-1234-5678',
              contactType: 'customer service',
              email: 'support@taskilo.de',
              availableLanguage: 'German',
            },
            sameAs: [
              'https://www.facebook.com/taskilo',
              'https://www.twitter.com/taskilo_de',
              'https://www.linkedin.com/company/taskilo',
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
