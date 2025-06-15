'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format, differenceInCalendarDays, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
// Firebase Imports für Firestore
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { app } from '@/firebase/clients'; // Stellen Sie sicher, dass Ihre Firebase-App hier importiert wird

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FiCheckCircle } from 'react-icons/fi';

import { SimpleSelect } from './SimpleSelect';
import OrderAddressSelection from './OrderAddressSelection';
import { DateTimeSelectionPopup, DateTimeSelectionPopupProps } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import PaymentSection from '@/app/dashboard/user/userId/components/OrderPaymentMethodSelection';

import { AnbieterDetails, UserProfileData, SavedAddress, BookingCharacteristics } from '@/types/types';
import { categories } from '@/lib/categories';
// import { TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants'; // Wird durch prozentuale Gebühr ersetzt
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

// Interface für BillingDetails, passend zu dem, was die API erwartet
// und was in BestaetigungsPage.tsx verwendet wird.
interface CustomerAddressForBilling {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  state?: string | null;
  country?: string | null;
}
interface BillingDetailsPayloadForApi {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: CustomerAddressForBilling;
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

const db = getFirestore(app); // Initialisiere Firestore-Datenbank

// Käufer-Servicegebühr Rate (z.B. 4.5%)
const BUYER_SERVICE_FEE_RATE = 0.045;

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
  const [tempJobDraftId, setTempJobDraftId] = useState<string | null>(null); // State für die Job-Draft-ID

  // State für die Auswahl der Zahlungsmethode in diesem Modal
  const [useSavedPaymentMethod, setUseSavedPaymentMethod] = useState<'new' | string>('new');


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

  const handlePaymentSuccess = useCallback(async (paymentIntentId: string) => {
    setLoading(true);
    setError(null);
    console.log("DEBUG: Zahlung erfolgreich bestätigt. Auftragserstellung wird über Webhook gehandhabt.");

    setLoading(false);
    setCurrentStep('success');
    setTimeout(() => {
      onClose();
      // Erwägen Sie, router.push zum aktuellen Pfad zu verwenden, um ein
      // Neuladen der Daten auf der Dashboard-Seite zu erzwingen,
      // falls router.refresh() nicht ausreicht (z.B. bei Client-Komponenten mit eigenem Fetching).
      router.push(window.location.pathname); // Navigiert zur aktuellen Seite, um potenziell Daten neu zu laden
    }, 3000);

  }, [onClose, router]);

