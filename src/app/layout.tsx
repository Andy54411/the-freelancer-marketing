// src/app/layout.tsx - Temporär zum Testen

import './globals.css';
import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from 'next/font/google'; // AUSKOMMENTIERT
import { Providers } from './providers';
import { ThemeProvider } from "@/components/theme-provider"; // Korrekter Import für ThemeProvider
import Chatbot from '@/components/Chatbot'; // Importiere den neuen Chatbot
import FooterSection from '@/components/footer'; // Importiere die Footer-Komponente

/*
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});
*/

export const metadata: Metadata = {
  title: 'TASKO',
  description:
    'TASKO bringt Kunden und Dienstleister wie Handwerker & Mietköche schnell und zuverlässig über App & Web zusammen – einfach buchen & starten!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      {/* Temporär ohne die Font-Klassen */}
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Providers>
            {children}
            <FooterSection />
            <Chatbot /> {/* Füge den Chatbot hier hinzu, damit er auf allen Seiten verfügbar ist */}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}