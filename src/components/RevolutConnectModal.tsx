'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiLoader, FiAlertCircle, FiCheckCircle, FiCreditCard } from 'react-icons/fi';

interface RevolutConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (connectionId?: string) => void;
  onError: (error: string) => void;
  userId: string;
  companyEmail: string;
  title?: string;
}

export default function RevolutConnectModal({
  isOpen,
  onClose,
  onSuccess,
  onError: _onError,
  userId,
  companyEmail,
  title = 'Revolut Business verbinden',
}: RevolutConnectModalProps) {
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
    return undefined;
  }, [isOpen]);

  // Listen for OAuth success messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Debug-Log entfernt

      // Ensure message is from trusted domain
      const trustedOrigins = ['https://taskilo.de', 'http://localhost:3000'];
      if (!trustedOrigins.includes(event.origin)) {
        // Debug-Log entfernt
        return;
      }

      if (event.data.type === 'REVOLUT_OAUTH_SUCCESS') {
        // Debug-Log entfernt
        setIsLoading(false);
        if (onSuccess) {
          // Debug-Log entfernt
          onSuccess(event.data.connectionId);
        }
        onClose();
      } else if (event.data.type === 'REVOLUT_OAUTH_ERROR') {
        setIsLoading(false);
        setError(event.data.error || 'OAuth-Verbindung fehlgeschlagen');
      }
    };

    if (isOpen) {
      // Debug-Log entfernt
      window.addEventListener('message', handleMessage);
      return () => {
        // Debug-Log entfernt
        window.removeEventListener('message', handleMessage);
      };
    }
    return undefined;
  }, [isOpen, onSuccess, onClose]);

  // Handle Revolut OAuth flow
  const handleConnectRevolut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Debug-Log entfernt

      // Call our OAuth authorize endpoint
      const response = await fetch(
        `/api/revolut/oauth/authorize?userId=${userId}&companyEmail=${encodeURIComponent(companyEmail)}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize Revolut OAuth');
      }

      // Debug-Log entfernt

      // Open OAuth in new tab/window instead of redirecting
      const authWindow = window.open(
        data.authUrl,
        'revolut-oauth',
        'width=600,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
      );

      if (!authWindow) {
        throw new Error('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.');
      }

      // Monitor the popup window for completion
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);

          // Give a moment for any potential success callbacks
          setTimeout(() => {
            // Check if we should refresh or close modal
            if (onSuccess) {
              onSuccess(); // Let parent component handle the success
            }
            onClose(); // Close the modal
          }, 1000);
        }
      }, 1000);

      // Auto-close monitoring after 15 minutes
      setTimeout(
        () => {
          if (!authWindow.closed) {
            authWindow.close();
            clearInterval(checkClosed);
            setIsLoading(false);
            setError('OAuth-Flow wurde abgebrochen oder ist abgelaufen.');
          }
        },
        15 * 60 * 1000
      );
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Reset error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Don't render on server
  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#14ad9f] rounded-lg flex items-center justify-center">
              <FiCreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">Revolut Business Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <FiX className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Fehler beim Verbinden</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Revolut Info */}
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  viewBox="0 0 24 24"
                  width="28"
                  height="28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 6C6.67 6 6 6.67 6 7.5V16.5C6 17.33 6.67 18 7.5 18H9V16.5H7.5V13.5H11.25C13.32 13.5 15 11.82 15 9.75C15 7.68 13.32 6 11.25 6H7.5ZM7.5 7.5H11.25C12.49 7.5 13.5 8.51 13.5 9.75C13.5 10.99 12.49 12 11.25 12H7.5V7.5Z"
                    fill="white"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Revolut Business verbinden
              </h3>
              <p className="text-gray-600 text-sm">
                Verbinden Sie Ihr Revolut Business-Konto sicher mit Taskilo für automatische
                Transaktionsverwaltung und Buchhaltung.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-gray-700">Sichere OAuth-Verbindung</span>
              </div>
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-gray-700">Echtzeit-Kontostände</span>
              </div>
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-gray-700">
                  Automatische Transaktionssynchronisation
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-gray-700">Multi-Währungsunterstützung</span>
              </div>
            </div>

            {/* Sandbox Test Account Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <FiCheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">Sandbox Test-Account</h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Für die Revolut Sandbox verwenden Sie diese Test-Daten:
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-mono bg-yellow-100 px-2 py-1 rounded">
                        📞 Telefon: +447240354142
                      </p>
                      <p className="text-xs font-mono bg-yellow-100 px-2 py-1 rounded">
                        🔐 Passcode: 0000
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FiCheckCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Sicher & Verschlüsselt</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Ihre Revolut-Anmeldedaten werden niemals bei Taskilo gespeichert. Die Verbindung
                    erfolgt direkt über die offizielle Revolut Business API.
                  </p>
                </div>
              </div>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnectRevolut}
              disabled={isLoading}
              className="w-full bg-[#14ad9f] hover:bg-taskilo-hover disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  <span>Verbindung wird hergestellt...</span>
                </>
              ) : (
                <>
                  <FiCreditCard className="w-4 h-4" />
                  <span>Mit Revolut verbinden</span>
                </>
              )}
            </button>

            {/* Info Text */}
            <p className="text-xs text-gray-500 text-center">
              Sie werden zu Revolut weitergeleitet, um die Verbindung zu autorisieren. Nach
              erfolgreicher Anmeldung kehren Sie automatisch zu Taskilo zurück.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
