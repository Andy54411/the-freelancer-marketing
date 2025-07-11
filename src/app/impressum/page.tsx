"use client";

import { HeroHeader } from '@/components/hero8-header';
import FooterSection from '@/components/footer';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ImpressumPage() {
  const { t } = useLanguage();

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Impressum
          </h1>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Angaben gemäß § 5 TMG
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-2">
                <p><strong>Taskilo GmbH</strong></p>
                <p>Musterstraße 123</p>
                <p>12345 Musterstadt</p>
                <p>Deutschland</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Kontakt
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-2">
                <p><strong>Telefon:</strong> +49 (0) 123 456789</p>
                <p><strong>E-Mail:</strong> info@taskilo.de</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Handelsregister
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-2">
                <p><strong>Handelsregister:</strong> Amtsgericht Musterstadt</p>
                <p><strong>Registernummer:</strong> HRB 12345</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Umsatzsteuer-ID
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p><strong>Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:</strong></p>
                <p>DE123456789</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-2">
                <p>Max Mustermann</p>
                <p>Musterstraße 123</p>
                <p>12345 Musterstadt</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Haftungsausschluss
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Haftung für Inhalte</h3>
                  <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Haftung für Links</h3>
                  <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