  const handlePaymentError = useCallback((message: string | null) => {
    setLoading(false);
    setError(message ? `Zahlungsfehler: ${message}` : 'Ein unbekannter Zahlungsfehler ist aufgetreten.');
  }, []);

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (selection, time, durationString) => {
    console.log("DEBUG: Starte handleDateTimeConfirm...");
    setError(null);
    setLoading(true);
    setIsDatePickerOpen(false);

    try {
      console.log("DEBUG: Validierung der Eingangsdaten...");
      if (!selection || !time || !durationString || !selectedProvider || !selectedSubcategory) {
        throw new Error("Fehler: Unvollständige Angaben. Bitte versuchen Sie es erneut.");
      }

      console.log("DEBUG: Überprüfung der Stripe-IDs...");
      if (!selectedProvider.stripeAccountId) {
        throw new Error("Der ausgewählte Anbieter kann derzeit keine Zahlungen empfangen. Bitte wählen Sie einen anderen Anbieter.");
      }
      if (!userProfile.stripeCustomerId) {
        throw new Error("Ihr Zahlungsprofil ist nicht vollständig. Bitte fügen Sie unter 'Einstellungen' eine Zahlungsmethode hinzu, bevor Sie buchen.");
      }

      console.log("DEBUG: Datum formatieren und Dauer berechnen...");
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
        throw new Error("Ungültiges Datum ausgewählt. Bitte versuchen Sie es erneut.");
      }

      const hourlyRateNum = parseFloat(String(selectedProvider.hourlyRate || '0'));
      const hoursInput = parseDurationStringToHours(durationString);

      if (isNaN(hourlyRateNum) || hourlyRateNum <= 0 || !hoursInput || hoursInput <= 0) {
        throw new Error("Stundensatz oder Dauer sind ungültig.");
      }

      // NEUES DEBUGGING FÜR BERECHNUNG
      console.log("DEBUG: Buchungscharakteristiken - isDurationPerDay:", currentBookingChars.isDurationPerDay);
      console.log("DEBUG: Stunden Eingabe (hoursInput):", hoursInput);
      console.log("DEBUG: Berechnete Anzahl der Tage (calculatedNumberOfDays):", calculatedNumberOfDays);

      const totalHours = currentBookingChars.isDurationPerDay ? hoursInput * calculatedNumberOfDays : hoursInput;
      console.log("DEBUG: Gesamtstunden (totalHours) für Preisberechnung:", totalHours);
      // ENDE DEBUGGING FÜR BERECHNUNG


      const servicePrice = totalHours * hourlyRateNum;
      const servicePriceInCents = Math.round(servicePrice * 100); // Preis des Dienstleisters in Cents
      const buyerServiceFeeInCents = Math.round(servicePriceInCents * BUYER_SERVICE_FEE_RATE);
      const totalPrice = servicePrice + (buyerServiceFeeInCents / 100); // Gesamtpreis inkl. prozentualer Gebühr
      const totalPriceInCents = Math.round(totalPrice * 100);

      // NEU: Client-seitige Validierung des Endpreises (Basispreis für den Draft)
      if (totalPriceInCents <= 0) {
        console.error("CreateOrderModal: Client-seitige Validierung fehlgeschlagen - totalPriceInCents (als Basispreis verwendet) ist nicht positiv:", totalPriceInCents);
        throw new Error("Der berechnete Auftragswert muss positiv sein. Bitte überprüfen Sie Dauer und Stundensatz des Anbieters.");
      }

      // Zusätzliche Prüfung für den reinen Dienstleistungspreis, der als Basispreis für den Draft dient
      if (servicePriceInCents <= 0) {
        console.error("CreateOrderModal: Client-seitige Validierung fehlgeschlagen - servicePriceInCents (als Basispreis für Draft verwendet) ist nicht positiv:", servicePriceInCents);
        throw new Error("Der reine Dienstleistungspreis muss positiv sein. Überprüfen Sie Stundensatz und Dauer.");
      }


      console.log("DEBUG: Adresse finalisieren...");
      const rawFinalAddress = useSavedAddress === 'new' ? newAddressDetails : userProfile.savedAddresses?.find(a => a.id === useSavedAddress);

      if (!rawFinalAddress || !rawFinalAddress.postal_code || !rawFinalAddress.name?.trim() || !rawFinalAddress.line1?.trim() || !rawFinalAddress.city?.trim() || !rawFinalAddress.country?.trim()) {
        throw new Error("Adresse unvollständig. Bitte alle Adressfelder ausfüllen.");
      }
      const finalAddress = rawFinalAddress as SavedAddress;

      const orderDetailsForBackend: OrderDetailsForBackend = {
        customerEmail: currentUser.email || userProfile.email || '', // Fallback
        customerFirebaseUid: currentUser.uid,
        customerFirstName: userProfile.firstname || '', // FIX: Fallback auf leeren String
        customerLastName: userProfile.lastname || '',
        customerType: userProfile.user_type || 'private',
        description,
        jobCalculatedPriceInCents: servicePriceInCents, // KORREKTUR: Reiner Dienstleistungspreis
        jobCity: finalAddress.city,
        jobCountry: finalAddress.country,
        jobDateFrom: dateFromFormatted,
        jobDateTo: dateToFormatted,
        jobDurationString: durationString,
        jobPostalCode: finalAddress.postal_code,
        jobStreet: finalAddress.line1,
        jobTimePreference: time,
        jobTotalCalculatedHours: totalHours, // Dies ist der Wert, der gespeichert wird
        kundeId: currentUser.uid,
        selectedAnbieterId: selectedProvider.id,
        selectedCategory: selectedCategory,
        selectedSubcategory: selectedSubcategory,
        totalPriceInCents: totalPriceInCents, // Gesamtpreis für die Bestellung/Zahlung
        addressName: finalAddress.name,
      };

      // Erstelle das billingDetails-Objekt für die API
      const billingDetailsForApi: BillingDetailsPayloadForApi = {
        name: [
          (`${userProfile.firstname || ''} ${userProfile.lastname || ''}`).trim(),
          typeof userProfile.companyName === 'string' ? userProfile.companyName.trim() : null,
          typeof currentUser.displayName === 'string' ? currentUser.displayName.trim() : null
        ].find(n => n && n.length > 0) || 'Unbekannter Name',
        email: currentUser.email || userProfile.email || '',
        phone: [
          typeof userProfile.phoneNumber === 'string' ? userProfile.phoneNumber : null,
          typeof userProfile.companyPhoneNumber === 'string' ? userProfile.companyPhoneNumber : null
        ].find(p => p && p.length > 0) || undefined,
        address: {
          line1: finalAddress.line1,
          line2: finalAddress.line2 || undefined, // Stelle sicher, dass line2 undefined ist, wenn leer
          city: finalAddress.city,
          postal_code: finalAddress.postal_code,
          country: finalAddress.country,
        },
      };

      console.log("DEBUG: Generiere temporäre Job-Entwurf-ID...");
      const newTempJobDraftId = crypto.randomUUID();
      setTempJobDraftId(newTempJobDraftId); // Speichere im State
      setFinalOrderData(orderDetailsForBackend); // FinalOrderData hier aktualisieren

      console.log("DEBUG: Speichere temporären Job-Entwurf in Firestore (temporaryJobDrafts)...", newTempJobDraftId);
      const tempDraftToSave = {
        ...orderDetailsForBackend,
        providerName: selectedProvider.companyName,
        providerId: selectedProvider.id,
        status: 'initial_draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      console.log("DEBUG: tempDraftToSave.customerFirebaseUid vor setDoc:", tempDraftToSave.customerFirebaseUid);

      await setDoc(doc(db, "temporaryJobDrafts", newTempJobDraftId), tempDraftToSave);
      console.log(`DEBUG: Temporärer Job-Entwurf ${newTempJobDraftId} erfolgreich in Firestore gespeichert.`);


      console.log("DEBUG: Rufe /api/create-payment-intent auf...");
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPriceInCents,
          jobPriceInCents: servicePriceInCents, // Hinzufügen von jobPriceInCents auf Root-Ebene
          currency: 'eur',
          connectedAccountId: selectedProvider.stripeAccountId,
          // platformFee wird serverseitig berechnet, daher hier nicht mehr senden (TRUST_AND_SUPPORT_FEE_EUR ist nur für die Client-Anzeige)
          taskId: newTempJobDraftId, // Verwende die generierte ID als taskId für Stripe Metadata
          firebaseUserId: currentUser.uid,
          stripeCustomerId: userProfile.stripeCustomerId,
          orderDetails: orderDetailsForBackend,
          billingDetails: billingDetailsForApi, // Hinzufügen von billingDetails auf Root-Ebene
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        console.error("API-Antwort Fehler:", data.error);
        throw new Error(data.error?.message || 'Fehler bei der Kommunikation mit dem Zahlungsserver.');
      }

      console.log("DEBUG: ERFOLG! clientSecret erhalten. Wechsle zu 'payment'.");
      setClientSecret(data.clientSecret);
      setFinalTotalPriceInCents(totalPriceInCents);
      setCurrentStep('payment');

    } catch (err: unknown) {
      console.error("DEBUG-FAIL: Fehler in handleDateTimeConfirm.", err);
      let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
        errorMessage = (err as any).message;
      }
      setError(errorMessage);
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

