'use client';

import { HeroHeader } from '@/components/hero8-header';

export default function NutzungsbedingungenPage() {
  return (
    <>
      <HeroHeader />
      {/* Gradient Container */}
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content */}
        <div className="relative z-10 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-8">
              Nutzungsbedingungen
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  1. Allgemeines
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Willkommen bei Taskilo. Durch den Zugriff auf und die Nutzung unserer Website
                    und Dienste erklären Sie sich mit diesen Nutzungsbedingungen einverstanden.
                    Bitte lesen Sie diese sorgfältig durch.
                  </p>
                  <p>
                    Diese Nutzungsbedingungen regeln die Nutzung der Website taskilo.de und aller
                    damit verbundenen Dienste. Sie gelten ergänzend zu unseren Allgemeinen
                    Geschäftsbedingungen (AGB).
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  2. Zulässige Nutzung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Sie verpflichten sich, unsere Dienste nur für rechtmäßige Zwecke und in
                    Übereinstimmung mit diesen Nutzungsbedingungen zu nutzen. Es ist Ihnen
                    untersagt:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>
                      Die Website in einer Weise zu nutzen, die gegen geltende Gesetze oder
                      Vorschriften verstößt.
                    </li>
                    <li>
                      Inhalte zu verbreiten, die beleidigend, diffamierend, obszön oder anderweitig
                      anstößig sind.
                    </li>
                    <li>
                      Die Sicherheit der Website zu gefährden oder zu versuchen, unbefugten Zugriff
                      auf unsere Systeme zu erlangen.
                    </li>
                    <li>
                      Automatisierte Systeme (Bots, Scraper etc.) zu verwenden, um auf unsere
                      Dienste zuzugreifen, ohne unsere ausdrückliche Zustimmung.
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  3. Geistiges Eigentum
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Alle Inhalte auf dieser Website, einschließlich Texte, Grafiken, Logos, Bilder
                    und Software, sind Eigentum von Taskilo oder unseren Lizenzgebern und durch
                    Urheberrechte und andere Gesetze zum Schutz geistigen Eigentums geschützt.
                  </p>
                  <p>
                    Sie dürfen Inhalte nur für persönliche, nicht-kommerzielle Zwecke nutzen, es sei
                    denn, es wurde ausdrücklich etwas anderes vereinbart.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  4. Haftungsausschluss
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Wir bemühen uns, die Informationen auf unserer Website aktuell und korrekt zu
                    halten, übernehmen jedoch keine Gewähr für die Vollständigkeit, Richtigkeit oder
                    Aktualität der bereitgestellten Inhalte.
                  </p>
                  <p>
                    Die Nutzung der Website erfolgt auf eigenes Risiko. Wir haften nicht für
                    Schäden, die durch die Nutzung oder Nichtverfügbarkeit der Website entstehen,
                    soweit dies gesetzlich zulässig ist.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  5. Änderungen der Nutzungsbedingungen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern.
                    Die geänderten Bedingungen werden auf dieser Seite veröffentlicht. Durch die
                    fortgesetzte Nutzung der Website nach solchen Änderungen erklären Sie sich mit
                    den neuen Bedingungen einverstanden.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  6. Kontakt
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Wenn Sie Fragen zu diesen Nutzungsbedingungen haben, kontaktieren Sie uns bitte
                    über unser Kontaktformular oder per E-Mail.
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
