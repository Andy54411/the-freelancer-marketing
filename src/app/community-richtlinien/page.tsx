import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Shield, 
  UserCheck, 
  MessageCircle,
  AlertTriangle,
  Ban,
  Flag,
  Heart,
  Scale
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community-Richtlinien | Taskilo',
  description: 'Unsere Regeln und Richtlinien für eine respektvolle und produktive Community.',
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Community-Richtlinien
          </h1>
          <p className="text-lg text-gray-600">
            Damit unsere Community ein sicherer und hilfreicher Ort für alle bleibt
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-gray-600 lead">
            Willkommen in der Taskilo Community! Diese Richtlinien helfen uns, eine positive, 
            respektvolle und produktive Umgebung für alle Mitglieder zu schaffen.
          </p>
        </div>

        {/* Core Principles */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Unsere Grundprinzipien</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sei freundlich</h3>
                  <p className="text-sm text-gray-600">
                    Behandle andere mit Respekt und Höflichkeit, auch bei Meinungsverschiedenheiten.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sei authentisch</h3>
                  <p className="text-sm text-gray-600">
                    Teile echte Erfahrungen und Informationen. Fake-Accounts sind nicht erlaubt.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sei hilfreich</h3>
                  <p className="text-sm text-gray-600">
                    Teile dein Wissen und hilf anderen, ihre Probleme zu lösen.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Sei fair</h3>
                  <p className="text-sm text-gray-600">
                    Vermeide Spam, Werbung und irreführende Informationen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What's Not Allowed */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Was ist nicht erlaubt?</h2>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Ban className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Belästigung & Hassrede</h3>
                  <p className="text-sm text-red-800">
                    Jegliche Form von Belästigung, Hassrede, Diskriminierung oder Drohungen 
                    gegen Einzelpersonen oder Gruppen ist strengstens verboten.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 mb-2">Spam & Werbung</h3>
                  <p className="text-sm text-orange-800">
                    Unaufgeforderte Werbung, repetitive Posts oder irrelevante kommerzielle 
                    Inhalte sind nicht gestattet.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Flag className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">Fehlinformationen</h3>
                  <p className="text-sm text-yellow-800">
                    Das absichtliche Verbreiten falscher oder irreführender Informationen 
                    schadet der Community und ist nicht erlaubt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Practices</h2>
          
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 shrink-0" />
                <span className="text-gray-700">
                  <strong>Suche zuerst:</strong> Bevor du eine Frage stellst, überprüfe ob sie bereits beantwortet wurde
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 shrink-0" />
                <span className="text-gray-700">
                  <strong>Sei spezifisch:</strong> Je detaillierter deine Frage, desto besser können andere helfen
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 shrink-0" />
                <span className="text-gray-700">
                  <strong>Bleib beim Thema:</strong> Halte Diskussionen relevant und fokussiert
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 shrink-0" />
                <span className="text-gray-700">
                  <strong>Danke für Hilfe:</strong> Zeige Wertschätzung für hilfreiche Antworten
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-teal-600 rounded-full mt-2 shrink-0" />
                <span className="text-gray-700">
                  <strong>Melde Verstöße:</strong> Hilf uns, die Community sicher zu halten, indem du problematische Inhalte meldest
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Consequences */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Konsequenzen bei Verstößen</h2>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600">
              Verstöße gegen diese Richtlinien können zu folgenden Maßnahmen führen:
            </p>
            <ol className="text-gray-600 space-y-2">
              <li>Warnung durch das Moderationsteam</li>
              <li>Temporäre Sperrung des Accounts</li>
              <li>Permanente Sperrung bei schweren oder wiederholten Verstößen</li>
            </ol>
            <p className="text-gray-600">
              Wir behalten uns das Recht vor, Inhalte zu entfernen oder Accounts zu sperren, 
              die gegen diese Richtlinien verstoßen.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gray-50 rounded-lg p-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Fragen zu den Richtlinien?</h2>
          <p className="text-gray-600 mb-6">
            Wenn du Fragen zu unseren Community-Richtlinien hast oder einen Verstoß melden möchtest, 
            kontaktiere uns bitte.
          </p>
          <Link
            href="/kontakt"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium"
          >
            Kontakt aufnehmen
          </Link>
        </section>

        {/* Back to Help */}
        <div className="mt-8 text-center">
          <Link
            href="/hilfe"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Zurück zum Hilfecenter
          </Link>
        </div>
      </div>
    </div>
  );
}
