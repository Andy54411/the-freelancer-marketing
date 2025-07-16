import { Inter } from 'next/font/google';
import { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Tasko',
    default: 'Tasko - Professionelle Dienstleistungen finden',
  },
  description:
    'Finden Sie qualifizierte Dienstleister in Ihrer Nähe. Vergleichen Sie Preise, Bewertungen und buchen Sie direkt.',
  keywords: ['Dienstleister', 'Handwerker', 'Reparatur', 'Service', 'Buchung'],
  authors: [{ name: 'Tasko Team' }],
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://taskilo.de',
    siteName: 'Tasko',
    title: 'Tasko - Professionelle Dienstleistungen finden',
    description:
      'Finden Sie qualifizierte Dienstleister in Ihrer Nähe. Vergleichen Sie Preise, Bewertungen und buchen Sie direkt.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tasko - Professionelle Dienstleistungen finden',
    description:
      'Finden Sie qualifizierte Dienstleister in Ihrer Nähe. Vergleichen Sie Preise, Bewertungen und buchen Sie direkt.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification-code',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.className}>
      <head>
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://storage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#14ad9f" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
