'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Package,
  Barcode,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  Truck,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Search,
  RefreshCw,
  FileText,
} from 'lucide-react';

const featuresData = [
  {
    icon: Package,
    title: 'Artikelverwaltung',
    description: 'Alle Produkte mit Bildern, Beschreibungen und Varianten verwalten.',
  },
  {
    icon: Barcode,
    title: 'Barcode-Scanning',
    description: 'Ein- und Ausgange per Barcode oder QR-Code erfassen.',
  },
  {
    icon: AlertTriangle,
    title: 'Bestandswarnungen',
    description: 'Automatische Benachrichtigungen bei niedrigem Lagerbestand.',
  },
  {
    icon: Warehouse,
    title: 'Mehrere Lagerorte',
    description: 'Verwalten Sie Bestände über mehrere Standorte hinweg.',
  },
  {
    icon: Truck,
    title: 'Lieferanten',
    description: 'Lieferanten verwalten und Bestellungen aufgeben.',
  },
  {
    icon: TrendingUp,
    title: 'Bestandsanalysen',
    description: 'Auswertungen zu Umschlag, Reichweite und Kapitalbindung.',
  },
];

const statsData = [
  { value: 'Echtzeit', label: 'Bestandsübersicht' },
  { value: 'Multi-Lager', label: 'Unterstützung' },
  { value: '0', label: 'Fehlbestände' },
];

const inventoryPreview = [
  { name: 'Laptop Dell XPS 15', sku: 'LP-DELL-001', stock: 12, minStock: 5, status: 'ok' },
  { name: 'Monitor Samsung 27"', sku: 'MO-SAMS-027', stock: 3, minStock: 5, status: 'low' },
  { name: 'Tastatur Logitech MX', sku: 'KB-LOGI-001', stock: 24, minStock: 10, status: 'ok' },
  { name: 'Maus Logitech MX', sku: 'MS-LOGI-001', stock: 0, minStock: 10, status: 'out' },
];

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700">
        <HeroHeader />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-left"
              >
                <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
                  Business Solutions
                </Badge>
                <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                  Lagerbestands-<br />
                  <span className="text-teal-200">verwaltung</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-lg">
                  Behalten Sie den Überblick über Ihren Lagerbestand. 
                  Automatische Warnungen, Barcode-Scanning und Analysen.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg"
                  >
                    <Link href="/register/company">
                      Jetzt kostenlos testen
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
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden lg:block"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Lagerbestand</h3>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs">
                          <Search className="h-3 w-3 mr-1" />
                          Suchen
                        </Button>
                        <Button size="sm" className="bg-[#14ad9f] hover:bg-[#14ad9f]/90 text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          Neuer Artikel
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {inventoryPreview.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.sku}</p>
                          </div>
                          <div className="text-right mr-3">
                            <p className={`text-sm font-medium ${
                              item.status === 'out' ? 'text-red-600' : 
                              item.status === 'low' ? 'text-yellow-600' : 'text-gray-900'
                            }`}>
                              {item.stock} Stück
                            </p>
                            <p className="text-xs text-gray-500">Min: {item.minStock}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.status === 'ok' ? 'bg-green-50 text-green-600 border-green-200' :
                              item.status === 'low' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                              'bg-red-50 text-red-600 border-red-200'
                            }`}
                          >
                            {item.status === 'ok' ? 'OK' : item.status === 'low' ? 'Niedrig' : 'Leer'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {statsData.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/80 text-lg">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Professionelle Lagerverwaltung
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Alle Funktionen für effiziente Bestandsführung
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-[#14ad9f]" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Einfacher Workflow
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Package,
                title: 'Wareneingang',
                description: 'Lieferungen per Barcode erfassen und Bestand automatisch erhöhen.',
              },
              {
                icon: RefreshCw,
                title: 'Bestandspflege',
                description: 'Inventuren durchführen und Bestände korrigieren.',
              },
              {
                icon: FileText,
                title: 'Warenausgang',
                description: 'Entnahmen buchen und mit Aufträgen verknüpfen.',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-[#14ad9f]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-10 w-10 text-[#14ad9f]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nahtlose Integration
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Verbunden mit allen anderen Taskilo-Modulen
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Rechnungswesen',
              'Auftrage',
              'Einkauf',
              'Lieferanten',
              'Buchhaltung',
              'E-Commerce',
            ].map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl px-8 py-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <span className="font-medium text-gray-700">{integration}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Warum Taskilo Lagerverwaltung?
              </h2>
              <ul className="space-y-4">
                {[
                  'Echtzeit-Übersicht über alle Bestände',
                  'Automatische Warnungen bei niedrigem Bestand',
                  'Barcode-Scanning für schnelle Erfassung',
                  'Mehrere Lagerorte verwalten',
                  'Integration mit Rechnungswesen',
                  'Ausführliche Bestandsanalysen',
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-[#14ad9f] shrink-0" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gray-50 rounded-2xl p-8"
            >
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Bestandsübersicht</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Gesamtartikel', value: '1.234' },
                    { label: 'Warenwert', value: '89.450 EUR' },
                    { label: 'Niedrige Bestände', value: '12', color: 'text-yellow-600' },
                    { label: 'Nicht lieferbar', value: '3', color: 'text-red-600' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{stat.label}</span>
                      <span className={`font-semibold ${stat.color || 'text-gray-900'}`}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-linear-to-r from-[#14ad9f] to-teal-600">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Behalten Sie den Überblick über Ihren Bestand
          </h2>
          <p className="text-xl text-white/90 mb-10">
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
              <Link href="/features/business">Alle Features ansehen</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
