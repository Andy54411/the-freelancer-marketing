'use client';

import { HeroHeader } from '@/components/hero8-header';

export default function AGBPage() {
  return (
    <>
      <HeroHeader />
      {/* Gradient Container */}
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content */}
        <div className="relative z-10 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-8">
              Allgemeine Geschäftsbedingungen (AGB)
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 1 Geltungsbereich und Vertragspartner
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen
                    der The Freelancer Marketing Ltd. (nachfolgend &ldquo;Taskilo&rdquo;,
                    &ldquo;wir&rdquo; oder &ldquo;uns&rdquo;) und den Nutzern (nachfolgend
                    &ldquo;Nutzer&rdquo;, &ldquo;Sie&rdquo; oder &ldquo;Kunde&rdquo;) der
                    Taskilo-Plattform.
                  </p>
                  <p>
                    Taskilo betreibt einen Online-Marktplatz, der es Auftraggebern (Kunden)
                    ermöglicht, Dienstleistungsanfragen zu stellen und Angebote von registrierten
                    Dienstleistern (Freelancern/Tasker) zu erhalten. Entgegenstehende oder
                    abweichende Bedingungen erkennen wir nicht an, es sei denn, wir haben ihrer
                    Geltung ausdrücklich zugestimmt.
                  </p>
                  <p>
                    Taskilo richtet sich sowohl an Unternehmer im Sinne des § 14 BGB als auch an
                    Verbraucher im Sinne des § 13 BGB. Je nach Kundenstatus gelten unterschiedliche
                    rechtliche Bestimmungen, insbesondere bei Widerrufsrecht und Haftung.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 2 Leistungsbeschreibung und Vertragsgegenstand
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Taskilo stellt eine webbasierte Software-as-a-Service (SaaS) Plattform zur
                    Verfügung, die folgende Hauptfunktionen umfasst:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Erstellung und Verwaltung von Dienstleistungsanfragen und Projekten</li>
                    <li>
                      Matching-Algorithmus zur Vermittlung zwischen Auftraggebern und Dienstleistern
                    </li>
                    <li>Sichere Kommunikationstools und Nachrichtensystem</li>
                    <li>Projekt- und Zeiterfassungstools</li>
                    <li>Bewertungs- und Reputationssystem</li>
                    <li>Zahlungsabwicklung und Rechnungsstellung</li>
                    <li>Streitbeilegungsmechanismen</li>
                    <li>API-Zugang für Drittanbieter-Integrationen</li>
                  </ul>
                  <p>
                    <strong>Wichtiger Hinweis:</strong> Taskilo ist ausschließlich Vermittler und
                    technischer Dienstleister. Wir sind nicht Vertragspartei der zwischen Kunden und
                    Dienstleistern geschlossenen Dienstleistungsverträge und übernehmen keine
                    Verantwortung für deren Durchführung, Qualität oder Rechtmäßigkeit.
                  </p>
                  <p>
                    Die Plattform ist täglich 24 Stunden verfügbar. Wir streben eine Verfügbarkeit
                    von 99,5% im Jahresmittel an, ausgenommen geplante Wartungsarbeiten, die
                    außerhalb der Geschäftszeiten durchgeführt werden.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 3 Registrierung, Nutzerkonto und Vertragsschluss
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>3.1 Registrierungsvoraussetzungen:</strong> Die Nutzung der
                    Taskilo-Plattform erfordert eine Registrierung. Zur Registrierung berechtigt
                    sind ausschließlich:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Volljährige, geschäftsfähige natürliche Personen</li>
                    <li>Juristische Personen und Personengesellschaften</li>
                    <li>Nutzer mit Wohnsitz/Sitz in Deutschland oder der EU</li>
                  </ul>
                  <p>
                    <strong>3.2 Registrierungsprozess:</strong> Bei der Registrierung sind
                    vollständige, aktuelle und wahrheitsgemäße Angaben zu machen. Dies umfasst:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Vollständiger Name und Anschrift</li>
                    <li>Gültige E-Mail-Adresse</li>
                    <li>Bei Unternehmen: Firmenbezeichnung, Rechtsform, Handelsregisternummer</li>
                    <li>Steuerliche Identifikationsnummer oder Umsatzsteuer-ID</li>
                  </ul>
                  <p>
                    <strong>3.3 Verifikation:</strong> Wir behalten uns vor, die angegebenen Daten
                    zu überprüfen und entsprechende Nachweise anzufordern. Bei unvollständigen oder
                    unrichtigen Angaben können wir die Registrierung ablehnen oder das Konto
                    sperren.
                  </p>
                  <p>
                    <strong>3.4 Zugangsdaten:</strong> Sie sind verpflichtet, Ihre Zugangsdaten
                    (Benutzername, Passwort) streng vertraulich zu behandeln und vor unbefugtem
                    Zugriff zu schützen. Sie haften für alle Aktivitäten, die unter Ihrem Konto
                    durchgeführt werden, es sei denn, diese beruhen auf einer nicht von Ihnen zu
                    vertretenden Sicherheitslücke unserer Systeme.
                  </p>
                  <p>
                    <strong>3.5 Vertragsschluss:</strong> Der Nutzungsvertrag kommt durch Ihre
                    erfolgreiche Registrierung und unsere Bestätigung per E-Mail zustande.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 4 Nutzungsbedingungen und Verhaltensregeln
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>4.1 Zulässige Nutzung:</strong> Die Plattform darf ausschließlich für
                    rechtmäßige Geschäftszwecke genutzt werden. Insbesondere ist folgendes
                    untersagt:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Übermittlung falscher, irreführender oder unvollständiger Informationen</li>
                    <li>Verletzung von Urheber-, Marken- oder sonstigen Schutzrechten Dritter</li>
                    <li>Angebot oder Nachfrage illegaler Dienstleistungen</li>
                    <li>
                      Umgehung unserer Gebührenstruktur oder direkter Kontakt zwecks Auftragsvergabe
                      außerhalb der Plattform
                    </li>
                    <li>Spam, unerwünschte Werbung oder Massennachrichten</li>
                    <li>Upload von Viren, Malware oder anderen schädlichen Inhalten</li>
                    <li>Automatisierte Datensammlung (Web Scraping, Crawling)</li>
                    <li>Manipulation von Bewertungen oder gefälschte Rezensionen</li>
                  </ul>
                  <p>
                    <strong>4.2 Inhaltliche Verantwortung:</strong> Sie sind allein verantwortlich
                    für alle Inhalte, die Sie über die Plattform bereitstellen. Dies umfasst
                    Projektbeschreibungen, Angebote, Nachrichten, hochgeladene Dateien und sonstige
                    Kommunikation.
                  </p>
                  <p>
                    <strong>4.3 Qualitätsstandards:</strong> Dienstleister verpflichten sich, ihre
                    Leistungen professionell, termingerecht und in der vereinbarten Qualität zu
                    erbringen. Kunden sind zur sachlichen und konstruktiven Kommunikation
                    verpflichtet.
                  </p>
                  <p>
                    <strong>4.4 Compliance:</strong> Alle Nutzer müssen geltendes Recht einhalten,
                    insbesondere Datenschutz-, Steuer- und Sozialversicherungsrecht. Bei
                    grenzüberschreitenden Dienstleistungen sind zusätzlich die jeweiligen nationalen
                    Bestimmungen zu beachten.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 5 Gebühren, Preise und Zahlungsbedingungen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>5.1 Kostenstruktur:</strong> Die Grundnutzung der Plattform ist
                    kostenlos. Gebühren fallen an für:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Erfolgsprovision bei Vertragsabschluss (3-8% je nach Projektvolumen)</li>
                    <li>Premium-Mitgliedschaften mit erweiterten Funktionen</li>
                    <li>Zusätzliche Services wie Featured Listings oder erweiterte Analysen</li>
                    <li>
                      Zahlungsabwicklung über Stripe (2,9% + 0,30€ pro Transaktion für Kreditkarten,
                      0,8% für SEPA)
                    </li>
                  </ul>
                  <p>
                    <strong>5.2 Preisanpassungen:</strong> Wir sind berechtigt, unsere Preise mit
                    einer Ankündigungsfrist von 30 Tagen anzupassen. Bei Preiserhöhungen von mehr
                    als 10% steht Ihnen ein außerordentliches Kündigungsrecht zu.
                  </p>
                  <p>
                    <strong>5.3 Zahlungsbedingungen:</strong> Alle Preise verstehen sich netto
                    zuzüglich gesetzlicher Mehrwertsteuer. Rechnungen werden elektronisch versandt
                    und sind innerhalb von 14 Tagen nach Rechnungsstellung fällig. Bei
                    Zahlungsverzug werden Mahngebühren in Höhe von 10€ pro Mahnung erhoben.
                  </p>
                  <p>
                    <strong>5.4 Zahlungsmethoden:</strong> Die Zahlungsabwicklung erfolgt über
                    unseren Partner Stripe, Inc. Wir akzeptieren SEPA-Lastschrift, Kreditkarten
                    (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay und
                    Banküberweisungen. Bei Lastschriftrückgaben fallen Gebühren in Höhe von 5€ an.
                    Für die sichere Abwicklung gelten zusätzlich die AGB von Stripe.
                  </p>
                  <p>
                    <strong>5.5 Rechnungsstellung:</strong> Rechnungen werden automatisiert
                    erstellt. Bei Fehlern in der Rechnungsstellung müssen diese innerhalb von 30
                    Tagen nach Rechnungserhalt gemeldet werden.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 6 Geistiges Eigentum und Nutzungsrechte
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>6.1 Plattform-IP:</strong> Alle Rechte an der Taskilo-Plattform,
                    einschließlich Software, Design, Logos, Marken und Inhalten, liegen bei Taskilo
                    oder unseren Lizenzgebern. Eine Nutzung außerhalb der gestatteten
                    Plattformnutzung ist untersagt.
                  </p>
                  <p>
                    <strong>6.2 Nutzer-Inhalte:</strong> Sie behalten das Eigentum an allen
                    Inhalten, die Sie über die Plattform bereitstellen. Durch das Hochladen räumen
                    Sie Taskilo jedoch ein nicht-exklusives, weltweites, gebührenfreies
                    Nutzungsrecht ein, das zur Bereitstellung und Verbesserung unserer Dienste
                    erforderlich ist.
                  </p>
                  <p>
                    <strong>6.3 Projektinhalte:</strong> Urheberrechte an durch Dienstleister
                    erstellten Werken gehen entsprechend der individuellen Vereinbarung zwischen
                    Kunde und Dienstleister über. Taskilo erwirbt hieran keine Rechte.
                  </p>
                  <p>
                    <strong>6.4 Markenrechte:</strong> Die Bezeichnung &ldquo;Taskilo&rdquo; ist
                    eine angemeldete Marke (Anmeldung: DE 3020252302804, Anmeldetag: 14.07.2025) und
                    steht unter dem Schutz des Markengesetzes. Die Marke ist geschützt für
                    technologische Dienstleistungen und Software-Entwicklung (Klasse 42) sowie
                    elektronische Geräte und Software-Anwendungen (Klasse 9). Die Nutzung der Marke
                    &ldquo;Taskilo&rdquo; sowie aller damit verbundenen Logos, Designs und
                    Kennzeichnungen ist ausschließlich den Betreibern der Plattform vorbehalten.
                  </p>
                  <p>
                    <strong>6.5 Nutzungsrechte für Plattform-Nutzer:</strong> Nutzer erhalten das
                    Recht zur bestimmungsgemäßen Nutzung der unter der Marke &ldquo;Taskilo&rdquo;
                    betriebenen Plattform-Dienste. Die kommerzielle Nutzung der Marke
                    &ldquo;Taskilo&rdquo; außerhalb der Plattform, die Erstellung eigener
                    Geschäftstätigkeiten unter diesem Namen oder die Verwendung in Werbematerialien
                    ist ohne ausdrückliche schriftliche Genehmigung untersagt.
                  </p>
                  <p>
                    <strong>6.6 Schutz vor Markenverletzungen:</strong> Jede unerlaubte Verwendung,
                    Nachahmung oder Verletzung der Markenrechte durch Dritte ist untersagt und kann
                    rechtliche Schritte zur Folge haben. Bei Verstoß gegen die Markenrechte behalten
                    sich die Betreiber das Recht vor, den Zugang zur Plattform zu sperren und
                    rechtliche Schritte einzuleiten.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 7 Haftungsbeschränkung und Gewährleistung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>7.1 Haftungsausschluss für Drittleistungen:</strong> Taskilo haftet
                    nicht für die Qualität, Pünktlichkeit oder Rechtmäßigkeit von Dienstleistungen
                    zwischen Kunden und Dienstleistern. Wir sind lediglich Vermittler und
                    technischer Dienstleister.
                  </p>
                  <p>
                    <strong>7.2 Beschränkte Haftung:</strong> Unsere Haftung ist auf Vorsatz und
                    grobe Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haften wir nur bei
                    Verletzung wesentlicher Vertragspflichten, wobei die Haftung auf den typischen,
                    vorhersehbaren Schaden begrenzt ist.
                  </p>
                  <p>
                    <strong>7.3 Haftungsobergrenze:</strong> Die Gesamthaftung von Taskilo ist pro
                    Schadensfall auf die in den letzten 12 Monaten von Ihnen gezahlten Gebühren,
                    maximal jedoch auf 10.000€ begrenzt.
                  </p>
                  <p>
                    <strong>7.4 Ausgeschlossene Schäden:</strong> Wir haften nicht für mittelbare
                    Schäden, entgangenen Gewinn, Datenverlust oder Folgeschäden, es sei denn bei
                    Vorsatz oder grober Fahrlässigkeit.
                  </p>
                  <p>
                    <strong>7.5 Verfügbarkeit:</strong> Wir bemühen uns um eine hohe Verfügbarkeit
                    der Plattform, können aber keine ununterbrochene Verfügbarkeit garantieren.
                    Wartungsarbeiten werden nach Möglichkeit außerhalb der Geschäftszeiten
                    durchgeführt.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 8 Streitbeilegung und Beschwerdemanagement
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>8.1 Mediationsverfahren:</strong> Bei Streitigkeiten zwischen Kunden und
                    Dienstleistern bieten wir einen kostenlosen Mediationsservice an. Beide Parteien
                    können innerhalb von 14 Tagen nach Projektabschluss eine Mediation beantragen.
                  </p>
                  <p>
                    <strong>8.2 Beschwerdebearbeitung:</strong> Beschwerden über unsere Plattform
                    oder Services bearbeiten wir innerhalb von 48 Stunden. Bei komplexeren Fällen
                    erfolgt eine abschließende Antwort binnen 7 Werktagen. Beschwerden können Sie an
                    support@taskilo.com richten.
                  </p>
                  <p>
                    <strong>8.3 Eskalationsverfahren:</strong> Können Streitigkeiten nicht durch
                    Mediation gelöst werden, steht bei Verbrauchern die
                    EU-Online-Streitbeilegungsplattform (https://ec.europa.eu/consumers/odr) zur
                    Verfügung.
                  </p>
                  <p>
                    <strong>8.4 Kontosperrung:</strong> Bei schwerwiegenden Verstößen gegen diese
                    AGB oder geltendes Recht können wir Konten temporär oder dauerhaft sperren. Vor
                    einer Sperrung erfolgt in der Regel eine Abmahnung, außer bei besonders schweren
                    Verstößen.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 9 Kündigung und Vertragsbeendigung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>9.1 Ordentliche Kündigung:</strong> Beide Parteien können den
                    Nutzungsvertrag jederzeit mit einer Frist von 30 Tagen zum Monatsende kündigen.
                    Premium-Abonnements können zum Ende der jeweiligen Laufzeit gekündigt werden.
                  </p>
                  <p>
                    <strong>9.2 Außerordentliche Kündigung:</strong> Eine fristlose Kündigung ist
                    bei wichtigem Grund möglich, insbesondere bei:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Schwerwiegenden Verstößen gegen diese AGB</li>
                    <li>Zahlungsverzug von mehr als 30 Tagen</li>
                    <li>Missbrauch der Plattform oder betrügerischem Verhalten</li>
                    <li>Verletzung von Rechten Dritter</li>
                  </ul>
                  <p>
                    <strong>9.3 Folgen der Kündigung:</strong> Bei Vertragsbeendigung werden Ihre
                    Daten entsprechend unserer Datenschutzerklärung behandelt. Laufende Projekte
                    können bis zu ihrem natürlichen Ende fortgeführt werden. Bereits gezahlte
                    Gebühren werden nicht erstattet, es sei denn bei von uns zu vertretender
                    außerordentlicher Kündigung.
                  </p>
                  <p>
                    <strong>9.4 Datenübertragbarkeit:</strong> Auf Anfrage stellen wir Ihnen Ihre
                    Daten in einem gängigen, maschinenlesbaren Format zur Verfügung.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 10 Besondere Bestimmungen für Verbraucher
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>10.1 Widerrufsrecht:</strong> Verbraucher haben ein 14-tägiges
                    Widerrufsrecht für kostenpflichtige Verträge. Das Widerrufsrecht erlischt bei
                    vollständiger Erbringung von Dienstleistungen, wenn die Ausführung mit
                    ausdrücklicher Zustimmung des Verbrauchers vor Ablauf der Widerrufsfrist
                    begonnen hat.
                  </p>
                  <p>
                    <strong>10.2 Gewährleistung:</strong> Für Verbraucher gelten die gesetzlichen
                    Gewährleistungsrechte. Bei Mängeln der Plattform können Verbraucher zunächst
                    Nacherfüllung verlangen.
                  </p>
                  <p>
                    <strong>10.3 Haftung:</strong> Gegenüber Verbrauchern haften wir nach den
                    gesetzlichen Bestimmungen. Haftungsbeschränkungen gelten nur, soweit gesetzlich
                    zulässig.
                  </p>
                  <p>
                    <strong>10.4 Streitbeilegung:</strong> Wir nehmen an Verfahren zur
                    außergerichtlichen Streitbeilegung vor einer Verbraucherschlichtungsstelle teil.
                    Zuständig ist die Allgemeine Verbraucherschlichtungsstelle des Zentrums für
                    Schlichtung e.V.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 11 Datenschutz und Datenverarbeitung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>10.1 Datenschutz-Compliance:</strong> Der Schutz Ihrer personenbezogenen
                    Daten ist uns besonders wichtig. Wir verarbeiten alle Daten in Übereinstimmung
                    mit der DSGVO, dem BDSG und anderen geltenden Datenschutzgesetzen.
                  </p>
                  <p>
                    <strong>10.2 Datenverarbeitung:</strong> Einzelheiten zur Datenverarbeitung,
                    einschließlich Zweck, Rechtsgrundlage, Speicherdauer und Ihren Rechten finden
                    Sie in unserer separaten Datenschutzerklärung. Bei Fragen zum Datenschutz
                    kontaktieren Sie uns unter privacy@taskilo.com.
                  </p>
                  <p>
                    <strong>10.3 Zahlungsdaten:</strong> Zahlungsdaten werden ausschließlich durch
                    unseren PCI-DSS zertifizierten Partner Stripe verarbeitet. Taskilo erhält keine
                    vollständigen Kreditkartendaten oder sensible Zahlungsinformationen.
                  </p>
                  <p>
                    <strong>10.4 Internationale Datenübertragung:</strong> Bei der Nutzung von
                    Cloud-Diensten und Stripe können Daten auch außerhalb der EU verarbeitet werden.
                    Dabei stellen wir durch geeignete Garantien (Standardvertragsklauseln,
                    Angemessenheitsbeschlüsse) sicher, dass das Datenschutzniveau der DSGVO
                    eingehalten wird.
                  </p>
                  <p>
                    <strong>10.5 Auftragsverarbeitung:</strong> Soweit wir externe Dienstleister wie
                    Stripe einsetzen, die Zugang zu personenbezogenen Daten haben, schließen wir
                    entsprechende Auftragsverarbeitungsverträge nach Art. 28 DSGVO ab.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 12 Änderungen der AGB
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>11.1 Änderungsrecht:</strong> Wir behalten uns vor, diese AGB bei
                    wichtigem Grund zu ändern, insbesondere bei:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Änderungen der Rechtslage oder Rechtsprechung</li>
                    <li>Neuen oder geänderten Funktionen der Plattform</li>
                    <li>Sicherheitsverbesserungen oder technischen Anpassungen</li>
                    <li>Änderungen der Geschäftsstrategie, soweit zumutbar</li>
                  </ul>
                  <p>
                    <strong>11.2 Benachrichtigung:</strong> Über Änderungen werden Sie mindestens 30
                    Tage vor Inkrafttreten per E-Mail und durch Hinweis auf der Plattform
                    informiert.
                  </p>
                  <p>
                    <strong>11.3 Widerspruchsrecht:</strong> Sie können Änderungen innerhalb von 30
                    Tagen schriftlich widersprechen. Bei Widerspruch gegen wesentliche Änderungen
                    können beide Parteien den Vertrag außerordentlich kündigen.
                  </p>
                  <p>
                    <strong>11.4 Zustimmung:</strong> Nutzen Sie die Plattform nach Inkrafttreten
                    der geänderten AGB weiter, gelten diese als angenommen.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 13 Schlussbestimmungen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>13.1 Anwendbares Recht:</strong> Es gilt das Recht der Republik Zypern.
                    Für Verbraucher aus Deutschland gelten zusätzlich die zwingenden
                    verbraucherschützenden Bestimmungen des deutschen Rechts, soweit diese günstiger
                    sind.
                  </p>
                  <p>
                    <strong>13.2 Gerichtsstand:</strong> Für Streitigkeiten mit Unternehmern ist
                    ausschließlicher Gerichtsstand Paphos, Zypern. Für Verbraucher aus Deutschland
                    gilt der gesetzliche Gerichtsstand in Deutschland, wobei wir berechtigt sind, am
                    Wohnsitz des Verbrauchers zu klagen.
                  </p>
                  <p>
                    <strong>13.3 Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen
                    dieser AGB unwirksam oder undurchführbar sein oder werden, bleibt die
                    Wirksamkeit der übrigen Bestimmungen unberührt. Die unwirksame Bestimmung wird
                    durch eine wirksame ersetzt, die dem beabsichtigten wirtschaftlichen Zweck am
                    nächsten kommt.
                  </p>
                  <p>
                    <strong>13.4 Schriftformerfordernis:</strong> Änderungen oder Ergänzungen dieser
                    AGB bedürfen der Schriftform. Dies gilt auch für die Aufhebung dieser
                    Schriftformklausel.
                  </p>
                  <p>
                    <strong>13.5 Abtretung:</strong> Sie sind nicht berechtigt, Ihre Rechte und
                    Pflichten aus diesem Vertrag ohne unsere vorherige schriftliche Zustimmung
                    abzutreten.
                  </p>
                  <p>
                    <strong>13.6 Vertragssprache:</strong> Diese AGB werden in deutscher Sprache
                    geschlossen. Maßgeblich ist stets die deutsche Fassung.
                  </p>
                </div>
              </section>

              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg mt-8">
                <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-4">
                  Kontaktinformationen
                </h3>
                <div className="text-sm text-white/90 drop-shadow-lg space-y-2">
                  <p>
                    <strong>The Freelancer Marketing Ltd.</strong>
                  </p>
                  <p>Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2</p>
                  <p>8015, Paphos Cyprus</p>
                  <p>Telefon: +49 1525 1939026</p>
                  <p>E-Mail: legal@taskilo.com</p>
                  <p>Website: www.taskilo.com</p>
                  <p>Registrierungsnummer: HE 458650</p>
                  <p>VAT: CY60058879W</p>
                  <p>Bank: Revolut Bank</p>
                  <p>IBAN: LT703250024720869498</p>
                  <p>BIC: REVOLT21</p>

                  <div className="mt-4 space-y-1">
                    <p>
                      <strong>Weitere Kontaktmöglichkeiten:</strong>
                    </p>
                    <p>Allgemeiner Support: support@taskilo.com</p>
                    <p>Technischer Support: tech@taskilo.com</p>
                    <p>Datenschutzanfragen: privacy@taskilo.com</p>
                    <p>Geschäftsanfragen: business@taskilo.com</p>
                    <p>Rechnungsfragen: billing@taskilo.com</p>
                  </div>

                  <div className="mt-6 space-y-2">
                    <p>
                      <strong>Spezielle Kontaktadressen:</strong>
                    </p>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-xs">
                      <li>
                        <strong>Allgemeine Anfragen:</strong> info@taskilo.com
                      </li>
                      <li>
                        <strong>Technischer Support:</strong> support@taskilo.com
                      </li>
                      <li>
                        <strong>Rechtliche Angelegenheiten:</strong> legal@taskilo.com
                      </li>
                      <li>
                        <strong>Datenschutz:</strong> privacy@taskilo.com
                      </li>
                      <li>
                        <strong>Beschwerden & Mediation:</strong> disputes@taskilo.com
                      </li>
                      <li>
                        <strong>Presse & Medien:</strong> press@taskilo.com
                      </li>
                    </ul>
                  </div>

                  <p className="mt-4">
                    <strong>Markenhinweis:</strong> Taskilo ist eine angemeldete Marke
                    (Aktenzeichen: DE 3020252302804, Anmeldetag: 14.07.2025) der Elisabeth Schröder
                    und Andy Staudinger. Die Marke ist geschützt für technologische
                    Dienstleistungen, Software-Entwicklung und elektronische Anwendungen.
                  </p>
                  <p className="mt-4">
                    <strong>Stand dieser AGB:</strong> Juli 2025
                  </p>
                  <p className="mt-4 text-xs">
                    Diese AGB wurden unter Berücksichtigung der Rechtsprechung und Best Practices
                    führender Online-Marktplätze und SaaS-Anbieter erstellt. Sie werden regelmäßig
                    überprüft und bei Bedarf aktualisiert.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
