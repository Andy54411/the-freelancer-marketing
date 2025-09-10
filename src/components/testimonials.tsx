'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Maria Schmidt',
      role: 'Hausbesitzer',
      content:
        'Taskilo hat mir geholfen, einen zuverlässigen Handwerker zu finden. Schnell und unkompliziert!',
      rating: 5,
      avatar: 'MS',
    },
    {
      name: 'Thomas Weber',
      role: 'Manager',
      content:
        'Perfekter Service! Die Plattform ist benutzerfreundlich und die Dienstleister sind professionell.',
      rating: 5,
      avatar: 'TW',
    },
    {
      name: 'Julia Müller',
      role: 'Mutter',
      content: 'Als berufstätige Mutter schätze ich die Zeitersparnis. Alles läuft reibungslos ab.',
      rating: 5,
      avatar: 'JM',
    },
    {
      name: 'Andreas König',
      role: 'Hausbesitzer',
      content: 'Hochwertige Dienstleister und faire Preise. Kann ich jedem empfehlen!',
      rating: 5,
      avatar: 'AK',
    },
    {
      name: 'Sarah Fischer',
      role: 'Wohnungsbesitzer',
      content: 'Die Qualität der Arbeit war ausgezeichnet. Ich nutze Taskilo immer wieder.',
      rating: 5,
      avatar: 'SF',
    },
    {
      name: 'Michael Braun',
      role: 'Unternehmer',
      content: 'Für mein Unternehmen die perfekte Lösung. Zuverlässige Partner für alle Projekte.',
      rating: 5,
      avatar: 'MB',
    },
    {
      name: 'Lisa Wagner',
      role: 'Gartenliebhaber',
      content: 'Mein Garten sieht fantastisch aus! Die Gartenprofis waren sehr kompetent.',
      rating: 5,
      avatar: 'LW',
    },
    {
      name: 'David Hoffmann',
      role: 'Autoliebhaber',
      content: 'Autoservice war top! Schnelle Terminvereinbarung und faire Preise.',
      rating: 5,
      avatar: 'DH',
    },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <section className="py-16 md:py-32 bg-transparent">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold lg:text-5xl text-white drop-shadow-lg">
            Was unsere Kunden über
            <span className="text-[#14ad9f]"> Taskilo </span>
            sagen
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/90 drop-shadow-md">
            Tausende zufriedene Kunden vertrauen bereits auf unsere Plattform
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar>
                    <AvatarFallback className="bg-[#14ad9f] text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </div>

                <div className="flex space-x-1 mb-4">{renderStars(testimonial.rating)}</div>

                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8 bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-8 shadow-sm border border-white/20">
            <div className="text-center min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-[#14ad9f]">4.8/5</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                Durchschnittliche Bewertung
              </p>
            </div>
            <div className="text-center min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-[#14ad9f]">10.000+</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                Zufriedene Kunden
              </p>
            </div>
            <div className="text-center min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-[#14ad9f]">15.000+</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                Bewertungen
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
