'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';

interface ProviderCTAProps {
  variant?: 'default' | 'compact';
}

export default function ProviderCTA({ variant = 'default' }: ProviderCTAProps) {
  const benefits = [
    'Kostenlose Registrierung',
    'Direkte Kundenanfragen',
    'Flexible Arbeitszeiten',
    'Sichere Bezahlung',
  ];

  if (variant === 'compact') {
    return (
      <section className="relative overflow-hidden">
        <div className="bg-linear-to-r from-[#14ad9f] to-teal-600 py-16">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Als Anbieter registrieren
            </h2>
            <p className="text-white/90 mb-6 max-w-xl mx-auto">
              Werden Sie Teil der Taskilo Community und erreichen Sie neue Kunden.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register/company"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
              >
                Jetzt registrieren
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-[#14ad9f] transition-colors duration-300"
              >
                Beratung anfragen
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop"
          alt="Professionelle Dienstleister bei der Arbeit"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#14ad9f]/95 to-teal-600/90" />
      </div>

      <div className="relative z-10 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-white">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 drop-shadow-lg">
                Werden Sie Anbieter auf Taskilo
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow-md">
                Erreichen Sie tausende potenzielle Kunden - sowohl Privatpersonen als auch
                Unternehmen. Starten Sie noch heute und bauen Sie Ihr Geschäft aus.
              </p>

              {/* Benefits */}
              <ul className="space-y-3 mb-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white shrink-0" />
                    <span className="text-white/90">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register/company"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Als Anbieter registrieren
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-[#14ad9f] transition-all duration-300"
                >
                  Beratung anfragen
                </Link>
              </div>
            </div>

            {/* Stats/Trust Indicators */}
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-white mb-2">10.000+</div>
                    <div className="text-white/80 text-sm">Aktive Anbieter</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-white mb-2">50.000+</div>
                    <div className="text-white/80 text-sm">Aufträge vermittelt</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-white mb-2">4.8/5</div>
                    <div className="text-white/80 text-sm">Durchschnittsbewertung</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-white mb-2">98%</div>
                    <div className="text-white/80 text-sm">Zufriedene Kunden</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
