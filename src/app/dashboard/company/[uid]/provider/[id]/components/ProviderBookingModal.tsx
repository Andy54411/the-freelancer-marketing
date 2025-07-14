'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, User, Euro } from 'lucide-react';
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
  const [currentStep, setCurrentStep] = useState<'description' | 'datetime'>('description');
  const [description, setDescription] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

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
      await onConfirm(selection, time, durationString, description);
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep('description');
    setDescription('');
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
