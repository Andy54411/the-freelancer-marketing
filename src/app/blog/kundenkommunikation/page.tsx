import type { Metadata } from 'next';
import { ArrowLeft, MessageCircle, Star, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tipps zur Kundenkommunikation auf Taskilo - Erfolgreicher Service',
  description:
    'Professionelle Kundenkommunikation für Dienstleister: Chat-Tipps, Konfliktlösung, Bewertungen verbessern und langfristige Kundenbeziehungen aufbauen.',
  keywords:
    'Kundenkommunikation, Kundenservice, Taskilo, Dienstleister, Chat, Bewertungen, Kundenbeziehung',
  openGraph: {
    title: 'Professionelle Kundenkommunikation auf Taskilo',
    description:
      'Expertentipps für bessere Kundenkommunikation, höhere Bewertungen und mehr Folgeaufträge.',
    type: 'article',
  },
};

export default function KundenkommunikationPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-linear-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="bg-white/95 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-[#14ad9f] font-bold text-sm">T</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Taskilo</span>
              </Link>
              <Link
                href="/blog"
                className="flex items-center space-x-2 text-gray-600 hover:text-[#14ad9f] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zurück zum Blog</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="bg-linear-to-r from-blue-500 to-purple-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3 mb-6">
              <MessageCircle className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">
                Tipps zur Kundenkommunikation auf Taskilo
              </h1>
            </div>
            <p className="text-xl text-blue-100 leading-relaxed">
              Excellente Kommunikation ist der Schlüssel zu 5-Sterne-Bewertungen, Folgeaufträgen und
              einer erfolgreichen Dienstleister-Karriere auf Taskilo.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Kommunikations-Impact */}
          <div className="bg-blue-50 rounded-xl p-8 mb-12 border border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Der Impact guter Kommunikation
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">+87%</div>
                <p className="text-gray-700">mehr 5-Sterne-Bewertungen</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">+154%</div>
                <p className="text-gray-700">mehr Folgeaufträge</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">+62%</div>
                <p className="text-gray-700">höhere Weiterempfehlungsrate</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">-73%</div>
                <p className="text-gray-700">weniger Beschwerden & Konflikte</p>
              </div>
            </div>
          </div>

          {/* Die 5 Phasen der Kundenkommunikation */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Die 5 Phasen der erfolgreichen Kundenkommunikation
            </h2>

            {/* Phase 1: Erstkontakt */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Erstkontakt & Anfrage-Bearbeitung
                </h3>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Schnelle Reaktion (Goldene 2-Stunden-Regel)
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h5 className="font-semibold text-green-800 mb-2">Sofort antworten:</h5>
                      <p className="text-green-700 text-sm">
                        &quot;Vielen Dank für Ihre Anfrage! Ich erstelle Ihnen gerne ein
                        detailliertes Angebot. Bis heute Abend erhalten Sie alle
                        Informationen.&quot;
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-blue-800 mb-2">
                        Telefonische Klärung anbieten:
                      </h5>
                      <p className="text-blue-700 text-sm">
                        &quot;Für komplexe Fragen rufe ich Sie gerne an: Wann passt es Ihnen? Tel:
                        030 / 123 456 78&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Professioneller Ton</h4>
                  <div className="space-y-3">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-800 text-sm font-semibold">Richtig:</p>
                      <p className="text-green-700 text-sm italic">
                        &quot;Guten Tag Herr Schmidt, gerne unterstütze ich Sie bei der
                        Badsanierung. Für ein präzises Angebot benötige ich noch...&quot;
                      </p>
                    </div>

                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-red-800 text-sm font-semibold">Falsch:</p>
                      <p className="text-red-700 text-sm italic">
                        &quot;Hi, klar kann ich das machen. Kostet so 5-8k, je nachdem. Melde mich
                        wenn Zeit habe.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
                <h4 className="font-semibold text-[#14ad9f] mb-2">Taskilo-Erfolgsformel:</h4>
                <p className="text-gray-700">
                  Antwortzeit unter 2 Stunden + professioneller Ton + konkrete nächste Schritte =
                  85% höhere Wahrscheinlichkeit auf Auftrag!
                </p>
              </div>
            </div>

            {/* Phase 2: Beratung & Angebot */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Beratungsphase & Angebotserstellung
                </h3>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Bedarfsanalyse</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        Aktiv nachfragen: &quot;Welches Ergebnis stellen Sie sich vor?&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        Budget erfragen: &quot;Haben Sie einen groben Kostenrahmen im Kopf?&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        Zeitplan klären: &quot;Bis wann soll das Projekt fertig sein?&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        Besonderheiten beachten: &quot;Gibt es spezielle Wünsche?&quot;
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Beratungstipps</h4>
                  <div className="space-y-3">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-yellow-800 text-sm font-semibold">
                        Alternative Lösungen anbieten:
                      </p>
                      <p className="text-yellow-700 text-sm">
                        &quot;Es gibt 3 Ansätze für Ihr Projekt: Budget-Variante (3.000€), Standard
                        (5.000€) oder Premium (8.000€). Was spricht Sie an?&quot;
                      </p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-blue-800 text-sm font-semibold">Expertenwissen teilen:</p>
                      <p className="text-blue-700 text-sm">
                        &quot;Nach 15 Jahren Erfahrung empfehle ich in Ihrem Fall... Das spart
                        langfristig Kosten und ist nachhaltiger.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3: Auftragsbegleitung */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">3</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Auftragsbegleitung & Projektmanagement
                </h3>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Regelmäßige Updates</h4>
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">
                        Täglicher Status (große Projekte):
                      </h5>
                      <p className="text-green-700 text-sm">
                        &quot;Guten Morgen! Heute stehen Punkt 3-5 auf dem Plan: Elektroinstallation
                        Küche. Voraussichtlich bis 16 Uhr fertig. Fragen?&quot;
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">Foto-Updates:</h5>
                      <p className="text-blue-700 text-sm">
                        Zwischenstände fotografieren und per Taskilo-Chat senden. Kunden lieben es,
                        den Fortschritt zu sehen!
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Probleme proaktiv kommunizieren
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-orange-800 text-sm font-semibold">
                        Verzögerungen sofort melden:
                      </p>
                      <p className="text-orange-700 text-sm">
                        &quot;Leider Verzögerung: Material hat Lieferproblem. Neue Planung: Start
                        Mittwoch statt Montag. Entschuldigung für Unannehmlichkeiten!&quot;
                      </p>
                    </div>

                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-red-800 text-sm font-semibold">
                        Mehrkosten vorher besprechen:
                      </p>
                      <p className="text-red-700 text-sm">
                        &quot;Bei der Entfernung der Fliesen ist ein Wasserschaden aufgetreten.
                        Reparatur nötig: 300€. Soll ich das beheben oder warten Sie ab?&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 4: Abschluss & Übergabe */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">4</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Abschluss & Übergabe</h3>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    🎉 Professionelle Übergabe
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">✅ Gemeinsame Abnahme:</h5>
                      <p className="text-green-700 text-sm">
                        &quot;Lassen Sie uns gemeinsam durchgehen: Entspricht alles Ihren
                        Vorstellungen? Hier sind die Garantieunterlagen und Pflegetipps.&quot;
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">
                        📋 Dokumentation übergeben:
                      </h5>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Garantieunterlagen</li>
                        <li>• Pflegeanleitung</li>
                        <li>• Notfallkontakte</li>
                        <li>• Wartungsplan (falls relevant)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    ⭐ Bewertung aktiv ansprechen
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-yellow-800 text-sm font-semibold">
                        Höflich um Bewertung bitten:
                      </p>
                      <p className="text-yellow-700 text-sm">
                        &quot;Falls Sie zufrieden sind, würde ich mich sehr über eine ehrliche
                        Bewertung auf Taskilo freuen. Das hilft anderen Kunden bei der
                        Auswahl.&quot;
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-green-800 text-sm font-semibold">
                        Nachbetreuung anbieten:
                      </p>
                      <p className="text-green-700 text-sm">
                        &quot;Bei Fragen oder kleinen Problemen können Sie mich jederzeit
                        kontaktieren. Auch in 6 Monaten! Kundenzufriedenheit ist mir wichtig.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 5: Nachbetreuung */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">5</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Nachbetreuung & Kundenbindung</h3>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    🔄 Follow-Up Strategie
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">📞 Nach 1 Woche:</h5>
                      <p className="text-blue-700 text-sm">
                        &quot;Kurze Nachfrage: Läuft alles problemlos? Sind Sie zufrieden mit dem
                        Ergebnis?&quot;
                      </p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">📅 Nach 3 Monaten:</h5>
                      <p className="text-green-700 text-sm">
                        &quot;Wie gefällt Ihnen Ihr neues Bad? Falls Wartung oder weitere Projekte
                        anstehen, denken Sie gerne an mich!&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">💝 Mehrwert bieten</h4>
                  <div className="space-y-3">
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-purple-800 text-sm font-semibold">
                        Saisonale Tipps senden:
                      </p>
                      <p className="text-purple-700 text-sm">
                        &quot;Wintercheck: Vergessen Sie nicht die Heizungswartung! Gerne erstelle
                        ich ein Angebot.&quot;
                      </p>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-orange-800 text-sm font-semibold">Empfehlungsprogramm:</p>
                      <p className="text-orange-700 text-sm">
                        &quot;Kennen Sie jemanden, der auch renovieren möchte? Bei erfolgreicher
                        Vermittlung gibt&apos;s 5% Rabatt auf Ihr nächstes Projekt!&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schwierige Situationen meistern */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <AlertTriangle className="w-8 h-8 mr-2 text-orange-500" />
                Schwierige Situationen professionell meistern
              </h2>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🔥 Konflikt-Situationen
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-2">Kunde ist unzufrieden:</h4>
                      <p className="text-red-700 text-sm mb-2 italic">
                        &quot;Das sieht ganz anders aus als besprochen!&quot;
                      </p>
                      <div className="bg-white p-3 rounded border border-red-100">
                        <p className="text-green-800 text-sm font-semibold">
                          ✅ Richtige Reaktion:
                        </p>
                        <p className="text-gray-700 text-sm">
                          &quot;Das tut mir sehr leid! Lassen Sie uns das gemeinsam anschauen. Wo
                          genau sehen Sie Unterschiede zu unserer Absprache? Ich finde sicher eine
                          Lösung, mit der Sie zufrieden sind.&quot;
                        </p>
                      </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">Preisdiskussion:</h4>
                      <p className="text-orange-700 text-sm mb-2 italic">
                        &quot;Das ist viel teurer als gedacht!&quot;
                      </p>
                      <div className="bg-white p-3 rounded border border-orange-100">
                        <p className="text-green-800 text-sm font-semibold">
                          ✅ Richtige Reaktion:
                        </p>
                        <p className="text-gray-700 text-sm">
                          &quot;Verstehe Ihre Überraschung! Lassen Sie mich die Kalkulation
                          erklären: [Aufschlüsselung]. Gerne finden wir eine Budget-freundlichere
                          Variante.&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    💬 De-Eskalations-Techniken
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        <strong>Aktiv zuhören:</strong> &quot;Verstehe ich richtig, dass Sie sich
                        Sorgen machen wegen...&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        <strong>Empathie zeigen:</strong> &quot;Ich kann Ihren Ärger absolut
                        verstehen...&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        <strong>Verantwortung übernehmen:</strong> &quot;Das war mein Fehler, ich
                        kümmere mich sofort darum.&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        <strong>Lösungen anbieten:</strong> &quot;Hier sind 3 Wege, wie wir das
                        lösen können...&quot;
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        <strong>Timeline setzen:</strong> &quot;Bis morgen Abend haben Sie eine
                        Lösung von mir.&quot;
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 bg-[#14ad9f] bg-opacity-10 p-3 rounded-lg">
                    <p className="text-gray-700 text-sm">
                      <strong>Goldene Regel:</strong> Niemals defensiv werden! Immer
                      lösungsorientiert bleiben.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat-Etikette */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <MessageCircle className="w-8 h-8 mr-2 text-blue-500" />
                Taskilo-Chat perfekt nutzen
              </h2>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    💬 Chat-Dos and Don&apos;ts
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">✅ DOs:</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Antwort binnen 2-4 Stunden (Werktags)</li>
                        <li>• Vollständige Sätze schreiben</li>
                        <li>• Emojis sparsam aber freundlich nutzen 😊</li>
                        <li>• Fotos für besseres Verständnis senden</li>
                        <li>• Komplexe Themen telefonisch klären</li>
                      </ul>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-2">❌ DON&apos;Ts:</h4>
                      <ul className="text-red-700 text-sm space-y-1">
                        <li>
                          • Zu informeller Ton (&quot;Hey&quot;, &quot;Jo&quot;, &quot;Läuft&quot;)
                        </li>
                        <li>• Nachrichten nach 20 Uhr</li>
                        <li>• Endlos-Monologe ohne Struktur</li>
                        <li>• Schlechte Nachrichten ohne Lösungsvorschlag</li>
                        <li>• Automatische Antworten bei wichtigen Themen</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📱 Chat-Features optimal nutzen
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">📸 Foto-Funktion:</h4>
                      <p className="text-blue-700 text-sm">
                        Vorher/Nachher-Bilder, Materialproben, Fortschritte dokumentieren
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">📍 Standort teilen:</h4>
                      <p className="text-purple-700 text-sm">
                        &quot;Bin in 10 Minuten da!&quot; - Live-Location bei Anfahrt
                      </p>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">📄 Dokumente senden:</h4>
                      <p className="text-orange-700 text-sm">
                        Angebote, Rechnungen, Garantieunterlagen direkt im Chat
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">
                        ⏰ Termine koordinieren:
                      </h4>
                      <p className="text-green-700 text-sm">
                        Taskilo-Kalender Integration für einfache Terminabsprachen
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bewertungsmanagement */}
          <div className="mb-12">
            <div className="bg-linear-to-r from-yellow-400 to-orange-500 rounded-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <Star className="w-8 h-8 mr-2" />
                Bewertungsmanagement - 5 Sterne garantiert
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">🎯 Vor dem Projekt</h3>
                  <div className="space-y-2 text-yellow-100">
                    <p>• Realistische Erwartungen setzen</p>
                    <p>• Kommunikationsstil klären</p>
                    <p>• Timeline abstimmen</p>
                    <p>• Qualitätsstandards definieren</p>
                  </div>
                </div>

                <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">🔧 Während dem Projekt</h3>
                  <div className="space-y-2 text-yellow-100">
                    <p>• Regelmäßige Updates senden</p>
                    <p>• Probleme proaktiv ansprechen</p>
                    <p>• Sauber arbeiten & aufräumen</p>
                    <p>• Flexibel auf Wünsche eingehen</p>
                  </div>
                </div>

                <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">⭐ Nach dem Projekt</h3>
                  <div className="space-y-2 text-yellow-100">
                    <p>• Professionelle Übergabe</p>
                    <p>• Nachbetreuung anbieten</p>
                    <p>• Höflich um Bewertung bitten</p>
                    <p>• Langfristig erreichbar bleiben</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-white bg-opacity-20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">🏆 Geheimtipp für 5-Sterne-Bewertungen:</h4>
                <p className="text-yellow-100">
                  Übertreffen Sie Erwartungen bei kleinen Details: Kostenlose Zusatzleistung,
                  perfekte Sauberkeit, pünktliche Lieferung, persönliche Note. Das bleibt in
                  Erinnerung!
                </p>
              </div>
            </div>
          </div>

          {/* Kommunikations-Templates */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                📝 Kommunikations-Templates für jede Situation
              </h2>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🟢 Positive Situationen
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">Projektstart:</h4>
                      <p className="text-green-700 text-sm italic">
                        &quot;Guten Morgen! Heute startet Ihr Projekt. Wir kommen um 8 Uhr, haben
                        alle Materialien dabei und rechnen mit Fertigstellung bis Freitag. Freue
                        mich auf die Zusammenarbeit!&quot;
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Fortschritt-Update:</h4>
                      <p className="text-blue-700 text-sm italic">
                        &quot;Update Tag 3: Grundarbeiten abgeschlossen, morgen beginnen wir mit
                        [nächster Schritt]. Bisher läuft alles planmäßig. Anbei Foto vom aktuellen
                        Stand 📸&quot;
                      </p>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">
                        Erfolgreicher Abschluss:
                      </h4>
                      <p className="text-green-700 text-sm italic">
                        &ldquo;Geschafft! 🎉 Ihr Projekt ist fertig und ich bin sehr zufrieden mit
                        dem Ergebnis. Gerne führe ich Sie durch alles und erkläre die Pflege. Zeit
                        für die Übergabe?&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🟡 Herausfordernde Situationen
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">Verzögerung:</h4>
                      <p className="text-orange-700 text-sm italic">
                        &ldquo;Wichtiger Hinweis: Durch [konkreter Grund] verzögert sich das Projekt
                        um 2 Tage. Neuer Termin: [Datum]. Entschuldigung für die Unannehmlichkeiten!
                        Kompensation: [Vorschlag]&rdquo;
                      </p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-2">Unerwartetes Problem:</h4>
                      <p className="text-red-700 text-sm italic">
                        &ldquo;Unvorhergesehenes entdeckt: [Problem]. Das bedeutet [Auswirkung].
                        Meine Lösungsvorschläge: 1) [Option A] 2) [Option B]. Was ist Ihre
                        Präferenz? Rufe um 14 Uhr an.&rdquo;
                      </p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2">Nachbesserung nötig:</h4>
                      <p className="text-yellow-700 text-sm italic">
                        &ldquo;Sie haben absolut recht - das entspricht nicht meinen Standards.
                        Komme morgen früh und bringe das in Ordnung. Selbstverständlich kostenfrei.
                        Vielen Dank für den Hinweis!&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Erfolgsmessung */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="w-8 h-8 mr-2 text-[#14ad9f]" />
                Ihren Kommunikationserfolg messen
              </h2>

              <div className="grid lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Wichtige KPIs:</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold">Antwortzeit:</span>
                      <span className="text-[#14ad9f] font-bold">&lt; 2 Stunden</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold">Bewertungsdurchschnitt:</span>
                      <span className="text-[#14ad9f] font-bold">4.8+ Sterne</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold">Folgeaufträge:</span>
                      <span className="text-[#14ad9f] font-bold">30%+ Quote</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold">Beschwerden:</span>
                      <span className="text-[#14ad9f] font-bold">&lt; 5% aller Aufträge</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🎯 Verbesserungsmaßnahmen:
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">Wöchentliche Bewertungsanalyse durchführen</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">Kundenfeedback systematisch sammeln</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">
                        Erfolgreiche Kommunikationspatterns dokumentieren
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">Regelmäßig Konkurrenz-Profile studieren</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span className="text-sm">Taskilo-Webinare und Schulungen besuchen</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Starten Sie mit professioneller Kommunikation durch!
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Nutzen Sie diese Tipps für zufriedenere Kunden, bessere Bewertungen und mehr Erfolg.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/anbieter/dashboard"
                className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-taskilo-hover transition-colors"
              >
                Zur Kundenbetreuung
              </Link>
              <Link
                href="/anbieter/schulungen"
                className="border-2 border-[#14ad9f] text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-[#14ad9f] hover:text-white transition-colors"
              >
                Kommunikations-Schulung
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900/90 backdrop-blur-sm text-white py-8 mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-300">
              © 2025 Taskilo. Alle Rechte vorbehalten. |
              <Link href="/datenschutz" className="hover:text-[#14ad9f] ml-2">
                Datenschutz
              </Link>{' '}
              |
              <Link href="/agb" className="hover:text-[#14ad9f] ml-2">
                AGB
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
