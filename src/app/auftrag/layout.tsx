// Layout für alle /auftrag/* Seiten
'use client';

import { RegistrationProvider } from '@/contexts/Registration-Context';
import React from 'react';
import { usePathname } from 'next/navigation';

export default function AuftragLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Prüfen ob wir uns auf einer get-started Seite befinden
  const isGetStartedPage = pathname?.includes('/auftrag/get-started');

  if (isGetStartedPage) {
    return (
      <RegistrationProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
          <div className="relative z-10">{children}</div>
        </div>
      </RegistrationProvider>
    );
  }

  // Für andere /auftrag Seiten das normale Layout
  return <RegistrationProvider>{children}</RegistrationProvider>;
}
