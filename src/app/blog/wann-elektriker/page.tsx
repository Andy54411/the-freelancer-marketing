import type { Metadata } from 'next';
import {
  ArrowLeft,
  Zap,
  AlertTriangle,
  CheckCircle,
  Phone,
  Home,
  Wrench,
  Shield,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Wann brauche ich einen professionellen Elektriker? - Taskilo Ratgeber',
  description:
    'Elektriker beauftragen oder selbst machen? Erfahren Sie, wann Elektroarbeiten nur vom Fachmann durchgeführt werden dürfen und welche Arbeiten erlaubt sind.',
  keywords: 'Elektriker, Elektroinstallation, Elektroarbeiten, VDE, Sicherheit, Taskilo, Elektro',
  openGraph: {
    title: 'Wann brauche ich einen professionellen Elektriker?',
    description:
      'Sicherheit bei Elektroarbeiten: Wann Profis ran müssen und was Sie selbst machen dürfen.',
    type: 'article',
  },
};

export default function ElektrikerRatgeberPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="bg-white/95 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#14ad9f] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
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
        <section className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3 mb-6">
              <Zap className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold">
                Wann brauche ich einen professionellen Elektriker?
              </h1>
            </div>
            <p className="text-xl text-yellow-100 leading-relaxed">
              Sicherheit geht vor! Erfahren Sie, welche Elektroarbeiten nur vom Fachmann
              durchgeführt werden dürfen und bei welchen Projekten Sie unbedingt einen
              zertifizierten Elektriker beauftragen sollten.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Warning Box */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-12">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ SICHERHEITSHINWEIS</h2>
                <p className="text-red-700 text-lg">
                  Elektroarbeiten können lebensgefährlich sein! Unsachgemäße Installationen führen
                  zu Stromschlägen, Bränden und Versicherungsproblemen. Bei Zweifeln immer einen
                  zertifizierten Elektriker beauftragen.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Decision Guide */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Schnell-Entscheidung: Profi oder Eigenleistung?
            </h2>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Immer Profi */}
              <div className="bg-red-50 rounded-xl p-8 border border-red-200">
                <div className="flex items-center space-x-3 mb-6">
                  <Shield className="w-8 h-8 text-red-500" />
                  <h3 className="text-2xl font-bold text-red-800">IMMER PROFI BEAUFTRAGEN</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">
                      🔌 Anschlüsse an Hauptstromkreis
                    </h4>
                    <p className="text-red-700 text-sm">
                      Steckdosen, Schalter, Verteilerkästen - nur VDE-zertifizierte Elektriker!
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">🏠 Festinstallationen</h4>
                    <p className="text-red-700 text-sm">
                      Deckenlampen, Einbaustrahler, Küchengeräte-Anschluss
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">💧 Feuchträume</h4>
                    <p className="text-red-700 text-sm">
                      Badezimmer, Küche, Keller - besondere Schutzbestimmungen!
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">
                      🔧 Verteilerkästen & Sicherungen
                    </h4>
                    <p className="text-red-700 text-sm">
                      FI-Schalter, Sicherungsautomaten, Zähleranschluss
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-2">⚡ Hochvolt-Bereiche</h4>
                    <p className="text-red-700 text-sm">
                      Alles über 50V, Starkstrom (400V), E-Auto-Ladestationen
                    </p>
                  </div>
                </div>
              </div>

              {/* Eventuell Eigenleistung */}
              <div className="bg-green-50 rounded-xl p-8 border border-green-200">
                <div className="flex items-center space-x-3 mb-6">
                  <Wrench className="w-8 h-8 text-green-500" />
                  <h3 className="text-2xl font-bold text-green-800">EVENTUELL EIGENLEISTUNG</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-800 mb-2">💡 Lampen wechseln</h4>
                    <p className="text-green-700 text-sm">
                      Glühbirnen, LED-Spots - aber STROM AUS und bei Unsicherheit Profi!
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-800 mb-2">🔌 Einfache Reparaturen</h4>
                    <p className="text-green-700 text-sm">
                      Kabel von Elektrogeräten, Stecker austauschen (12V/24V)
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-800 mb-2">🎵 Niedervolt-Systeme</h4>
                    <p className="text-green-700 text-sm">
                      12V LED-Stripes, Klingel, Türsprechanlage (je nach System)
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-800 mb-2">📱 Smart Home (teilweise)</h4>
                    <p className="text-green-700 text-sm">
                      Batteriebasierte Sensoren, WLAN-Geräte ohne Festinstallation
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800 text-sm font-semibold">
                      ⚠️ ACHTUNG: Auch bei "erlaubten" Arbeiten gilt - im Zweifel lieber den Profi!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Situationen im Detail */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Konkrete Situationen: Wann Sie einen Elektriker brauchen
            </h2>

            {/* Renovation */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Home className="w-6 h-6 mr-2 text-[#14ad9f]" />
                Renovierung & Umzug
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">
                    🚫 Zwingend Elektriker beauftragen:
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Zusätzliche Steckdosen installieren</li>
                    <li>• Lichtschalter versetzen oder ergänzen</li>
                    <li>• Küchengeräte anschließen (Herd, Geschirrspüler)</li>
                    <li>• Elektroheizung installieren</li>
                    <li>• Rollläden mit Motorsteuerung</li>
                    <li>• Unterputz-Verlegung von Kabeln</li>
                    <li>• Sicherungskasten erweitern</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-green-800 mb-3">
                    ✅ Eventuell selbst machbar:
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Lampen in bestehende Fassungen einsetzen</li>
                    <li>• Aufputz-Verlängerungskabel (sichtbar)</li>
                    <li>• Batteriebetriebene Beleuchtung</li>
                    <li>• Mobile Elektrogeräte anschließen</li>
                  </ul>

                  <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-yellow-800 text-sm">
                      <strong>Tipp:</strong> Auch "einfache" Arbeiten sollten vom Elektriker
                      abgenommen werden, um Versicherungsschutz zu gewährleisten.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Home */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Phone className="w-6 h-6 mr-2 text-[#14ad9f]" />
                Smart Home & Automation
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">🚫 Immer Elektriker:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Unterputz-Schalter mit WLAN/Zigbee</li>
                    <li>• Einbau-Dimmer für Deckenlicht</li>
                    <li>• Fest installierte Überwachungskameras</li>
                    <li>• Elektrische Türöffner</li>
                    <li>• KNX/EIB-Bussysteme</li>
                    <li>• Smart-Home-Zentralen mit Festanschluss</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-green-800 mb-3">✅ Oft selbst möglich:</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>• WLAN-Zwischenstecker</li>
                    <li>• Batteriebasierte Sensoren (Tür, Fenster)</li>
                    <li>• Philips Hue & ähnliche Lichtsysteme</li>
                    <li>• Echo, Google Home (nur Einstecken)</li>
                    <li>• WLAN-Thermostate (bei Batteriebetrieb)</li>
                  </ul>

                  <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-blue-800 text-sm">
                      <strong>Smart-Home-Regel:</strong> Alles was in die Steckdose gesteckt wird =
                      OK. Alles was fest verkabelt wird = Elektriker!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notfälle */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
                Notfälle & Problemfälle
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-red-800 mb-3">
                    🚨 SOFORT Elektriker/Notdienst:
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Stromausfall in der ganzen Wohnung</li>
                    <li>• Sicherung springt ständig raus</li>
                    <li>• Funkenflug aus Steckdosen/Schaltern</li>
                    <li>• Brandgeruch bei Elektrogeräten</li>
                    <li>• FI-Schalter löst dauerhaft aus</li>
                    <li>• Kribbeln/Stromschlag bei Berührung</li>
                    <li>• Wasserschaden an Elektroinstallation</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-orange-800 mb-3">
                    ⏰ Baldmöglichst Elektriker:
                  </h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Einzelne Steckdosen funktionieren nicht</li>
                    <li>• Lichtschalter reagieren nicht</li>
                    <li>• Küchengeräte gehen nicht an</li>
                    <li>• Elektroheizung bleibt kalt</li>
                    <li>• WLAN-Router bekommt keinen Strom</li>
                  </ul>

                  <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-red-800 text-sm font-semibold">
                      Bei Elektro-Notfällen: Hauptschalter ausschalten, Feuerwehr (112) bei Brand,
                      dann sofort Elektriker-Notdienst kontaktieren!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kosten */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-6">💰 Was kostet ein Elektriker?</h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">🔧 Standard-Arbeiten</h3>
                  <div className="space-y-2 text-[#e6fffe]">
                    <p>• Steckdose setzen: 80-150€</p>
                    <p>• Lichtschalter: 60-120€</p>
                    <p>• Deckenlampe: 100-200€</p>
                    <p>• Küchengerät anschließen: 120-250€</p>
                    <p>• Stundensatz: 50-80€</p>
                  </div>
                </div>

                <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">🏠 Größere Projekte</h3>
                  <div className="space-y-2 text-[#e6fffe]">
                    <p>• Elektro-Komplettsanierung: 8.000-15.000€</p>
                    <p>• Küchen-Elektrik: 1.500-3.000€</p>
                    <p>• Bad-Elektrik: 1.000-2.500€</p>
                    <p>• Smart Home Basis: 2.000-5.000€</p>
                  </div>
                </div>

                <div className="bg-white bg-opacity-20 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">🚨 Notdienst</h3>
                  <div className="space-y-2 text-[#e6fffe]">
                    <p>• Wochenende: +50% Aufschlag</p>
                    <p>• Nachts: +100% Aufschlag</p>
                    <p>• Feiertage: +100% Aufschlag</p>
                    <p>• Anfahrt: 50-100€</p>
                    <p>• Notdienst-Pauschale: 150-300€</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sicherheitstipps */}
          <div className="mb-12">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Shield className="w-8 h-8 mr-2 text-[#14ad9f]" />
                Sicherheitstipps für Heimwerker
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">✅ IMMER beachten:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span>Hauptschalter ausschalten vor jeder Arbeit</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span>Spannungsprüfer verwenden - nie "blind" vertrauen</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span>Isolierte Werkzeuge verwenden</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span>Bei Feuchtigkeit NIEMALS arbeiten</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1 shrink-0" />
                      <span>Arbeiten niemals alleine durchführen</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🚫 NIEMALS machen:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                      <span>Mit nassen Händen oder Füßen arbeiten</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                      <span>Sicherungen oder FI-Schalter überbrücken</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                      <span>Billige Baumarkt-Kabel für Festinstallation</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                      <span>An 400V-Anschlüssen (Herd, etc.) arbeiten</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                      <span>Arbeiten unter Zeitdruck durchführen</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">⚡ Lebensgefahr!</h4>
                <p className="text-red-700">
                  Strom kann tödlich sein! 50V können bereits ausreichen, um einen Herzstillstand zu
                  verursachen. 230V-Haushaltsstrom ist extrem gefährlich. Bei geringstem Zweifel:
                  Finger weg und Profi rufen!
                </p>
              </div>
            </div>
          </div>

          {/* Qualifikationen */}
          <div className="mb-12">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                🎓 Qualifikationen eines professionellen Elektrikers
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    📜 Mindest-Qualifikationen:
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-semibold text-blue-800">Elektrotechnik-Ausbildung</p>
                      <p className="text-blue-700 text-sm">
                        3,5 Jahre Ausbildung + Gesellenprüfung
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-semibold text-blue-800">VDE-Zertifizierung</p>
                      <p className="text-blue-700 text-sm">
                        Berechtigung für Arbeiten an Niederspannungsanlagen
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-semibold text-blue-800">Gewerbeberechtigung</p>
                      <p className="text-blue-700 text-sm">
                        Eingetragener Elektroinstallateur-Betrieb
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-semibold text-blue-800">Haftpflichtversicherung</p>
                      <p className="text-blue-700 text-sm">Mindestens 1 Mio. € Deckungssumme</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🏆 Zusätzliche Spezialisierungen:
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="font-semibold text-green-800">KNX/EIB Smart Home</p>
                      <p className="text-green-700 text-sm">Zertifizierung für Bussysteme</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="font-semibold text-green-800">E-Mobilität</p>
                      <p className="text-green-700 text-sm">Wallbox-Installation und Wartung</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="font-semibold text-green-800">Photovoltaik</p>
                      <p className="text-green-700 text-sm">
                        Solaranlagen-Planung und Installation
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="font-semibold text-green-800">Gebäudeautomation</p>
                      <p className="text-green-700 text-sm">Komplexe Steuerungssysteme</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-[#14ad9f] bg-opacity-10 p-4 rounded-lg">
                <h4 className="font-semibold text-[#14ad9f] mb-2">🔍 Taskilo-Qualitätsprüfung:</h4>
                <p className="text-gray-700">
                  Alle Elektriker auf Taskilo durchlaufen eine umfassende Qualifikationsprüfung. Wir
                  prüfen Ausbildungsnachweise, VDE-Zertifikate, Gewerbeanmeldung und
                  Versicherungsschutz.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-12">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">❓ Häufige Fragen</h2>

              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Darf ich eine Lampe selbst anschließen?
                  </h3>
                  <p className="text-gray-700">
                    Das Wechseln von Glühbirnen ist erlaubt. Das Anschließen neuer Lampen an die
                    Elektroinstallation (Deckenanschluss) sollte vom Elektriker gemacht werden, da
                    es sich um eine Festinstallation handelt.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Was passiert wenn ich selbst Elektroarbeiten mache?
                  </h3>
                  <p className="text-gray-700">
                    Bei unsachgemäßen Elektroarbeiten erlischt der Versicherungsschutz. Im
                    Schadensfall (Brand, Wasserschaden) zahlt die Versicherung nicht und Sie haften
                    persönlich für alle Schäden.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Wie erkenne ich einen seriösen Elektriker?
                  </h3>
                  <p className="text-gray-700">
                    Seriöse Elektriker haben eine Gewerbeanmeldung, VDE-Zertifizierung,
                    Haftpflichtversicherung, geben detaillierte Kostenvoranschläge und haben
                    positive Kundenbewertungen.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Was kostet ein Elektriker-Notdienst?
                  </h3>
                  <p className="text-gray-700">
                    Notdienste kosten 150-300€ Grundpauschale plus Stundenlohn (75-120€) plus
                    Material. An Wochenenden und nachts kommen 50-100% Aufschlag dazu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Sicherheit geht vor - Professionelle Elektriker finden
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Beauftragen Sie zertifizierte und versicherte Elektriker für alle Elektroarbeiten.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/services/elektriker"
                className="bg-[#14ad9f] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#129488] transition-colors"
              >
                Elektriker finden
              </Link>
              <Link
                href="/services/notdienst"
                className="bg-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Elektro-Notdienst
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
