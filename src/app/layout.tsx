// src/app/layout.tsx - Haupt-Layout

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import Chatbot from '@/components/Chatbot';
// import { FooterSection } from '@/components/FooterSection';
import GoogleAnalytics from '@/components/GoogleAnalytics';
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
              
              // Set default consent state
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
              <Providers>
                {children}
                <Footer />
                <Chatbot />
                <CookieBanner />
                <GoogleAnalytics />
                <Analytics />
                <SpeedInsights />
              </Providers>
            </AnalyticsProvider>
          </CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
