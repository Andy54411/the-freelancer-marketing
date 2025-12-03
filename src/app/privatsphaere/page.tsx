'use client';

import { HeroHeader } from '@/components/hero8-header';
import { Button } from '@/components/ui/button';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';

export default function PrivatsphaerePage() {
  const { resetConsent } = useCookieConsentContext();

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
              Privatsphäre-Einstellungen
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  Ihre Privatsphäre ist uns wichtig
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Bei Taskilo nehmen wir den Schutz Ihrer persönlichen Daten sehr ernst. Auf
                    dieser Seite können Sie Ihre Privatsphäre-Einstellungen verwalten und mehr
                    darüber erfahren, wie wir Ihre Daten schützen.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  Cookie-Einstellungen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Wir verwenden Cookies, um Ihre Erfahrung auf unserer Website zu verbessern. Sie
                    können Ihre Einwilligung zur Verwendung von Cookies jederzeit ändern oder
                    widerrufen.
                  </p>
                  <div className="pt-4">
                    <Button
                      onClick={resetConsent}
                      className="bg-white text-teal-600 hover:bg-gray-100 font-semibold"
                    >
                      Cookie-Einstellungen öffnen
                    </Button>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  Ihre Rechte
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Gemäß der Datenschutz-Grundverordnung (DSGVO) haben Sie folgende Rechte in Bezug
                    auf Ihre personenbezogenen Daten:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>
                      <strong>Auskunftsrecht:</strong> Sie können Auskunft über Ihre bei uns
                      gespeicherten Daten verlangen.
                    </li>
                    <li>
                      <strong>Recht auf Berichtigung:</strong> Sie können die Berichtigung falscher
                      Daten verlangen.
                    </li>
                    <li>
                      <strong>Recht auf Löschung:</strong> Sie können die Löschung Ihrer Daten
                      verlangen (&quot;Recht auf Vergessenwerden&quot;).
                    </li>
                    <li>
                      <strong>Recht auf Einschränkung der Verarbeitung:</strong> Sie können die
                      Einschränkung der Verarbeitung Ihrer Daten verlangen.
                    </li>
                    <li>
                      <strong>Recht auf Datenübertragbarkeit:</strong> Sie können Ihre Daten in
                      einem strukturierten, gängigen Format erhalten.
                    </li>
                    <li>
                      <strong>Widerspruchsrecht:</strong> Sie können der Verarbeitung Ihrer Daten
                      widersprechen.
                    </li>
                  </ul>
                  <p className="mt-4">
                    Um eines dieser Rechte auszuüben, kontaktieren Sie uns bitte unter{' '}
                    <a
                      href="mailto:datenschutz@taskilo.de"
                      className="underline hover:text-teal-200"
                    >
                      datenschutz@taskilo.de
                    </a>
                    .
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  Weitere Informationen
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Detaillierte Informationen darüber, wie wir Ihre Daten verarbeiten, finden Sie
                    in unserer{' '}
                    <a href="/datenschutz" className="underline hover:text-teal-200">
                      Datenschutzerklärung
                    </a>
                    .
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
