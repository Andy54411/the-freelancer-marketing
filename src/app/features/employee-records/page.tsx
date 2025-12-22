'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  FileText,
  Shield,
  Lock,
  Bell,
  FolderOpen,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Upload,
  Search,
  UserCheck,
  Building2,
  GraduationCap,
} from 'lucide-react';

const statsData = [
  { value: '100%', label: 'DSGVO-konform' },
  { value: '10 Jahre', label: 'Dokumentenarchiv' },
  { value: '256-Bit', label: 'Verschlusselung' },
];

const featuresData = [
  {
    icon: FolderOpen,
    title: 'Zentrale Dokumentenverwaltung',
    description: 'Alle Personaldokumente an einem Ort - Vertrage, Zeugnisse, Zertifikate und mehr.',
  },
  {
    icon: Lock,
    title: 'Rollenbasierte Zugriffsrechte',
    description: 'Definieren Sie genau, wer welche Dokumente einsehen und bearbeiten darf.',
  },
  {
    icon: Bell,
    title: 'Automatische Erinnerungen',
    description: 'Nie wieder ablaufende Dokumente verpassen - automatische Benachrichtigungen.',
  },
  {
    icon: Upload,
    title: 'Einfacher Dokumenten-Upload',
    description: 'Drag & Drop Upload für schnelles Hinzufügen neuer Dokumente.',
  },
  {
    icon: Search,
    title: 'Volltextsuche',
    description: 'Finden Sie jedes Dokument in Sekunden mit intelligenter Volltextsuche.',
  },
  {
    icon: Shield,
    title: 'Audit-Trail',
    description: 'Lückenlose Protokollierung aller Zugriffe und Änderungen für Compliance.',
  },
];

const documentTypesData = [
  {
    title: 'Arbeitsvertrage',
    description: 'Vertrage, Änderungen, Kundigungen sicher aufbewahren',
    icon: FileText,
  },
  {
    title: 'Zertifikate & Qualifikationen',
    description: 'Fortbildungen, Zertifikate mit Ablaufdatum verwalten',
    icon: GraduationCap,
  },
  {
    title: 'Personaldokumente',
    description: 'Ausweise, Gesundheitszeugnisse, Fuhrerscheine',
    icon: UserCheck,
  },
  {
    title: 'Gehaltsabrechnungen',
    description: 'Alle Abrechnungen chronologisch archivieren',
    icon: Building2,
  },
];

const benefitsData = [
  {
    title: 'Für HR-Abteilungen',
    benefits: [
      'Alle Mitarbeiterdaten zentral und übersichtlich',
      'Schneller Zugriff auf alle relevanten Dokumente',
      'Automatische Erinnerungen bei ablaufenden Dokumenten',
      'Compliance durch lückenlose Dokumentation',
      'Zeitersparnis durch digitale Workflows',
    ],
  },
  {
    title: 'Für Mitarbeiter',
    benefits: [
      'Self-Service Portal für eigene Dokumente',
      'Gehaltsabrechnungen jederzeit einsehbar',
      'Urlaubsanträge digital einreichen',
      'Persönliche Daten selbst aktualisieren',
      'Sichere Kommunikation mit HR',
    ],
  },
];

const workflowSteps = [
  {
    step: 1,
    title: 'Mitarbeiter anlegen',
    description: 'Erfassen Sie Stammdaten und legen Sie die digitale Akte an.',
  },
  {
    step: 2,
    title: 'Dokumente hochladen',
    description: 'Laden Sie alle relevanten Dokumente per Drag & Drop hoch.',
  },
  {
    step: 3,
    title: 'Zugriffsrechte definieren',
    description: 'Legen Sie fest, wer welche Dokumente einsehen darf.',
  },
  {
    step: 4,
    title: 'Automatisch erinnern',
    description: 'Das System erinnert bei ablaufenden Dokumenten automatisch.',
  },
];

