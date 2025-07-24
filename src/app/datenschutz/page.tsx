'use client';

import { HeroHeader } from '../../components/hero8-header';

export default function DatenschutzPage() {
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
              Datenschutzerklärung
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  1. Datenschutz auf einen Blick
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Allgemeine Hinweise</h3>
                  <p>
                    Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
                    personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
                    Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert
                    werden können.
                  </p>

                  <h3 className="font-semibold">Datenerfassung auf dieser Website</h3>
                  <p>
                    <strong>
                      Wer ist verantwortlich für die Datenerfassung auf dieser Website?
                    </strong>
                  </p>
                  <p>
                    Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber.
                    Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  2. Hosting und Content Delivery Networks (CDN)
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Externes Hosting</h3>
                  <p>
                    Diese Website wird bei Siteground gehostet. Siteground ist ein
                    Webhosting-Anbieter mit Servern in Europa. Die personenbezogenen Daten, die auf
                    dieser Website erfasst werden, werden auf den Servern von Siteground
                    gespeichert.
                  </p>
                  <p>
                    Siteground ist ein GDPR-konformer Hosting-Anbieter. Details zur
                    Datenverarbeitung bei Siteground finden Sie in der Datenschutzerklärung von
                    Siteground: https://www.siteground.com/privacy
                  </p>
                  <p>
                    Die Verwendung von Siteground erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f
                    DSGVO. Wir haben ein berechtigtes Interesse an einer möglichst zuverlässigen
                    Darstellung unserer Website.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  3. Firebase Services (Google)
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Firebase Authentication</h3>
                  <p>
                    Wir nutzen Firebase Authentication für die Benutzeranmeldung und -verwaltung.
                    Firebase Authentication speichert Benutzerdaten wie E-Mail-Adressen und
                    Authentifizierungstokens.
                  </p>

                  <h3 className="font-semibold">Firebase Firestore Database</h3>
                  <p>
                    Unsere Datenbank wird über Firebase Firestore bereitgestellt. Hier werden
                    Benutzerdaten, Aufträge, Chat-Nachrichten und andere Anwendungsdaten
                    gespeichert.
                  </p>

                  <h3 className="font-semibold">Firebase Storage</h3>
                  <p>
                    Für die Speicherung von Dateien wie Profilbildern, Auftragsdokumenten und
                    anderen Medien nutzen wir Firebase Storage.
                  </p>

                  <h3 className="font-semibold">Firebase Functions</h3>
                  <p>
                    Serverseitige Funktionen werden über Firebase Functions ausgeführt,
                    einschließlich E-Mail-Versand, Zahlungsabwicklung und API-Integrationen.
                  </p>

                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                    und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
                  </p>
                  <p>
                    <strong>Datenschutzerklärung:</strong>{' '}
                    https://firebase.google.com/support/privacy
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  4. Google Tag Manager und Analytics
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Google Tag Manager</h3>
                  <p>
                    Diese Website verwendet Google Tag Manager für die Verwaltung von Tracking-Codes
                    und Analytics-Tags. Google Tag Manager selbst speichert keine personenbezogenen
                    Daten, ermöglicht es aber anderen Tags, dies zu tun.
                  </p>
                  <p>
                    <strong>Verarbeitete Daten:</strong> IP-Adresse, Geräteinformationen,
                    Browser-Typ, Besuchszeiten, Seitenaufrufe, Klicks, Conversions,
                    Benutzerinteraktionen
                  </p>

                  <h3 className="font-semibold">Google Analytics 4</h3>
                  <p>
                    Wir verwenden Google Analytics 4 zur Analyse des Nutzerverhaltens auf unserer
                    Website. Diese Daten helfen uns dabei, die Website zu verbessern und den
                    Benutzern eine bessere Erfahrung zu bieten.
                  </p>
                  <p>
                    <strong>Verarbeitete Daten:</strong> Anonymisierte IP-Adressen, Seitenaufrufe,
                    Verweildauer, Conversions, demografische Informationen (falls verfügbar),
                    Benutzerregistrierungen nach Kategorien (Kunde/Dienstleister),
                    Auftragserstellungen nach Dienstleistungsarten und Subkategorien,
                    Benutzerinteraktionen und Event-Tracking für über 110 Dienstleistungskategorien
                  </p>

                  <h3 className="font-semibold">Cookie-Consent und DSGVO-Konformität</h3>
                  <p>
                    Wir verwenden ein Cookie-Consent-System, das die Zustimmung der Benutzer für
                    verschiedene Kategorien von Cookies einholt. Analytics-Cookies werden nur nach
                    ausdrücklicher Zustimmung gesetzt.
                  </p>
                  <p>
                    <strong>Consent-Modi:</strong> Analytics-Zustimmung, Marketing-Zustimmung,
                    Funktionale Cookies (für Website-Funktionalität). Wir verfolgen detaillierte
                    Nutzeraktionen wie Registrierungen nach Benutzertyp, Auftragserstellungen nach
                    Hauptkategorien (Handwerk, Reinigung, IT, Transport, Beratung, Garten,
                    Gesundheit, Sonstiges) und spezifischen Subkategorien für detaillierte
                    Marktanalysen und Serviceoptimierung.
                  </p>

                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für
                    Analytics-Cookies, Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) für
                    notwendige Cookies
                  </p>
                  <p>
                    <strong>Datenschutzerklärung:</strong> https://policies.google.com/privacy
                  </p>
                  <p>
                    <strong>Widerspruchsmöglichkeit:</strong> Sie können die Datenerfassung durch
                    Google Analytics verhindern, indem Sie das Browser-Add-on zur Deaktivierung von
                    Google Analytics herunterladen und installieren:
                    https://tools.google.com/dlpage/gaoptout
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  5. Zahlungsdienstleister (Stripe)
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Stripe Payment Processing</h3>
                  <p>
                    Für die Abwicklung von Zahlungen auf unserer Website verwenden wir Stripe, einen
                    sicheren und PCI-DSS-konformen Zahlungsdienstleister. Stripe verarbeitet
                    Zahlungsdaten direkt und sicher.
                  </p>

                  <h3 className="font-semibold">Verarbeitete Daten</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Kreditkarten- und Zahlungsdaten (verschlüsselt)</li>
                    <li>Rechnungsadresse und Kontaktdaten</li>
                    <li>Transaktionsdaten und Bestellinformationen</li>
                    <li>IP-Adresse für Betrugsschutz</li>
                    <li>Geräteinformationen für Sicherheitsprüfungen</li>
                  </ul>

                  <h3 className="font-semibold">Sicherheit und Compliance</h3>
                  <p>
                    Stripe ist PCI-DSS Level 1 zertifiziert und erfüllt die höchsten
                    Sicherheitsstandards für Zahlungsverarbeitung. Alle Zahlungsdaten werden
                    verschlüsselt übertragen und gespeichert.
                  </p>

                  <h3 className="font-semibold">Fraud Detection</h3>
                  <p>
                    Stripe verwendet maschinelles Lernen zur Betrugserkennung und analysiert
                    Transaktionsmuster, um verdächtige Aktivitäten zu identifizieren und zu
                    blockieren.
                  </p>

                  <h3 className="font-semibold">Datenaufbewahrung</h3>
                  <p>
                    Stripe speichert Zahlungsdaten für die Dauer, die für die
                    Transaktionsabwicklung, Rückerstattungen und zur Einhaltung regulatorischer
                    Anforderungen erforderlich ist.
                  </p>

                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                    und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherer
                    Zahlungsabwicklung)
                  </p>
                  <p>
                    <strong>Datenschutzerklärung:</strong> https://stripe.com/privacy
                  </p>
                  <p>
                    <strong>Datenverarbeitung:</strong> Stripe, Inc., 354 Oyster Point Blvd, South
                    San Francisco, CA 94080, USA
                  </p>
                  <p>
                    <strong>Angemessenheitsbeschluss:</strong> Die Datenübertragung in die USA
                    erfolgt auf Grundlage der EU-US Data Privacy Framework Adequacy Decision.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  6. Newsletter und E-Mail-Marketing (Resend)
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Newsletter-Service</h3>
                  <p>
                    Wir verwenden Resend für den Versand unseres Newsletters und andere
                    E-Mail-Kommunikation. Resend ist ein moderner, DSGVO-konformer
                    E-Mail-Dienstleister mit Servern in Europa.
                  </p>

                  <h3 className="font-semibold">Newsletter-Anmeldung (Double-Opt-In)</h3>
                  <p>
                    Für die Newsletter-Anmeldung verwenden wir das Double-Opt-In-Verfahren. Nach der
                    Anmeldung erhalten Sie eine Bestätigungs-E-Mail mit einem Aktivierungslink. Erst
                    nach Klick auf diesen Link wird Ihre E-Mail-Adresse für den Newsletter-Versand
                    aktiviert.
                  </p>

                  <h3 className="font-semibold">Verarbeitete Daten</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>E-Mail-Adresse (erforderlich für Newsletter-Versand)</li>
                    <li>Zeitstempel der Anmeldung</li>
                    <li>IP-Adresse bei der Anmeldung (für rechtliche Nachweispflichten)</li>
                    <li>Bestätigungsstatus (angemeldet/bestätigt/abgemeldet)</li>
                    <li>Eindeutige Bestätigungstoken für sichere Verifikation</li>
                    <li>Abmelde-Token für einfache Newsletterabmeldung</li>
                  </ul>

                  <h3 className="font-semibold">Newsletter-Inhalte</h3>
                  <p>Unser Newsletter enthält Informationen über:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Neue Features und Services von Taskilo</li>
                    <li>Tipps und Updates für Kunden und Dienstleister</li>
                    <li>Wichtige Ankündigungen und Plattform-Updates</li>
                    <li>Sonderaktionen und Rabatte (gelegentlich)</li>
                  </ul>

                  <h3 className="font-semibold">E-Mail-Tracking und Analytics</h3>
                  <p>
                    Unsere Newsletter enthalten keine Tracking-Pixel oder andere
                    Überwachungstechnologien. Wir respektieren Ihre Privatsphäre und verfolgen
                    nicht, ob Sie E-Mails öffnen oder auf Links klicken.
                  </p>

                  <h3 className="font-semibold">Datensicherheit und Verschlüsselung</h3>
                  <p>
                    Alle E-Mail-Übertragungen über Resend erfolgen verschlüsselt über TLS/SSL. Ihre
                    Daten werden sicher in europäischen Rechenzentren gespeichert und verarbeitet.
                  </p>

                  <h3 className="font-semibold">Newsletter-Abmeldung</h3>
                  <p>Sie können sich jederzeit vom Newsletter abmelden durch:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Klick auf den Abmelde-Link in jeder Newsletter-E-Mail</li>
                    <li>E-Mail an newsletter@taskilo.de mit Betreff &ldquo;Abmelden&rdquo;</li>
                    <li>Kontaktaufnahme über unser Kontaktformular</li>
                  </ul>
                  <p>
                    Die Abmeldung ist sofort wirksam. Ihre E-Mail-Adresse wird unverzüglich aus
                    unserem Newsletter-System entfernt.
                  </p>

                  <h3 className="font-semibold">Datenaufbewahrung</h3>
                  <p>
                    Angemeldete Newsletter-E-Mail-Adressen werden bis zur Abmeldung gespeichert.
                    Nach der Abmeldung werden die Daten innerhalb von 30 Tagen vollständig gelöscht,
                    soweit keine gesetzlichen Aufbewahrungspflichten bestehen.
                  </p>

                  <h3 className="font-semibold">Transactional E-Mails</h3>
                  <p>
                    Zusätzlich zum Newsletter versenden wir über Resend auch wichtige System-E-Mails
                    wie:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Willkommens-E-Mails nach der Registrierung</li>
                    <li>Auftragsbestätigungen und Status-Updates</li>
                    <li>Zahlungsbestätigungen und Rechnungen</li>
                    <li>Sicherheits-Benachrichtigungen</li>
                    <li>Passwort-Reset-E-Mails</li>
                  </ul>
                  <p>
                    Diese E-Mails sind für die Nutzung unserer Services erforderlich und können
                    nicht abbestellt werden.
                  </p>

                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für
                    Newsletter, Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für transactionale
                    E-Mails
                  </p>
                  <p>
                    <strong>Datenverarbeitung:</strong> Resend (Zeno Technologies, Inc.),
                    europäische Server und DSGVO-konforme Datenverarbeitung
                  </p>
                  <p>
                    <strong>Datenschutzerklärung:</strong> https://resend.com/legal/privacy-policy
                  </p>
                  <p>
                    <strong>Newsletter-Kontakt:</strong> newsletter@taskilo.de
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  7. KI-Chatbot (Google Gemini)
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Wir verwenden Google Gemini AI für unseren intelligenten Chatbot und
                    Kundensupport. Der Chatbot verarbeitet Ihre Nachrichten, um Ihnen bei Fragen und
                    Problemen zu helfen.
                  </p>

                  <h3 className="font-semibold">Verarbeitete Daten</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Chat-Nachrichten und Gesprächsverlauf</li>
                    <li>Benutzername und E-Mail-Adresse (falls angegeben)</li>
                    <li>Zeitstempel der Nachrichten</li>
                    <li>Session-IDs für Gesprächskontinuität</li>
                    <li>Automatische Eskalation zu menschlichen Mitarbeitern</li>
                  </ul>

                  <h3 className="font-semibold">Lernfähigkeiten</h3>
                  <p>
                    Unser Chatbot lernt aus Gesprächen, um bessere Antworten zu geben. Gespräche
                    werden analysiert, um häufige Fragen zu identifizieren und die Qualität des
                    Supports zu verbessern.
                  </p>

                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                    und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an verbessertem Support)
                  </p>
                  <p>
                    <strong>Datenschutzerklärung:</strong> https://policies.google.com/privacy
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  8. Allgemeine Hinweise und Pflichtinformationen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Datenschutz</h3>
                  <p>
                    Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr
                    ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend
                    der gesetzlichen Datenschutzbestimmungen sowie dieser Datenschutzerklärung.
                  </p>

                  <h3 className="font-semibold">Hinweis zur verantwortlichen Stelle</h3>
                  <p>
                    Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
                  </p>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg mt-2">
                    <p>
                      <strong>Taskilo GmbH</strong>
                    </p>
                    <p>Musterstraße 123</p>
                    <p>12345 Musterstadt</p>
                    <p>Deutschland</p>
                    <p>
                      <strong>E-Mail:</strong> datenschutz@taskilo.de
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  9. Datenerfassung auf dieser Website
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Cookies</h3>
                  <p>
                    Unsere Internetseiten verwenden so genannte &ldquo;Cookies&rdquo;. Cookies sind
                    kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden
                    entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder
                    dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
                  </p>

                  <h3 className="font-semibold">Server-Log-Dateien</h3>
                  <p>
                    Der Provider der Seiten erhebt und speichert automatisch Informationen in so
                    genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
                    Dies sind:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Browsertyp und Browserversion</li>
                    <li>verwendetes Betriebssystem</li>
                    <li>Referrer URL</li>
                    <li>Hostname des zugreifenden Rechners</li>
                    <li>Uhrzeit der Serveranfrage</li>
                    <li>IP-Adresse</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  10. Ihre Rechte
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger
                    und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben
                    außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
                  </p>

                  <p>
                    Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit
                    unter der im Impressum angegebenen Adresse an uns wenden.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
