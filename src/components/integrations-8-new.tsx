import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Users, Star, TrendingUp } from 'lucide-react'

export default function IntegrationsSection1() {
    const stats = [
        {
            icon: Users,
            number: '10.000+',
            label: 'Zufriedene Kunden',
            color: 'text-[#14ad9f]',
            bgColor: 'bg-[#14ad9f]/10'
        },
        {
            icon: Shield,
            number: '5.000+',
            label: 'Verifizierte Anbieter',
            color: 'text-blue-600',
            bgColor: 'bg-blue-600/10'
        },
        {
            icon: Star,
            number: '4.8/5',
            label: 'Durchschnittsbewertung',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-600/10'
        },
        {
            icon: TrendingUp,
            number: '99%',
            label: 'Erfolgreiche Projekte',
            color: 'text-green-600',
            bgColor: 'bg-green-600/10'
        }
    ]

    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div>
                        <div className="inline-flex items-center rounded-full bg-[#14ad9f]/10 px-4 py-2 text-sm font-medium text-[#14ad9f] mb-6">
                            Vertrauen Sie auf Qualität
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                            Über 10.000 Kunden vertrauen bereits auf
                            <span className="text-[#14ad9f]"> Taskilo</span>
                        </h2>

                        <p className="text-lg text-gray-600 mb-8">
                            Taskilo hat sich als führende Plattform für professionelle Dienstleistungen etabliert.
                            Unsere Zahlen sprechen für sich und zeigen das Vertrauen unserer Kunden.
                        </p>

                        {/* Customer Testimonial */}
                        <div className="bg-gray-50 rounded-xl p-6 mb-8">
                            <div className="flex items-center mb-4">
                                <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-current" />
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-700 mb-4">
                                "Taskilo hat mir geholfen, schnell und unkompliziert einen zuverlässigen Handwerker zu finden.
                                Die Qualität der Arbeit war ausgezeichnet!"
                            </p>
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-semibold">
                                    MS
                                </div>
                                <div className="ml-3">
                                    <p className="font-semibold text-gray-900">Maria Schmidt</p>
                                    <p className="text-sm text-gray-600">Hausbesitzerin aus München</p>
                                </div>
                            </div>
                        </div>

                        <Button asChild size="lg" className="bg-[#14ad9f] hover:bg-[#0f9d84]">
                            <a href="/register/user">Jetzt kostenlos registrieren</a>
                        </Button>
                    </div>

                    {/* Right Statistics */}
                    <div className="grid grid-cols-2 gap-6">
                        {stats.map((stat, index) => (
                            <Card key={index} className="text-center group hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
                                <CardContent className="p-8">
                                    <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${stat.bgColor} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                        <stat.icon className={`h-8 w-8 ${stat.color}`} />
                                    </div>
                                    <div className={`text-3xl font-bold mb-2 ${stat.color}`}>
                                        {stat.number}
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium">
                                        {stat.label}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
