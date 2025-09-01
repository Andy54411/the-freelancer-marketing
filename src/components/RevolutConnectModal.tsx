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
  onError,
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
  }, [isOpen]);

  // Handle Revolut OAuth flow
  const handleConnectRevolut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🏦 Starting Revolut connection for user:', userId);

      // Call our OAuth authorize endpoint
      const response = await fetch(
        `/api/revolut/oauth/authorize?userId=${userId}&companyEmail=${encodeURIComponent(companyEmail)}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize Revolut OAuth');
      }

      console.log('✅ Got Revolut OAuth URL, redirecting...');

      // Redirect to Revolut OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('❌ Revolut connection error:', error.message);
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
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Fehler beim Verbinden</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Revolut Info */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">R</span>
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
                <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Sichere OAuth-Verbindung</span>
              </div>
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Echtzeit-Kontostände</span>
              </div>
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  Automatische Transaktionssynchronisation
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Multi-Währungsunterstützung</span>
              </div>
            </div>

            {/* Sandbox Test Account Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <FiCheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
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
                <FiCheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
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
              className="w-full bg-[#14ad9f] hover:bg-[#129488] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
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
