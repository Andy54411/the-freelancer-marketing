"use client";

import { HeroHeader } from '@/components/hero8-header';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DatenschutzPage() {
    const { t } = useLanguage();

    return (
        <>
            <HeroHeader />
            <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
                <div className="max-w-4xl mx-auto px-6">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
                        Datenschutzerklärung
                    </h1>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                1. Datenschutz auf einen Blick
                            </h2>
                            <div className="text-gray-700 dark:text-gray-300 space-y-4">
                                <h3 className="font-semibold">Allgemeine Hinweise</h3>
                                <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>

                                <h3 className="font-semibold">Datenerfassung auf dieser Website</h3>
                                <p><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
                                <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                2. Hosting und Content Delivery Networks (CDN)
                            </h2>
                            <div className="text-gray-700 dark:text-gray-300 space-y-4">
                                <h3 className="font-semibold">Externes Hosting</h3>
                                <p>Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                3. Allgemeine Hinweise und Pflichtinformationen
                            </h2>
                            <div className="text-gray-700 dark:text-gray-300 space-y-4">
                                <h3 className="font-semibold">Datenschutz</h3>
                                <p>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzbestimmungen sowie dieser Datenschutzerklärung.</p>

                                <h3 className="font-semibold">Hinweis zur verantwortlichen Stelle</h3>
                                <p>Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:</p>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mt-2">
                                    <p><strong>Taskilo GmbH</strong></p>
                                    <p>Musterstraße 123</p>
                                    <p>12345 Musterstadt</p>
                                    <p>Deutschland</p>
                                    <p><strong>E-Mail:</strong> datenschutz@taskilo.de</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                4. Datenerfassung auf dieser Website
                            </h2>
                            <div className="text-gray-700 dark:text-gray-300 space-y-4">
                                <h3 className="font-semibold">Cookies</h3>
                                <p>Unsere Internetseiten verwenden so genannte &ldquo;Cookies&rdquo;. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.</p>

                                <h3 className="font-semibold">Server-Log-Dateien</h3>
                                <p>Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:</p>
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
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                                5. Ihre Rechte
                            </h2>
                            <div className="text-gray-700 dark:text-gray-300 space-y-4">
                                <p>Sie haben jederzeit das Recht unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.</p>

                                <p>Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich jederzeit unter der im Impressum angegebenen Adresse an uns wenden.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </>
    );
}
