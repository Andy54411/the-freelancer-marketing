'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Lock,
  AlertTriangle,
  FileText,
  Download,
  Mail,
  Printer,
  Send,
  Save } from
'lucide-react';
import { GoBDService } from '@/services/gobdService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GoBDActionWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  actionType: 'download' | 'email' | 'post' | 'print' | 'save';
  documentType?: string;
  documentNumber?: string;
  companyId: string;
  documentId: string;
  isAlreadyLocked?: boolean;
  onConsentSaved?: () => void; // Callback wenn Zustimmung gespeichert wurde
}

const actionConfig = {
  download: {
    icon: Download,
    title: 'PDF herunterladen',
    description: 'Das Dokument als PDF-Datei herunterladen',
    lockMessage: 'Nach dem Download wird das Dokument automatisch festgeschrieben'
  },
  email: {
    icon: Mail,
    title: 'Als E-Mail versenden',
    description: 'Das Dokument per E-Mail verschicken',
    lockMessage: 'Nach dem Versand wird das Dokument automatisch festgeschrieben'
  },
  post: {
    icon: Send,
    title: 'Per Post verschicken',
    description: 'Das Dokument per Post versenden',
    lockMessage: 'Nach der Postversendung wird das Dokument automatisch festgeschrieben'
  },
  print: {
    icon: Printer,
    title: 'Drucken',
    description: 'Das Dokument ausdrucken',
    lockMessage: 'Nach dem Drucken wird das Dokument automatisch festgeschrieben'
  },
  save: {
    icon: Save,
    title: 'Speichern',
    description: 'Das Dokument dauerhaft speichern',
    lockMessage: 'Nach dem Speichern wird das Dokument automatisch festgeschrieben'
  }
};

export function GoBDActionWarning({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  documentType = 'Dokument',
  documentNumber,
  companyId,
  documentId,
  isAlreadyLocked = false,
  onConsentSaved
}: GoBDActionWarningProps) {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const config = actionConfig[actionType];
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    if (!user) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Speichere die Zustimmung dauerhaft, wenn gewünscht
      if (rememberChoice) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const companyRef = doc(db, 'companies', companyId);
        await updateDoc(companyRef, {
          'gobdSettings.autoLockConsent': true,
          'gobdSettings.autoLockConsentDate': new Date(),
          'gobdSettings.autoLockConsentBy': user.uid
        });



        // Benachrichtige Parent-Komponente
        if (onConsentSaved) {
          onConsentSaved();
        }
      }

      // 2. Führe die ursprüngliche Aktion aus
      await onConfirm();

      // 3. GoBD-Festschreibung nur wenn noch nicht gesperrt
      if (!isAlreadyLocked) {
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unbekannt';

        const lockSuccess = await GoBDService.autoLockOnSend(
          companyId,
          documentId,
          user.uid,
          userName
        );

        if (lockSuccess) {
          toast.success(`${config.title} erfolgreich - Dokument wurde festgeschrieben`);
        }
      } else {
        toast.success(`${config.title} erfolgreich abgeschlossen`);
      }

      onClose();
    } catch (error) {
      console.error(`${actionType} action failed:`, error);
      toast.error(`Fehler beim ${config.title.toLowerCase()}: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
      setConfirmed(false);
      setRememberChoice(false);
    }
  };

  const handleCancel = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-[#14ad9f]" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {documentNumber &&
            <span className="font-medium">{documentType} {documentNumber}</span>
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {config.description}
          </p>

          {!isAlreadyLocked &&
          <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>GoBD-Hinweis:</strong><br />
                {config.lockMessage}. Das Dokument kann danach nicht mehr bearbeitet oder gelöscht werden.
              </AlertDescription>
            </Alert>
          }

          {isAlreadyLocked &&
          <Alert className="bg-blue-50 border-blue-200">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Dieses Dokument ist bereits festgeschrieben und kann nicht mehr verändert werden.
              </AlertDescription>
            </Alert>
          }

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(!!checked)} />

              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">

                {isAlreadyLocked ?
                `Ich möchte das Dokument ${config.title.toLowerCase()}` :
                `Ich verstehe die GoBD-Konsequenzen und möchte fortfahren`
                }
              </label>
            </div>
            
            {!isAlreadyLocked &&
            <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                id="remember"
                checked={rememberChoice}
                onCheckedChange={(checked) => setRememberChoice(!!checked)}
                disabled={!confirmed} />

                <label
                htmlFor="remember"
                className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">

                  Entscheidung speichern und nicht mehr nachfragen
                </label>
              </div>
            }
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}>

            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed || isProcessing}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">

            {isProcessing ?
            <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Wird verarbeitet...
              </> :

            <>
                <IconComponent className="h-4 w-4 mr-2" />
                {config.title}
              </>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

// Hook für einfache Verwendung
export function useGoBDActionWarning() {
  const [isOpen, setIsOpen] = useState(false);
  const [actionConfig, setActionConfig] = useState<Omit<GoBDActionWarningProps, 'isOpen' | 'onClose'> | null>(null);

  const showWarning = (config: Omit<GoBDActionWarningProps, 'isOpen' | 'onClose'>) => {
    setActionConfig(config);
    setIsOpen(true);
  };

  const hideWarning = () => {
    setIsOpen(false);
    setActionConfig(null);
  };

  const WarningComponent = actionConfig ?
  <GoBDActionWarning
    {...actionConfig}
    isOpen={isOpen}
    onClose={hideWarning} /> :

  null;

  return {
    showWarning,
    hideWarning,
    WarningComponent
  };
}