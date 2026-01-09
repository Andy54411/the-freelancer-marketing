'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Info } from 'lucide-react';

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
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogTitle className="sr-only">DSGVO Einstellungen</DialogTitle>
        <DialogDescription className="sr-only">
          Informationen zur DSGVO und wie sie sich auf WhatsApp-Vorlagen auswirkt
        </DialogDescription>
        
        {/* Header */}
        <div className="px-6 py-5 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">DSGVO Einstellungen</h2>
            <p className="text-sm text-gray-500">Datenschutz-Konformität für WhatsApp-Nachrichten</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Linke Spalte - Info */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Was ist die DSGVO?</h3>
                  <p className="text-sm text-blue-800">
                    Die DSGVO ist eine EU-Verordnung zum Schutz personenbezogener Daten. 
                    Sie verlangt die eindeutige Zustimmung der Nutzer für Kommunikation.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Was bedeutet das für die Vorlage?</h3>
                <p className="text-sm text-gray-600">
                  Wenn diese Option aktiviert ist, muss der Empfänger zunächst mit 
                  <span className="font-mono bg-gray-100 px-1 mx-1 rounded">START</span> 
                  antworten, bevor weitere Nachrichten gesendet werden können.
                </p>
              </div>
            </div>

            {/* Rechte Spalte - Beispiel */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Beispiel-Nachricht:</h3>
              <div className="bg-[#dcf8c6] rounded-lg p-4 text-sm space-y-2 shadow-sm">
                <p>Hallo Max Mustermann,</p>
                <p>
                  wir möchten Sie künftig über WhatsApp über Neuigkeiten informieren.
                </p>
                <p>
                  Bitte antworten Sie mit <strong>START</strong>, um zuzustimmen, 
                  oder mit <strong>STOP</strong>, wenn Sie keine Nachrichten wünschen.
                </p>
                <p className="text-gray-600 text-xs mt-2">
                  Ihre Zustimmung können Sie jederzeit widerrufen.
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Section */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${isDsgvoTemplate ? 'text-[#25D366]' : 'text-gray-400'}`} />
                <div>
                  <Label
                    htmlFor="dsgvo-toggle"
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                  >
                    Datenschutz-Vorlage aktivieren
                  </Label>
                  <p className="text-xs text-gray-500">
                    Erfordert Zustimmung des Empfängers vor dem Senden weiterer Nachrichten
                  </p>
                </div>
              </div>
              <Switch 
                id="dsgvo-toggle" 
                checked={isDsgvoTemplate} 
                onCheckedChange={onToggle}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="outline"
              onClick={onClose}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={onClose} 
              className="bg-[#25D366] hover:bg-[#128C7E] text-white px-6"
            >
              Übernehmen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
