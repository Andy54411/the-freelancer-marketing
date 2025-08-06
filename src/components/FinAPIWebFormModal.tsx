'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);

    // Check if iframe loaded successfully
    if (iframeRef.current) {
      try {
        // Try to access iframe content to detect errors
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc && iframeDoc.title?.includes('404')) {
          setError('WebForm konnte nicht geladen werden (404)');
        }
      } catch (e) {
        // Cross-origin restriction is expected for finAPI
        console.log('Iframe loaded (cross-origin restrictions apply)');
      }
    }
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setError('WebForm konnte nicht geladen werden');
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
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
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FiLoader className="animate-spin mx-auto mb-4 text-[#14ad9f]" size={32} />
                <p className="text-gray-600">WebForm wird geladen...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md p-6">
                <FiAlertCircle className="mx-auto mb-4 text-red-500" size={48} />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">WebForm-Fehler</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setError(null);
                      setIsLoading(true);
                      // Reload iframe
                      if (iframeRef.current) {
                        iframeRef.current.src = webFormUrl;
                      }
                    }}
                    className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors"
                  >
                    Erneut versuchen
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
          ) : (
            <iframe
              ref={iframeRef}
              src={webFormUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="finAPI WebForm"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
            />
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
