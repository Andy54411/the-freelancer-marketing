'use client';

import React from 'react';
import {
  FiCreditCard,
  FiShield,
  FiCheck,
  FiClock,
  FiUser,
  FiUsers,
  FiArrowRight,
  FiAlertCircle,
  FiDollarSign,
  FiLock,
} from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function ZahlungsablaeufeGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />

        {/* Header */}
        <div className="text-white py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">Zahlungsabläufe bei Taskilo</h1>
            <p className="text-xl text-white/90 drop-shadow-md">
              Transparente und sichere Zahlungen für Kunden und Dienstleister
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-12">
            {/* Einführung */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#14ad9f] to-teal-500 rounded-full flex items-center justify-center">
                    <FiShield className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Sichere Zahlungen mit Stripe</h2>
                </div>

                <p className="text-gray-700 text-lg mb-4">
                  Bei Taskilo verwenden wir <strong>Stripe Connect</strong> für alle Zahlungen. Dies
                  gewährleistet höchste Sicherheitsstandards und transparente Abläufe für alle
                  Beteiligten.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <FiLock className="text-green-600 text-xl mb-2" />
                    <h3 className="font-semibold text-green-900 mb-2">Bank-Level Sicherheit</h3>
                    <p className="text-green-800 text-sm">
                      SSL-Verschlüsselung und PCI DSS Level 1 Compliance
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <FiCreditCard className="text-blue-600 text-xl mb-2" />
                    <h3 className="font-semibold text-blue-900 mb-2">Alle Zahlungsmittel</h3>
                    <p className="text-blue-800 text-sm">
                      Kreditkarten, SEPA, Apple Pay, Google Pay und mehr
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Für Kunden */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <FiUser className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Für Kunden</h2>
                </div>

                {/* Standard Zahlungen */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiCreditCard className="text-[#14ad9f]" />
                    Standard-Zahlungen (Festpreis)
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                      <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Service buchen</h4>
                        <p className="text-gray-600 text-sm">
                          Sie wählen einen Service mit Festpreis und buchen ihn direkt
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                      <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Sofortige Zahlung</h4>
                        <p className="text-gray-600 text-sm">
                          Sichere Bezahlung über Stripe - Geld wird auf unserem Treuhandkonto
                          gehalten
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                      <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Service-Durchführung</h4>
                        <p className="text-gray-600 text-sm">
                          Der Dienstleister führt den Service durch
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        4
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">Automatische Freigabe</h4>
                        <p className="text-green-800 text-sm">
                          Nach Abschluss wird das Geld automatisch an den Dienstleister übertragen
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zusätzliche Stunden */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiClock className="text-orange-500" />
                    Zusätzliche Arbeitszeit
                  </h3>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <FiAlertCircle className="text-orange-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-orange-900 mb-2">
                          Was passiert bei Mehrarbeit?
                        </h4>
                        <p className="text-orange-800 text-sm mb-4">
                          Wenn der Service mehr Zeit benötigt als geplant, dokumentiert der
                          Dienstleister die zusätzlichen Stunden und reicht sie zur Freigabe ein.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <FiCheck className="text-green-600" />
                        <span className="text-sm text-gray-700">
                          Sie erhalten eine Benachrichtigung über zusätzliche Stunden
                        </span>
                      </div>
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <FiCheck className="text-green-600" />
                        <span className="text-sm text-gray-700">
                          Sie können die Stunden prüfen und genehmigen
                        </span>
                      </div>
                      <div className="flex items-center gap-3 bg-white rounded-lg p-3">
                        <FiCheck className="text-green-600" />
                        <span className="text-sm text-gray-700">
                          Sofortige sichere Zahlung nach Genehmigung
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sicherheit für Kunden */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FiShield className="text-blue-600" />
                    Ihr Schutz als Kunde
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-3 text-blue-800">
                      <FiCheck className="text-blue-600 flex-shrink-0" />
                      <span className="text-sm">
                        Geld wird erst nach Ihrer Bestätigung freigegeben
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-blue-800">
                      <FiCheck className="text-blue-600 flex-shrink-0" />
                      <span className="text-sm">Transparente Aufschlüsselung aller Kosten</span>
                    </li>
                    <li className="flex items-center gap-3 text-blue-800">
                      <FiCheck className="text-blue-600 flex-shrink-0" />
                      <span className="text-sm">Dispute-Management bei Problemen</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Für Dienstleister */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <FiUsers className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Für Dienstleister</h2>
                </div>

                {/* Stripe Connect Setup */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiCreditCard className="text-[#14ad9f]" />
                    Zahlungsempfang einrichten
                  </h3>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                    <div className="flex items-start gap-3">
                      <FiAlertCircle className="text-yellow-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-yellow-900 mb-2">
                          Einmalige Einrichtung erforderlich
                        </h4>
                        <p className="text-yellow-800 text-sm">
                          Um Zahlungen empfangen zu können, müssen Sie Ihr Stripe Connect Konto
                          einrichten. Dies ist gesetzlich vorgeschrieben und dauert nur wenige
                          Minuten.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                      <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Unternehmensdaten angeben</h4>
                        <p className="text-gray-600 text-sm">
                          Firmenname, Adresse und Steuernummer
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 bg-gray-50 rounded-lg p-4">
                      <div className="w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Bankkonto verknüpfen</h4>
                        <p className="text-gray-600 text-sm">IBAN für Auszahlungen hinterlegen</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-green-900">Zahlungen empfangen</h4>
                        <p className="text-green-800 text-sm">
                          Sie können sofort Aufträge annehmen und Zahlungen erhalten
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auszahlungen */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FiDollarSign className="text-green-500" />
                    Auszahlungen
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">Automatische Auszahlung</h4>
                      <p className="text-green-800 text-sm mb-3">
                        Nach Auftragsabschluss wird das Geld automatisch auf Ihr Konto überwiesen
                      </p>
                      <div className="space-y-1 text-xs text-green-700">
                        <div>• Täglich um 16:00 Uhr</div>
                        <div>• 1-2 Werktage Bearbeitungszeit</div>
                        <div>• Keine zusätzlichen Kosten</div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Platform-Gebühr</h4>
                      <p className="text-blue-800 text-sm mb-3">
                        Transparente Provisionsabrechnung
                      </p>
                      <div className="space-y-1 text-xs text-blue-700">
                        <div>• 5-10% Platform-Gebühr</div>
                        <div>• Automatisch abgezogen</div>
                        <div>• Detaillierte Abrechnung</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zusätzliche Stunden für Dienstleister */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiClock className="text-[#14ad9f]" />
                    Zusätzliche Arbeitszeit abrechnen
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FiArrowRight className="text-[#14ad9f] mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Stunden dokumentieren</p>
                        <p className="text-xs text-gray-600">
                          Zusätzliche Arbeitszeit genau erfassen
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiArrowRight className="text-[#14ad9f] mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Freigabe einreichen</p>
                        <p className="text-xs text-gray-600">
                          Kunde erhält Benachrichtigung zur Prüfung
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiArrowRight className="text-[#14ad9f] mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Automatische Zahlung</p>
                        <p className="text-xs text-gray-600">
                          Nach Genehmigung sofortige Abrechnung
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Gebühren & Kosten */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                    <FiDollarSign className="text-white text-xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Gebühren & Transparenz</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-semibold text-green-900 mb-3">Für Kunden</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-3 text-green-800">
                        <FiCheck className="text-green-600 flex-shrink-0" />
                        <span className="text-sm">Keine versteckten Kosten</span>
                      </li>
                      <li className="flex items-center gap-3 text-green-800">
                        <FiCheck className="text-green-600 flex-shrink-0" />
                        <span className="text-sm">Transparente Preisgestaltung</span>
                      </li>
                      <li className="flex items-center gap-3 text-green-800">
                        <FiCheck className="text-green-600 flex-shrink-0" />
                        <span className="text-sm">Stripe-Gebühren bereits eingerechnet</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">Für Dienstleister</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-3 text-blue-800">
                        <FiCheck className="text-blue-600 flex-shrink-0" />
                        <span className="text-sm">5-10% Platform-Gebühr</span>
                      </li>
                      <li className="flex items-center gap-3 text-blue-800">
                        <FiCheck className="text-blue-600 flex-shrink-0" />
                        <span className="text-sm">Kostenlose Auszahlungen</span>
                      </li>
                      <li className="flex items-center gap-3 text-blue-800">
                        <FiCheck className="text-blue-600 flex-shrink-0" />
                        <span className="text-sm">Detaillierte Abrechnungen</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Support */}
            <section>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Fragen zu Zahlungen?</h2>
                  <p className="text-gray-600 mb-6">
                    Unser Support-Team hilft Ihnen gerne bei allen Fragen rund um Zahlungen und
                    Abrechnungen.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                      href="mailto:support@taskilo.de"
                      className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
                    >
                      E-Mail Support
                    </a>
                    <a
                      href="/contact"
                      className="border border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Kontakt aufnehmen
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
