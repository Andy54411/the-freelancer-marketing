'use client';

import { HeroHeader } from '@/components/hero8-header';

export default function VertragsabschlussAGBPage() {
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
              Vertragsbedingungen für Dienstleistungsaufträge
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 1 Vertragsparteien und Plattformrolle
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>1.1 Vertragsparteien:</strong> Der Dienstleistungsvertrag kommt direkt
                    zwischen dem Auftraggeber (Kunde) und dem Auftragnehmer (Dienstleister/Tasker)
                    zustande. Beide Parteien sind eigenständige Vertragspartner.
                  </p>
                  <p>
                    <strong>1.2 Taskilo als Plattform:</strong> Taskilo ist ausschließlich Betreiber
                    der Vermittlungsplattform und wird nicht Vertragspartei des
                    Dienstleistungsvertrags. Taskilo vermittelt lediglich den Kontakt zwischen
                    Auftraggeber und Auftragnehmer.
                  </p>
                  <p>
                    <strong>1.3 Deutsches Recht:</strong> Alle Verträge unterliegen deutschem Recht
                    unter Ausschluss des UN-Kaufrechts. Erfüllungsort und Gerichtsstand ist der Sitz
                    des Auftragnehmers, sofern beide Parteien Kaufleute sind.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 2 Vertragsabschluss und Angebotsbindung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>2.1 Verbindlicher Vertragsabschluss:</strong> Mit der Annahme eines
                    Angebots durch den Auftraggeber kommt ein rechtsverbindlicher
                    Dienstleistungsvertrag zwischen den Parteien zustande.
                  </p>
                  <p>
                    <strong>2.2 Bestätigungspflicht:</strong> Beide Parteien müssen vor
                    Vertragsabschluss diese Vertragsbedingungen ausdrücklich bestätigen. Ohne diese
                    Bestätigung ist kein Vertragsabschluss möglich.
                  </p>
                  <p>
                    <strong>2.3 Angebotsdauer:</strong> Angebote sind für 14 Tage bindend, sofern
                    nicht anders angegeben.
                  </p>
                  <p>
                    <strong>2.4 Leistungsbeschreibung:</strong> Der Auftragnehmer verpflichtet sich
                    zur ordnungsgemäßen Erbringung der im Angebot detailliert beschriebenen
                    Leistung.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 3 Taskilo-Provision und Zahlungsabwicklung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>3.1 Provisionspflicht:</strong> Der Auftragnehmer verpflichtet sich, an
                    Taskilo eine Provision in Höhe von 5% des Auftragswertes (brutto) zu zahlen.
                  </p>
                  <p>
                    <strong>3.2 Fälligkeit:</strong> Die Provision wird fällig, sobald der Vertrag
                    zwischen den Parteien zustande kommt und ist vor dem Kontaktdatenaustausch zu
                    entrichten.
                  </p>
                  <p>
                    <strong>3.3 Zahlungsabwicklung:</strong> Taskilo bietet optional sichere
                    Zahlungsabwicklung über Stripe an. Die Nutzung ist freiwillig.
                  </p>
                  <p>
                    <strong>3.4 Kontaktfreigabe:</strong> Der Austausch von Kontaktdaten erfolgt
                    erst nach erfolgter Provisionszahlung durch den Auftragnehmer.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 4 Stornierung und Stornierungskosten
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>4.1 Stornierung durch Auftraggeber:</strong> Der Auftraggeber kann den
                    Vertrag bis zu 24 Stunden vor dem vereinbarten Leistungsbeginn kostenfrei
                    stornieren.
                  </p>
                  <p>
                    <strong>4.2 Stornierungskosten bei kurzfristiger Absage:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>
                      Bei Stornierung 24-12 Stunden vor Leistungsbeginn: 25% des Auftragswertes
                    </li>
                    <li>
                      Bei Stornierung 12-2 Stunden vor Leistungsbeginn: 50% des Auftragswertes
                    </li>
                    <li>
                      Bei Stornierung weniger als 2 Stunden vor Leistungsbeginn: 75% des
                      Auftragswertes
                    </li>
                    <li>Bei Stornierung nach Leistungsbeginn: 100% des Auftragswertes</li>
                  </ul>
                  <p>
                    <strong>4.3 Außerordentliche Kündigung:</strong> Beide Parteien können bei
                    wichtigem Grund den Vertrag außerordentlich kündigen. Ein wichtiger Grund liegt
                    insbesondere bei Unmöglichkeit der Leistungserbringung, erheblichen
                    Vertragsverletzungen oder bei Insolvenz einer Partei vor.
                  </p>
                  <p>
                    <strong>4.4 Stornierung durch Auftragnehmer:</strong> Storniert der
                    Auftragnehmer ohne wichtigen Grund, ist er zum Ersatz der dem Auftraggeber
                    entstehenden Mehrkosten verpflichtet.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 5 Gewährleistung und Haftung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>5.1 Gewährleistung:</strong> Der Auftragnehmer gewährleistet die
                    ordnungsgemäße und fachgerechte Erbringung der Dienstleistung nach den
                    anerkannten Regeln der Technik.
                  </p>
                  <p>
                    <strong>5.2 Haftung des Auftragnehmers:</strong> Der Auftragnehmer haftet für
                    Schäden, die er vorsätzlich oder grob fahrlässig verursacht. Bei leichter
                    Fahrlässigkeit haftet er nur bei Verletzung wesentlicher Vertragspflichten.
                  </p>
                  <p>
                    <strong>5.3 Haftung Taskilo:</strong> Taskilo haftet nicht für die
                    ordnungsgemäße Erfüllung der zwischen den Parteien geschlossenen
                    Dienstleistungsverträge. Taskilo ist lediglich Vermittler.
                  </p>
                  <p>
                    <strong>5.4 Versicherung:</strong> Es wird empfohlen, dass beide Parteien über
                    ausreichende Haftpflichtversicherungen verfügen.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 6 Mängelrechte und Nacherfüllung
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>6.1 Mängelanzeige:</strong> Mängel sind unverzüglich nach Entdeckung
                    schriftlich anzuzeigen. Offensichtliche Mängel müssen spätestens 7 Tage nach
                    Leistungserbringung gerügt werden.
                  </p>
                  <p>
                    <strong>6.2 Nacherfüllung:</strong> Bei mangelhafter Leistung hat der
                    Auftraggeber zunächst Anspruch auf Nacherfüllung. Der Auftragnehmer kann wählen
                    zwischen Nachbesserung oder Neuerbringung der Leistung.
                  </p>
                  <p>
                    <strong>6.3 Weitere Rechte:</strong> Schlägt die Nacherfüllung fehl, kann der
                    Auftraggeber nach seiner Wahl Minderung verlangen oder vom Vertrag zurücktreten.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 7 Datenschutz und Vertraulichkeit
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>7.1 Datenschutz:</strong> Beide Parteien verpflichten sich zur
                    Einhaltung der DSGVO und aller anderen datenschutzrechtlichen Bestimmungen.
                  </p>
                  <p>
                    <strong>7.2 Vertraulichkeit:</strong> Beide Parteien verpflichten sich, alle im
                    Rahmen der Vertragsabwicklung erlangten vertraulichen Informationen der anderen
                    Partei streng vertraulich zu behandeln.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 8 Streitbeilegung und Schlussbestimmungen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>8.1 Mediation:</strong> Die Parteien verpflichten sich, bei
                    Streitigkeiten zunächst eine einvernehmliche Lösung zu suchen. Bei Bedarf kann
                    eine Mediation über Taskilo vermittelt werden.
                  </p>
                  <p>
                    <strong>8.2 Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser
                    Vertragsbedingungen unwirksam sein, bleibt die Wirksamkeit der übrigen
                    Bestimmungen davon unberührt.
                  </p>
                  <p>
                    <strong>8.3 Verbraucherschutz:</strong> Ist der Auftraggeber Verbraucher, gelten
                    die zwingenden verbraucherschutzrechtlichen Bestimmungen, insbesondere das
                    Widerrufsrecht nach § 312g BGB.
                  </p>
                  <p>
                    <strong>8.4 Änderungen:</strong> Änderungen dieser Vertragsbedingungen bedürfen
                    der Schriftform oder der elektronischen Bestätigung über die Taskilo-Plattform.
                  </p>
                </div>
              </section>

              <div className="mt-8 p-4 bg-white/20 rounded-lg">
                <p className="text-white/90 text-sm">
                  <strong>Stand:</strong> 20. August 2025
                  <br />
                  <strong>Gültig für:</strong> Alle über die Taskilo-Plattform vermittelten
                  Dienstleistungsverträge
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
