'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface DsgvoSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  isDsgvoTemplate: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DsgvoSettingsDialog({
  open,
  onClose,
  isDsgvoTemplate,
  onToggle,
}: DsgvoSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogTitle className="sr-only">Was ist DSGVO?</DialogTitle>
        <DialogDescription className="sr-only">
          Informationen zur DSGVO und wie sie sich auf WhatsApp-Vorlagen auswirkt
        </DialogDescription>
        {/* Header */}
        <div className="px-6 py-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Was ist DSGVO?</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          <div className="text-sm text-gray-800 space-y-4">
            <p>
              Die DSGVO ist eine Verordnung der Europäischen Union zum Schutz personenbezogener
              Daten und der Privatsphäre. Sie verlangt von Unternehmen, verantwortungsvoll mit
              personenbezogenen Daten umzugehen, die eindeutige Zustimmung der Nutzer einzuholen,
              die Datensicherheit zu gewährleisten und das Recht der Personen auf Zugriff, Korrektur
              oder Löschung ihrer Daten zu respektieren. Bei Nichteinhaltung können hohe Bußgelder
              verhängt werden.
            </p>

            <div>
              <h2 className="font-semibold text-base text-gray-900 mb-2">
                Was bedeutet dies für die Vorlage?
              </h2>
              <p>
                Wenn du einem Lead eine Nachricht sendest, musst du die Konversation mit einer
                Vorlage einleiten. Wenn diese Vorlage mit DSGVO gekennzeichnet ist, muss der Lead
                zunächst mit &quot;START&quot; antworten, bevor die Konversation stattfindet.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base text-gray-900 mb-2">Beispiel:</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
                <p>Hallo J. Doe,</p>
                <p>
                  wir möchten Sie künftig über WhatsApp über Neuigkeiten informieren. Bitte
                  antworten Sie mit &quot;START&quot;, um zuzustimmen, oder mit &quot;STOP&quot;,
                  wenn Sie keine Nachrichten wünschen. Ihre Zustimmung können Sie jederzeit
                  widerrufen.
                </p>
                <p>
                  Vielen Dank,
                  <br />
                  Firma Mustermann
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3 pt-2">
            <Switch id="dsgvo-toggle" checked={isDsgvoTemplate} onCheckedChange={onToggle} />
            <Label
              htmlFor="dsgvo-toggle"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Datenschutz Vorlage
            </Label>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white px-6">
              schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
