// src/app/layout.tsx - Haupt-Layout

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ThemeProvider } from '@/components/theme-provider';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import Chatbot from '@/components/Chatbot';
import FooterSection from '@/components/footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Footer from '@/components/footer';

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
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
