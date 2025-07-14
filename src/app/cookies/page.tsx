'use client';

import React from 'react';
import { FiInfo, FiSettings, FiShield, FiMail } from 'react-icons/fi';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#14ad9f] text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Cookie-Richtlinie</h1>
          <p className="text-xl opacity-90">
            Informationen über die Verwendung von Cookies auf Taskilo.de
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* What are cookies */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <FiInfo className="text-2xl text-[#14ad9f] mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Was sind Cookies?</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden, wenn Sie
              unsere Website besuchen. Sie helfen uns dabei, Ihre Präferenzen zu speichern und Ihre
              Nutzererfahrung zu verbessern.
            </p>
          </section>

          {/* Types of cookies */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <FiSettings className="text-2xl text-[#14ad9f] mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Welche Cookies verwenden wir?</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Notwendige Cookies</h3>
                <p className="text-gray-700">
                  Diese Cookies sind für das ordnungsgemäße Funktionieren der Website erforderlich
                  und können nicht deaktiviert werden. Sie speichern beispielsweise Ihre
                  Anmeldeinformationen und Sicherheitseinstellungen.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytische Cookies</h3>
                <p className="text-gray-700">
                  Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website
                  interagieren, indem sie Informationen anonym sammeln und melden. Wir verwenden
                  Vercel Analytics für diese Zwecke.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Funktionale Cookies</h3>
                <p className="text-gray-700">
                  Diese Cookies ermöglichen es der Website, erweiterte Funktionalität und
                  Personalisierung bereitzustellen, wie z.B. die Speicherung Ihrer Sprachpräferenzen
                  und Dashboard-Einstellungen.
                </p>
              </div>
            </div>
          </section>

          {/* Your choices */}
          <section className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center mb-6">
              <FiShield className="text-2xl text-[#14ad9f] mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Ihre Wahlmöglichkeiten</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-700">
                Sie können Cookies in Ihren Browser-Einstellungen verwalten. Beachten Sie jedoch,
                dass die Deaktivierung bestimmter Cookies die Funktionalität unserer Website
                beeinträchtigen kann.
              </p>
              <p className="text-gray-700">
                Die meisten Webbrowser akzeptieren Cookies automatisch, aber Sie können Ihre
                Browser-Einstellungen normalerweise ändern, um Cookies abzulehnen, wenn Sie dies
                bevorzugen.
              </p>
            </div>
          </section>

          {/* Browser settings */}
          <section className="bg-gray-100 rounded-lg p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Browser-Einstellungen für Cookies
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Chrome</h4>
                <p className="text-gray-600">
                  Einstellungen → Erweitert → Datenschutz und Sicherheit → Cookies
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Firefox</h4>
                <p className="text-gray-600">Einstellungen → Datenschutz & Sicherheit → Cookies</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Safari</h4>
                <p className="text-gray-600">
                  Einstellungen → Datenschutz → Cookies und Website-Daten
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Edge</h4>
                <p className="text-gray-600">Einstellungen → Cookies und Websiteberechtigungen</p>
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
          <section className="text-center text-gray-500 text-sm">
            <p>Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
