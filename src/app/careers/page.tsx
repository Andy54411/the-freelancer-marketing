'use client';

import { HeroHeader } from '@/components/hero8-header';
import CareersCTA from '@/components/careers-cta';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  Target,
  TrendingUp,
  Mail,
  Heart,
  Coffee,
  Globe,
  Laptop,
  Calendar,
  Gift,
  ArrowRight,
  Briefcase,
} from 'lucide-react';

export default function CareersPage() {
  const values = [
    {
      icon: Users,
      title: 'Teamwork',
      description: 'Arbeite mit einem motivierten Team an innovativen Lösungen für die Zukunft.',
    },
    {
      icon: Target,
      title: 'Mission',
      description: 'Hilf dabei, lokale Dienstleister und Kunden zusammenzubringen.',
    },
    {
      icon: TrendingUp,
      title: 'Wachstum',
      description: 'Entwickle dich in einem schnell wachsenden Unternehmen weiter.',
    },
  ];

  const benefits = [
    { icon: Laptop, title: 'Remote-First', description: 'Arbeite von überall aus' },
    { icon: Calendar, title: 'Flexible Arbeitszeiten', description: 'Work-Life-Balance' },
    { icon: Coffee, title: 'Team Events', description: 'Regelmäßige Zusammenkünfte' },
    { icon: Gift, title: 'Weiterbildung', description: 'Budget für Kurse & Konferenzen' },
    { icon: Heart, title: 'Gesundheit', description: 'Fitness-Zuschuss' },
    { icon: Globe, title: 'International', description: 'Vielfältiges Team' },
  ];

  const openPositions = [
    {
      title: 'Senior Frontend Developer',
      department: 'Engineering',
      location: 'Remote / München',
      type: 'Vollzeit',
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote / Berlin',
      type: 'Vollzeit',
    },
    {
      title: 'Customer Success Manager',
      department: 'Operations',
      location: 'Remote',
      type: 'Vollzeit',
    },
  ];

  return (
    <>
      <HeroHeader />
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="bg-linear-to-br from-[#14ad9f] to-teal-600 text-white pt-32 pb-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Bild links */}
              <div className="hidden md:block">
                <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                    alt="Taskilo Team bei der Arbeit"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Text rechts */}
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg mb-6">
                  Karriere bei Taskilo
                </h1>
                <p className="text-lg md:text-xl text-white/90 drop-shadow-md mb-8">
                  Werde Teil des Teams, das die Zukunft der Dienstleistungsbranche gestaltet. 
                  Gemeinsam verbinden wir Menschen mit den besten lokalen Dienstleistern.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="#positions"
                    className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                  >
                    Offene Stellen ansehen
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="mailto:careers@taskilo.de"
                    className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-[#14ad9f] transition-colors duration-300"
                  >
                    Initiativbewerbung
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Section - Text links, Bild rechts */}
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            {/* Text links */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Warum Taskilo?</h2>
              <p className="text-lg text-gray-600 mb-8">
                Bei uns arbeitest du an einer Plattform, die echten Mehrwert für Menschen schafft.
                Wir glauben an Innovation, Teamwork und nachhaltiges Wachstum.
              </p>
              <div className="space-y-4">
                {values.map((value, index) => {
                  const IconComponent = value.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, delay: index * 0.15, ease: "easeOut" }}
                      className="flex items-start gap-4"
                    >
                      <div className="w-12 h-12 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center shrink-0">
                        <IconComponent className="w-6 h-6 text-[#14ad9f]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">{value.title}</h3>
                        <p className="text-gray-600 text-sm">{value.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            
            {/* Bild rechts */}
            <div className="hidden md:block">
              <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop"
                  alt="Arbeiten bei Taskilo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12 mb-20 overflow-hidden">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10"
            >
              Deine Benefits
            </motion.h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.1,
                      ease: "easeOut"
                    }}
                    whileHover={{ 
                      y: -8, 
                      scale: 1.05,
                      transition: { duration: 0.2 }
                    }}
                    className="text-center cursor-default"
                  >
                    <motion.div 
                      className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-100"
                      whileHover={{ 
                        rotate: [0, -10, 10, -10, 0],
                        transition: { duration: 0.5 }
                      }}
                    >
                      <IconComponent className="w-6 h-6 text-[#14ad9f]" />
                    </motion.div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{benefit.title}</h3>
                    <p className="text-gray-500 text-xs">{benefit.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Open Positions */}
          <div id="positions" className="mb-20">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4"
            >
              Offene Stellen
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-gray-600 text-center max-w-2xl mx-auto mb-10"
            >
              Finde die passende Position und werde Teil unseres wachsenden Teams
            </motion.p>

            {openPositions.length > 0 ? (
              <div className="space-y-4">
                {openPositions.map((position, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.15,
                      ease: "easeOut"
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 10px 40px rgba(20, 173, 159, 0.15)",
                      transition: { duration: 0.2 }
                    }}
                    className="bg-white rounded-xl p-6 border border-gray-200 hover:border-[#14ad9f] transition-all duration-300 group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <motion.div 
                          className="w-12 h-12 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center shrink-0"
                          whileHover={{ rotate: 360, transition: { duration: 0.5 } }}
                        >
                          <Briefcase className="w-6 h-6 text-[#14ad9f]" />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#14ad9f] transition-colors">
                            {position.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                              {position.department}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                              {position.location}
                            </span>
                            <span className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] px-3 py-1 rounded-full">
                              {position.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Link
                          href={`mailto:careers@taskilo.de?subject=Bewerbung: ${position.title}`}
                          className="inline-flex items-center gap-2 bg-[#14ad9f] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors duration-300 text-sm shrink-0"
                        >
                          Jetzt bewerben
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-xl p-12 border border-gray-200 text-center"
              >
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Keine offenen Stellen
                </h3>
                <p className="text-gray-600">
                  Derzeit haben wir keine offenen Positionen. Sende uns gerne eine Initiativbewerbung!
                </p>
              </motion.div>
            )}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2070&auto=format&fit=crop"
                alt="Team bei der Arbeit"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-r from-[#14ad9f]/95 to-teal-600/90" />
            </div>
            
            <div className="relative z-10 p-8 md:p-12">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                  <motion.div 
                    className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0"
                    whileHover={{ rotate: [0, -5, 5, -5, 0], transition: { duration: 0.5 } }}
                    animate={{ 
                      boxShadow: [
                        "0 0 0 0 rgba(255,255,255,0.4)",
                        "0 0 0 20px rgba(255,255,255,0)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Mail className="w-10 h-10 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                      Keine passende Stelle dabei?
                    </h3>
                    <p className="text-white/90 text-lg max-w-lg drop-shadow-md">
                      Wir freuen uns über Initiativbewerbungen von motivierten Talenten. 
                      Zeig uns, was du kannst!
                    </p>
                  </div>
                </div>
                <motion.a
                  href="mailto:careers@taskilo.de"
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 bg-white text-[#14ad9f] px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors duration-300 shadow-lg text-lg shrink-0"
                >
                  <Mail className="w-5 h-5" />
                  Initiativbewerbung senden
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Careers CTA */}
        <CareersCTA />
      </div>
    </>
  );
}
