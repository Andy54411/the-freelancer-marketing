import { Star, Clock, Shield, Users, CheckCircle, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function IntegrationsSection1() {
    return (
        <section>
            <div className="bg-muted dark:bg-background py-24 md:py-32">
                <div className="mx-auto flex flex-col px-6 md:grid md:max-w-5xl md:grid-cols-2 md:gap-12">
                    <div className="order-last mt-6 flex flex-col gap-12 md:order-first">
                        <div className="space-y-6">
                            <h2 className="text-balance text-3xl font-semibold md:text-4xl lg:text-5xl">Vertrauen Sie auf Taskilo</h2>
                            <p className="text-muted-foreground">Über 10.000 zufriedene Kunden und 5.000+ verifizierte Dienstleister vertrauen bereits auf unsere Plattform.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                asChild>
                                <Link href="/register/user">Jetzt kostenlos starten</Link>
                            </Button>
                        </div>

                        <div className="mt-auto grid grid-cols-[auto_1fr] gap-3">
                            <div className="bg-background flex aspect-square items-center justify-center border rounded-lg">
                                <Star className="size-9 text-yellow-500" />
                            </div>
                            <blockquote>
                                <p>"Taskilo hat mir geholfen, schnell und unkompliziert einen zuverlässigen Handwerker zu finden. Absolute Empfehlung!"</p>
                                <div className="mt-2 flex gap-2 text-sm">
                                    <cite>Maria Schmidt</cite>
                                    <p className="text-muted-foreground">Kundin aus München</p>
                                </div>
                            </blockquote>
                        </div>
                    </div>

                    <div className="-mx-6 px-6 [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_70%,transparent_100%)] sm:mx-auto sm:max-w-md md:-mx-6 md:ml-auto md:mr-0">
                        <div className="bg-background dark:bg-muted/50 rounded-2xl border p-3 shadow-lg md:pb-12">
                            <div className="grid grid-cols-2 gap-2">
                                <Integration
                                    icon={<Users className="text-blue-600" />}
                                    name="10.000+"
                                    description="Zufriedene Kunden vertrauen Taskilo"
                                />
                                <Integration
                                    icon={<CheckCircle className="text-green-600" />}
                                    name="5.000+"
                                    description="Verifizierte Dienstleister"
                                />
                                <Integration
                                    icon={<Clock className="text-purple-600" />}
                                    name="< 2 Min"
                                    description="Durchschnittliche Buchungszeit"
                                />
                                <Integration
                                    icon={<Shield className="text-emerald-600" />}
                                    name="100%"
                                    description="Sichere Zahlungsabwicklung"
                                />
                                <Integration
                                    icon={<Star className="text-yellow-500" />}
                                    name="4.8/5"
                                    description="Durchschnittliche Bewertung"
                                />
                                <Integration
                                    icon={<TrendingUp className="text-red-600" />}
                                    name="99.8%"
                                    description="Erfolgreiche Vermittlungen"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

const Integration = ({ icon, name, description }: { icon: React.ReactNode; name: string; description: string }) => {
    return (
        <div className="bg-background dark:bg-muted/50 rounded-xl border p-3">
            <div className="flex items-center gap-2">
                <div className="*:size-4">{icon}</div>
                <p className="text-sm font-medium">{name}</p>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        </div>
    )
}
