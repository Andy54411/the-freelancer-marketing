'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    {
      name: 'Maria Schmidt',
      role: t('testimonials.role.homeowner'),
      content: t('testimonials.content.maria'),
      rating: 5,
      avatar: 'MS',
    },
    {
      name: 'Thomas Weber',
      role: t('testimonials.role.manager'),
      content: t('testimonials.content.thomas'),
      rating: 5,
      avatar: 'TW',
    },
    {
      name: 'Julia Müller',
      role: t('testimonials.role.mother'),
      content: t('testimonials.content.julia'),
      rating: 5,
      avatar: 'JM',
    },
    {
      name: 'Andreas König',
      role: t('testimonials.role.homeowner'),
      content: t('testimonials.content.andreas'),
      rating: 5,
      avatar: 'AK',
    },
    {
      name: 'Sarah Fischer',
      role: t('testimonials.role.apartmentOwner'),
      content: t('testimonials.content.sarah'),
      rating: 5,
      avatar: 'SF',
    },
    {
      name: 'Michael Braun',
      role: t('testimonials.role.entrepreneur'),
      content: t('testimonials.content.michael'),
      rating: 5,
      avatar: 'MB',
    },
    {
      name: 'Lisa Wagner',
      role: t('testimonials.role.gardenLover'),
      content: t('testimonials.content.lisa'),
      rating: 5,
      avatar: 'LW',
    },
    {
      name: 'David Hoffmann',
      role: t('testimonials.role.carEnthusiast'),
      content: t('testimonials.content.david'),
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
    <section className="py-16 md:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold lg:text-5xl text-gray-900 dark:text-white">
            {t('testimonials.title.part1')}
            <span className="text-[#14ad9f]"> Taskilo </span>
            {t('testimonials.title.part2')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">
            {t('testimonials.subtitle')}
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar>
                    <AvatarFallback className="bg-[#14ad9f] text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </h4>
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
          <div className="inline-flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8 bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-8 shadow-sm border dark:border-gray-700">
            <div className="text-center min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-[#14ad9f]">4.8/5</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                {t('testimonials.stats.avgRating')}
              </p>
            </div>
            <div className="text-center min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-[#14ad9f]">10.000+</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                {t('testimonials.stats.happyCustomers')}
              </p>
            </div>
            <div className="text-center min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-[#14ad9f]">15.000+</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
                {t('testimonials.stats.reviews')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
