import type { Metadata } from 'next';
import {
  ArrowLeft,
  Shield,
  Lock,
  RefreshCw,
  Scale,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Taskilo Käuferschutz & Garantie - Ihre Sicherheit beim Kauf | Taskilo',
  description:
    'Detaillierte Erklärung des Taskilo Käuferschutzes: Sichere Bezahlung, Geld-zurück-Garantie, Schlichtungsverfahren und Absicherung bis 10.000€.',
  keywords: 'Käuferschutz, Garantie, sichere Bezahlung, Geld-zurück, Schlichtung, Taskilo',
  openGraph: {
    title: 'Taskilo Käuferschutz & Garantie - Ihre Sicherheit beim Kauf',
    description:
      'Umfassender Schutz für alle Kunden: Sichere Bezahlung, Garantien und Schlichtung bis 10.000€.',
    type: 'article',
  },
};

export default function KaeuferschutzPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/20 pointer-events-none"></div>
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
      <section className="text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">Käuferschutz & Garantie</h1>
          </div>
          <p className="text-xl text-white/95 leading-relaxed drop-shadow-md">
            Ihre Sicherheit ist unser Versprechen. Erfahren Sie, wie unser umfassender Käuferschutz
            Sie bei jedem Auftrag absichert.
          </p>
        </div>
      </section>

      {/* Protection Overview */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">100% Schutz für Ihre Aufträge</h2>
            <p className="text-xl text-gray-600">
              Taskilo bietet Ihnen eine <strong>Rundum-Absicherung bis 10.000€</strong> pro Auftrag.
              Von der Bezahlung bis zur finalen Abnahme sind Sie vollständig geschützt.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sichere Bezahlung</h3>
              <p className="text-gray-600">
                Ihr Geld wird erst freigegeben, wenn Sie mit dem Service zufrieden sind.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Geld-zurück-Garantie</h3>
              <p className="text-gray-600">
                Bei Mängeln oder Nichterfüllung erhalten Sie Ihr Geld vollständig zurück.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#14ad9f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Professionelle Schlichtung</h3>
              <p className="text-gray-600">
                Bei Streitfällen vermitteln unsere Experten kostenlos zwischen allen Parteien.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* How Secure Payment Works */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CreditCard className="w-6 h-6 mr-2 text-[#14ad9f]" />
            So funktioniert die sichere Bezahlung
          </h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-[#14ad9f] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Auftrag bezahlen</h3>
                <p className="text-gray-600">
                  Sie bezahlen den vereinbarten Betrag sicher über Stripe. Das Geld wird auf einem
                  <strong> Treuhandkonto</strong> hinterlegt und nicht sofort an den Anbieter
                  weitergeleitet.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-[#14ad9f] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Service wird erbracht</h3>
                <p className="text-gray-600">
                  Der Anbieter führt den Service aus. Sie haben während dieser Zeit
                  <strong> vollständigen Schutz</strong> und können bei Problemen jederzeit
                  eingreifen.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-[#14ad9f] text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Abnahme & Freigabe</h3>
                <p className="text-gray-600">
                  Erst nach Ihrer <strong>ausdrücklichen Bestätigung</strong> wird das Geld an den
                  Anbieter freigegeben. Sie haben 14 Tage Zeit für die finale Prüfung.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg mt-6">
            <p className="text-green-800">
              <strong>🔒 Ihre Sicherheit:</strong> Das Geld bleibt solange gesperrt, bis Sie den
              Service als vollständig und zufriedenstellend abgenommen haben.
            </p>
          </div>
        </div>

        {/* Protection Levels */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-[#14ad9f]" />
            Unsere Schutzleistungen im Detail
          </h2>

          <div className="space-y-8">
            {/* Basic Protection */}
            <div className="border-l-4 border-[#14ad9f] pl-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                💰 Finanzielle Absicherung (bis 10.000€)
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Vollständige Rückerstattung</strong> bei Nichterfüllung des Services
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Teilerstattung</strong> bei unvollständiger oder mangelhafter Leistung
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Schadensersatz</strong> bei nachweisbaren Schäden durch den Service
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#14ad9f] mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Zusätzliche Kosten</strong> für Nachbesserungen werden übernommen
                  </span>
                </li>
              </ul>
            </div>

            {/* Quality Protection */}
            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">⭐ Qualitätsgarantie</h3>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>30 Tage Nachbesserungsrecht</strong> bei Qualitätsmängeln
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Kostenlose Nacharbeiten</strong> bei nicht-zufriedenstellenden
                    Ergebnissen
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Alternative Anbieter</strong> bei wiederholten Qualitätsproblemen
                  </span>
                </li>
              </ul>
            </div>

            {/* Time Protection */}
            <div className="border-l-4 border-orange-500 pl-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">⏰ Termingarantie</h3>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Entschädigung</strong> bei verspäteter Fertigstellung ohne triftige
                    Gründe
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Kostenfreie Stornierung</strong> bei Nichterscheinen des Anbieters
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Prioritätsbehandlung</strong> bei Nachbuchungen nach Terminversäumnissen
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dispute Resolution Process */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Scale className="w-6 h-6 mr-2 text-[#14ad9f]" />
            Unser Schlichtungsverfahren
          </h2>

          <p className="text-gray-600 mb-6">
            Falls es zu Unstimmigkeiten kommt, haben wir einen{' '}
            <strong>professionellen Schlichtungsprozess</strong> etabliert:
          </p>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">
                📞 Stufe 1: Direkter Support (sofort)
              </h3>
              <p className="text-gray-600">
                Unser Kundenservice vermittelt direkt zwischen Ihnen und dem Anbieter.
                <strong> 90% aller Fälle</strong> werden hier bereits gelöst.
              </p>
              <div className="mt-2 text-sm text-gray-500">
                ⏱️ Reaktionszeit: Innerhalb von 2 Stunden | 📞 Hotline: 24/7 verfügbar
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">
                🔍 Stufe 2: Fachliche Bewertung (1-3 Tage)
              </h3>
              <p className="text-gray-600">
                Unsere Fachexperten bewerten den Fall objektiv und erstellen eine
                <strong> bindende Empfehlung</strong> für beide Parteien.
              </p>
              <div className="mt-2 text-sm text-gray-500">
                ⏱️ Bearbeitungszeit: 1-3 Werktage | 🎯 Erfolgsquote: 95%
              </div>
            </div>

            <div className="bg-[#14ad9f] bg-opacity-10 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">
                ⚖️ Stufe 3: Externe Schlichtung (5-10 Tage)
              </h3>
              <p className="text-gray-600">
                Bei komplexen Fällen wird ein <strong>unabhängiger Mediator</strong> eingeschaltet.
                Dieses Verfahren ist für Sie kostenfrei.
              </p>
              <div className="mt-2 text-sm text-gray-500">
                ⏱️ Bearbeitungszeit: 5-10 Werktage | 💯 Finale Entscheidung bindend
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg mt-6">
            <p className="text-red-800 flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Wichtig:</strong> Während des gesamten Schlichtungsverfahrens bleibt Ihr
                Geld gesperrt. Es wird erst nach finaler Einigung freigegeben.
              </span>
            </p>
          </div>
        </div>

        {/* Coverage Limits */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-white/30 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            💎 Absicherungssummen nach Auftragswert
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                    Auftragswert
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                    Käuferschutz
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                    Besonderheiten
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-3">bis 500€</td>
                  <td className="border border-gray-300 px-4 py-3">100% Absicherung</td>
                  <td className="border border-gray-300 px-4 py-3">Vereinfachtes Verfahren</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3">500€ - 2.500€</td>
                  <td className="border border-gray-300 px-4 py-3">100% Absicherung</td>
                  <td className="border border-gray-300 px-4 py-3">Standard-Verfahren</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-3">2.500€ - 10.000€</td>
                  <td className="border border-gray-300 px-4 py-3">100% Absicherung</td>
                  <td className="border border-gray-300 px-4 py-3">Erweiterte Dokumentation</td>
                </tr>
                <tr className="bg-[#14ad9f] bg-opacity-10">
                  <td className="border border-gray-300 px-4 py-3 font-semibold">über 10.000€</td>
                  <td className="border border-gray-300 px-4 py-3 font-semibold">
                    Individuelle Lösung
                  </td>
                  <td className="border border-gray-300 px-4 py-3 font-semibold">
                    Persönlicher Berater
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 mt-4 text-sm">
            Bei Aufträgen über 10.000€ erstellen wir individuelle Schutzkonzepte mit erweiterten
            Garantien.
          </p>
        </div>

        {/* What NOT Covered */}
        <div className="bg-orange-50 rounded-xl p-8 border-orange-200 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-orange-600" />
            Was ist nicht abgedeckt?
          </h2>

          <div className="space-y-3">
            <p className="text-gray-700">
              ❌ <strong>Änderungswünsche nach Projektbeginn</strong> - außer vertraglich vereinbart
            </p>
            <p className="text-gray-700">
              ❌ <strong>Schäden durch höhere Gewalt</strong> (Naturkatastrophen, etc.)
            </p>
            <p className="text-gray-700">
              ❌ <strong>Subjektive Geschmacksurteile</strong> - wenn der Service vertragsgemäß
              erbracht wurde
            </p>
            <p className="text-gray-700">
              ❌ <strong>Folgeschäden</strong> die nicht direkt durch den Service entstanden sind
            </p>
            <p className="text-gray-700">
              ❌ <strong>Vorsätzliche Falschangaben</strong> Ihrerseits bei der Auftragsbeschreibung
            </p>
          </div>

          <div className="bg-orange-100 p-4 rounded-lg mt-4">
            <p className="text-orange-800 text-sm">
              Bei Unklarheiten über den Schutzumfang beraten wir Sie gerne vor Auftragserteilung
              kostenlos.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-xl p-8 text-white">
          <div className="text-center">
            <Phone className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Sofort-Hilfe bei Problemen</h2>
            <p className="text-xl text-[#e6fffe] mb-6">
              Unser Käuferschutz-Team ist 24/7 für Sie da und löst 95% aller Fälle binnen 24
              Stunden.
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="font-bold mb-2">📞 Hotline</h3>
                <p className="text-[#e6fffe]">+49 (0) 30 12345678</p>
                <p className="text-sm text-[#b3f5f2]">24/7 verfügbar</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">📧 E-Mail</h3>
                <p className="text-[#e6fffe]">schutz@taskilo.de</p>
                <p className="text-sm text-[#b3f5f2]">Antwort binnen 2h</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">💬 Live-Chat</h3>
                <p className="text-[#e6fffe]">Direkt in der App</p>
                <p className="text-sm text-[#b3f5f2]">Sofort verfügbar</p>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/contact"
                className="bg-white text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
              >
                Jetzt Kontakt aufnehmen
              </Link>
            </div>
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
