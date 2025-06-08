import './globals.css';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from './providers'; // Importiere deine neue Provider-Komponente

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

// "use client" ist jetzt entfernt, daher ist dieser Export wieder gültig.
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Wickle die children einfach in deine neue Providers-Komponente */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}