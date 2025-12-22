'use client';

import { motion } from 'framer-motion';
import { Shield, Clock, Users, Award } from 'lucide-react';

export default function ContentSection() {
  const features = [
    {
      icon: Clock,
      title: 'Schnell',
      description: 'Dienstleister in wenigen Minuten finden',
    },
    {
      icon: Shield,
      title: 'Sicher',
      description: 'Verifizierte Anbieter und sichere Bezahlung',
    },
    {
      icon: Users,
      title: 'Professionell',
      description: 'Qualifizierte Experten für jeden Bereich',
    },
    {
      icon: Award,
      title: 'Bewährt',
      description: 'Über 10.000 zufriedene Kunden vertrauen uns',
    },
  ];

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-50px' }}
          >
            <h2 className="text-4xl font-semibold lg:text-5xl text-gray-900">
              Die Plattform, die
              <span className="text-[#14ad9f]"> Dienstleister und Kunden </span>
              perfekt zusammenbringt
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Taskilo macht es einfach, den perfekten Dienstleister für Ihr Projekt zu finden. Von
              der Suche bis zur Bezahlung - alles aus einer Hand.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ x: 5 }}
                  className="flex items-start space-x-3 group"
                >
                  <motion.div
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#14ad9f]/10 group-hover:bg-[#14ad9f] transition-colors duration-300"
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="h-5 w-5 text-[#14ad9f] group-hover:text-white transition-colors duration-300" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true, margin: '-50px' }}
            className="relative"
          >
            <div className="aspect-4/3 overflow-hidden rounded-xl relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80"
                alt="Taskilo Platform"
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#14ad9f]/30 to-transparent rounded-xl" />
            </div>

            {/* Floating Stats Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="absolute -bottom-6 -left-6 rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl border dark:border-gray-700"
            >
              <div className="flex items-center space-x-4">
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14ad9f]/10"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Award className="h-6 w-6 text-[#14ad9f]" />
                </motion.div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">4.8/5</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Kundenbewertung</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
