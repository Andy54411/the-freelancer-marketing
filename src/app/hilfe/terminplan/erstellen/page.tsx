import React from 'react';
import type { Metadata } from 'next';
import HilfeLayout from '@/components/hilfe/HilfeLayout';
import { Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terminplan erstellen | Taskilo Kalender Hilfe',
  description: 'Erfahre, wie du einen Terminplan in Taskilo Kalender erstellst, um anderen zu ermöglichen, Termine mit dir zu buchen.',
};

const sidebarLinks = [
  { title: 'Terminplan erstellen', href: '/hilfe/terminplan/erstellen', current: true },
  { title: 'Verfügbarkeit prüfen', href: '/hilfe/terminplan/verfuegbarkeit' },
  { title: 'Terminplan teilen', href: '/hilfe/terminplan/teilen' },
  { title: 'Terminplan bearbeiten', href: '/hilfe/terminplan/bearbeiten' },
];

export default function TerminplanErstellenPage() {
  return (
    <HilfeLayout
      title="Terminplan erstellen"
      sidebarLinks={sidebarLinks}
      currentIndex={1}
      totalArticles={4}
    >
      {/* Introduction */}
      <p className="text-gray-600 mb-6">
        Wenn du einen neuen Terminplan erstellst, musst du:
      </p>
      <ul className="list-disc pl-6 mb-8 text-gray-600 space-y-2">
        <li>Die Termindauer und deine Verfügbarkeit auswählen.</li>
        <li>Anpassen, wie du dich mit anderen triffst.</li>
      </ul>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Before you begin */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Bevor du beginnst</h2>
      <p className="text-gray-600 mb-4">
        Folgendes benötigst du, um einen Terminplan zu erstellen:
      </p>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-gray-600">Ein Taskilo-Konto mit aktivem Kalender.</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-teal-600" />
          </div>
          <span className="text-gray-600">Einen Computer mit einem unterstützten Webbrowser. Du kannst keinen Terminplan in der mobilen App erstellen.</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-blue-800 text-sm">
          <strong>Tipp:</strong> Einige Terminplan-Funktionen erfordern ein Premium-Abonnement.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Step 1 */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Schritt 1: Terminplan einrichten</h2>
      
      <ol className="list-decimal pl-6 mb-6 text-gray-600 space-y-2">
        <li>Öffne auf einem Computer den <strong>Taskilo Kalender</strong>.</li>
        <li>Klicke oben links auf <strong>Erstellen</strong>.</li>
        <li>Wähle <strong>Terminplan</strong>.</li>
        <li>Richte im linken Bereich deine Termineinstellungen ein.</li>
        <li>Klicke auf <strong>Weiter</strong>.</li>
      </ol>

      {/* Settings Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Einstellung
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Beschreibung
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Titel hinzufügen
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Gib einen Titel für deinen Terminplan ein.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Der Titel ist für jeden sichtbar, der den Link zu deiner Buchungsseite hat.</li>
                  <li>Der Titel erscheint in deinem Kalender für den Plan und eingehende Buchungen.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Termindauer
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Klicke unter &quot;Termindauer&quot; auf den Dropdown-Pfeil.</li>
                  <li>Wähle die Dauer aus.
                    <ul className="list-disc pl-4 mt-1">
                      <li>Um eine benutzerdefinierte Dauer festzulegen, wähle <strong>Benutzerdefiniert</strong>.</li>
                    </ul>
                  </li>
                </ol>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Allgemeine Verfügbarkeit
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Lege Datum, Uhrzeit und Zeitzone deiner Termine fest.</p>
                <p>Für wöchentlich wiederkehrende Termine kannst du neben einem Zeitfenster auswählen:</p>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li><strong>Ganztägig nicht verfügbar</strong>: Mach dich für das ausgewählte Zeitfenster nicht verfügbar.</li>
                  <li><strong>Weitere Periode hinzufügen</strong>: Füge am selben Tag ein weiteres Zeitfenster hinzu.</li>
                  <li><strong>Zeit auf alle kopieren</strong>: Wende denselben Zeitplan auf alle Tage an.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Buchungsfenster
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Begrenze den Zeitraum, in dem Personen Termine in deinem Kalender buchen können:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Die maximale Vorlaufzeit, die andere haben, um einen Termin bei dir zu buchen.</li>
                  <li>Die minimale Vorlaufzeit, die du für die Buchung eines Termins benötigst.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Angepasste Verfügbarkeit
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                Ändere deine Verfügbarkeit für bestimmte Daten, wie z.B. Feiertage.
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Gebuchte Termineinstellungen
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Verwalte die Termine, die in deinem Kalender erscheinen:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Pufferzeit:</strong> Füge Zeit zwischen Terminen in deinem Kalender hinzu.</li>
                  <li><strong>Maximale Buchungen pro Tag:</strong> Begrenze die Anzahl der Termine, die du an einem Tag annimmst.</li>
                  <li><strong>Gästeberechtigungen:</strong> Erlaube Gästen, andere zu deinen Terminen einzuladen.</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* Step 2 */}
      <h2 className="text-xl font-medium text-gray-900 mb-4">Schritt 2: Buchungsseite einrichten</h2>
      
      <ol className="list-decimal pl-6 mb-6 text-gray-600 space-y-2">
        <li>Richte im linken Bereich deine Buchungsseiteneinstellungen ein.</li>
        <li>Klicke auf <strong>Speichern</strong>.</li>
      </ol>

      {/* Booking Page Settings Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Buchungsseiteneinstellung
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-900 border-b border-gray-200">
                Beschreibung
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Foto und Name der Buchungsseite
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Überprüfe, wie deine Identität auf deiner Buchungsseite angezeigt wird.</p>
                <p>Um das Profilfoto oder den Kontonamen auf deiner Buchungsseite zu ändern, aktualisiere deine persönlichen Daten in deinem Taskilo-Konto.</p>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Ort und Konferenz
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Um auszuwählen, wie und wo du Personen triffst, die Termine bei dir buchen:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Klicke auf <strong>Auswählen, wie und wo getroffen wird</strong>.</li>
                  <li>Wähle:
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li><strong>Taskilo Meet Videokonferenz</strong></li>
                      <li><strong>Persönliches Treffen</strong></li>
                      <li><strong>Telefonanruf</strong></li>
                      <li><strong>Keine / wird später festgelegt</strong></li>
                    </ul>
                  </li>
                </ol>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Beschreibung
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Füge eine Beschreibung hinzu, die deinen Service erklärt. Die Beschreibung wird angezeigt:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Auf deiner Buchungsseite</li>
                  <li>In Bestätigungs-E-Mails</li>
                  <li>In Ereignisbeschreibungen</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Buchungsformular
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Füge Felder hinzu, die Teilnehmer ausfüllen müssen, einschließlich Pflichtfelder für:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Vorname</li>
                  <li>Nachname</li>
                  <li>E-Mail-Adresse</li>
                </ul>
                <p className="mt-2">Um weitere Felder hinzuzufügen, klicke auf <strong>Element hinzufügen</strong>.</p>
                <p className="mt-2">Um Spam-Buchungen zu vermeiden, aktiviere <strong>E-Mail-Verifizierung erforderlich</strong>.</p>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-900 align-top">
                Buchungsbestätigungen und Erinnerungen
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <p className="mb-2">Richte Bestätigungs-E-Mails und Erinnerungen für deine Termine ein.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Du kannst bis zu 5 Erinnerungen senden.</li>
                  <li>Du kannst den Text der Erinnerungs-E-Mails nicht bearbeiten.</li>
                  <li>Um mehr als eine Erinnerung zu senden, klicke auf <strong>Erinnerung hinzufügen</strong>.</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="text-center my-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Bereit zum Starten?</h3>
        <a 
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Erstelle deinen ersten Terminplan
        </a>
      </div>
    </HilfeLayout>
  );
}
