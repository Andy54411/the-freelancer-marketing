import Image from 'next/image'
import { Shield, Clock, Users, Award } from 'lucide-react'

export default function ContentSection() {
  const features = [
    {
      icon: Clock,
      title: 'Schnell',
      description: 'Dienstleister in wenigen Minuten finden'
    },
    {
      icon: Shield,
      title: 'Sicher',
      description: 'Verifizierte Anbieter und sichere Bezahlung'
    },
    {
      icon: Users,
      title: 'Professionell',
      description: 'Qualifizierte Experten für jeden Bereich'
    },
    {
      icon: Award,
      title: 'Bewährt',
      description: 'Über 10.000 zufriedene Kunden vertrauen uns'
    }
  ]

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-semibold lg:text-5xl text-gray-900">
              Die Plattform, die 
              <span className="text-blue-600"> Dienstleister und Kunden </span>
              perfekt zusammenbringt
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Taskilo macht es einfach, den perfekten Dienstleister für Ihr Projekt zu finden. 
              Von der Suche bis zur Bezahlung - alles aus einer Hand.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <feature.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <Users className="mx-auto h-16 w-16 text-blue-400" />
                  <p className="mt-4 text-sm text-gray-500">Taskilo Platform</p>
                </div>
              </div>
            </div>
            
            {/* Floating Stats Card */}
            <div className="absolute -bottom-6 -left-6 rounded-lg bg-white p-6 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">4.8/5</p>
                  <p className="text-sm text-gray-600">Kundenbewertung</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
