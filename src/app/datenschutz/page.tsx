'use client';

import { HeroHeader } from '@/components/hero8-header';

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
                    <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
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
                    Webhosting-Anbieter mit Servern in Europa. Die personenbezogenen Daten,
                    die auf dieser Website erfasst werden, werden auf den Servern von Siteground
                    gespeichert.
                  </p>
                  <p>
                    Siteground ist ein GDPR-konformer Hosting-Anbieter. Details zur
                    Datenverarbeitung bei Siteground finden Sie in der Datenschutzerklärung
                    von Siteground: https://www.siteground.com/privacy
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
                    Benutzerdaten, Aufträge, Chat-Nachrichten und andere Anwendungsdaten gespeichert.
                  </p>
                  
                  <h3 className="font-semibold">Firebase Storage</h3>
                  <p>
                    Für die Speicherung von Dateien wie Profilbildern, Auftragsdokumenten und
                    anderen Medien nutzen wir Firebase Storage.
                  </p>
                  
                  <h3 className="font-semibold">Firebase Functions</h3>
                  <p>
                    Serverseitige Funktionen werden über Firebase Functions ausgeführt, einschließlich
                    E-Mail-Versand, Zahlungsabwicklung und API-Integrationen.
                  </p>
                  
                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                    und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
                  </p>
                  <p>
                    <strong>Datenschutzerklärung:</strong> https://firebase.google.com/support/privacy
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  4. KI-Chatbot (Google Gemini)
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Wir verwenden Google Gemini AI für unseren intelligenten Chatbot und
                    Kundensupport. Der Chatbot verarbeitet Ihre Nachrichten, um Ihnen bei
                    Fragen und Problemen zu helfen.
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
                    Unser Chatbot lernt aus Gesprächen, um bessere Antworten zu geben.
                    Gespräche werden analysiert, um häufige Fragen zu identifizieren und
                    die Qualität des Supports zu verbessern.
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
                  5. Allgemeine Hinweise und Pflichtinformationen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <h3 className="font-semibold">Datenschutz</h3>
                  <p>
                    Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
                    Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der
                    gesetzlichen Datenschutzbestimmungen sowie dieser Datenschutzerklärung.
                  </p>

                  <h3 className="font-semibold">Hinweis zur verantwortlichen Stelle</h3>
                  <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
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
                  4. Datenerfassung auf dieser Website
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
                    genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies
                    sind:
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
                  5. Ihre Rechte
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und
                    Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem
                    ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
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
