'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/footer';

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Liste der Pfade, wo Footer NICHT angezeigt werden soll
  const hiddenFooterPaths = ['/login', '/register', '/admin', '/staff', '/onboarding', '/dashboard'];

  // Prüfe ob aktueller Pfad Footer verstecken soll
  const shouldHideFooter = hiddenFooterPaths.some(path => pathname?.startsWith(path));

  // Zeige Footer nur wenn er nicht versteckt werden soll
  if (shouldHideFooter) {
    return null;
  }

  return <Footer />;
}
