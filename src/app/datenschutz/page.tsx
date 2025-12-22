'use client';

import { motion } from 'framer-motion';
import { Shield, Server, Database, CreditCard, Mail, Bot, Cookie, UserCheck, ChevronDown } from 'lucide-react';
import { HeroHeader } from '@/components/hero8-header';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

interface SectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  index: number;
  defaultOpen?: boolean;
}

function CollapsibleSection({ icon: Icon, title, children, index, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      viewport={{ once: true }}
    >
      <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Icon className="w-5 h-5 text-white" />
            </motion.div>
            <h2 className="text-xl font-semibold text-white drop-shadow-lg text-left">
              {title}
            </h2>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </motion.div>
        </button>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="px-6 pb-6 pt-0">
              <div className="text-white/90 drop-shadow-lg space-y-4">
                {children}
              </div>
            </CardContent>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

export default function DatenschutzPage() {
  return (
    <>
      <HeroHeader />
      {/* Gradient Container */}
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1920&q=80"
            alt="Privacy Background"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/90 to-teal-700/95" />
        </div>

        {/* Content */}
        <div className="relative z-10 py-20 pt-32">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-4">
                Datenschutzerklärung
              </h1>
              <p className="text-white/80">
                Klicken Sie auf einen Abschnitt, um mehr zu erfahren
              </p>
            </motion.div>

            <div className="space-y-4">
              <CollapsibleSection icon={Shield} title="1. Datenschutz auf einen Blick" index={0} defaultOpen>
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
              </CollapsibleSection>

              <CollapsibleSection icon={Server} title="2. Hosting und Content Delivery Networks (CDN)" index={1}>
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
              </CollapsibleSection>

              <CollapsibleSection icon={Database} title="3. Firebase Services (Google)" index={2}>
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
              </CollapsibleSection>

              <CollapsibleSection icon={Database} title="4. Google Tag Manager und Analytics" index={3}>
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
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für
                  Analytics-Cookies, Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) für
                  notwendige Cookies
                </p>
                <p>
                  <strong>Widerspruchsmöglichkeit:</strong> Sie können die Datenerfassung durch
                  Google Analytics verhindern, indem Sie das Browser-Add-on zur Deaktivierung von
                  Google Analytics herunterladen und installieren:
                  https://tools.google.com/dlpage/gaoptout
                </p>
              </CollapsibleSection>

              <CollapsibleSection icon={CreditCard} title="5. Zahlungsdienstleister (Stripe)" index={4}>
                <h3 className="font-semibold">Stripe Payment Processing & Platform Account Hold</h3>
                <p>
                  Für die Abwicklung von Zahlungen auf unserer Website verwenden wir Stripe, einen
                  sicheren und PCI-DSS-konformen Zahlungsdienstleister. Stripe verarbeitet
                  Zahlungsdaten direkt und sicher.
                </p>
                <p>
                  <strong>Platform Account Hold System:</strong> Wir nutzen Stripe&apos;s Platform
                  Account Hold System zur sicheren Zahlungsabwicklung. Dabei werden Zahlungen
                  zunächst auf unserem Platform Account gehalten und erst nach erfolgreicher
                  Projektabnahme durch beide Parteien an die Dienstleister übertragen.
                </p>

                <h3 className="font-semibold">Verarbeitete Daten</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Kreditkarten- und Zahlungsdaten (verschlüsselt)</li>
                  <li>Rechnungsadresse und Kontaktdaten</li>
                  <li>Transaktionsdaten und Bestellinformationen</li>
                  <li>IP-Adresse für Betrugsschutz</li>
                  <li>Geräteinformationen für Sicherheitsprüfungen</li>
                  <li>Platform Hold Informationen</li>
                </ul>

                <h3 className="font-semibold">Sicherheit und Compliance</h3>
                <p>
                  Stripe ist PCI-DSS Level 1 zertifiziert und erfüllt die höchsten
                  Sicherheitsstandards für Zahlungsverarbeitung.
                </p>

                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                </p>
                <p>
                  <strong>Datenschutzerklärung:</strong> https://stripe.com/privacy
                </p>
              </CollapsibleSection>

              <CollapsibleSection icon={Mail} title="6. Newsletter und E-Mail-Marketing (Resend)" index={5}>
                <h3 className="font-semibold">Newsletter-Service</h3>
                <p>
                  Wir verwenden Resend für den Versand unseres Newsletters und andere
                  E-Mail-Kommunikation. Resend ist ein moderner, DSGVO-konformer
                  E-Mail-Dienstleister mit Servern in Europa.
                </p>

                <h3 className="font-semibold">Newsletter-Anmeldung (Double-Opt-In)</h3>
                <p>
                  Für die Newsletter-Anmeldung verwenden wir das Double-Opt-In-Verfahren. Nach der
                  Anmeldung erhalten Sie eine Bestätigungs-E-Mail mit einem Aktivierungslink.
                </p>

                <h3 className="font-semibold">Verarbeitete Daten</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>E-Mail-Adresse (erforderlich für Newsletter-Versand)</li>
                  <li>Zeitstempel der Anmeldung</li>
                  <li>IP-Adresse bei der Anmeldung</li>
                  <li>Bestätigungsstatus</li>
                </ul>

                <h3 className="font-semibold">Newsletter-Abmeldung</h3>
                <p>Sie können sich jederzeit vom Newsletter abmelden durch:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Klick auf den Abmelde-Link in jeder Newsletter-E-Mail</li>
                  <li>E-Mail an newsletter@taskilo.de mit Betreff &ldquo;Abmelden&rdquo;</li>
                </ul>

                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
                </p>
                <p>
                  <strong>Datenschutzerklärung:</strong> https://resend.com/legal/privacy-policy
                </p>
              </CollapsibleSection>

              <CollapsibleSection icon={Bot} title="7. KI-Chatbot (Google Gemini)" index={6}>
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
                </ul>

                <p>
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                  und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an verbessertem Support)
                </p>
                <p>
                  <strong>Datenschutzerklärung:</strong> https://policies.google.com/privacy
                </p>
              </CollapsibleSection>

              <CollapsibleSection icon={Shield} title="8. Allgemeine Hinweise und Pflichtinformationen" index={7}>
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
                    <strong>The Freelancer Marketing Ltd.</strong>
                  </p>
                  <p>Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2</p>
                  <p>8015, Paphos Cyprus</p>
                  <p>Registrierungsnummer: HE 458650</p>
                  <p>VAT: CY60058879W</p>
                  <p>
                    <strong>E-Mail:</strong> legal@taskilo.de
                  </p>
                </div>
              </CollapsibleSection>

              <CollapsibleSection icon={Cookie} title="9. Datenerfassung auf dieser Website" index={8}>
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
              </CollapsibleSection>

              <CollapsibleSection icon={UserCheck} title="10. Ihre Rechte" index={9}>
                <p>
                  Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger
                  und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben
                  außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
                </p>

                <p>
                  Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit
                  unter der im Impressum angegebenen Adresse an uns wenden.
                </p>

                <div className="bg-white/10 p-4 rounded-lg mt-4">
                  <h3 className="font-semibold mb-2">Ihre Rechte im Überblick:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Auskunftsrecht (Art. 15 DSGVO)</li>
                    <li>Berichtigungsrecht (Art. 16 DSGVO)</li>
                    <li>Löschungsrecht (Art. 17 DSGVO)</li>
                    <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                    <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                    <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
                  </ul>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
