'use client';

import { HeroHeader } from '@/components/hero8-header';
import ProviderCTA from '@/components/provider-cta';
import Link from 'next/link';
import {
  Search,
  Zap,
  Globe,
  Shield,
  Users,
  Target,
  Heart,
  Briefcase,
  ArrowRight,
} from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Search,
      title: 'Qualitätsprüfung',
      description: 'Alle Dienstleister werden sorgfältig geprüft und von echten Kunden bewertet.',
    },
    {
      icon: Zap,
      title: 'Schnell & Einfach',
      description: 'In wenigen Klicks den richtigen Dienstleister für Ihr Projekt finden.',
    },
    {
      icon: Globe,
      title: 'Lokal & Nachhaltig',
      description: 'Unterstützung lokaler Unternehmen und kurze Wege für mehr Nachhaltigkeit.',
    },
    {
      icon: Shield,
      title: 'Sicherheit',
      description: 'Sichere Zahlungsabwicklung und Schutz vor unseriösen Anbietern.',
    },
  ];

  const stats = [
    { value: '56.582+', label: 'Dienstleister' },
    { value: '994.012+', label: 'Bewertungen' },
    { value: '1.2M+', label: 'Projekte' },
    { value: '4.8/5', label: 'Kundenzufriedenheit' },
  ];

  const team = [
    {
      name: 'Innovation',
      icon: Target,
      description: 'Wir entwickeln ständig neue Lösungen, um Dienstleistungen einfacher zu machen.',
    },
    {
      name: 'Vertrauen',
      icon: Heart,
      description: 'Transparenz und Ehrlichkeit sind die Grundlage unserer Plattform.',
    },
    {
      name: 'Gemeinschaft',
      icon: Users,
      description: 'Wir stärken lokale Dienstleister und verbinden sie mit ihrer Community.',
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
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg mb-6">
                  Über Taskilo
                </h1>
                <p className="text-lg md:text-xl text-white/90 drop-shadow-md mb-8">
                  Wir verbinden Menschen mit den besten Dienstleistern in ihrer Nähe. Unsere Mission
                  ist es, hochwertige Dienstleistungen für jeden zugänglich zu machen.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center gap-2 bg-white text-[#14ad9f] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                  >
                    Services entdecken
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-6 py-3 rounded-xl font-semibold hover:bg-white hover:text-[#14ad9f] transition-colors duration-300"
                  >
                    Kontakt aufnehmen
                  </Link>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl bg-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
                    alt="Team bei der Zusammenarbeit"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Unsere Mission</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Bei Taskilo glauben wir daran, dass jeder Zugang zu hochwertigen Dienstleistungen
              haben sollte. Unsere Plattform macht es einfach, vertrauenswürdige Dienstleister zu
              finden und gleichzeitig lokalen Unternehmen zu helfen, neue Kunden zu erreichen.
            </p>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:border-[#14ad9f] hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-[#14ad9f]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12 mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              Unsere Zahlen sprechen für sich
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#14ad9f] mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Values */}
          <div className="mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
              Unsere Werte
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
              Diese Prinzipien leiten uns bei allem, was wir tun
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {team.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-8 border border-gray-200 text-center hover:shadow-lg transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-[#14ad9f]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.name}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Join Team CTA */}
          <div className="bg-linear-to-r from-[#14ad9f]/10 to-teal-500/10 border border-[#14ad9f]/20 rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#14ad9f]/20 rounded-xl flex items-center justify-center shrink-0">
                  <Briefcase className="w-7 h-7 text-[#14ad9f]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Werde Teil des Teams</h3>
                  <p className="text-gray-600">
                    Wir suchen talentierte Menschen, die mit uns die Zukunft gestalten möchten.
                  </p>
                </div>
              </div>
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 bg-[#14ad9f] text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors duration-300 shrink-0"
              >
                Offene Stellen
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Provider CTA */}
        <ProviderCTA />
      </div>
    </>
  );
}
