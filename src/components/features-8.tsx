import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Users, Shield, Zap, Globe, TrendingUp } from 'lucide-react'

export default function FeaturesSection() {
  const features = [
    {
      icon: CheckCircle,
      title: 'Verifizierte Dienstleister',
      description: 'Alle Unternehmen und Handwerker durchlaufen einen strengen Verifizierungsprozess für maximale Sicherheit und Qualität.',
      color: 'text-[#14ad9f]',
      bgColor: 'bg-[#14ad9f]/10'
    },
    {
      icon: Zap,
      title: 'Blitzschnelle Buchung',
      description: 'Buchen Sie professionelle Dienstleistungen in wenigen Klicks - von der Anfrage bis zur Bestätigung in Minuten.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10'
    },
    {
      icon: Shield,
      title: 'Sichere Bezahlung',
      description: 'Integrierte Zahlungsabwicklung mit Käuferschutz. Zahlen Sie erst nach erfolgreicher Leistungserbringung.',
      color: 'text-green-600',
      bgColor: 'bg-green-600/10'
    },
    {
      icon: Users,
      title: 'Direkter Kontakt',
      description: 'Kommunizieren Sie direkt mit Ihren Dienstleistern über unseren integrierten Chat und behalten Sie den Überblick.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10'
    },
    {
      icon: Globe,
      title: 'Deutschlandweit verfügbar',
      description: 'Finden Sie qualifizierte Dienstleister in ganz Deutschland - von Hamburg bis München.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10'
    },
    {
      icon: TrendingUp,
      title: 'Transparente Bewertungen',
      description: 'Echte Kundenbewertungen und detaillierte Profile helfen Ihnen bei der Auswahl des besten Dienstleisters.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-600/10'
    }
  ]

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Warum 
            <span className="text-[#14ad9f]"> Taskilo </span>
            die beste Wahl ist
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Entdecken Sie, wie Taskilo die Verbindung zwischen Kunden und professionellen Dienstleistern revolutioniert
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-white">
              <CardContent className="p-8">
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${feature.bgColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">10.000+</div>
              <div className="text-sm text-gray-600">Zufriedene Kunden</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">5.000+</div>
              <div className="text-sm text-gray-600">Geprüfte Anbieter</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">4.8/5</div>
              <div className="text-sm text-gray-600">Durchschnittsbewertung</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#14ad9f] mb-2">99%</div>
              <div className="text-sm text-gray-600">Erfolgreiche Projekte</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
