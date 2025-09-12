'use client';

import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiClock } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface OrderData {
  id: string;
  status: string;
  jobDateFrom?: string;
  jobDateTo?: string;
  priceInCents: number;
  providerId: string;
  customerId: string;
  paymentType?: string;
  customerType?: string;
}

interface StornoButtonSectionProps {
  order: OrderData;
  currentUser: any;
  onStornoSuccess: () => void;
}

interface StornoConditions {
  isOverdue: boolean;
  hasStornoRight: boolean;
  expectedRefund: number;
  processingFee: number;
  stornoType: 'normal' | 'lieferverzug';
  timeUntilDeadline?: number; // Stunden bis Deadline
}

export default function StornoButtonSection({
  order,
  currentUser,
  onStornoSuccess,
}: StornoButtonSectionProps) {
  const [stornoConditions, setStornoConditions] = useState<StornoConditions | null>(null);
  const [showStornoDialog, setShowStornoDialog] = useState(false);
  const [stornoReason, setStornoReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Storno-Berechtigung und Bedingungen laden
  useEffect(() => {
    loadStornoConditions();
  }, [order.id]);

  const loadStornoConditions = async () => {
    try {
      // API Call um Storno-Bedingungen zu laden mit verbessertem Deadline-Management
      const response = await fetch(
        `/api/public/storno-conditions/${order.providerId}?auftragId=${order.id}`
      );

      if (response.ok) {
        const data = await response.json();

        // Nutze die neuen API-Daten für präzise Deadline-Berechnung
        const auftragSpecific = data.auftragSpecific;

        if (!auftragSpecific) {
          setStornoConditions({
            isOverdue: false,
            hasStornoRight: false,
            expectedRefund: 0,
            processingFee: 0,
            stornoType: 'normal',
          });
          return;
        }

        const conditions: StornoConditions = {
          isOverdue: auftragSpecific.isOverdue || false,
          hasStornoRight: auftragSpecific.canCancel || auftragSpecific.fullRefundRight || false,
          expectedRefund: Math.round((auftragSpecific.refundAmount || 0) * 100), // Convert to cents
          processingFee: Math.round((auftragSpecific.processingFee || 0) * 100), // Convert to cents
          stornoType: auftragSpecific.stornoType || 'normal',
          timeUntilDeadline: auftragSpecific.hoursUntilDeadline,
        };

        setStornoConditions(conditions);
      }
    } catch (error) {
      // Fallback auf alte Methode
      const isOverdue = checkIfOverdue();
      setStornoConditions({
        isOverdue,
        hasStornoRight: isOverdue || canCancelNormally(),
        expectedRefund: isOverdue ? order.priceInCents : Math.max(0, order.priceInCents - 1000), // 10€ fallback fee
        processingFee: isOverdue ? 0 : 1000,
        stornoType: isOverdue ? 'lieferverzug' : 'normal',
        timeUntilDeadline: calculateTimeUntilDeadline(),
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfOverdue = (): boolean => {
    // Verwende jobDateTo als primäre Deadline, dann jobDateFrom (konsistent mit API)
    const deadline = order.jobDateTo || order.jobDateFrom;
    if (!deadline) return false;

    const today = new Date();
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(23, 59, 59, 999); // Ende des Tages

    return today > deadlineDate;
  };

  const canCancelNormally = (): boolean => {
    // Normale Stornierung möglich bei Status: AKTIV, zahlung_erhalten_clearing, accepted
    const cancellableStates = [
      'AKTIV',
      'zahlung_erhalten_clearing',
      'accepted',
      'PROVIDER_COMPLETED',
    ];

    return cancellableStates.includes(order.status);
  };

  const calculateTimeUntilDeadline = (): number | undefined => {
    // Verwende jobDateTo als primäre Deadline, dann jobDateFrom (konsistent mit API)
    const deadline = order.jobDateTo || order.jobDateFrom;
    if (!deadline) return undefined;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(23, 59, 59, 999);

    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    return diffHours > 0 ? diffHours : 0;
  };

  const handleStornoSubmit = async () => {
    if (!stornoConditions || !stornoReason.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/user/${currentUser.uid}/orders/${order.id}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: stornoReason,
          stornoType: stornoConditions.stornoType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setShowStornoDialog(false);
        onStornoSuccess();

        // Zusätzliche Info für User
        if (stornoConditions.stornoType === 'lieferverzug') {
          alert(
            '✅ Storno-Recht aktiviert! Ihre Anfrage wird prioritär bearbeitet und Sie erhalten eine vollständige Rückerstattung.'
          );
        } else {
          alert(
            '📋 Storno-Anfrage eingereicht! Ein Admin prüft Ihren Fall und meldet sich in 24h zurück.'
          );
        }
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.message}`);
      }
    } catch (error) {
      alert('Fehler beim Einreichen der Storno-Anfrage. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="md:col-span-2 mt-4 p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!stornoConditions) {
    return null; // Keine Daten geladen
  }

  // NUR bei Lieferverzug anzeigen
  if (!stornoConditions.isOverdue) {
    return null; // Kein Storno-Button bei normalen, pünktlichen Aufträgen
  }

  return (
    <div className="md:col-span-2 mt-4">
      {/* LIEFERVERZUG STORNO-RECHT */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-red-800 text-lg mb-2">
              🚨 LIEFERVERZUG - STORNO-RECHT AKTIV!
            </h3>
            <p className="text-red-700 mb-3">
              Das Ausführungsdatum wurde überschritten. Der Anbieter ist im Verzug. Sie haben das
              Recht, diesen Auftrag zu stornieren und Ihr Geld zurückzufordern.
            </p>
            <div className="bg-white rounded-lg p-3 mb-4 border border-red-200">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">
                    ✅ Vollständige Rückerstattung:
                  </span>
                  <span className="font-bold text-green-700">
                    €{(stornoConditions.expectedRefund / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 font-medium">
                    ✅ Keine Bearbeitungsgebühr für Sie:
                  </span>
                  <span className="font-bold text-green-700">€0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 font-medium">
                    ⚠️ Strafgebühr wird vom Anbieter getragen
                  </span>
                  <span className="text-orange-700">Separat</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={showStornoDialog} onOpenChange={setShowStornoDialog}>
          <DialogTrigger asChild>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-lg">
              <FiAlertTriangle className="mr-2 h-5 w-5" />
              Auftrag wegen Lieferverzug stornieren
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-800">Lieferverzug-Stornierung</DialogTitle>
              <DialogDescription>
                Beschreiben Sie kurz die Situation für unsere Dokumentation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="storno-reason">Grund der Stornierung *</Label>
                <Textarea
                  id="storno-reason"
                  value={stornoReason}
                  onChange={e => setStornoReason(e.target.value)}
                  placeholder="z.B. Anbieter ist nicht erschienen, keine Kommunikation seit Tagen..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Ihre Rechte:</strong> Vollständige Rückerstattung ohne Abzüge. Bearbeitung
                  erfolgt prioritär innerhalb von 24 Stunden.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStornoDialog(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleStornoSubmit}
                  disabled={!stornoReason.trim() || isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isSubmitting ? 'Wird eingereicht...' : 'Stornierung einreichen'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
