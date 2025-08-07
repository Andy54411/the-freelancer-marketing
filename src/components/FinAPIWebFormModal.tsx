'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiLoader, FiAlertCircle, FiCheckCircle, FiCreditCard } from 'react-icons/fi';

interface FinAPIWebFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bankConnectionId?: string) => void;
  onError: (error: string) => void;
  webFormUrl: string;
  bankName?: string;
  title?: string;
}

export default function FinAPIWebFormModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  webFormUrl,
  bankName,
  title = 'Bank verbinden',
}: FinAPIWebFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Client-side mounting guard
  useEffect(() => {
    setMounted(true);
  }, []);

  // Body scroll lock when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      };
    }
  }, [isOpen]);

  // Listen to iframe messages for WebForm completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only listen to finAPI messages
      if (!event.origin.includes('finapi.io')) {
        return;
      }

      console.log('finAPI WebForm message received:', event.data);

      if (event.data.type === 'BANK_CONNECTION_SUCCESS') {
        console.log('Bank connection successful:', event.data.bankConnectionId);
        onSuccess(event.data.bankConnectionId);
        onClose();
      } else if (event.data.type === 'BANK_CONNECTION_ERROR') {
        console.error('Bank connection failed:', event.data.error);
        onError(event.data.error || 'Bank-Verbindung fehlgeschlagen');
      } else if (event.data.type === 'WEBFORM_CANCELLED') {
        console.log('WebForm cancelled by user');
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [isOpen, onSuccess, onError, onClose]);

  // Handle popup window for WebForm (CSP workaround)
  const handleOpenWebFormPopup = () => {
    setIsLoading(true);
    setError(null);

    // Open WebForm in popup window to avoid CSP frame-ancestors issues
    const popup = window.open(
      webFormUrl,
      'finapi-webform',
      'width=800,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes,status=no'
    );

    if (!popup) {
      setError(
        'Popup wurde blockiert. Bitte erlauben Sie Popups für diese Website und versuchen Sie es erneut.'
      );
      setIsLoading(false);
      return;
    }

    // Monitor popup
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
        // Popup was closed - assume cancelled unless we got a success message
        console.log('WebForm popup was closed');
      }
    }, 1000);

    // Timeout after 10 minutes
    const timeoutTimer = setTimeout(() => {
      if (!popup.closed) {
        clearInterval(checkClosed);
        popup.close();
        setError('WebForm-Timeout erreicht. Bitte versuchen Sie es erneut.');
        setIsLoading(false);
      }
    }, 600000); // 10 minutes

    // Loading bleibt aktiv bis das Popup geschlossen wird oder Success/Error Message kommt
  };

  // Handle iframe error (fallback)
  const handleIframeError = () => {
    setIsLoading(false);
    setError(
      'finAPI kann nicht in einem iframe geladen werden (CSP). Verwenden Sie die Popup-Option.'
    );
  };

  const handleClose = () => {
    setIsLoading(true);
    setError(null);
    onClose();
  };

  // Don't render on server or if not open
  if (!mounted || !isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
      onClick={e => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FiCreditCard className="text-[#14ad9f]" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
              {bankName && <p className="text-sm text-gray-600">{bankName}</p>}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
            aria-label="Modal schließen"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md p-6">
                <FiAlertCircle className="mx-auto mb-4 text-red-500" size={48} />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">WebForm-Problem</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-medium">finAPI CSP-Einschränkung</p>
                    <p>
                      finAPI kann nicht in einem iframe geladen werden. Verwenden Sie das
                      Popup-Fenster.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleOpenWebFormPopup}
                      className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
                    >
                      In Popup öffnen
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md p-6">
                <FiCreditCard className="mx-auto mb-4 text-[#14ad9f]" size={48} />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Bank-Verbindung starten
                </h3>
                <p className="text-gray-600 mb-4">
                  Aufgrund von Sicherheitsrichtlinien öffnet sich das finAPI WebForm in einem
                  separaten Fenster.
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <p className="font-medium">Sicher und PSD2-konform</p>
                    <p>Das WebForm wird direkt von finAPI bereitgestellt.</p>
                  </div>
                  <button
                    onClick={handleOpenWebFormPopup}
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <FiLoader className="animate-spin" />
                        WebForm wird geöffnet...
                      </>
                    ) : (
                      <>
                        <FiCreditCard />
                        WebForm öffnen
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500">
                    Falls ein Popup-Blocker aktiv ist, erlauben Sie bitte Popups für diese Website.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="text-[#14ad9f]" />
              <span>Sichere Verbindung über finAPI</span>
            </div>
            <div className="flex items-center gap-4">
              <span>PSD2-konform</span>
              <span>•</span>
              <span>SSL-verschlüsselt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
