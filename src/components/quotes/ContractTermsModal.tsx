'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { CardElement } from '@stripe/react-stripe-js';

interface ContractTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  userType: 'customer' | 'provider';
  quoteAmount: number;
  quoteTitle: string;
}

export default function ContractTermsModal({
  isOpen,
  onClose,
  onAccept,
  userType,
  quoteAmount,
  quoteTitle,
}: ContractTermsModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataProtectionAccepted, setDataProtectionAccepted] = useState(false);
  const [cancellationTermsAccepted, setCancellationTermsAccepted] = useState(false);

  const allTermsAccepted = termsAccepted && dataProtectionAccepted && cancellationTermsAccepted;

  const handleAccept = () => {
    if (allTermsAccepted) {
      onAccept();
      // Reset states
      setTermsAccepted(false);
      setDataProtectionAccepted(false);
      setCancellationTermsAccepted(false);
    }
  };

  const provisionAmount = quoteAmount * 0.05;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {userType === 'customer' ? 'Auftragsbestätigung' : 'Angebots-Annahme bestätigen'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Auftragsinformationen */}
          <div className="bg-[#14ad9f]/10 rounded-lg p-4 border border-[#14ad9f]/20">
            <h3 className="font-semibold text-gray-900 mb-2">Auftragsdaten:</h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Titel:</strong> {quoteTitle}
              </p>
              <p>
                <strong>Auftragswert:</strong> {quoteAmount.toFixed(2)} €
              </p>
              {userType === 'provider' && (
                <p>
                  <strong>Taskilo-Provision (5%):</strong> {provisionAmount.toFixed(2)} €
                </p>
              )}
            </div>
          </div>

          {/* Wichtige Hinweise */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">
              🚨 Verbindlicher Vertragsabschluss
            </h3>
            <div className="text-sm text-yellow-700 space-y-2">
              {userType === 'customer' ? (
                <>
                  <p>
                    Sie nehmen hiermit das Angebot verbindlich an. Es entsteht ein rechtsgültiger
                    Dienstleistungsvertrag zwischen Ihnen und dem Anbieter.
                  </p>
                  <p>
                    <strong>Stornierungskosten beachten:</strong> Bei Stornierung fallen je nach
                    Zeitpunkt Stornierungsgebühren von 25-100% des Auftragswertes an.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Ihr Angebot wurde angenommen. Es entsteht ein rechtsgültiger
                    Dienstleistungsvertrag zwischen Ihnen und dem Auftraggeber.
                  </p>
                  <p>
                    <strong>Provisionszahlung erforderlich:</strong> Vor dem Kontaktdatenaustausch
                    ist die Taskilo-Provision in Höhe von {provisionAmount.toFixed(2)} € zu
                    entrichten.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Bestätigungen */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Erforderliche Bestätigungen:</h3>

            {/* Vertragsbedingungen */}
            <label className="flex items-start space-x-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    termsAccepted
                      ? 'bg-[#14ad9f] border-[#14ad9f] text-white'
                      : 'border-gray-300 group-hover:border-[#14ad9f]'
                  }`}
                >
                  {termsAccepted && <Check className="w-3 h-3" />}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-700">
                  Ich akzeptiere die{' '}
                  <Link
                    href="/agb/vertragsabschluss"
                    target="_blank"
                    className="text-[#14ad9f] hover:text-[#129488] underline"
                  >
                    Vertragsbedingungen für Dienstleistungsaufträge
                  </Link>{' '}
                  und bestätige, dass ein verbindlicher Vertrag zustande kommt.
                </span>
              </div>
            </label>

            {/* Datenschutz */}
            <label className="flex items-start space-x-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={dataProtectionAccepted}
                  onChange={e => setDataProtectionAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    dataProtectionAccepted
                      ? 'bg-[#14ad9f] border-[#14ad9f] text-white'
                      : 'border-gray-300 group-hover:border-[#14ad9f]'
                  }`}
                >
                  {dataProtectionAccepted && <Check className="w-3 h-3" />}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-700">
                  Ich akzeptiere die{' '}
                  <Link
                    href="/datenschutz"
                    target="_blank"
                    className="text-[#14ad9f] hover:text-[#129488] underline"
                  >
                    Datenschutzbestimmungen
                  </Link>{' '}
                  und stimme dem Austausch meiner Kontaktdaten zu.
                </span>
              </div>
            </label>

            {/* Stornierungsbedingungen */}
            <label className="flex items-start space-x-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={cancellationTermsAccepted}
                  onChange={e => setCancellationTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    cancellationTermsAccepted
                      ? 'bg-[#14ad9f] border-[#14ad9f] text-white'
                      : 'border-gray-300 group-hover:border-[#14ad9f]'
                  }`}
                >
                  {cancellationTermsAccepted && <Check className="w-3 h-3" />}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-700">
                  Ich habe die Stornierungsbedingungen zur Kenntnis genommen und akzeptiere, dass
                  bei kurzfristigen Absagen Stornierungskosten von 25-100% des Auftragswertes
                  anfallen können.
                </span>
              </div>
            </label>
          </div>

          {/* Stripe Payment für Provider */}
          {userType === 'provider' && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Zahlungsinformationen</h3>
              <div className="p-4 border border-gray-300 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kreditkarte für Provision ({provisionAmount.toFixed(2)} €)
                </label>
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Die Provision wird sofort abgebucht. Test-Kartennummer: 4242424242424242
                </p>
              </div>
            </div>
          )}

          {/* Rechtlicher Hinweis */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
            <p className="mb-2">
              <strong>Rechtliche Hinweise:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Taskilo ist nur Vermittlungsplattform und wird nicht Vertragspartei</li>
              <li>Der Vertrag kommt direkt zwischen Auftraggeber und Auftragnehmer zustande</li>
              <li>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts</li>
              <li>Bei Verbrauchern besteht ggf. ein gesetzliches Widerrufsrecht</li>
            </ul>
          </div>
        </div>

        {/* Footer mit Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-xl">
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAccept}
              disabled={!allTermsAccepted}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                allTermsAccepted
                  ? 'bg-[#14ad9f] hover:bg-[#129488] text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {userType === 'customer'
                ? 'Auftrag verbindlich annehmen'
                : 'Bestätigen und fortfahren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
