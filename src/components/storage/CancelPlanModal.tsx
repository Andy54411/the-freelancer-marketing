'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, Shield, FileX } from 'lucide-react';
import { toast } from 'sonner';
import { StorageLimitService } from '@/services/storageLimitService';

interface CancelPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  currentPlanId: string;
  currentUsage: number; // in bytes
  onCancelComplete?: () => void;
}

export function CancelPlanModal({
  open,
  onOpenChange,
  companyId,
  currentPlanId,
  currentUsage,
  onCancelComplete,
}: CancelPlanModalProps) {
  const [signature, setSignature] = useState('');
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [consent3, setConsent3] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState('');

  // Get plan name from ID
  const getPlanName = (planId: string): string => {
    const planNames: { [key: string]: string } = {
      free: 'Free (500 MB)',
      '1gb': '1 GB',
      '10gb': '10 GB',
      '30gb': '30 GB',
      '50gb': '50 GB',
      '100gb': '100 GB',
      unlimited: 'Unlimited',
    };
    return planNames[planId] || planId;
  };

  const currentPlanName = getPlanName(currentPlanId);

  // Fetch user's IP address
  useEffect(() => {
    if (open) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setIpAddress(data.ip))
        .catch(() => setIpAddress('unknown'));
    }
  }, [open]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const kb = bytes / 1024;
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);

    if (gb >= 1) {
      return gb.toFixed(2) + ' GB';
    } else if (mb >= 1) {
      return mb.toFixed(2) + ' MB';
    } else if (kb >= 1) {
      return kb.toFixed(2) + ' KB';
    } else {
      return bytes + ' B';
    }
  };

  const handleCancel = async () => {
    if (!signature.trim()) {
      toast.error('Bitte geben Sie Ihren vollständigen Namen ein');
      return;
    }

    if (!consent1 || !consent2 || !consent3) {
      toast.error('Bitte bestätigen Sie alle Punkte');
      return;
    }

    setLoading(true);

    try {
      // 1. Record consent in Firestore
      const consentResult = await StorageLimitService.recordCancellationConsent(
        companyId,
        signature,
        ipAddress
      );

      if (!consentResult.success) {
        throw new Error(consentResult.error || 'Fehler beim Speichern der Einwilligung');
      }

      // 2. Cancel Stripe subscription
      const cancelResponse = await fetch('/api/storage/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      const cancelData = await cancelResponse.json();

      if (!cancelResponse.ok) {
        // Handle "no subscription" error specially
        if (cancelData.error?.includes('Abonnement')) {
          toast.info('Sie haben derzeit kein aktives Abonnement', {
            description: 'Ihre Einwilligung wurde gespeichert. Sie nutzen bereits den Free-Plan.',
          });
          onOpenChange(false);

          // Reset form
          setSignature('');
          setConsent1(false);
          setConsent2(false);
          setConsent3(false);

          if (onCancelComplete) {
            onCancelComplete();
          }
          return;
        }

        throw new Error(cancelData.error || 'Fehler beim Kündigen des Abonnements');
      }

      toast.success('Plan erfolgreich gekündigt', {
        description: 'Ihr Plan läuft bis zum Ende des Abrechnungszeitraums.',
      });
      onOpenChange(false);

      // Reset form
      setSignature('');
      setConsent1(false);
      setConsent2(false);
      setConsent3(false);

      // Call parent callback if provided
      if (onCancelComplete) {
        onCancelComplete();
      }
    } catch (error: any) {
      console.error('Error canceling plan:', error);
      toast.error(error.message || 'Fehler beim Kündigen des Plans');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = signature.trim() && consent1 && consent2 && consent3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle className="text-lg">Plan kündigen</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Sie kündigen <strong>{currentPlanName}</strong>. Wichtige Informationen beachten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-2">
          {/* Current Usage Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileX className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-xs text-red-800">
                Sie nutzen <strong>{formatBytes(currentUsage)}</strong>. Nach Kündigung werden{' '}
                <strong>alle Daten unwiderruflich gelöscht</strong>.
              </div>
            </div>
          </div>

          {/* What happens */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Was passiert?
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li className="flex gap-2">
                <span className="text-red-600">•</span>
                <span>Plan läuft bis Monatsende, dann Free-Plan (500 MB)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600">•</span>
                <span>
                  <strong>Alle Daten werden gelöscht</strong> (über 500 MB)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600">•</span>
                <span>Uploads & Downloads sofort gesperrt</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-600">•</span>
                <span>
                  <strong>Keine Wiederherstellung möglich</strong>
                </span>
              </li>
            </ul>
          </div>

          {/* Consent Checkboxes */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
            <h3 className="text-sm font-semibold text-gray-900">Bestätigung erforderlich</h3>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent1"
                checked={consent1}
                onCheckedChange={checked => setConsent1(checked as boolean)}
                className="mt-0.5"
              />
              <label
                htmlFor="consent1"
                className="text-xs text-gray-700 cursor-pointer leading-tight"
              >
                Ich verstehe, dass alle Daten <strong>unwiderruflich gelöscht</strong> werden.
              </label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent2"
                checked={consent2}
                onCheckedChange={checked => setConsent2(checked as boolean)}
                className="mt-0.5"
              />
              <label
                htmlFor="consent2"
                className="text-xs text-gray-700 cursor-pointer leading-tight"
              >
                Ich habe meine Daten <strong>bereits gesichert</strong>.
              </label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="consent3"
                checked={consent3}
                onCheckedChange={checked => setConsent3(checked as boolean)}
                className="mt-0.5"
              />
              <label
                htmlFor="consent3"
                className="text-xs text-gray-700 cursor-pointer leading-tight"
              >
                <strong>Taskilo übernimmt keine Verantwortung</strong> für gelöschte Daten.
              </label>
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-1.5">
            <label htmlFor="signature" className="text-xs font-medium text-gray-900">
              Digitale Unterschrift (vollständiger Name) *
            </label>
            <Input
              id="signature"
              placeholder="Max Mustermann"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              className="font-serif h-9 text-sm"
            />
            <p className="text-[10px] text-gray-500">
              IP: {ipAddress} • Zeitstempel wird gespeichert
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-3 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            size="sm"
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!isFormValid || loading}
            size="sm"
          >
            {loading ? 'Wird gekündigt...' : 'Jetzt kündigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
