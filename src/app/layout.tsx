// src/app/layout.tsx - Haupt-Layout

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from '@/contexts/LanguageContext';
import Chatbot from '@/components/Chatbot';
import FooterSection from '@/components/footer';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'TASKILO',
  description:
    'TASKILO bringt Kunden und Dienstleister wie Handwerker & Mietköche schnell und zuverlässig über App & Web zusammen – einfach buchen & starten!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <LanguageProvider>
            <Providers>
              {children}
              <FooterSection />
              <Chatbot />
              <Analytics />
              <SpeedInsights />
            </Providers>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}