export default function EmployeeRecordsPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] to-teal-600 relative">
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      <div className="relative z-10">
        <HeroHeader />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-left">
                <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
                  Unternehmenslösungen
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Digitale <br />
                  <span className="text-teal-200">Mitarbeiterakte</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Personalverwaltung vollständig digitalisieren. Alle Mitarbeiterdaten sicher, 
                  zentral und DSGVO-konform verwaltet - von Arbeitsvertragen bis zu Weiterbildungen.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
                  >
                    <Link href="/register/company">
                      Jetzt digitalisieren
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent"
                  >
                    <Link href="/contact">
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Demo anfordern
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="space-y-4">
                    <div className="bg-white/20 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                          MM
                        </div>
                        <div>
                          <p className="text-white font-semibold">Max Mustermann</p>
                          <p className="text-white/70 text-sm">Projektleiter - Seit 15.03.2020</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/10 rounded-lg p-2">
                          <p className="text-white font-bold">12</p>
                          <p className="text-white/60 text-xs">Dokumente</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2">
                          <p className="text-white font-bold">3</p>
                          <p className="text-white/60 text-xs">Zertifikate</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2">
                          <p className="text-green-300 font-bold">Aktiv</p>
                          <p className="text-white/60 text-xs">Status</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                        <FileText className="h-5 w-5 text-teal-300" />
                        <span className="text-white text-sm">Arbeitsvertrag_2020.pdf</span>
                        <Badge className="ml-auto bg-green-500/20 text-green-300 text-xs">Gultig</Badge>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-teal-300" />
                        <span className="text-white text-sm">Zertifikat_Projektmanagement.pdf</span>
                        <Badge className="ml-auto bg-yellow-500/20 text-yellow-300 text-xs">Lauft ab</Badge>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                        <UserCheck className="h-5 w-5 text-teal-300" />
                        <span className="text-white text-sm">Gesundheitszeugnis.pdf</span>
                        <Badge className="ml-auto bg-green-500/20 text-green-300 text-xs">Gultig</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {statsData.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/80 text-lg">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Alles für digitale Personalverwaltung
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Von der Dokumentenverwaltung bis zum Self-Service Portal
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuresData.map((feature, index) => (
                <Card key={index} className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#14ad9f]/10 rounded-xl">
                        <feature.icon className="h-6 w-6 text-[#14ad9f]" />
                      </div>
                      <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600 text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Document Types */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Alle Dokumententypen verwalten
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Strukturierte Ablage für jede Art von Personaldokument
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {documentTypesData.map((docType, index) => (
                <Card key={index} className="text-center border-2 border-gray-100 shadow-lg hover:shadow-xl hover:border-[#14ad9f]/30 transition-all duration-300">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <docType.icon className="h-8 w-8 text-[#14ad9f]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{docType.title}</h3>
                    <p className="text-gray-600 text-sm">{docType.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                So einfach funktioniert es
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                In vier Schritten zur digitalen Personalakte
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {workflowSteps.map((item, index) => (
                <div key={index} className="relative">
                  <div className="bg-white rounded-2xl p-6 shadow-lg h-full">
                    <div className="w-12 h-12 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      <ArrowRight className="h-6 w-6 text-[#14ad9f]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Vorteile für alle Beteiligten
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Digitale Personalakten, die HR und Mitarbeitern das Leben erleichtern
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {benefitsData.map((group, index) => (
                <Card key={index} className="border-2 border-gray-100 shadow-lg">
                  <CardHeader className="bg-[#14ad9f]/5">
                    <CardTitle className="text-2xl text-[#14ad9f]">{group.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-4">
                      {group.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-[#14ad9f] shrink-0 mt-0.5" />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-linear-to-r from-[#14ad9f] to-teal-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Starten Sie jetzt mit der digitalen Personalakte
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Kostenlos testen - keine Kreditkarte erforderlich
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
              >
                <Link href="/register/company">
                  Kostenlos registrieren
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent"
              >
                <Link href="/contact">Demo anfordern</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
