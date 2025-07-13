import { CheckCircle, Users, Shield, Zap, Globe, TrendingUp } from 'lucide-react'

export default function FeaturesSection() {
  const features = [
    {
      icon: CheckCircle,
      title: 'Verifizierte Dienstleister',
      description: 'Alle Unternehmen und Handwerker durchlaufen einen strengen Verifizierungsprozess für maximale Sicherheit und Qualität.'
    },
    {
      icon: Zap,
      title: 'Blitzschnelle Buchung',
      description: 'Buchen Sie professionelle Dienstleistungen in wenigen Klicks - von der Anfrage bis zur Bestätigung in Minuten.'
    },
    {
      icon: Shield,
      title: 'Sichere Bezahlung',
      description: 'Integrierte Zahlungsabwicklung mit Käuferschutz. Zahlen Sie erst nach erfolgreicher Leistungserbringung.'
    },
    {
      icon: Users,
      title: 'Direkter Kontakt',
      description: 'Kommunizieren Sie direkt mit Ihren Dienstleistern über unseren integrierten Chat und behalten Sie den Überblick.'
    },
    {
      icon: Globe,
      title: 'Deutschlandweit verfügbar',
      description: 'Finden Sie qualifizierte Dienstleister in ganz Deutschland - von Hamburg bis München.'
    },
    {
      icon: TrendingUp,
      title: 'Transparente Bewertungen',
      description: 'Echte Kundenbewertungen und detaillierte Profile helfen Ihnen bei der Auswahl des besten Dienstleisters.'
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Warum Taskilo die beste Wahl ist
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Entdecken Sie, wie Taskilo die Verbindung zwischen Kunden und professionellen Dienstleistern revolutioniert
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100"
            >
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-500 text-white">
                    <feature.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Über 10.000 zufriedene Kunden
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              5.000+ verifizierte Dienstleister
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              99.8% Erfolgsquote
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
