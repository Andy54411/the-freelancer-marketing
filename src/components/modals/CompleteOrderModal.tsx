'use client';

import React from 'react';
import { X, CheckCircle, Mail, Star, Wallet, Bell } from 'lucide-react';

interface CompleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function CompleteOrderModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: CompleteOrderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-teal-500 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Auftrag abschließen
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-lg mb-6">
            Haben Sie die Arbeit erfolgreich abgeschlossen?
          </p>

          {/* Steps */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-4">
              So läuft der Abschluss ab:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="bg-teal-100 rounded-full p-1.5 mt-0.5">
                  <Bell className="h-4 w-4 text-teal-600" />
                </div>
                <span className="text-gray-700">
                  Kunde wird über den Abschluss benachrichtigt
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-teal-100 rounded-full p-1.5 mt-0.5">
                  <Star className="h-4 w-4 text-teal-600" />
                </div>
                <span className="text-gray-700">
                  Kunde bewertet Ihre Leistung
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-teal-100 rounded-full p-1.5 mt-0.5">
                  <Wallet className="h-4 w-4 text-teal-600" />
                </div>
                <span className="text-gray-700">
                  Nach der Bewertung erfolgt die Auszahlung
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="bg-teal-100 rounded-full p-1.5 mt-0.5">
                  <Mail className="h-4 w-4 text-teal-600" />
                </div>
                <span className="text-gray-700">
                  Sie erhalten eine E-Mail über die Auszahlung
                </span>
              </li>
            </ul>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Hinweis:</strong> Nach dem Abschluss kann der Kunde die Arbeit
              bewerten und freigeben. Die Auszahlung erfolgt automatisch nach der
              Kundenbestätigung.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              Abbrechen
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Wird abgeschlossen...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Ja, abschließen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
