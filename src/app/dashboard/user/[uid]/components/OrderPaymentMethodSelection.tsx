'use client';

/**
 * OrderPaymentMethodSelection - Escrow-basierte Zahlungsmethoden-Auswahl
 * 
 * Diese Komponente ersetzt die alte Stripe-basierte Zahlungsmethoden-Auswahl
 * durch das neue Escrow/Revolut-System.
 */

import React, { useState } from 'react';
import { FiLoader } from 'react-icons/fi';
import { Building2, Shield, CreditCard, CheckCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfileData } from '@/types/types';

// Bank Details für Treuhand-Überweisungen
const TASKILO_BANK_DETAILS = {
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX',
  bankName: 'Commerzbank',
  accountHolder: 'Taskilo GmbH - Treuhand',
};

interface FullOrderDetails {
  orderId?: string;
  providerId?: string;
  selectedAnbieterId?: string;
  [key: string]: unknown;
}

interface OrderPaymentMethodSelectionProps {
  userProfile: UserProfileData;
  useSavedPaymentMethod: 'new' | 'escrow_bank_transfer' | 'escrow_revolut' | string;
  setUseSavedPaymentMethod: (value: 'new' | 'escrow_bank_transfer' | 'escrow_revolut' | string) => void;
  clientSecret: string | null; // Legacy - nicht mehr verwendet für Escrow
  isPaymentIntentLoading: boolean; // Legacy - wird zu isLoading umbenannt
  handleCheckoutFormProcessing: (isProcessing: boolean) => void;
  handleCheckoutFormError: (errorMessage: string | null) => void;
  handleCheckoutFormSuccess: (escrowId: string) => void;
  loading: boolean;
  totalPriceInCents: number;
  onPaymentSuccess: (escrowId: string) => Promise<void>;
  onPaymentError: (message: string | null) => void;
  fullOrderDetails: FullOrderDetails | null;
}

const OrderPaymentMethodSelection: React.FC<OrderPaymentMethodSelectionProps> = ({
  userProfile,
  useSavedPaymentMethod,
  setUseSavedPaymentMethod,
  isPaymentIntentLoading,
  handleCheckoutFormProcessing,
  handleCheckoutFormError,
  handleCheckoutFormSuccess,
  loading,
  totalPriceInCents,
  onPaymentSuccess,
  onPaymentError,
  fullOrderDetails,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCreatingEscrow, setIsCreatingEscrow] = useState(false);
  const [escrowReference, setEscrowReference] = useState<string | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ''));
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text.replace(/\s/g, '');
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCreateEscrow = async () => {
    if (!fullOrderDetails || totalPriceInCents <= 0) {
      onPaymentError('Auftragsdaten fehlen');
      return;
    }

    setIsCreatingEscrow(true);
    handleCheckoutFormProcessing(true);
    handleCheckoutFormError(null);

    try {
      const response = await fetch('/api/payment/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          orderId: fullOrderDetails.orderId || `order-${Date.now()}`,
          customerId: userProfile.uid,
          providerId: fullOrderDetails.providerId || fullOrderDetails.selectedAnbieterId,
          amount: totalPriceInCents,
          currency: 'EUR',
          paymentMethod: useSavedPaymentMethod === 'escrow_revolut' ? 'revolut' : 'bank_transfer',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Erstellen der Zahlung');
      }

      const escrowId = result.escrow.id;
      setEscrowReference(`ESC-${escrowId.slice(-8).toUpperCase()}`);
      
      // Erfolg melden - Escrow wurde erstellt, Zahlung ausstehend
      handleCheckoutFormSuccess(escrowId);
      await onPaymentSuccess(escrowId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      handleCheckoutFormError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsCreatingEscrow(false);
      handleCheckoutFormProcessing(false);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-white space-y-4">
      <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
        <Building2 className="mr-2 text-[#14ad9f]" /> Zahlungsmethode *
      </h4>

      {/* Info Banner */}
      <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-teal-800">Sichere Treuhand-Zahlung</p>
            <p className="text-teal-600 mt-0.5">
              Ihr Geld wird sicher verwahrt und erst nach Auftragsabschluss freigegeben.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="space-y-3">
        {/* Bank Transfer Option */}
        <label 
          className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
            useSavedPaymentMethod === 'escrow_bank_transfer' 
              ? 'border-[#14ad9f] bg-teal-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="escrow_bank_transfer"
            checked={useSavedPaymentMethod === 'escrow_bank_transfer'}
            onChange={() => setUseSavedPaymentMethod('escrow_bank_transfer')}
            className="mt-1 h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
          />
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">SEPA-Überweisung</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Überweisen Sie den Betrag auf unser Treuhandkonto
            </p>
          </div>
        </label>

        {/* Revolut Option */}
        <label 
          className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
            useSavedPaymentMethod === 'escrow_revolut' 
              ? 'border-[#14ad9f] bg-teal-50' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="escrow_revolut"
            checked={useSavedPaymentMethod === 'escrow_revolut'}
            onChange={() => setUseSavedPaymentMethod('escrow_revolut')}
            className="mt-1 h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
          />
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Revolut Business</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Schnell</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Sofortige Zahlung über Revolut
            </p>
          </div>
        </label>
      </div>

      {/* Bank Transfer Details */}
      {useSavedPaymentMethod === 'escrow_bank_transfer' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="text-sm font-semibold text-gray-700 mb-3">Überweisungsdaten</h5>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Empfänger:</span>
              <span className="text-sm font-medium">{TASKILO_BANK_DETAILS.accountHolder}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">IBAN:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-medium">{TASKILO_BANK_DETAILS.iban}</span>
                <button
                  onClick={() => copyToClipboard(TASKILO_BANK_DETAILS.iban, 'iban')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  {copiedField === 'iban' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">BIC:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-medium">{TASKILO_BANK_DETAILS.bic}</span>
                <button
                  onClick={() => copyToClipboard(TASKILO_BANK_DETAILS.bic, 'bic')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  {copiedField === 'bic' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bank:</span>
              <span className="text-sm font-medium">{TASKILO_BANK_DETAILS.bankName}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Betrag:</span>
              <span className="text-sm font-bold text-[#14ad9f]">{formatCurrency(totalPriceInCents)}</span>
            </div>

            {escrowReference && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Verwendungszweck:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-orange-600">{escrowReference}</span>
                  <button
                    onClick={() => copyToClipboard(escrowReference, 'reference')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copiedField === 'reference' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleCreateEscrow}
        disabled={loading || isCreatingEscrow || isPaymentIntentLoading || !useSavedPaymentMethod || useSavedPaymentMethod === 'new'}
        className="w-full mt-4 bg-[#14ad9f] text-white hover:bg-[#12908f] transition disabled:opacity-50"
      >
        {isCreatingEscrow ? (
          <>
            <FiLoader className="animate-spin mr-2" />
            Zahlung wird vorbereitet...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Auftrag erstellen & Zahlung initiieren
          </>
        )}
      </Button>

      <p className="text-xs text-center text-gray-500 mt-2">
        Mit dem Klick auf den Button akzeptieren Sie unsere AGB und Datenschutzbestimmungen.
      </p>
    </div>
  );
};

export default OrderPaymentMethodSelection;
