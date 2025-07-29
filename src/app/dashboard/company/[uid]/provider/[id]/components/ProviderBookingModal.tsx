'use client';

import React, { useState } from 'react';
import { X, Calendar, User, Euro, CreditCard, CheckCircle } from 'lucide-react';
import {
  DateTimeSelectionPopup,
  DateTimeSelectionPopupProps,
} from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';

interface Provider {
  id: string;
  companyName?: string;
  userName?: string;
  hourlyRate?: number;
  profilePictureFirebaseUrl?: string;
  profilePictureURL?: string;
  photoURL?: string;
  selectedCategory?: string;
  selectedSubcategory?: string;
  bio?: string;
  description?: string;
}

interface ProviderBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
  onConfirm: (
    selection: any,
    time: string,
    durationString: string,
    description: string
  ) => Promise<void>;
}

export const ProviderBookingModal: React.FC<ProviderBookingModalProps> = ({
  isOpen,
  onClose,
  provider,
  onConfirm,
}) => {
  const [currentStep, setCurrentStep] = useState<'description' | 'datetime' | 'payment'>(
    'description'
  );
  const [description, setDescription] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<{
    selection: any;
    time: string;
    durationString: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleDescriptionNext = () => {
    if (!description.trim()) {
      alert('Bitte geben Sie eine Beschreibung für den Auftrag ein.');
      return;
    }
    setCurrentStep('datetime');
    setIsDatePickerOpen(true);
  };

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (
    selection,
    time,
    durationString
  ) => {
    setIsDatePickerOpen(false);
    if (time && durationString) {
      setSelectedDateTime({ selection, time, durationString });
      setCurrentStep('payment');
    }
  };

  const handlePaymentConfirm = async () => {
    if (!selectedDateTime) return;

    setIsProcessingPayment(true);
    try {
      await onConfirm(
        selectedDateTime.selection,
        selectedDateTime.time,
        selectedDateTime.durationString,
        description
      );
      handleClose();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('description');
    setDescription('');
    setSelectedDateTime(null);
    setIsDatePickerOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  const getProviderName = () => provider.companyName || provider.userName || 'Unbekannter Anbieter';
  const getProfileImage = () =>
    provider.profilePictureFirebaseUrl ||
    provider.profilePictureURL ||
    provider.photoURL ||
    '/images/default-avatar.jpg';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {currentStep === 'description' && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Termin buchen</h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Provider Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={getProfileImage()}
                    alt={getProviderName()}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/images/default-avatar.jpg';
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getProviderName()}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {provider.selectedSubcategory && (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {provider.selectedSubcategory}
                        </div>
                      )}
                      {provider.hourlyRate && (
                        <div className="flex items-center gap-1">
                          <Euro className="w-4 h-4" />€{provider.hourlyRate}/h
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Form */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Auftragsbeschreibung *
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Beschreiben Sie hier, was genau gemacht werden soll..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] dark:bg-gray-700 dark:text-white min-h-[120px] resize-none"
                    required
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Geben Sie möglichst detaillierte Informationen zu Ihrem Auftrag an.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDescriptionNext}
                    className="flex-1 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Weiter zu Terminauswahl
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'payment' && selectedDateTime && (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Zahlungsdetails
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Buchungsübersicht
                </h3>

                {/* Provider Info */}
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={getProfileImage()}
                    alt={getProviderName()}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getProviderName()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {provider.selectedSubcategory}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Datum & Zeit:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {selectedDateTime.time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Dauer:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {selectedDateTime.durationString}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Stundensatz:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      €{provider.hourlyRate}/h
                    </span>
                  </div>

                  {/* Price Calculation */}
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-900 dark:text-white">
                        Geschätzter Gesamtpreis:
                      </span>
                      <span className="text-[#14ad9f]">
                        €
                        {(
                          (provider.hourlyRate || 0) *
                          (parseFloat(selectedDateTime.durationString) || 1)
                        ).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      * Finale Abrechnung erfolgt nach tatsächlich geleisteten Stunden
                    </p>
                  </div>
                </div>

                {/* Description Preview */}
                {description && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Auftragsbeschreibung:
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white italic">
                      &ldquo;{description}&rdquo;
                    </div>
                  </div>
                )}
              </div>

              {/* B2B Payment Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      B2B-Abrechnung
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Als Geschäftskunde erhalten Sie eine ordnungsgemäße Rechnung mit ausgewiesener
                      MwSt. Die Zahlung erfolgt über Ihr hinterlegtes Firmenkonto.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('datetime')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handlePaymentConfirm}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Wird verarbeitet...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Jetzt kostenpflichtig buchen
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DateTimeSelectionPopup */}
      {isDatePickerOpen && (
        <DateTimeSelectionPopup
          isOpen={isDatePickerOpen}
          onClose={() => {
            setIsDatePickerOpen(false);
            setCurrentStep('description');
          }}
          onConfirm={handleDateTimeConfirm}
          bookingSubcategory={provider.selectedSubcategory || provider.selectedCategory || null}
          contextCompany={{
            id: provider.id,
            companyName: getProviderName(),
            hourlyRate: provider.hourlyRate || 0,
            profilePictureURL: getProfileImage(),
            description: provider.bio || provider.description,
            selectedSubcategory: provider.selectedSubcategory,
          }}
        />
      )}
    </>
  );
};
