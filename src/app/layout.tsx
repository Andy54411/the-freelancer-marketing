// src/app/layout.tsx - Haupt-Layout

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import { AlertProvider } from '@/components/ui/AlertProvider';
import Chatbot from '@/components/Chatbot';
// import { FooterSection } from '@/components/FooterSection';
// import GoogleAnalytics from '@/components/GoogleAnalytics'; // Removed to avoid conflicts with GTM
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Footer from '@/components/footer';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'TASKILO',
  description:
    'TASKILO bringt Kunden und Dienstleister wie Handwerker & Mietköche schnell und zuverlässig über App & Web zusammen – einfach buchen & starten!',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TASKILO',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
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
        {/* Google Tag Manager */}
        {/* Google Consent Mode V2 - Initialize before any tracking */}
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
                console.log('No saved consent found, checking for existing cookies');
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
                console.log('🚀 GTM initialized with saved consent:', savedConsent);
                
                // If user revoked analytics consent, clear existing analytics cookies
                if (!savedConsent.analytics && hasAnalyticsCookies) {
                  console.log('⚠️ CLEARING ANALYTICS COOKIES - User revoked consent');
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
                console.log('🚀 GTM initialized with inferred consent from existing cookies');
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
                console.log('🚀 GTM initialized with default denied consent');
              }
            `,
          }}
        />

        {/* Google Tag Manager Script */}
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

        {/* Google Tag Manager NoScript Fallback */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CookieConsentProvider>
            <AnalyticsProvider>
              <AlertProvider>
                <Providers>
                  {children}
                  <Footer />
                  <Chatbot />
                  <CookieBanner />
                  {/* GoogleAnalytics removed - GTM handles all analytics */}
                  <Analytics />
                  <SpeedInsights />
                </Providers>
              </AlertProvider>
            </AnalyticsProvider>
          </CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
