import React from 'react';
import type { Metadata } from 'next';
import HilfeLayout from '@/components/hilfe/HilfeLayout';
import { Copy, Mail, Globe, Lock, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terminplan teilen | Taskilo Kalender Hilfe',
  description: 'Erfahre, wie du deinen Terminplan mit anderen teilst, damit sie Termine bei dir buchen können.',
};

const sidebarLinks = [
  { title: 'Terminplan erstellen', href: '/hilfe/terminplan/erstellen' },
  { title: 'Verfügbarkeit prüfen', href: '/hilfe/terminplan/verfuegbarkeit' },
  { title: 'Terminplan teilen', href: '/hilfe/terminplan/teilen', current: true },
  { title: 'Terminplan bearbeiten', href: '/hilfe/terminplan/bearbeiten' },
];

export default function TeilenPage() {
  return (
    <HilfeLayout
      title="Terminplan teilen"
      sidebarLinks={sidebarLinks}
      currentIndex={3}
      totalArticles={4}
    >
      {/* Introduction */}
      <p className="text-gray-600 mb-6">
        Nachdem du deinen Terminplan erstellt hast, kannst du ihn mit anderen teilen. Personen, die den 
        Link erhalten, können verfügbare Zeiten sehen und direkt einen Termin bei dir buchen.
      </p>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Get booking link */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Buchungslink abrufen</h2>
      
      <ol className="list-decimal pl-6 mb-6 text-gray-600 space-y-3">
        <li>Öffne auf einem Computer den <strong>Taskilo Kalender</strong>.</li>
        <li>Klicke auf deinen <strong>Terminplan</strong> im Kalender.</li>
        <li>Klicke auf <strong>Buchungsseite öffnen</strong> oder <strong>Teilen</strong>.</li>
        <li>Wähle eine der folgenden Optionen:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Link kopieren:</strong> Kopiert den Buchungslink in die Zwischenablage.</li>
            <li><strong>In neuem Tab öffnen:</strong> Zeigt eine Vorschau deiner Buchungsseite.</li>
          </ul>
        </li>
      </ol>

      {/* Sharing Options */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Teilen-Option
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Beschreibung
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm align-top">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Copy className="w-4 h-4" />
                  Link kopieren
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Kopiert den vollständigen Buchungslink. Du kannst diesen Link dann in E-Mails, 
                Nachrichten oder auf deiner Website einfügen.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm align-top">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Mail className="w-4 h-4" />
                  Per E-Mail senden
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Öffnet dein E-Mail-Programm mit einem vorausgefüllten Link zu deiner Buchungsseite.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm align-top">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Globe className="w-4 h-4" />
                  Auf Website einbetten
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Generiert HTML-Code, den du auf deiner Website einfügen kannst.</p>
                <p className="text-xs text-gray-500">Premium-Feature</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* What guests see */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Was Gäste sehen</h2>
      
      <p className="text-gray-600 mb-4">
        Wenn jemand deinen Buchungslink öffnet, sieht er:
      </p>

      <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
        <li><strong>Dein Profilfoto und Namen</strong> (falls konfiguriert)</li>
        <li><strong>Den Titel</strong> deines Terminplans</li>
        <li><strong>Die Beschreibung</strong> deines Services</li>
        <li><strong>Verfügbare Zeitfenster</strong> basierend auf deiner Verfügbarkeit</li>
        <li><strong>Die Termindauer</strong> (z.B. 30 Minuten, 1 Stunde)</li>
        <li><strong>Den Treffpunkt</strong> (Video, Telefon, vor Ort)</li>
      </ul>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-blue-800 text-sm">
          <strong>Tipp:</strong> Teste deinen Buchungslink selbst, um zu sehen, wie er für andere aussieht. 
          Klicke dazu auf &quot;In neuem Tab öffnen&quot; in den Teilen-Optionen.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Privacy settings */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Datenschutzeinstellungen</h2>
      
      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Öffentlicher Link</h3>
            <p className="text-gray-600 text-sm">
              Jeder mit dem Link kann deine Buchungsseite sehen und einen Termin buchen. 
              Keine Anmeldung erforderlich.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">E-Mail-Verifizierung</h3>
            <p className="text-gray-600 text-sm">
              Wenn aktiviert, müssen Gäste ihre E-Mail-Adresse bestätigen, bevor die Buchung 
              abgeschlossen wird. Dies verhindert Spam-Buchungen.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Nur für angemeldete Nutzer</h3>
            <p className="text-gray-600 text-sm">
              Bei dieser Einstellung können nur Personen mit einem Taskilo-Konto Termine buchen.
            </p>
            <p className="text-xs text-gray-500 mt-1">Premium-Feature</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Where to share */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Wo du deinen Link teilen kannst</h2>
      
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">E-Mail-Signatur</h3>
          <p className="text-gray-600 text-sm">
            Füge deinen Buchungslink zu deiner E-Mail-Signatur hinzu, damit Kontakte einfach 
            Termine mit dir vereinbaren können.
          </p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Website</h3>
          <p className="text-gray-600 text-sm">
            Bette den Link oder einen Buchungsbutton auf deiner Website ein.
          </p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Social Media</h3>
          <p className="text-gray-600 text-sm">
            Teile den Link in deinem LinkedIn-Profil, Instagram-Bio oder anderen sozialen Netzwerken.
          </p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Direktnachrichten</h3>
          <p className="text-gray-600 text-sm">
            Sende den Link direkt an Personen, die einen Termin bei dir buchen möchten.
          </p>
        </div>
      </div>
    </HilfeLayout>
  );
}
