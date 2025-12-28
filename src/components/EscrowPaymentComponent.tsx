'use client';

/**
 * EscrowPaymentComponent - Ersetzt alle Stripe-Zahlungskomponenten
 * 
 * Integriert mit dem neuen Escrow/Revolut-System für sichere B2B-Zahlungen.
 * Unterstützt:
 * - SEPA-Überweisungen
 * - Revolut Business Payments
 * - Treuhand-basierte Zahlungsabwicklung
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2,
  CreditCard,
  X,
  CheckCircle,
  AlertCircle,
  Building2,
  Shield,
  Clock,
  ArrowRight,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Types
interface EscrowPaymentProps {
  projectData: {
    projectId: string;
    projectTitle: string;
    projectDescription?: string;
    amount: number; // in cents
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

interface PaymentInstructions {
  escrowId: string;
  bankDetails: {
    iban: string;
    bic: string;
    bankName: string;
    accountHolder: string;
  };
  reference: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

type PaymentMethod = 'bank_transfer' | 'revolut';
type PaymentStep = 'select_method' | 'processing' | 'instructions' | 'success' | 'error';

// Constants
const TASKILO_BANK_DETAILS = {
  iban: 'DE89 3704 0044 0532 0130 00', // Taskilo Treuhandkonto
  bic: 'COBADEFFXXX',
  bankName: 'Commerzbank',
  accountHolder: 'Taskilo GmbH - Treuhand',
};

const PLATFORM_FEE_PERCENT = 10;

export function EscrowPaymentComponent({
  projectData,
  customerData,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: EscrowPaymentProps) {
  const [step, setStep] = useState<PaymentStep>('select_method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatCurrency = useCallback((cents: number, currency = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  }, []);

  const calculateFees = useCallback((amount: number) => {
    const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
    const providerAmount = amount - platformFee;
    return { platformFee, providerAmount };
  }, []);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  const handleCreateEscrow = async () => {
    if (!selectedMethod) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          orderId: projectData.projectId,
          customerId: customerData.customerId,
          providerId: projectData.providerId,
          amount: projectData.amount,
          currency: projectData.currency || 'EUR',
          paymentMethod: selectedMethod === 'revolut' ? 'revolut' : 'bank_transfer',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Erstellen der Zahlung');
      }

      // Set payment instructions
      const escrowData = result.escrow;
      setPaymentInstructions({
        escrowId: escrowData.id,
        bankDetails: TASKILO_BANK_DETAILS,
        reference: `ESC-${escrowData.id.slice(-8).toUpperCase()}`,
        amount: projectData.amount,
        currency: projectData.currency || 'EUR',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 Tage
      });

      setStep('instructions');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      setStep('error');
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentInstructions) return;

    setIsLoading(true);
    setError(null);

    try {
      // In einer echten Implementierung würde hier ein Webhook von Revolut/Bank
      // den Zahlungseingang bestätigen. Für manuelle Bestätigung:
      const response = await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hold',
          escrowId: paymentInstructions.escrowId,
          paymentId: `MANUAL-${Date.now()}`,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Zahlungsbestätigung');
      }

      setStep('success');
      onSuccess(paymentInstructions.escrowId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const { platformFee, providerAmount } = calculateFees(projectData.amount);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal-600" />
            <CardTitle>Sichere Zahlung</CardTitle>
          </div>
          <CardDescription>
            Treuhand-geschützte Zahlung für {projectData.projectTitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Betrag</span>
              <span className="font-medium">{formatCurrency(projectData.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Davon Plattformgebühr ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="text-gray-500">{formatCurrency(platformFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Auszahlung an Anbieter</span>
              <span className="text-gray-600">{formatCurrency(providerAmount)}</span>
            </div>
          </div>

          {/* Step: Select Payment Method */}
          {step === 'select_method' && (
            <div className="space-y-4">
              <h3 className="font-medium">Zahlungsmethode wählen</h3>
              
              {/* Bank Transfer */}
              <button
                onClick={() => setSelectedMethod('bank_transfer')}
                className={cn(
                  'w-full p-4 border rounded-lg text-left transition-all',
                  selectedMethod === 'bank_transfer'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-teal-600 mt-0.5" />
                  <div>
                    <div className="font-medium">SEPA-Überweisung</div>
                    <div className="text-sm text-gray-500">
                      Überweisen Sie den Betrag auf unser Treuhandkonto
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">1-2 Werktage</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Revolut */}
              <button
                onClick={() => setSelectedMethod('revolut')}
                className={cn(
                  'w-full p-4 border rounded-lg text-left transition-all',
                  selectedMethod === 'revolut'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-teal-600 mt-0.5" />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Revolut Business
                      <Badge variant="outline" className="text-xs">Empfohlen</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Sofortige Zahlung über Revolut
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Sofort</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Escrow Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Treuhand-Schutz</AlertTitle>
                <AlertDescription>
                  Ihr Geld wird sicher auf unserem Treuhandkonto verwahrt und erst nach 
                  erfolgreicher Leistungserbringung an den Anbieter ausgezahlt.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-teal-600 animate-spin" />
              <p className="mt-4 text-gray-600">Zahlung wird vorbereitet...</p>
            </div>
          )}

          {/* Step: Payment Instructions */}
          {step === 'instructions' && paymentInstructions && (
            <div className="space-y-4">
              <Alert className="border-teal-200 bg-teal-50">
                <CheckCircle className="h-4 w-4 text-teal-600" />
                <AlertTitle className="text-teal-800">Zahlung erstellt</AlertTitle>
                <AlertDescription className="text-teal-700">
                  Bitte überweisen Sie den folgenden Betrag:
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Empfänger</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{paymentInstructions.bankDetails.accountHolder}</span>
                    <button
                      onClick={() => copyToClipboard(paymentInstructions.bankDetails.accountHolder, 'accountHolder')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedField === 'accountHolder' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">IBAN</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{paymentInstructions.bankDetails.iban}</span>
                    <button
                      onClick={() => copyToClipboard(paymentInstructions.bankDetails.iban.replace(/\s/g, ''), 'iban')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedField === 'iban' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">BIC</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{paymentInstructions.bankDetails.bic}</span>
                    <button
                      onClick={() => copyToClipboard(paymentInstructions.bankDetails.bic, 'bic')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedField === 'bic' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Verwendungszweck</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-teal-700">{paymentInstructions.reference}</span>
                    <button
                      onClick={() => copyToClipboard(paymentInstructions.reference, 'reference')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedField === 'reference' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Betrag</span>
                  <span className="font-mono text-lg font-bold text-teal-700">
                    {formatCurrency(paymentInstructions.amount, paymentInstructions.currency)}
                  </span>
                </div>
              </div>

              <Alert variant="destructive" className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Wichtig</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Verwenden Sie bitte genau den angegebenen Verwendungszweck, 
                  damit wir Ihre Zahlung korrekt zuordnen können.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Zahlung eingegangen</h3>
              <p className="text-gray-500 text-center mt-2">
                Ihr Geld ist sicher auf unserem Treuhandkonto und wird nach 
                erfolgreicher Leistung an den Anbieter ausgezahlt.
              </p>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Fehler</h3>
              <p className="text-gray-500 text-center mt-2">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setStep('select_method');
                  setError(null);
                }}
              >
                Erneut versuchen
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          {step === 'select_method' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                onClick={handleCreateEscrow}
                disabled={!selectedMethod || isLoading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    Weiter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'instructions' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Später bezahlen
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird bestätigt...
                  </>
                ) : (
                  <>
                    Zahlung bestätigen
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700">
              Fertig
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// Inline Payment Component - für direkte Einbettung
interface InlineEscrowPaymentProps {
  orderId: string;
  totalAmount: number; // in cents
  totalHours?: number;
  customerId: string;
  providerId: string;
  onSuccess: (escrowId: string) => void;
  onError: (error: string) => void;
}

export function InlineEscrowPayment({
  orderId,
  totalAmount,
  customerId,
  providerId,
  onSuccess,
  onError,
}: InlineEscrowPaymentProps) {
  return (
    <EscrowPaymentComponent
      projectData={{
        projectId: orderId,
        projectTitle: `Auftrag ${orderId.slice(-6).toUpperCase()}`,
        amount: totalAmount,
        paymentType: 'order_payment',
        providerId,
      }}
      customerData={{
        customerId,
      }}
      isOpen={true}
      onClose={() => {}}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
}

export default EscrowPaymentComponent;
