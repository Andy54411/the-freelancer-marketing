import React from 'react';
import type { Metadata } from 'next';
import HilfeLayout from '@/components/hilfe/HilfeLayout';
import { Pause, Play, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terminplan bearbeiten | Taskilo Kalender Hilfe',
  description: 'Erfahre, wie du deinen Terminplan bearbeitest, pausierst oder löschst.',
};

const sidebarLinks = [
  { title: 'Terminplan erstellen', href: '/hilfe/terminplan/erstellen' },
  { title: 'Verfügbarkeit prüfen', href: '/hilfe/terminplan/verfuegbarkeit' },
  { title: 'Terminplan teilen', href: '/hilfe/terminplan/teilen' },
  { title: 'Terminplan bearbeiten', href: '/hilfe/terminplan/bearbeiten', current: true },
];

export default function BearbeitenPage() {
  return (
    <HilfeLayout
      title="Terminplan bearbeiten"
      sidebarLinks={sidebarLinks}
      currentIndex={4}
      totalArticles={4}
    >
      {/* Introduction */}
      <p className="text-gray-600 mb-6">
        Du kannst deinen Terminplan jederzeit bearbeiten, um Einstellungen anzupassen, ihn vorübergehend 
        zu pausieren oder vollständig zu löschen.
      </p>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Edit settings */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Terminplan-Einstellungen bearbeiten</h2>
      
      <ol className="list-decimal pl-6 mb-6 text-gray-600 space-y-3">
        <li>Öffne auf einem Computer den <strong>Taskilo Kalender</strong>.</li>
        <li>Klicke auf deinen <strong>Terminplan</strong> im Kalender.</li>
        <li>Klicke auf das <strong>Bearbeiten-Symbol</strong> (Stift) oder wähle <strong>Bearbeiten</strong>.</li>
        <li>Nimm die gewünschten Änderungen vor.</li>
        <li>Klicke auf <strong>Speichern</strong>.</li>
      </ol>

      {/* Editable Settings */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Einstellung
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Was du ändern kannst
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Titel und Beschreibung
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Aktualisiere den Namen deines Terminplans und die Beschreibung, die Gästen angezeigt wird.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Termindauer
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Ändere die Länge der Termine (z.B. von 30 auf 60 Minuten). 
                Bereits gebuchte Termine behalten ihre ursprüngliche Dauer.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Verfügbarkeit
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tage und Uhrzeiten anpassen</li>
                  <li>Pufferzeiten ändern</li>
                  <li>Buchungsfenster anpassen</li>
                  <li>Maximale Buchungen pro Tag festlegen</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Ort und Konferenz
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Wechsle zwischen Videokonferenz, Telefonat oder persönlichem Treffen.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Buchungsformular
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Füge zusätzliche Felder hinzu oder entferne sie. Ändere, welche Informationen 
                Gäste bei der Buchung angeben müssen.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Erinnerungen
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Passe an, wann und wie viele Erinnerungen an Gäste gesendet werden.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Pause schedule */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Terminplan pausieren oder fortsetzen</h2>
      
      <p className="text-gray-600 mb-4">
        Wenn du vorübergehend keine neuen Buchungen annehmen möchtest (z.B. während eines Urlaubs), 
        kannst du deinen Terminplan pausieren, anstatt ihn zu löschen.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Pause className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Pausieren</h3>
            <p className="text-gray-600 text-sm">
              Neue Buchungen werden verhindert. Bereits gebuchte Termine bleiben bestehen.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Fortsetzen</h3>
            <p className="text-gray-600 text-sm">
              Neue Buchungen sind wieder möglich. Der Buchungslink funktioniert wieder.
            </p>
          </div>
        </div>
      </div>

      <h3 className="font-medium text-gray-900 mb-3">So pausierst du deinen Terminplan:</h3>
      <ol className="list-decimal pl-6 mb-8 text-gray-600 space-y-2">
        <li>Klicke auf deinen <strong>Terminplan</strong> im Kalender.</li>
        <li>Klicke auf die <strong>drei Punkte</strong> (Mehr-Optionen).</li>
        <li>Wähle <strong>Buchungen pausieren</strong>.</li>
        <li>Um fortzusetzen, wiederhole die Schritte und wähle <strong>Buchungen fortsetzen</strong>.</li>
      </ol>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Duplicate schedule */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Terminplan duplizieren</h2>
      
      <p className="text-gray-600 mb-4">
        Erstelle eine Kopie eines bestehenden Terminplans, um schnell einen ähnlichen Plan 
        mit anderen Einstellungen zu erstellen.
      </p>

      <ol className="list-decimal pl-6 mb-8 text-gray-600 space-y-2">
        <li>Klicke auf deinen <strong>Terminplan</strong> im Kalender.</li>
        <li>Klicke auf die <strong>drei Punkte</strong> (Mehr-Optionen).</li>
        <li>Wähle <strong>Duplizieren</strong>.</li>
        <li>Bearbeite die Einstellungen der Kopie nach Bedarf.</li>
        <li>Klicke auf <strong>Speichern</strong>.</li>
      </ol>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Delete schedule */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Terminplan löschen</h2>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm font-medium mb-1">Achtung: Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <p className="text-red-700 text-sm">
              Wenn du einen Terminplan löschst:
            </p>
            <ul className="list-disc pl-4 mt-2 text-red-700 text-sm space-y-1">
              <li>Der Buchungslink funktioniert nicht mehr.</li>
              <li>Bereits gebuchte Termine bleiben in deinem Kalender, aber der Terminplan ist weg.</li>
              <li>Du musst einen neuen Terminplan erstellen und den neuen Link teilen.</li>
            </ul>
          </div>
        </div>
      </div>

      <h3 className="font-medium text-gray-900 mb-3">So löschst du deinen Terminplan:</h3>
      <ol className="list-decimal pl-6 mb-8 text-gray-600 space-y-2">
        <li>Klicke auf deinen <strong>Terminplan</strong> im Kalender.</li>
        <li>Klicke auf die <strong>drei Punkte</strong> (Mehr-Optionen).</li>
        <li>Wähle <strong>Löschen</strong>.</li>
        <li>Bestätige die Löschung im Dialogfenster.</li>
      </ol>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-blue-800 text-sm">
          <strong>Tipp:</strong> Wenn du nur vorübergehend keine Buchungen annehmen möchtest, 
          verwende stattdessen die <strong>Pausieren</strong>-Funktion. So behältst du alle 
          Einstellungen und kannst später einfach fortsetzen.
        </p>
      </div>
    </HilfeLayout>
  );
}
