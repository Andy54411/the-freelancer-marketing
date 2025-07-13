import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Star } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Maria Schmidt',
      role: 'Hausbesitzerin',
      content: 'Taskilo hat mir geholfen, einen fantastischen Elektriker zu finden. Schnell, professionell und zu einem fairen Preis!',
      rating: 5,
      avatar: 'MS'
    },
    {
      name: 'Thomas Weber',
      role: 'Geschäftsführer',
      content: 'Für unser Büro haben wir über Taskilo einen zuverlässigen Reinigungsservice gefunden. Absolute Empfehlung!',
      rating: 5,
      avatar: 'TW'
    },
    {
      name: 'Julia Müller',
      role: 'Mutter von 2 Kindern',
      content: 'Die Kinderbetreuung über Taskilo war ein Segen. Verifizierte Betreuer und einfache Buchung.',
      rating: 5,
      avatar: 'JM'
    },
    {
      name: 'Andreas König',
      role: 'Hausbesitzer',
      content: 'Meine Küche wurde perfekt renoviert. Taskilo macht es einfach, vertrauensvolle Handwerker zu finden.',
      rating: 5,
      avatar: 'AK'
    },
    {
      name: 'Sarah Fischer',
      role: 'Apartment-Besitzerin',
      content: 'Von der Buchung bis zur Bezahlung - alles lief reibungslos. Taskilo ist meine erste Wahl!',
      rating: 5,
      avatar: 'SF'
    },
    {
      name: 'Michael Braun',
      role: 'IT-Unternehmer',
      content: 'Für IT-Support haben wir schnell einen kompetenten Techniker gefunden. Sehr zufrieden!',
      rating: 5,
      avatar: 'MB'
    },
    {
      name: 'Lisa Wagner',
      role: 'Gartenliebhaberin',
      content: 'Mein Garten wurde wunderschön gestaltet. Die Gärtner auf Taskilo sind echte Profis.',
      rating: 5,
      avatar: 'LW'
    },
    {
      name: 'David Hoffmann',
      role: 'Auto-Enthusiast',
      content: 'Autowäsche und Pflege über Taskilo - schnell gebucht und perfekt ausgeführt.',
      rating: 5,
      avatar: 'DH'
    }
  ]

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <section className="py-16 md:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-semibold lg:text-5xl text-gray-900 dark:text-white">
            Was unsere Kunden über 
            <span className="text-[#14ad9f]"> Taskilo </span>
            sagen
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Über 10.000 zufriedene Kunden vertrauen bereits auf Taskilo
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar>
                    <AvatarFallback className="bg-[#14ad9f] text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </div>
                
                <div className="flex space-x-1 mb-4">
                  {renderStars(testimonial.rating)}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-8 bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border dark:border-gray-700">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#14ad9f]">4.8/5</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Durchschnittsbewertung</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#14ad9f]">10.000+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Zufriedene Kunden</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#14ad9f]">15.000+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bewertungen</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
