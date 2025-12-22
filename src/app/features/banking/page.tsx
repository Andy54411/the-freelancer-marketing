'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import {
  Landmark,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PieChart,
  Shield,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const featuresData = [
  {
    icon: Landmark,
    title: 'Multi-Banking',
    description: 'Alle Bankkonten an einem Ort verwalten und überwachen.',
  },
  {
    icon: RefreshCw,
    title: 'Auto-Synchronisierung',
    description: 'Transaktionen werden automatisch abgerufen und kategorisiert.',
  },
  {
    icon: ArrowUpRight,
    title: 'Überweisungen',
    description: 'Zahlungen direkt aus Taskilo initiieren und freigeben.',
  },
  {
    icon: CreditCard,
    title: 'Kreditkarten',
    description: 'Firmenkreditkarten integrieren und Ausgaben tracken.',
  },
  {
    icon: PieChart,
    title: 'Cash Flow Analyse',
    description: 'Einnahmen und Ausgaben visualisieren und prognostizieren.',
  },
  {
    icon: Shield,
    title: 'Bank-Sicherheit',
    description: 'PSD2-konform mit modernster Verschlusselung.',
  },
];

const statsData = [
  { value: '150+', label: 'Banken verbunden' },
  { value: 'PSD2', label: 'konform' },
  { value: 'Echtzeit', label: 'Synchronisierung' },
];

const transactionsPreview = [
  { description: 'Meier GmbH - Rechnung 2024-001', amount: '+2.450,00 EUR', date: 'Heute', type: 'in' },
  { description: 'Buroausstattung Schmidt', amount: '-189,90 EUR', date: 'Gestern', type: 'out' },
  { description: 'AWS Monthly Invoice', amount: '-156,78 EUR', date: 'Gestern', type: 'out' },
  { description: 'Kunde Weber - Anzahlung', amount: '+1.000,00 EUR', date: '15.01.', type: 'in' },
];

export default function BankingPage() {
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Banking<br />
                  <span className="text-teal-200">Integration</span>
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                  Alle Bankkonten zentral verwalten. 
                  Transaktionen automatisch synchronisieren und kategorisieren.
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
                    <div className="p-4 border-b bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900">Geschäftskonto</h3>
                        <Badge className="bg-green-100 text-green-700 border-0">Verbunden</Badge>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">24.567,89 EUR</p>
                      <p className="text-sm text-green-600">+1.234,56 EUR heute</p>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-3">Letzte Transaktionen</p>
                      <div className="space-y-2">
                        {transactionsPreview.map((tx, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                {tx.type === 'in' 
                                  ? <ArrowDownLeft className="h-4 w-4 text-green-600" />
                                  : <ArrowUpRight className="h-4 w-4 text-red-600" />
                                }
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{tx.description}</p>
                                <p className="text-xs text-gray-500">{tx.date}</p>
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${
                              tx.type === 'in' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
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
              Moderne Banking-Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Alles was Sie für effizientes Finanzmanagement brauchen
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

      {/* Banks */}
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
              Ihre Bank ist dabei
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Über 150 Banken in Deutschland, Österreich und der Schweiz
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6">
            {[
              'Deutsche Bank',
              'Commerzbank',
              'Sparkasse',
              'Volksbank',
              'ING',
              'DKB',
              'N26',
              'Revolut',
            ].map((bank, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-xl px-8 py-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <span className="font-medium text-gray-700">{bank}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cash Flow */}
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
              Cash Flow im Griff
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wallet,
                title: 'Kontostand-Übersicht',
                description: 'Alle Konten auf einen Blick mit Gesamtsaldo.',
              },
              {
                icon: TrendingUp,
                title: 'Cash Flow Prognose',
                description: 'Basierend auf geplanten Zahlungen und offenen Rechnungen.',
              },
              {
                icon: PieChart,
                title: 'Ausgabenanalyse',
                description: 'Automatische Kategorisierung und Auswertung.',
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
                Warum Taskilo Banking?
              </h2>
              <ul className="space-y-4">
                {[
                  'Alle Konten an einem Ort',
                  'Automatische Transaktions-Synchronisierung',
                  'Intelligente Kategorisierung',
                  'Rechnungsabgleich mit einem Klick',
                  'Sichere PSD2-Verbindung',
                  'Cash Flow Prognose',
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
                <h3 className="font-semibold text-gray-900 mb-4">Verbundene Konten</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Geschäftskonto', bank: 'Deutsche Bank', balance: '24.567,89 EUR' },
                    { name: 'Sparkonto', bank: 'DKB', balance: '15.000,00 EUR' },
                    { name: 'Kreditkarte', bank: 'Revolut', balance: '-1.234,56 EUR' },
                  ].map((account, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{account.name}</p>
                        <p className="text-xs text-gray-500">{account.bank}</p>
                      </div>
                      <span className={`font-semibold ${
                        account.balance.startsWith('-') ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {account.balance}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Gesamtsaldo</span>
                    <span className="text-xl font-bold text-[#14ad9f]">38.333,33 EUR</span>
                  </div>
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
            Ihre Finanzen im Griff
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
