import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Star, TrendingUp } from 'lucide-react';

export default function IntegrationsSection1() {
  const stats = [
    {
      icon: Users,
      number: '10.000+',
      label: 'Zufriedene Kunden',
      color: 'text-white',
      bgColor: 'bg-[#14ad9f]/10',
    },
    {
      icon: Shield,
      number: '5.000+',
      label: 'Verifizierte Anbieter',
      color: 'text-white',
      bgColor: 'bg-blue-600/10',
    },
    {
      icon: Star,
      number: '4.8/5',
      label: 'Ø Bewertung',
      color: 'text-white',
      bgColor: 'bg-yellow-600/10',
    },
    {
      icon: TrendingUp,
      number: '99%',
      label: 'Erfolgreiche Projekte',
      color: 'text-white',
      bgColor: 'bg-green-600/10',
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center rounded-full bg-[#14ad9f]/10 px-4 py-2 text-sm font-medium text-[#14ad9f] mb-6">
              Vertrauen Sie auf Qualität
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-6">
              Über 10.000 Kunden vertrauen bereits auf
              <span className="text-[#14ad9f]"> Taskilo</span>
            </h2>

            <p className="text-lg text-white/90 drop-shadow-md mb-8">
              Taskilo hat sich als führende Plattform für professionelle Dienstleistungen etabliert.
              Unsere Zahlen sprechen für sich und zeigen das Vertrauen unserer Kunden.
            </p>

            {/* Customer Testimonial */}
            <div className="bg-transparent rounded-xl p-6 mb-8">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-white/90 drop-shadow-md mb-4">
                &ldquo;Taskilo hat mir geholfen, schnell und unkompliziert einen zuverlässigen
                Handwerker zu finden. Die Qualität der Arbeit war ausgezeichnet!&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-semibold">
                  MS
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-white drop-shadow-md">Maria Schmidt</p>
                  <p className="text-sm text-white/80 drop-shadow-md">
                    Hausbesitzerin aus München
                  </p>
                </div>
              </div>
            </div>

            <Button asChild size="lg" className="bg-[#14ad9f] hover:bg-[#0f9d84]">
              <a href="/register/user">Jetzt kostenlos registrieren</a>
            </Button>
          </div>

          {/* Right Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="text-center group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-transparent"
              >
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="inline-flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-transparent mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold mb-2 text-white drop-shadow-lg">
                    {stat.number}
                  </div>
                  <p className="text-xs sm:text-sm text-white drop-shadow-md font-medium leading-tight">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
