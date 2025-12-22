'use client';

import { motion } from 'framer-motion';
import { Building2, Mail, Globe, FileText, AlertCircle, Server } from 'lucide-react';
import { HeroHeader } from '@/components/hero8-header';
import { Card, CardContent } from '@/components/ui/card';

export default function ImpressumPage() {
  const sections = [
    {
      icon: Building2,
      title: 'Angaben gemäß § 5 TMG',
      content: (
        <div className="space-y-2">
          <p>
            <strong>The Freelancer Marketing Ltd.</strong>
          </p>
          <p>Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2</p>
          <p>8015, Paphos Cyprus</p>
          <p>Registrierungsnummer: HE 458650</p>
          <p>VAT: CY60058879W</p>
        </div>
      ),
    },
    {
      icon: Mail,
      title: 'Kontakt',
      content: (
        <div className="space-y-2">
          <p>
            <strong>E-Mail:</strong> info@taskilo.de
          </p>
          <p>
            <strong>Support:</strong> support@taskilo.de
          </p>
          <p>
            <strong>Rechtliche Angelegenheiten:</strong> legal@taskilo.de
          </p>
          <p>
            <strong>Website:</strong> www.taskilo.de
          </p>
        </div>
      ),
    },
    {
      icon: FileText,
      title: 'Handelsregister',
      content: (
        <div className="space-y-2">
          <p>
            <strong>Handelsregister:</strong> Companies Registration Office Cyprus
          </p>
          <p>
            <strong>Registernummer:</strong> HE 458650
          </p>
          <p>
            <strong>VAT-Nummer:</strong> CY60058879W
          </p>
        </div>
      ),
    },
    {
      icon: Globe,
      title: 'Umsatzsteuer-ID',
      content: (
        <div>
          <p>
            <strong>VAT-Identifikationsnummer:</strong>
          </p>
          <p>CY60058879W</p>
        </div>
      ),
    },
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
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1920&q=80"
            alt="Legal Background"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/90 to-teal-700/95" />
        </div>

        {/* Content */}
        <div className="relative z-10 py-20 pt-32">
          <div className="max-w-4xl mx-auto px-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-bold text-white drop-shadow-lg mb-8"
            >
              Impressum
            </motion.h1>

            <div className="space-y-6">
              {sections.map((section, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <motion.div
                          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                          transition={{ duration: 0.5 }}
                          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                        >
                          <section.icon className="w-5 h-5 text-white" />
                        </motion.div>
                        <h2 className="text-xl font-semibold text-white drop-shadow-lg">
                          {section.title}
                        </h2>
                      </div>
                      <div className="text-white/90 drop-shadow-lg">{section.content}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Verantwortlich */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                      >
                        <Building2 className="w-5 h-5 text-white" />
                      </motion.div>
                      <h2 className="text-xl font-semibold text-white drop-shadow-lg">
                        Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
                      </h2>
                    </div>
                    <div className="text-white/90 drop-shadow-lg space-y-2">
                      <p>Andy Staudinger</p>
                      <p>Geschäftsführung</p>
                      <p>The Freelancer Marketing Ltd.</p>
                      <p>Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2</p>
                      <p>8015, Paphos Cyprus</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Haftungsausschluss */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                      >
                        <AlertCircle className="w-5 h-5 text-white" />
                      </motion.div>
                      <h2 className="text-xl font-semibold text-white drop-shadow-lg">
                        Haftungsausschluss
                      </h2>
                    </div>
                    <div className="text-white/90 drop-shadow-lg space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Haftung für Inhalte</h3>
                        <p>
                          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen
                          Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind
                          wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte
                          oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
                          forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          Hosting
                        </h3>
                        <p>Diese Website wird gehostet bei:</p>
                        <p className="mt-2">
                          <strong>Siteground</strong>
                          <br />
                          Siteground Spain S.L.
                          <br />
                          Calle Miquel Granell, 11
                          <br />
                          03203 Elche, Spanien
                        </p>
                        <p className="mt-2">
                          Domain: taskilo.de
                          <br />
                          Registrar: Siteground
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Haftung für Links</h3>
                        <p>
                          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
                          wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
                          keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
                          jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Markenhinweis</h3>
                        <p>
                          Taskilo ist eine angemeldete Marke (Aktenzeichen: DE 3020252302804,
                          Anmeldetag: 14.07.2025) der Elisabeth Schröder und Andy Staudinger. Die Marke
                          ist geschützt für technologische Dienstleistungen, Software-Entwicklung und
                          elektronische Anwendungen.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
