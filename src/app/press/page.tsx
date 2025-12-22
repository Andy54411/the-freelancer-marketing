'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, Award, Mail, Download, ArrowRight } from 'lucide-react';
import { HeroHeader } from '@/components/hero8-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PressPage() {
  const stats = [
    {
      icon: Users,
      title: 'Gemeinschaft',
      description: 'Verbindung zwischen lokalen Dienstleistern und Kunden',
    },
    {
      icon: Award,
      title: 'Qualität',
      description: 'Fokus auf hochwertige Dienstleistungen und Kundenzufriedenheit',
    },
    {
      icon: FileText,
      title: 'Innovation',
      description: 'Moderne Technologie für einfache Vermittlung',
    },
  ];

  const pressKitItems = [
    'Firmenlogos und Bildmaterial',
    'Unternehmensinformationen',
    'Statistiken und Zahlen',
  ];

  return (
    <>
      <HeroHeader />
      {/* Gradient Container */}
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920&q=80"
            alt="Press Background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/90 to-teal-700/95" />
        </div>

        {/* Content */}
        <div className="relative z-10 py-16 pt-32">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Presse & Medien</h1>
              <p className="text-xl text-white drop-shadow-lg opacity-90">
                Informationen und Ressourcen für Medienvertreter
              </p>
            </motion.div>

            <div className="space-y-12">
              {/* About Section */}
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Über Taskilo</h2>
                <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl">
                  <CardContent className="p-8">
                    <p className="text-white leading-relaxed mb-4 drop-shadow-lg">
                      Taskilo ist eine innovative Plattform, die lokale Dienstleister mit Kunden
                      verbindet. Unser Ziel ist es, die Vermittlung von hochwertigen Dienstleistungen
                      zu vereinfachen und dabei sowohl Anbietern als auch Kunden die bestmögliche
                      Erfahrung zu bieten.
                    </p>
                    <p className="text-white leading-relaxed drop-shadow-lg">
                      Seit unserer Gründung haben wir uns zu einer vertrauenswürdigen Plattform
                      entwickelt, die lokale Wirtschaft stärkt und den Alltag unserer Nutzer
                      erleichtert.
                    </p>
                  </CardContent>
                </Card>
              </motion.section>

              {/* Key Facts */}
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">
                  Unternehmensdaten
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -5, scale: 1.02 }}
                    >
                      <Card className="h-full bg-white/10 backdrop-blur-sm border-0 shadow-xl group">
                        <CardContent className="p-6 text-center">
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            <stat.icon className="h-10 w-10 text-white mx-auto mb-4" />
                          </motion.div>
                          <h3 className="text-lg font-semibold mb-2 text-white drop-shadow-lg">
                            {stat.title}
                          </h3>
                          <p className="text-white/90 drop-shadow-lg text-sm">
                            {stat.description}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Press Kit */}
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Presse-Kit</h2>
                <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl">
                  <CardContent className="p-8">
                    <p className="text-white mb-6 drop-shadow-lg">
                      Für Medienanfragen und detaillierte Informationen stehen wir gerne zur
                      Verfügung.
                    </p>
                    <div className="space-y-4">
                      {pressKitItems.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          viewport={{ once: true }}
                          className="flex items-center space-x-3 group"
                        >
                          <Download className="h-5 w-5 text-white group-hover:text-[#14ad9f] transition-colors" />
                          <span className="text-white drop-shadow-lg">{item}</span>
                        </motion.div>
                      ))}
                    </div>
                    <motion.div
                      className="mt-6"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button className="bg-white text-[#14ad9f] hover:bg-gray-100 group">
                        Presse-Kit herunterladen
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.section>

              {/* Contact */}
              <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-6">Pressekontakt</h2>
                <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                  <CardContent className="p-8 text-white text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
                      viewport={{ once: true }}
                      className="flex items-center justify-center mb-6"
                    >
                      <div className="p-4 bg-white/20 rounded-full">
                        <Mail className="h-8 w-8" />
                      </div>
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-semibold mb-4 drop-shadow-lg">Medienanfragen</h3>
                      <p className="mb-6 drop-shadow-lg max-w-md mx-auto">
                        Für Interviews, Pressemitteilungen oder weitere Informationen kontaktieren Sie
                        uns gerne:
                      </p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <a
                          href="mailto:presse@taskilo.de"
                          className="inline-block bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                        >
                          presse@taskilo.de
                        </a>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
