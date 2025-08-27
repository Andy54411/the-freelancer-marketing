'use client';

import React, { useState } from 'react';
import { X, Calendar, User, Euro, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DateTimeSelectionPopup,
  DateTimeSelectionPopupProps,
} from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import B2BPaymentComponent from '@/components/B2BPaymentComponent';

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
  stripeAccountId?: string; // Für B2B Payment
}

interface ProviderBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
  onConfirm: (
    dateSelection: any,
    time: string,
    duration: string,
    description: string
  ) => Promise<void>;
}

export const ProviderBookingModal: React.FC<ProviderBookingModalProps> = ({
  isOpen,
  onClose,
  provider,
  onConfirm,
}) => {
  const { user } = useAuth(); // Hole aktuellen User für B2B Payment
  const [currentStep, setCurrentStep] = useState<
    'description' | 'datetime' | 'payment' | 'stripe-payment'
  >('description');
  const [description, setDescription] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<{
    dateSelection: any;
    time: string;
    duration: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isB2BPaymentOpen, setIsB2BPaymentOpen] = useState(false);
  const [b2bProjectData, setB2bProjectData] = useState<{
    projectId: string;
    projectTitle: string;
    projectDescription: string;
    amount: number;
    currency: string;
    paymentType: 'milestone' | 'project_deposit' | 'final_payment';
    providerId: string;
    providerStripeAccountId: string;
  } | null>(null);

  const handleDescriptionNext = () => {
    if (!description.trim()) {
      alert('Bitte geben Sie eine Beschreibung für den Auftrag ein.');
      return;
    }
    setCurrentStep('datetime');
    setIsDatePickerOpen(true);
  };

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (
    dateSelection,
    time,
    duration
  ) => {
    setIsDatePickerOpen(false);
    if (time && duration) {
      setSelectedDateTime({ dateSelection, time, duration });
      setCurrentStep('payment');
    }
  };

  const handlePaymentConfirm = async () => {
    if (!selectedDateTime) return;

    setIsProcessingPayment(true);
    try {
      // DEBUG: Provider Stripe Account prüfen

      // FALLBACK: Falls stripeAccountId undefined ist, versuche direkten DB-Zugriff
      if (!provider.stripeAccountId) {
        try {
          // Direkter Firestore-Zugriff um stripeAccountId zu holen
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/firebase/clients');

          // KRITISCHE KORREKTUR: Erst companies, dann users Collection prüfen
          let userData: any = null;

          // 1. Prüfe companies Collection
          const companyDoc = await getDoc(doc(db, 'companies', provider.id));
          if (companyDoc.exists()) {
            userData = companyDoc.data();
          } else {
            // 2. Fallback: users Collection
            const userDoc = await getDoc(doc(db, 'users', provider.id));
            if (userDoc.exists()) {
              userData = userDoc.data();
            }
          }

          if (userData) {
            // Verwende die direkt geladene stripeAccountId
            if (userData.stripeAccountId?.startsWith('acct_')) {
              // Überschreibe die provider stripeAccountId für diese Session
              provider.stripeAccountId = userData.stripeAccountId;
            }
          }
        } catch (fallbackError) {
          console.error('Fehler beim Laden der Provider Stripe Account ID:', fallbackError);
        }
      } else {
      }

      // Prüfe ob Provider Stripe Account vorhanden und gültig ist
      if (!provider.stripeAccountId || !provider.stripeAccountId.startsWith('acct_')) {
        alert(
          'B2B Payment nicht möglich: Provider hat kein konfiguriertes Stripe Connect Konto. ' +
            'Bitte kontaktieren Sie den Anbieter oder verwenden Sie eine andere Zahlungsmethode.'
        );
        return;
      }

      // Berechne den Gesamtbetrag
      const hourlyRate = provider.hourlyRate || 0;
      const durationStr = selectedDateTime.duration;

      let totalHours = 0;

      // Prüfe ob wir eine DateRange haben (mehrtägige Buchung)
      if (
        selectedDateTime.dateSelection &&
        selectedDateTime.dateSelection.from &&
        selectedDateTime.dateSelection.to
      ) {
        const startDate = new Date(selectedDateTime.dateSelection.from);
        const endDate = new Date(selectedDateTime.dateSelection.to);
        const daysDiff =
          Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
        const hoursPerDay = parseFloat(durationStr) || 8;
        totalHours = daysDiff * hoursPerDay;
      } else {
        // Fallback: normale Stundenberechnung
        const hoursMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*Stunden?/i);
        totalHours = hoursMatch ? parseFloat(hoursMatch[1]) : parseFloat(durationStr) || 1;
      }

      const totalAmountCents = Math.round(hourlyRate * totalHours * 100); // In Cents

      // Erstelle B2B Project Data für die neue B2BPaymentComponent
      const projectData = {
        projectId: `b2b-booking-${Date.now()}`,
        projectTitle: `Service-Buchung: ${provider.companyName || provider.userName}`,
        projectDescription: `${description}\n\nStunden: ${totalHours}h\nStundensatz: €${hourlyRate}/h`,
        amount: totalAmountCents,
        currency: 'eur',
        paymentType: 'project_deposit' as const,
        providerId: provider.id,
        providerStripeAccountId: provider.stripeAccountId,
      };

      setB2bProjectData(projectData);
      setCurrentStep('stripe-payment');
      setIsB2BPaymentOpen(true);
    } catch (error) {
      alert(
        `Zahlung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleStripePaymentSuccess = async (paymentIntentId: string) => {
    // KORREKT: Webhook erstellt die Order automatisch - kein Frontend-Order-Creation
    // Der Webhook verarbeitet den payment_intent.succeeded Event und erstellt die Order

    alert(
      'Buchung erfolgreich abgeschlossen! Die Bestellung wird automatisch erstellt. Sie erhalten eine Bestätigung per E-Mail.'
    );
    handleClose();
  };

  const handleStripePaymentError = (errorMessage: string) => {
    alert(`Zahlung fehlgeschlagen: ${errorMessage}`);
    setCurrentStep('payment'); // Zurück zum Payment Step
  };

  const handleClose = () => {
    setCurrentStep('description');
    setDescription('');
    setSelectedDateTime(null);
    setB2bProjectData(null);
    setIsB2BPaymentOpen(false);
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Dienstleistung buchen
                </h2>
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
                      {(() => {
                        // Prüfe ob dateSelection ein DateRange-Objekt ist
                        if (
                          selectedDateTime.dateSelection &&
                          typeof selectedDateTime.dateSelection === 'object'
                        ) {
                          if (
                            selectedDateTime.dateSelection.from &&
                            selectedDateTime.dateSelection.to
                          ) {
                            // DateRange: von X bis Y
                            const startDate = new Date(
                              selectedDateTime.dateSelection.from
                            ).toLocaleDateString('de-DE');
                            const endDate = new Date(
                              selectedDateTime.dateSelection.to
                            ).toLocaleDateString('de-DE');
                            return `${startDate} - ${endDate}, ${selectedDateTime.time}`;
                          } else if (selectedDateTime.dateSelection.from) {
                            // Einzeltag aus DateRange
                            const singleDate = new Date(
                              selectedDateTime.dateSelection.from
                            ).toLocaleDateString('de-DE');
                            return `${singleDate}, ${selectedDateTime.time}`;
                          }
                        }

                        // Fallback: verwende time string direkt
                        return selectedDateTime.time;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Dauer:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {(() => {
                        // Prüfe ob wir eine DateRange haben (mehrtägige Buchung)
                        if (
                          selectedDateTime.dateSelection &&
                          selectedDateTime.dateSelection.from &&
                          selectedDateTime.dateSelection.to
                        ) {
                          const startDate = new Date(selectedDateTime.dateSelection.from);
                          const endDate = new Date(selectedDateTime.dateSelection.to);

                          // Berechne die Anzahl der Tage
                          const timeDiff = endDate.getTime() - startDate.getTime();
                          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

                          // Extrahiere Stunden pro Tag
                          const hoursPerDay = parseFloat(selectedDateTime.duration) || 8;

                          if (daysDiff > 1) {
                            return `${daysDiff} Tage à ${hoursPerDay} Stunden`;
                          }
                        }

                        // Fallback auf ursprünglichen duration string
                        return selectedDateTime.duration;
                      })()}
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
                        {(() => {
                          const hourlyRate = provider.hourlyRate || 0;
                          const durationStr = selectedDateTime.duration;

                          // Prüfe ob wir eine DateRange haben (mehrtägige Buchung)
                          if (
                            selectedDateTime.dateSelection &&
                            selectedDateTime.dateSelection.from &&
                            selectedDateTime.dateSelection.to
                          ) {
                            const startDate = new Date(selectedDateTime.dateSelection.from);
                            const endDate = new Date(selectedDateTime.dateSelection.to);

                            // Berechne die Anzahl der Tage
                            const timeDiff = endDate.getTime() - startDate.getTime();
                            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 weil Start- und Endtag beide inkludiert sind

                            // Extrahiere Stunden pro Tag aus durationStr
                            const hoursPerDay = parseFloat(durationStr) || 8; // Fallback auf 8 Stunden

                            const totalHours = daysDiff * hoursPerDay;

                            return (hourlyRate * totalHours).toFixed(2);
                          }

                          // Prüfe ob es eine mehrtägige Buchung ist (Text-Format)
                          const multiDayMatch1 = durationStr.match(
                            /(\d+)\s*Tage?\s*[àa]\s*(\d+)\s*Stunden?/i
                          );
                          const multiDayMatch2 = durationStr.match(
                            /(\d+)\s*[Tt]age?\s*[àaA]\s*(\d+)\s*[Ss]tunden?/i
                          );

                          if (multiDayMatch1 || multiDayMatch2) {
                            const match = multiDayMatch1 || multiDayMatch2;
                            if (match && match[1] && match[2]) {
                              const days = parseInt(match[1]);
                              const hoursPerDay = parseInt(match[2]);
                              const totalHours = days * hoursPerDay;

                              return (hourlyRate * totalHours).toFixed(2);
                            }
                          }

                          // Normale Stundenberechnung (z.B. "8 Stunden")
                          const hoursMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*Stunden?/i);
                          if (hoursMatch) {
                            const hours = parseFloat(hoursMatch[1]);

                            return (hourlyRate * hours).toFixed(2);
                          }

                          // Fallback: versuche direkt zu parsen
                          const directHours = parseFloat(durationStr) || 1;

                          return (hourlyRate * directHours).toFixed(2);
                        })()}
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
                      Dienstleistung kostenpflichtig buchen
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* B2B Payment wird als separates Modal gerendert */}
        </div>
      </div>

      {/* B2B Payment Component */}
      {b2bProjectData && (
        <B2BPaymentComponent
          projectData={b2bProjectData}
          customerData={{
            customerId: user?.uid || 'anonymous',
            companyName: '', // Wird aus Firebase geladen
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Taskilo Kunde',
            email: user?.email || '',
            phone: '', // Wird aus Firebase geladen
            address: undefined, // Wird aus Firebase geladen
          }}
          isOpen={isB2BPaymentOpen}
          onClose={() => {
            setIsB2BPaymentOpen(false);
            setCurrentStep('payment');
          }}
          onSuccess={handleStripePaymentSuccess}
          onError={handleStripePaymentError}
        />
      )}

      {/* DateTimeSelectionPopup */}
      {isDatePickerOpen && (
        <DateTimeSelectionPopup
          isOpen={isDatePickerOpen}
          onClose={() => {
            setIsDatePickerOpen(false);
            setCurrentStep('description');
          }}
          onConfirm={handleDateTimeConfirm} // WICHTIG: Verwendet handleDateTimeConfirm, NICHT die originale onConfirm!
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
