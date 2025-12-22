'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight, Users, Rocket, Heart } from 'lucide-react';

export default function CareersCTA() {
  const highlights = [
    'Innovative Technologie-Stack',
    'Remote-First Kultur',
    'Wettbewerbsfähige Vergütung',
    'Persönliche Weiterentwicklung',
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
          alt="Team bei der Zusammenarbeit"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#14ad9f]/95 to-teal-600/90" />
      </div>

      <div className="relative z-10 py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Rocket className="w-4 h-4" />
                Wir wachsen - Werde Teil des Teams
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 drop-shadow-lg">
                Gestalte die Zukunft mit uns
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow-md">
                Bei Taskilo arbeitest du an einer Plattform, die täglich das Leben von tausenden
                Menschen verbessert. Werde Teil unserer Mission, lokale Dienstleister und Kunden
                zusammenzubringen.
              </p>

              {/* Highlights */}
              <ul className="space-y-3 mb-8">
                {highlights.map((highlight, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-white shrink-0" />
                    <span className="text-white/90">{highlight}</span>
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="#positions"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Offene Stellen
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="mailto:careers@taskilo.de"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-[#14ad9f] transition-all duration-300"
                >
                  Initiativbewerbung
                </a>
              </div>
            </div>

            {/* Culture Card */}
            <div className="hidden md:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Unsere Kultur</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Flache Hierarchien</h4>
                      <p className="text-white/80 text-sm">
                        Direkte Kommunikation und schnelle Entscheidungen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Rocket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Impact-Driven</h4>
                      <p className="text-white/80 text-sm">
                        Deine Arbeit macht einen echten Unterschied
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-1">Work-Life-Balance</h4>
                      <p className="text-white/80 text-sm">
                        Flexible Arbeitszeiten und Remote-Optionen
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Team Stats */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">25+</div>
                    <div className="text-white/70 text-xs">Teammitglieder</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">8</div>
                    <div className="text-white/70 text-xs">Nationalitäten</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">100%</div>
                    <div className="text-white/70 text-xs">Remote-Ready</div>
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
