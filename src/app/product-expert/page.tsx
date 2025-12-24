import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Award, 
  Star, 
  Users,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  Heart,
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Product Expert werden | Taskilo',
  description: 'Werde Teil unseres Product Expert Programms und hilf anderen Nutzern bei ihren Fragen.',
};

export default function ProductExpertPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-teal-600 to-teal-800 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Werde Product Expert
            </h1>
            <p className="text-xl text-teal-100 mb-8">
              Teile dein Wissen, hilf der Community und werde ein anerkannter Experte
            </p>
            <button className="bg-white text-teal-600 px-8 py-3 rounded-lg hover:bg-gray-50 font-medium inline-flex items-center gap-2">
              Jetzt bewerben
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* What is it */}
        <section className="mb-16">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Was ist ein Product Expert?
            </h2>
            <p className="text-lg text-gray-600">
              Product Experts sind erfahrene Taskilo-Nutzer, die ihr Wissen mit der Community teilen, 
              Fragen beantworten und anderen dabei helfen, das Beste aus Taskilo herauszuholen.
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Deine Vorteile als Product Expert
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Besonderes Badge</h3>
              <p className="text-sm text-gray-600">
                Erhalte ein exklusives Product Expert Badge, das dich in der Community hervorhebt
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Frühzeitiger Zugang</h3>
              <p className="text-sm text-gray-600">
                Teste neue Features vor allen anderen und gib direktes Feedback
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Exklusives Netzwerk</h3>
              <p className="text-sm text-gray-600">
                Tausche dich mit anderen Experts aus und lerne von den Besten
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Anerkennung</h3>
              <p className="text-sm text-gray-600">
                Werde als Experte in deinem Bereich anerkannt und baue deinen Ruf aus
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Direkter Einfluss</h3>
              <p className="text-sm text-gray-600">
                Bringe deine Ideen ein und gestalte die Zukunft von Taskilo aktiv mit
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Community Impact</h3>
              <p className="text-sm text-gray-600">
                Hilf anderen, erfolgreicher zu sein und mache einen echten Unterschied
              </p>
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Voraussetzungen
          </h2>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Aktiver Taskilo-Nutzer</h3>
                    <p className="text-sm text-gray-600">
                      Du nutzt Taskilo regelmäßig und kennst die Plattform gut
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Hilfsbereitschaft</h3>
                    <p className="text-sm text-gray-600">
                      Du hast Freude daran, anderen zu helfen und dein Wissen zu teilen
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Kommunikationsstärke</h3>
                    <p className="text-sm text-gray-600">
                      Du kannst komplexe Sachverhalte klar und verständlich erklären
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Zeitinvestment</h3>
                    <p className="text-sm text-gray-600">
                      Du kannst etwa 2-5 Stunden pro Woche investieren, um die Community zu unterstützen
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Community Guidelines</h3>
                    <p className="text-sm text-gray-600">
                      Du hältst dich an unsere Community-Richtlinien und verhältst dich respektvoll
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            So wirst du Product Expert
          </h2>
          
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bewerbung einreichen</h3>
                  <p className="text-gray-600">
                    Fülle das Bewerbungsformular aus und erzähle uns, warum du Product Expert werden möchtest
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Prüfung</h3>
                  <p className="text-gray-600">
                    Unser Team prüft deine Bewerbung und meldet sich innerhalb von 5-7 Werktagen bei dir
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Onboarding</h3>
                  <p className="text-gray-600">
                    Nach Annahme durchläufst du ein kurzes Onboarding und erhältst Zugang zu allen Expert-Ressourcen
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Loslegen</h3>
                  <p className="text-gray-600">
                    Starte als Product Expert und beginne, der Community zu helfen!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-linear-to-r from-teal-50 to-blue-50 rounded-2xl p-8 md:p-12 border border-teal-200">
          <div className="text-center max-w-2xl mx-auto">
            <MessageSquare className="w-16 h-16 text-teal-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bereit, Product Expert zu werden?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Bewirb dich jetzt und werde Teil unseres Expert-Teams
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 font-medium inline-flex items-center justify-center gap-2">
                Jetzt bewerben
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                href="/kontakt"
                className="bg-white text-teal-600 px-8 py-3 rounded-lg hover:bg-gray-50 font-medium inline-flex items-center justify-center gap-2 border border-teal-600"
              >
                Fragen stellen
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
