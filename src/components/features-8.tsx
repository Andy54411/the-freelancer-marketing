'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Users, Shield, Zap, Globe, TrendingUp } from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      icon: CheckCircle,
      title: 'Verifizierte Anbieter',
      description: 'Alle Dienstleister werden von uns geprüft und verifiziert',
      color: 'text-[#14ad9f]',
      bgColor: 'bg-[#14ad9f]/10',
    },
    {
      icon: Zap,
      title: 'Schnelle Buchung',
      description: 'Terminvereinbarung in wenigen Klicks',
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
    },
    {
      icon: Shield,
      title: 'Sichere Bezahlung',
      description: 'Alle Zahlungen werden sicher über unsere Plattform abgewickelt',
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
    },
    {
      icon: Users,
      title: 'Direkter Kontakt',
      description: 'Kommunizieren Sie direkt mit dem Dienstleister',
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
    },
    {
      icon: Globe,
      title: 'Deutschlandweit',
      description: 'Verfügbar in allen deutschen Städten',
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
    },
    {
      icon: TrendingUp,
      title: 'Bewertungen',
      description: 'Transparente Bewertungen von echten Kunden',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-600/10',
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Warum Taskilo?
          </h2>
          <p className="text-lg text-white/90 max-w-3xl mx-auto drop-shadow-md">
            Entdecken Sie die Vorteile unserer Plattform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-white/90 backdrop-blur-sm"
            >
              <CardContent className="p-8">
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor} mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
                10.000+
              </div>
              <div className="text-xs sm:text-sm text-white/90 drop-shadow-md">
                Zufriedene Kunden
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
                5.000+
              </div>
              <div className="text-xs sm:text-sm text-white/90 drop-shadow-md">
                Geprüfte Anbieter
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
                4.8/5
              </div>
              <div className="text-xs sm:text-sm text-white/90 drop-shadow-md leading-tight">
                Ø Bewertung
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-md">
                99%
              </div>
              <div className="text-xs sm:text-sm text-white/90 drop-shadow-md">
                Erfolgreiche Projekte
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
