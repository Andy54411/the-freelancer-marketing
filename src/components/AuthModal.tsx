'use client';

import React from 'react';
import { X, User, Shield, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerName?: string;
  service?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  providerName = 'diesem Anbieter',
  service = 'diesem Service',
}: AuthModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = () => {
    router.push('/login');
    onClose();
  };

  const handleRegister = () => {
    router.push('/register');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Anmeldung erforderlich</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#14ad9f] hover:bg-gray-100 p-2 rounded-lg transition-colors"
            aria-label="Anmeldung-Dialog schließen"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#14ad9f] bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-[#14ad9f]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Buchen Sie {service} bei {providerName}
            </h3>
            <p className="text-gray-600">
              Um einen Service zu buchen, müssen Sie sich zuerst anmelden oder registrieren.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-700">Sichere Zahlungsabwicklung</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-700">Bewertungen und Qualitätssicherung</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-700">Persönlicher Kundenservice</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Anmelden
            </button>
            <button
              onClick={handleRegister}
              className="w-full border border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Jetzt registrieren
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Mit der Anmeldung stimmen Sie unseren{' '}
            <a href="/terms" className="text-[#14ad9f] hover:underline">
              Nutzungsbedingungen
            </a>{' '}
            und{' '}
            <a href="/privacy" className="text-[#14ad9f] hover:underline">
              Datenschutzrichtlinien
            </a>{' '}
            zu.
          </p>
        </div>
      </div>
    </div>
  );
}
