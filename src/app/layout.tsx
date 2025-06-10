// src/app/layout.tsx - MINIMALE TESTVERSION

import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tasko - Test",
  description: "Test-Deployment ohne Provider",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        {/* Der Provider-Wrapper wird für den Test entfernt */}
        {children}
      </body>
    </html>
  );
}