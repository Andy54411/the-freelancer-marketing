import React from 'react';
import type { Metadata } from 'next';
import HilfeLayout from '@/components/hilfe/HilfeLayout';
import { Check, AlertCircle, CalendarCheck, CalendarX } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Verfügbarkeit prüfen | Taskilo Kalender Hilfe',
  description: 'Erfahre, wie du Kalenderkonflikte vermeidest und deine Verfügbarkeit über mehrere Kalender hinweg prüfst.',
};

const sidebarLinks = [
  { title: 'Terminplan erstellen', href: '/hilfe/terminplan/erstellen' },
  { title: 'Verfügbarkeit prüfen', href: '/hilfe/terminplan/verfuegbarkeit', current: true },
  { title: 'Terminplan teilen', href: '/hilfe/terminplan/teilen' },
  { title: 'Terminplan bearbeiten', href: '/hilfe/terminplan/bearbeiten' },
];

export default function VerfuegbarkeitPage() {
  return (
    <HilfeLayout
      title="Verfügbarkeit über Kalender hinweg prüfen"
      sidebarLinks={sidebarLinks}
      currentIndex={2}
      totalArticles={4}
    >
      {/* Introduction */}
      <p className="text-gray-600 mb-6">
        Wenn du einen Terminplan erstellst, kann Taskilo Kalender automatisch deine Verfügbarkeit über mehrere Kalender 
        hinweg prüfen. So werden Doppelbuchungen vermieden und deine Termine bleiben konfliktfrei.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-800 text-sm">
            <strong>Hinweis:</strong> Die Verfügbarkeitsprüfung ist ein Premium-Feature und erfordert möglicherweise 
            ein entsprechendes Abonnement.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* How conflicts are detected */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">So werden Konflikte erkannt</h2>
      
      <p className="text-gray-600 mb-6">
        Taskilo prüft automatisch die ausgewählten Kalender auf Überschneidungen. Wenn ein Zeitfenster bereits 
        durch einen anderen Termin belegt ist, wird es als nicht verfügbar markiert.
      </p>

      {/* Conflict Scenarios */}
      <div className="grid gap-4 mb-8">
        {/* Available */}
        <div className="flex items-start gap-4 p-4 border border-green-200 bg-green-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-green-800 mb-1">Verfügbar</h3>
            <p className="text-green-700 text-sm">
              Das Zeitfenster ist in allen geprüften Kalendern frei. Kunden können diesen Termin buchen.
            </p>
          </div>
        </div>

        {/* Unavailable */}
        <div className="flex items-start gap-4 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <CalendarX className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-medium text-red-800 mb-1">Nicht verfügbar (Konflikt)</h3>
            <p className="text-red-700 text-sm">
              Ein anderer Termin belegt dieses Zeitfenster. Das Slot wird Kunden nicht angezeigt.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Configure availability check */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Verfügbarkeitsprüfung konfigurieren</h2>
      
      <ol className="list-decimal pl-6 mb-6 text-gray-600 space-y-3">
        <li>
          Öffne deinen <strong>Terminplan</strong> zur Bearbeitung.
        </li>
        <li>
          Scrolle zum Abschnitt <strong>Kalender</strong>.
        </li>
        <li>
          Aktiviere <strong>Kalender auf Verfügbarkeit prüfen</strong>.
        </li>
        <li>
          Wähle die Kalender aus, die geprüft werden sollen:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Dein Hauptkalender</li>
            <li>Sekundäre Kalender</li>
            <li>Freigegebene Kalender</li>
          </ul>
        </li>
        <li>
          Klicke auf <strong>Speichern</strong>.
        </li>
      </ol>

      {/* Settings Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Kalenderoption
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Beschreibung
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Primärer Kalender
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Dein Hauptkalender, in dem Termine standardmäßig erstellt werden. Wird immer auf Konflikte geprüft.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Sekundäre Kalender
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Zusätzliche Kalender, die du erstellt hast. Wähle aus, welche bei der Verfügbarkeitsprüfung 
                berücksichtigt werden sollen.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Freigegebene Kalender
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Kalender, die andere Personen mit dir geteilt haben. Nützlich für Team-Koordination.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Co-Host-Kalender
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Wenn du Co-Hosts zu deinem Terminplan hinzufügst, kannst du auch deren 
                Kalender auf Verfügbarkeit prüfen.</p>
                <p className="text-amber-700 bg-amber-50 p-2 rounded text-xs">
                  <strong>Tipp:</strong> Standardmäßig werden Co-Host-Kalender nicht geprüft. Aktiviere diese 
                  Option explizit, um Doppelbuchungen zu vermeiden.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Best Practices */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Best Practices</h2>
      
      <div className="space-y-3 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-gray-600">
            <strong>Alle relevanten Kalender einbeziehen:</strong> Stelle sicher, dass alle Kalender, die 
            deine Verfügbarkeit beeinflussen, in die Prüfung einbezogen werden.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-gray-600">
            <strong>Pufferzeiten nutzen:</strong> Füge Pufferzeiten zwischen Terminen hinzu, um Übergänge 
            zu ermöglichen und Stress zu reduzieren.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-gray-600">
            <strong>Regelmäßig überprüfen:</strong> Prüfe regelmäßig deine Kalendereinstellungen, besonders 
            wenn sich deine Arbeitssituation ändert.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-gray-600">
            <strong>Maximale Buchungen begrenzen:</strong> Setze ein Tageslimit, um Überarbeitung zu vermeiden.
          </span>
        </div>
      </div>
    </HilfeLayout>
  );
}
