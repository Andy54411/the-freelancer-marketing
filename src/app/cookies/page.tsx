'use client';

import React from 'react';
import { FiInfo, FiSettings, FiShield, FiMail } from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function CookiesPage() {
  return (
    <>
      <HeroHeader />
      {/* Gradient Container */}
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Content */}
        <div className="relative z-10 py-16">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Cookie-Richtlinie</h1>
              <p className="text-xl text-white drop-shadow-lg opacity-90">
                Informationen über die Verwendung von Cookies auf Taskilo.de
              </p>
            </div>

            <div className="space-y-8">
          {/* What are cookies */}
          <section className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <div className="flex items-center mb-6">
              <FiInfo className="text-2xl text-white mr-3" />
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Was sind Cookies?</h2>
            </div>
            <p className="text-white/90 drop-shadow-lg leading-relaxed mb-4">
              Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden, wenn Sie
              unsere Website besuchen. Sie helfen uns dabei, Ihre Präferenzen zu speichern und Ihre
              Nutzererfahrung zu verbessern.
            </p>
          </section>

          {/* Types of cookies */}
          <section className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <div className="flex items-center mb-6">
              <FiSettings className="text-2xl text-white mr-3" />
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Welche Cookies verwenden wir?</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-2">1. Notwendige Cookies</h3>
                <p className="text-white/90 drop-shadow-lg mb-3">
                  Diese Cookies sind für das ordnungsgemäße Funktionieren der Website erforderlich
                  und können nicht deaktiviert werden.
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded p-4 text-sm space-y-3">
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>__session</strong>: Firebase Authentication Session Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Benutzerauthentifizierung und Sitzungsverwaltung</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 2 Wochen</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>firebase:authUser</strong>: Firebase Auth User Data</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Speicherung von Benutzerdaten im Local Storage</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> Bis zur Abmeldung</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>firebase:host</strong>: Firebase Storage Cache</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Caching für Firebase Storage und Firestore</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 30 Tage</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-2">2. Analytische Cookies</h3>
                <p className="text-white/90 drop-shadow-lg mb-3">
                  Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website
                  interagieren, indem sie Informationen anonym sammeln und melden.
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded p-4 text-sm space-y-3">
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>_ga</strong>: Google Analytics Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Eindeutige Benutzer-ID für Webseitenanalyse</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 2 Jahre</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>_ga_*</strong>: Google Analytics 4 Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Sitzungsstatus und Ereignisverfolgung</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 2 Jahre</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>_gid</strong>: Google Analytics Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Kurzzeitige Benutzer-ID für Webseitenanalyse</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 24 Stunden</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>__vercel_analytics_id</strong>: Vercel Analytics Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Anonyme Webseitenanalyse und Performance-Monitoring</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 1 Jahr</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>PHPSESSID</strong>: Siteground Hosting Session Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Session-Management für PHP-basierte Funktionen</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> Session (wird beim Schließen des Browsers gelöscht)</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>siteground_security_*</strong>: Siteground Security Cookies</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Sicherheitsmaßnahmen und Schutz vor Spam/Bots</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 24 Stunden</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>sg_cache_*</strong>: Siteground Cache Cookies</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Optimierung der Website-Performance und Caching</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 1 Stunde</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-2">4. KI-Chatbot und Support Cookies</h3>
                <p className="text-white/90 drop-shadow-lg mb-3">
                  Diese Cookies werden für unseren KI-gestützten Chatbot und Support-System verwendet.
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded p-4 text-sm space-y-3">
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>chatbot_session</strong>: Chatbot Session Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Verfolgung der Chatbot-Sitzung und Gesprächsverlauf</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 24 Stunden</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>support_chat_*</strong>: Support Chat Cookies</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Speicherung von Support-Chat-Daten und Eskalationen</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> Session</p>
                  </div>
                  <div>
                    <p className="text-white/90 drop-shadow-lg"><strong>gemini_context</strong>: KI-Kontext Cookie</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Speicherung des Gesprächskontexts für bessere KI-Antworten</p>
                    <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> 1 Stunde</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-2">5. Funktionale Cookies</h3>
                <p className="text-white/90 drop-shadow-lg mb-3">
                  Diese Cookies ermöglichen es der Website, erweiterte Funktionalität und
                  Personalisierung bereitzustellen.
                </p>
                <div className="bg-white/10 backdrop-blur-sm rounded p-4 text-sm">
                  <p className="text-white/90 drop-shadow-lg"><strong>googtrans</strong>: Google Translate Cookie</p>
                  <p className="text-white/90 drop-shadow-lg"><strong>Zweck:</strong> Speichert die gewählte Sprache für die Übersetzung</p>
                  <p className="text-white/90 drop-shadow-lg"><strong>Laufzeit:</strong> Session</p>
                </div>
              </div>
            </div>
          </section>

          {/* Your choices */}
          <section className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <div className="flex items-center mb-6">
              <FiShield className="text-2xl text-white mr-3" />
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Ihre Wahlmöglichkeiten</h2>
            </div>
            <div className="space-y-4">
              <p className="text-white/90 drop-shadow-lg">
                Sie können Cookies in Ihren Browser-Einstellungen verwalten. Beachten Sie jedoch,
                dass die Deaktivierung bestimmter Cookies die Funktionalität unserer Website
                beeinträchtigen kann.
              </p>
              <p className="text-white/90 drop-shadow-lg">
                Die meisten Webbrowser akzeptieren Cookies automatisch, aber Sie können Ihre
                Browser-Einstellungen normalerweise ändern, um Cookies abzulehnen, wenn Sie dies
                bevorzugen.
              </p>
            </div>
          </section>

          {/* Browser settings */}
          <section className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-4">
              Browser-Einstellungen für Cookies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2 text-white drop-shadow-lg">Chrome</h4>
                <p className="text-white/90 drop-shadow-lg">
                  Einstellungen → Erweitert → Datenschutz und Sicherheit → Cookies
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-white drop-shadow-lg">Firefox</h4>
                <p className="text-white/90 drop-shadow-lg">Einstellungen → Datenschutz & Sicherheit → Cookies</p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-white drop-shadow-lg">Safari</h4>
                <p className="text-white/90 drop-shadow-lg">
                  Einstellungen → Datenschutz → Cookies und Website-Daten
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-white drop-shadow-lg">Edge</h4>
                <p className="text-white/90 drop-shadow-lg">Einstellungen → Cookies und Websiteberechtigungen</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-[#14ad9f] rounded-lg p-8 text-white text-center">
            <FiMail className="text-4xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-4">Fragen zu Cookies?</h3>
            <p className="mb-6">
              Wenn Sie Fragen zu unserer Cookie-Richtlinie haben, kontaktieren Sie uns gerne.
            </p>
            <a
              href="mailto:datenschutz@taskilo.de"
              className="inline-block bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              datenschutz@taskilo.de
            </a>
          </section>

          {/* Last updated */}
          <section className="text-center">
            <p className="text-white/90 drop-shadow-lg text-sm">
              Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
            </p>
          </section>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
