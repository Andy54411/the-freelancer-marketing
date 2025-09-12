// src/app/layout.tsx - Haupt-Layout

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { AlertProvider } from '@/components/ui/AlertProvider';
import Chatbot from '@/components/Chatbot';
import ConditionalFooter from '@/components/ConditionalFooter';
import ConditionalChatbot from '@/components/ConditionalChatbot';
import SmoothRedirectOverlay from '@/components/SmoothRedirectOverlay';
import { StructuredData } from '@/components/seo/StructuredData';
// import { FooterSection } from '@/components/FooterSection';
// import GoogleAnalytics from '@/components/GoogleAnalytics'; // Removed to avoid conflicts with GTM
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Footer from '@/components/footer';
import Script from 'next/script';
import CSPDebugger from '@/components/debug/CSPDebugger';
import CSPMonitor from '@/components/debug/CSPMonitor';

export const metadata: Metadata = {
  title: {
    template: '%s | Taskilo - Service-Marktplatz für B2B & B2C',
    default:
      'Taskilo - Professionelle Dienstleister finden & buchen | B2B & B2C Service-Marktplatz',
  },
  description:
    'Taskilo verbindet Kunden mit verifizierten Dienstleistern. Von Handwerkern bis Consultants - sicher buchen, flexibel zahlen, professionell abwickeln. Jetzt kostenlos registrieren!',
  keywords: [
    'Dienstleister finden',
    'Handwerker buchen',
    'B2B Services',
    'B2C Services',
    'Freelancer Plattform',
    'Service Marktplatz',
    'Taskrabbit Alternative',
    'Fiverr Deutschland',
    'Malt Alternative',
    'sichere Zahlung',
    'Stripe Connect',
    'verifizierte Anbieter',
    'Projektmanagement',
    'Zeiterfassung',
    'Rechnungsstellung',
    'Consulting Services',
    'lokale Dienstleister',
    'Deutschland Service',
    'professionelle Services',
  ],
  authors: [{ name: 'Taskilo Team' }],
  creator: 'Taskilo',
  publisher: 'Taskilo',
  category: 'Business & Professional Services',
  openGraph: {
    title: 'Taskilo - Professionelle Dienstleister finden & buchen',
    description:
      'Service-Marktplatz für B2B & B2C: Handwerker, Consultants & Freelancer sicher buchen. Verifizierte Anbieter, flexible Zahlung, professionelle Abwicklung.',
    url: 'https://taskilo.de',
    siteName: 'Taskilo',
    type: 'website',
    locale: 'de_DE',
    images: [
      {
        url: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
        width: 1200,
        height: 630,
        alt: 'Taskilo - Service-Marktplatz für professionelle Dienstleistungen',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taskilo - Professionelle Dienstleister finden & buchen',
    description:
      'Service-Marktplatz für B2B & B2C: Handwerker, Consultants & Freelancer sicher buchen.',
    images: ['https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg'],
    creator: '@taskilo_de',
    site: '@taskilo_de',
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
  alternates: {
    canonical: 'https://taskilo.de',
    languages: {
      'de-DE': 'https://taskilo.de',
      'x-default': 'https://taskilo.de',
    },
  },
  verification: {
    google: '0E8Byz81aHsAqsSa-9hmt6IHJb1irr8QfyGuo2zFp98',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Taskilo',
    startupImage: [
      {
        url: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
        media:
          '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: 'https://taskilo.de/images/Gemini_Generated_Image_pqjk64pqjk64pqjk.jpeg',
        media:
          '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  applicationName: 'Taskilo',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Taskilo',
    'application-name': 'Taskilo',
    'msapplication-TileColor': '#14ad9f',
    'theme-color': '#14ad9f',
  },
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    shrinkToFit: 'no',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Performance Optimizations - Preconnect zu kritischen Ressourcen */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://taskilo.de" />

        {/* DNS Prefetch für externe Services */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />

        {/* Google Tag Manager - Only in Production */}

        {/* Google Consent Mode V2 - Initialize before any tracking */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="google-consent-init"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}

              // Check for saved consent first
              let savedConsent = null;
              let hasAnalyticsCookies = false;

              try {
                const stored = localStorage.getItem('taskilo-cookie-consent');
                if (stored) {
                  savedConsent = JSON.parse(stored);
                }

                // Check if analytics cookies already exist (indicating previous consent)
                hasAnalyticsCookies = document.cookie.includes('_ga=') || document.cookie.includes('_ga_');
              } catch (e) {

                hasAnalyticsCookies = document.cookie.includes('_ga=') || document.cookie.includes('_ga_');
              }

              // Set consent state based on saved preferences, existing cookies, or defaults
              if (savedConsent) {
                // ALWAYS respect saved consent - never override with cookie inference
                gtag('consent', 'default', {
                  'analytics_storage': savedConsent.analytics ? 'granted' : 'denied',
                  'ad_storage': savedConsent.marketing ? 'granted' : 'denied',
                  'ad_user_data': savedConsent.marketing ? 'granted' : 'denied',
                  'ad_personalization': savedConsent.marketing ? 'granted' : 'denied',
                  'functionality_storage': savedConsent.functional ? 'granted' : 'denied',
                  'personalization_storage': savedConsent.personalization ? 'granted' : 'denied',
                  'security_storage': 'granted',
                  'wait_for_update': 500
                });

                // If user revoked analytics consent, clear existing analytics cookies
                if (!savedConsent.analytics && hasAnalyticsCookies) {

                  // Clear Google Analytics cookies
                  const cookiesToClear = ['_ga', '_ga_' + '${process.env.NEXT_PUBLIC_GA_ID}'.replace('G-', ''), '_gid', '_gat', '_gat_gtag_' + '${process.env.NEXT_PUBLIC_GA_ID}'];
                  cookiesToClear.forEach(cookieName => {
                    document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + window.location.hostname;
                    document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  });
                }
              } else if (hasAnalyticsCookies) {
                // Only infer consent from cookies if NO explicit consent decision was saved
                gtag('consent', 'default', {
                  'analytics_storage': 'granted',
                  'ad_storage': 'granted',
                  'ad_user_data': 'granted',
                  'ad_personalization': 'granted',
                  'functionality_storage': 'granted',
                  'personalization_storage': 'granted',
                  'security_storage': 'granted',
                  'wait_for_update': 500
                });

              } else {
                gtag('consent', 'default', {
                  'analytics_storage': 'denied',
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied',
                  'functionality_storage': 'denied',
                  'personalization_storage': 'denied',
                  'security_storage': 'granted',
                  'wait_for_update': 2000
                });

              }
            `,
            }}
          />
        )}

        {/* Google Tag Manager Script */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');
            `,
            }}
          />
        )}

        {/* Google Tag Manager NoScript Fallback */}
        {process.env.NODE_ENV === 'production' && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}

        {/* Strukturierte Daten für SEO */}
        <StructuredData type="Organization" />
        <StructuredData type="WebSite" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CookieConsentProvider>
            <AnalyticsProvider>
              <AlertProvider>
                <Providers>
                  {children}
                  <SmoothRedirectOverlay />
                  <ConditionalFooter />
                  <ConditionalChatbot />
                  <CookieBanner />
                  {/* GoogleAnalytics removed - GTM handles all analytics */}
                  <Analytics />
                  <SpeedInsights />
                  {/* CSP Debugger for Development */}
                  {process.env.NODE_ENV === 'development' && <CSPDebugger />}
                  {/* CSP Monitor für Production und Development */}
                  <CSPMonitor />
                </Providers>
              </AlertProvider>
            </AnalyticsProvider>
          </CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
