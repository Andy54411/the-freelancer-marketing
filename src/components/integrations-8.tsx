'use client';

import { motion } from 'framer-motion';
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
    <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden">
      {/* Clean Teal Gradient Background */}
      <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-50px' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
              className="inline-flex items-center rounded-full bg-[#14ad9f]/10 px-4 py-2 text-sm font-medium text-[#14ad9f] mb-6"
            >
              Vertrauen Sie auf Qualität
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-6">
              Über 10.000 Kunden vertrauen bereits auf
              <span className="text-teal-200 font-extrabold"> Taskilo</span>
            </h2>

            <p className="text-lg text-white/90 drop-shadow-md mb-8">
              Taskilo hat sich als führende Plattform für professionelle Dienstleistungen etabliert.
              Unsere Zahlen sprechen für sich und zeigen das Vertrauen unserer Kunden.
            </p>

            {/* Customer Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20"
            >
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </motion.div>
                  ))}
                </div>
              </div>
              <p className="text-white/90 drop-shadow-md mb-4">
                &ldquo;Taskilo hat mir geholfen, schnell und unkompliziert einen zuverlässigen
                Handwerker zu finden. Die Qualität der Arbeit war ausgezeichnet!&rdquo;
              </p>
              <div className="flex items-center">
                <motion.div
                  className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-semibold"
                  whileHover={{ scale: 1.1 }}
                >
                  MS
                </motion.div>
                <div className="ml-3">
                  <p className="font-semibold text-white drop-shadow-md">Maria Schmidt</p>
                  <p className="text-sm text-white/80 drop-shadow-md">Hausbesitzerin aus München</p>
                </div>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button asChild size="lg" className="bg-[#14ad9f] hover:bg-[#0f9d84]">
                <a href="/register/user">Jetzt kostenlos registrieren</a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true, margin: '-50px' }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <Card className="h-full text-center group hover:shadow-xl transition-all duration-300 border-0 shadow-sm bg-white/10 backdrop-blur-sm">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <motion.div
                      className="inline-flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/10 mb-3 sm:mb-4 transition-all duration-300"
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </motion.div>
                    <motion.div
                      className="text-2xl sm:text-3xl font-bold mb-2 text-white drop-shadow-lg"
                      whileHover={{ scale: 1.1 }}
                    >
                      {stat.number}
                    </motion.div>
                    <p className="text-xs sm:text-sm text-white drop-shadow-md font-medium leading-tight">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
