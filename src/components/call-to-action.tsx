'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CallToAction() {
  return (
    <section className="py-12 sm:py-16 md:py-32 bg-transparent">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold lg:text-5xl drop-shadow-lg">
            Bereit für den nächsten Schritt?
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-teal-100 drop-shadow-md">
            Registrieren Sie sich jetzt und entdecken Sie alle Vorteile von Taskilo
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-6 sm:px-8 py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/register/user">Als Kunde registrieren</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-[#14ad9f] text-[#14ad9f] bg-white hover:bg-[#14ad9f] hover:text-white font-semibold px-6 sm:px-8 py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/register/company">Als Dienstleister registrieren</Link>
            </Button>
          </div>

          <div className="mt-6 sm:mt-8 text-teal-100">
            <p className="text-xs sm:text-sm">✓ Kostenlose Registrierung ✓ Geprüfte Anbieter ✓ Sichere Abwicklung</p>
          </div>
        </div>
      </div>
    </section>
  );
}
