'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format, differenceInCalendarDays, isValid } from 'date-fns';
import { de } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FiLoader, FiCheckCircle } from 'react-icons/fi';

import { SimpleSelect } from './SimpleSelect';
import OrderAddressSelection from './OrderAddressSelection';
import { DateTimeSelectionPopup, DateTimeSelectionPopupProps } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import { PaymentSection } from '@/app/dashboard/user/[uid]/components/PaymentSection';

import { AnbieterDetails, UserProfileData, SavedAddress, BookingCharacteristics } from '@/types/types';
import { categories } from '@/lib/categories';
import { TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants';
import { getBookingCharacteristics } from '../../../../auftrag/get-started/[unterkategorie]/adresse/components/lib/utils';
import type { DateRange } from 'react-day-picker';

interface OrderDetailsForBackend {
  customerEmail: string;
  customerFirebaseUid: string;
  customerFirstName: string;
  customerLastName: string;
  customerType: string;
  description: string;
  jobCalculatedPriceInCents: number;
  jobCity: string;
  jobCountry: string;
  jobDateFrom: string;
  jobDateTo: string;
  jobDurationString: string;
  jobPostalCode: string;
  jobStreet: string;
  jobTimePreference: string;
  jobTotalCalculatedHours: number;
  kundeId: string;
  selectedAnbieterId: string;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  totalPriceInCents: number;
  addressName: string;
}

interface CreateOrderModalProps {
  onClose: () => void;
  currentUser: User;
  userProfile: UserProfileData;
}

function parseDurationStringToHours(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const match = durationStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) { const hours = parseFloat(match[1]); return isNaN(hours) ? null : hours; }
  return isNaN(parseFloat(durationStr)) ? null : parseFloat(durationStr);
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ onClose, currentUser, userProfile }) => {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'success'>('details');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [useSavedAddress, setUseSavedAddress] = useState<'new' | string>('new');
  const [newAddressDetails, setNewAddressDetails] = useState<SavedAddress | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AnbieterDetails | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalTotalPriceInCents, setFinalTotalPriceInCents] = useState<number>(0);
  const [finalOrderData, setFinalOrderData] = useState<OrderDetailsForBackend | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.savedAddresses && userProfile.savedAddresses.length > 0) {
      setUseSavedAddress(userProfile.savedAddresses[0].id);
    } else {
      setUseSavedAddress('new');
    }
  }, [userProfile?.savedAddresses]);

  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(cat => cat.title === selectedCategory);
    return category ? category.subcategories : [];
  }, [selectedCategory]);

  const currentBookingChars = useMemo<BookingCharacteristics>(() => getBookingCharacteristics(selectedSubcategory), [selectedSubcategory]);

  const handleOpenDatePicker = (provider: AnbieterDetails) => {
    setSelectedProvider(provider);
    setIsDatePickerOpen(true);
  };

  const handlePaymentSuccess = useCallback(() => {
    setLoading(false);
    setError(null);
    setCurrentStep('success');
    setTimeout(() => {
      onClose();
      router.refresh();
    }, 3000);
  }, [onClose, router]);

  const handlePaymentError = useCallback((message: string) => {
    setLoading(false);
    setError(`Zahlungsfehler: ${message}`);
  }, []);

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (selection, time, durationString) => {
    setError(null);
    setLoading(true);
    setIsDatePickerOpen(false);

    if (!selection || !time || !durationString || !selectedProvider || !selectedSubcategory) {
      setError("Fehler: Unvollständige Angaben für Preisberechnung.");
      setLoading(false);
      return;
    }

    let dateFromFormatted: string, dateToFormatted: string, calculatedNumberOfDays = 1;

    if (selection instanceof Date && isValid(selection)) {
      dateFromFormatted = format(selection, "yyyy-MM-dd");
      dateToFormatted = dateFromFormatted;
    } else if (selection && 'from' in selection && selection.from && isValid(selection.from)) {
      const { from, to } = selection;
      dateFromFormatted = format(from, "yyyy-MM-dd");
      dateToFormatted = to && isValid(to) ? format(to, "yyyy-MM-dd") : dateFromFormatted;
      calculatedNumberOfDays = to && isValid(to) ? differenceInCalendarDays(to, from) + 1 : 1;
    } else {
      setError("Ungültiges Datum ausgewählt.");
      setLoading(false);
      return;
    }

    const hourlyRateNum = parseFloat(String(selectedProvider.hourlyRate || '0'));
    const hoursInput = parseDurationStringToHours(durationString);

    if (isNaN(hourlyRateNum) || hourlyRateNum <= 0 || !hoursInput || hoursInput <= 0) {
      setError("Stundensatz oder Dauer ungültig.");
      setLoading(false);
      return;
    }

    const totalHours = currentBookingChars.isDurationPerDay ? hoursInput * calculatedNumberOfDays : hoursInput;
    const servicePrice = totalHours * hourlyRateNum;
    const totalPrice = servicePrice + TRUST_AND_SUPPORT_FEE_EUR;
    const totalPriceInCents = Math.round(totalPrice * 100);

    const rawFinalAddress = useSavedAddress === 'new' ? newAddressDetails : userProfile.savedAddresses?.find(a => a.id === useSavedAddress);

    if (!rawFinalAddress || !rawFinalAddress.postal_code || !rawFinalAddress.name?.trim() || !rawFinalAddress.line1?.trim() || !rawFinalAddress.city?.trim() || !rawFinalAddress.country?.trim()) {
      setError("Adresse unvollständig. Bitte alle Adressfelder ausfüllen (inklusive Name der Adresse).");
      setLoading(false);
      return;
    }
    const finalAddress = rawFinalAddress as SavedAddress;

    const orderDetailsForBackend: OrderDetailsForBackend = {
      customerEmail: currentUser.email || userProfile.email || '',
      customerFirebaseUid: currentUser.uid,
      customerFirstName: userProfile.firstname,
      customerLastName: userProfile.lastname || '',
      customerType: userProfile.user_type || 'private',
      description,
      jobCalculatedPriceInCents: totalPriceInCents,
      jobCity: finalAddress.city,
      jobCountry: finalAddress.country,
      jobDateFrom: dateFromFormatted,
      jobDateTo: dateToFormatted,
      jobDurationString: durationString,
      jobPostalCode: finalAddress.postal_code,
      jobStreet: finalAddress.line1,
      jobTimePreference: time,
      jobTotalCalculatedHours: totalHours,
      kundeId: currentUser.uid,
      selectedAnbieterId: selectedProvider.id,
      selectedCategory: selectedCategory,
      selectedSubcategory: selectedSubcategory,
      totalPriceInCents: totalPriceInCents,
      addressName: finalAddress.name,
    };

    try {
      if (!selectedProvider.stripeAccountId) {
        throw new Error("Anbieter hat kein verknüpftes Stripe-Konto.");
      }
      if (!userProfile.stripeCustomerId) {
        throw new Error("Sie haben kein Zahlungsprofil.");
      }

      const taskId = crypto.randomUUID();
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPriceInCents,
          currency: 'eur',
          connectedAccountId: selectedProvider.stripeAccountId,
          platformFee: TRUST_AND_SUPPORT_FEE_EUR,
          taskId,
          firebaseUserId: currentUser.uid,
          stripeCustomerId: userProfile.stripeCustomerId,
          orderDetails: orderDetailsForBackend,
        }),
      });

      const data = await response.json();
      if (data.error) { throw new Error(data.error.message || 'Fehler beim Erstellen der Zahlung.'); }

      setClientSecret(data.clientSecret);
      setFinalTotalPriceInCents(totalPriceInCents);
      setFinalOrderData(orderDetailsForBackend);
      setCurrentStep('payment');
    } catch (apiError: any) {
      setError(`API-Fehler: ${apiError.message || 'Unbekannt.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">Neuen Auftrag erstellen</h3>
        {error && <p className="bg-red-100 text-red-700 p-2 rounded-md text-sm my-2">{error}</p>}

        {currentStep === 'details' && (
          <div className="space-y-6">
            <div className="p-4 border rounded-md">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">1. Was soll erledigt werden?</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category">Hauptkategorie *</Label>
                  <SimpleSelect id="category" options={categories.map(c => c.title)} placeholder="Bitte wählen..." value={selectedCategory || ''} onChange={e => { setSelectedCategory(e.target.value); setSelectedSubcategory(null); setSelectedProvider(null); }} />
                </div>
                {selectedCategory && (
                  <div>
                    <Label htmlFor="subcategory">Unterkategorie *</Label>
                    <SimpleSelect id="subcategory" options={availableSubcategories} placeholder="Bitte wählen..." value={selectedSubcategory || ''} onChange={e => { setSelectedSubcategory(e.target.value); setSelectedProvider(null); }} />
                  </div>
                )}
                {selectedSubcategory && (
                  <div>
                    <Label htmlFor="description">Auftragsbeschreibung *</Label>
                    <Textarea id="description" placeholder="Beschreiben Sie hier, was genau gemacht werden soll..." value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                )}
              </div>
            </div>
            {selectedSubcategory && (
              <OrderAddressSelection userProfile={userProfile} useSavedAddress={useSavedAddress} setUseSavedAddress={setUseSavedAddress} newAddressDetails={newAddressDetails} setNewAddressDetails={setNewAddressDetails} selectedSubcategory={selectedSubcategory} onProviderSelect={setSelectedProvider} onOpenDatePicker={handleOpenDatePicker} />
            )}
            <div className="flex justify-end gap-2 mt-6 p-4 border-t">
              <Button type="button" onClick={onClose} variant="outline">Abbrechen</Button>
            </div>
          </div>
        )}

        {currentStep === 'payment' && finalOrderData && clientSecret && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gray-700">2. Zahlung abschließen</h4>
            <div className="p-4 border rounded-lg bg-gray-50 text-sm space-y-1">
              <p><strong>Anbieter:</strong> {selectedProvider?.companyName}</p>
              <p><strong>Auftrag:</strong> {finalOrderData.selectedSubcategory}</p>
              <p><strong>Datum:</strong> {format(new Date(finalOrderData.jobDateFrom), 'PPP', { locale: de })}</p>
              <p className="text-lg font-bold mt-2">Gesamtpreis: {(finalOrderData.totalPriceInCents / 100).toFixed(2)} EUR</p>
            </div>
            <PaymentSection totalPriceInCents={finalTotalPriceInCents} onPaymentSuccess={handlePaymentSuccess} onPaymentError={handlePaymentError} fullOrderDetails={finalOrderData} clientSecret={clientSecret} />
            <div className="flex justify-start pt-2">
              <Button type="button" onClick={() => { setError(null); setCurrentStep('details'); }} variant="outline">Zurück</Button>
            </div>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="text-center p-10 flex flex-col items-center justify-center">
            <FiCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-800">Auftrag erfolgreich erstellt!</h4>
            <p className="text-gray-600 mt-2">Das Modal wird in Kürze geschlossen.</p>
          </div>
        )}
      </div>

      <DateTimeSelectionPopup isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onConfirm={handleDateTimeConfirm} bookingSubcategory={selectedSubcategory} contextCompany={selectedProvider} />
    </>
  );
};
export default CreateOrderModal;