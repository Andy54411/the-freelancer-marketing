'use client';

import { HeroHeader } from '@/components/hero8-header';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AGBPage() {
  const { t } = useLanguage();

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Allgemeine Geschäftsbedingungen (AGB)
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 1 Geltungsbereich
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die
                  zwischen der Taskilo GmbH (nachfolgend &ldquo;Taskilo&rdquo; oder
                  &ldquo;wir&rdquo;) und ihren Kunden (nachfolgend &ldquo;Nutzer&rdquo; oder
                  &ldquo;Sie&rdquo;) über die Nutzung der Taskilo-Plattform geschlossen werden.
                </p>
                <p>
                  Die Taskilo-Plattform ist ein Online-Marktplatz, der es Nutzern ermöglicht,
                  Dienstleistungsanfragen zu stellen und Angebote von registrierten Dienstleistern
                  zu erhalten.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 2 Vertragsgegenstand
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>Taskilo stellt eine Online-Plattform zur Verfügung, über die:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Kunden Dienstleistungsanfragen erstellen können</li>
                  <li>Dienstleister Angebote für diese Anfragen abgeben können</li>
                  <li>Die Kommunikation zwischen Kunden und Dienstleistern ermöglicht wird</li>
                  <li>Bewertungen und Rezensionen verwaltet werden</li>
                </ul>
                <p>
                  Taskilo ist nicht selbst Vertragspartner der zwischen Kunden und Dienstleistern
                  geschlossenen Dienstleistungsverträge.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 3 Registrierung und Nutzerkonto
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Für die Nutzung bestimmter Funktionen der Plattform ist eine Registrierung
                  erforderlich. Bei der Registrierung müssen Sie wahrheitsgemäße und vollständige
                  Angaben machen.
                </p>
                <p>
                  Sie sind verpflichtet, Ihre Zugangsdaten vertraulich zu behandeln und vor
                  unbefugtem Zugriff zu schützen.
                </p>
                <p>
                  Sie sind für alle Aktivitäten verantwortlich, die unter Ihrem Nutzerkonto
                  durchgeführt werden.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 4 Nutzung der Plattform
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Die Nutzung der Plattform ist nur für rechtliche Zwecke gestattet. Insbesondere
                  ist es untersagt:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Falsche oder irreführende Informationen zu übermitteln</li>
                  <li>Rechte Dritter zu verletzen</li>
                  <li>Die Plattform für illegale Zwecke zu nutzen</li>
                  <li>Spam oder unerwünschte Nachrichten zu versenden</li>
                  <li>Die Funktionalität der Plattform zu beeinträchtigen</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 5 Gebühren und Zahlungen
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Die Nutzung der Grundfunktionen der Plattform ist kostenlos. Für bestimmte
                  Premium-Features können Gebühren anfallen, die vor der Nutzung transparent
                  kommuniziert werden.
                </p>
                <p>Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.</p>
                <p>Rechnungen werden elektronisch versandt und sind sofort fällig.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 6 Haftung
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Taskilo haftet nur für Schäden, die auf einer vorsätzlichen oder grob fahrlässigen
                  Pflichtverletzung beruhen.
                </p>
                <p>
                  Für die Qualität der über die Plattform angebotenen Dienstleistungen übernimmt
                  Taskilo keine Haftung.
                </p>
                <p>Die Haftung für mittelbare Schäden und entgangenen Gewinn ist ausgeschlossen.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 7 Datenschutz
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Einzelheiten zur
                  Datenverarbeitung finden Sie in unserer Datenschutzerklärung.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                § 8 Schlussbestimmungen
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
                  UN-Kaufrechts.
                </p>
                <p>Gerichtsstand für alle Streitigkeiten ist der Sitz der Taskilo GmbH.</p>
                <p>
                  Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit
                  der übrigen Bestimmungen unberührt.
                </p>
              </div>
            </section>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-8">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Stand:</strong> Juli 2025
                <br />
                <strong>Taskilo GmbH</strong>
                <br />
                Musterstraße 123, 12345 Musterstadt
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
