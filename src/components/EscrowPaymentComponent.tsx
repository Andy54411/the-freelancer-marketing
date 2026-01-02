'use client';

/**
 * EscrowPaymentComponent - Einfache Zahlungskomponente
 * 
 * Zwei Optionen:
 * 1. SEPA-Überweisung - zeigt Bankdaten
 * 2. Kreditkarte via Revolut - leitet zu Checkout weiter
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  CreditCard,
  X,
  CheckCircle,
  Building2,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/clients';

interface EscrowPaymentProps {
  projectData: {
    projectId: string;
    projectTitle: string;
    projectDescription?: string;
    amount: number;
    currency?: string;
    paymentType: 'milestone' | 'project_deposit' | 'final_payment' | 'order_payment';
    providerId: string;
  };
  customerData: {
    customerId: string;
    companyName?: string;
    name?: string;
    email?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (escrowId: string) => void;
  onError: (error: string) => void;
}

const TASKILO_BANK = {
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  name: 'Taskilo GmbH - Treuhand',
};

export function EscrowPaymentComponent({
  projectData,
  customerData,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: EscrowPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSepa, setShowSepa] = useState(false);
  const [escrowId, setEscrowId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [revolutOrderId, setRevolutOrderId] = useState<string | null>(null);

  // Prüfe Zahlungsstatus
  const checkPaymentStatus = useCallback(async () => {
    if (!revolutOrderId || !escrowId) return;
    
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;
      
      const token = await user.getIdToken();
      const res = await fetch(`/api/payment/revolut-status?orderId=${revolutOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const data = await res.json();
      if (data.success && data.isPaid) {
        // Zahlung erfolgreich!
        onSuccess(escrowId);
        onClose();
      }
    } catch {
      // Ignoriere Fehler beim Status-Check
    }
  }, [revolutOrderId, escrowId, onSuccess, onClose]);

  // Polling für Zahlungsstatus
  useEffect(() => {
    if (!waitingForPayment || !revolutOrderId) return;
    
    const interval = setInterval(checkPaymentStatus, 3000); // Alle 3 Sekunden prüfen
    return () => clearInterval(interval);
  }, [waitingForPayment, revolutOrderId, checkPaymentStatus]);

  const amount = (projectData.amount / 100).toFixed(2).replace('.', ',');

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const createEscrow = async (method: 'card' | 'sepa') => {
    setIsLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Bitte melden Sie sich an');
      
      const token = await user.getIdToken();
      const res = await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'create',
          orderId: projectData.projectId,
          buyerId: customerData.customerId,
          providerId: projectData.providerId,
          amount: projectData.amount,
          currency: projectData.currency || 'EUR',
          paymentMethod: method,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setEscrowId(data.escrow.id);

      if (method === 'card') {
        // Revolut Checkout - in neuem Tab öffnen
        if (data.checkoutUrl) {
          setRevolutOrderId(data.revolutOrderId);
          window.open(data.checkoutUrl, '_blank');
          // Warte auf Zahlung
          setWaitingForPayment(true);
        } else {
          // Keine Checkout-URL erhalten
          throw new Error(data.error || 'Kreditkartenzahlung konnte nicht initialisiert werden');
        }
      } else {
        // SEPA - zeige Bankdaten
        setShowSepa(true);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSepa = async () => {
    if (!escrowId) return;
    setIsLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) throw new Error('Bitte melden Sie sich an');
      
      const token = await user.getIdToken();
      await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'hold',
          escrowId,
          paymentId: `SEPA-${Date.now()}`,
        }),
      });
      onSuccess(escrowId);
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const reference = escrowId ? `ESC-${escrowId.slice(-8).toUpperCase()}` : '';

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="relative pb-2">
          <button onClick={onClose} className="absolute right-3 top-3 p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-lg">Sichere Zahlung</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Betrag */}
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Zu zahlen</div>
            <div className="text-3xl font-bold text-teal-600">{amount} EUR</div>
          </div>

          {waitingForPayment ? (
            /* Warte auf Zahlung */
            <div className="space-y-4 text-center py-6">
              <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Warte auf Zahlung...</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Bitte schließen Sie die Zahlung im Revolut-Tab ab.
                </p>
              </div>
              <Button
                onClick={checkPaymentStatus}
                variant="outline"
                className="mt-4"
              >
                Zahlungsstatus prüfen
              </Button>
            </div>
          ) : !showSepa ? (
            /* Zahlungsmethoden */
            <div className="space-y-3">
              {/* Kreditkarte */}
              <Button
                onClick={() => createEscrow('card')}
                disabled={isLoading}
                className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Mit Kreditkarte bezahlen
                  </>
                )}
              </Button>

              {/* SEPA */}
              <Button
                onClick={() => createEscrow('sepa')}
                disabled={isLoading}
                variant="outline"
                className="w-full h-14"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Building2 className="mr-2 h-5 w-5" />
                    Per SEPA-Überweisung
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500 pt-2">
                Treuhand-geschützt: Geld wird erst nach Leistung ausgezahlt
              </p>
            </div>
          ) : (
            /* SEPA Bankdaten */
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <span className="text-sm text-green-800">Auftrag erstellt. Bitte überweisen Sie:</span>
              </div>

              {[
                { label: 'Empfänger', value: TASKILO_BANK.name, key: 'name' },
                { label: 'IBAN', value: TASKILO_BANK.iban, key: 'iban' },
                { label: 'BIC', value: TASKILO_BANK.bic, key: 'bic' },
                { label: 'Verwendungszweck', value: reference, key: 'ref', highlight: true },
                { label: 'Betrag', value: `${amount} EUR`, key: 'amount', highlight: true },
              ].map(({ label, value, key, highlight }) => (
                <div key={key} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm text-gray-600">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-mono text-sm', highlight && 'font-bold text-teal-700')}>
                      {value}
                    </span>
                    <button onClick={() => copy(value, key)} className="p-1 hover:bg-gray-100 rounded">
                      {copied === key ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <Button
                onClick={confirmSepa}
                disabled={isLoading}
                className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ich habe überwiesen'}
              </Button>
              
              <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700">
                Später bezahlen
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}

// Export für Inline-Verwendung
export function InlineEscrowPayment({
  orderId,
  totalAmount,
  customerId,
  providerId,
  onSuccess,
  onError,
}: {
  orderId: string;
  totalAmount: number;
  customerId: string;
  providerId: string;
  onSuccess: (escrowId: string) => void;
  onError: (error: string) => void;
}) {
  return (
    <EscrowPaymentComponent
      projectData={{
        projectId: orderId,
        projectTitle: `Auftrag ${orderId.slice(-6).toUpperCase()}`,
        amount: totalAmount,
        paymentType: 'order_payment',
        providerId,
      }}
      customerData={{ customerId }}
      isOpen={true}
      onClose={() => {}}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
}