        {currentStep === 'payment' && finalOrderData && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gray-700">2. Zahlung abschließen</h4>
            <div className="p-4 border rounded-lg bg-gray-50 text-sm space-y-1">
              <p><strong>Anbieter:</strong> {selectedProvider?.companyName}</p>
              <p><strong>Auftrag:</strong> {finalOrderData.selectedSubcategory}</p>
              <p><strong>Datum:</strong> {format(new Date(finalOrderData.jobDateFrom), 'PPP', { locale: de })}</p>
              <p className="text-lg font-bold mt-2">Gesamtpreis: ${(finalOrderData.totalPriceInCents / 100).toFixed(2)} EUR</p>
            </div>
            <PaymentSection
              userProfile={userProfile}
              useSavedPaymentMethod={useSavedPaymentMethod}
              setUseSavedPaymentMethod={setUseSavedPaymentMethod}
              clientSecret={clientSecret}
              isPaymentIntentLoading={loading}
              handleCheckoutFormProcessing={(isProcessing) => setLoading(isProcessing)}
              handleCheckoutFormError={handlePaymentError}
              handleCheckoutFormSuccess={handlePaymentSuccess}
              loading={loading}

              totalPriceInCents={finalTotalPriceInCents}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              fullOrderDetails={finalOrderData}
            />
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
