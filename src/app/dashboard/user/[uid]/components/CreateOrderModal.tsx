'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { format, differenceInCalendarDays, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
// Firebase Imports für Firestore
import {
  getFirestore,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { app } from '@/firebase/clients'; // Stellen Sie sicher, dass Ihre Firebase-App hier importiert wird

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CheckCircle as FiCheckCircle, Globe, User as UserIcon, Info } from 'lucide-react';

import { SimpleSelect } from './SimpleSelect';
import OrderAddressSelection from './OrderAddressSelection';
import OrderAiEnhancer from './OrderAiEnhancer';
import {
  DateTimeSelectionPopup,
  DateTimeSelectionPopupProps,
} from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import PaymentSection from '@/app/dashboard/user/[uid]/components/OrderPaymentMethodSelection';
import { toast } from 'sonner';

import {
  AnbieterDetails,
  UserProfileData,
  SavedAddress,
  BookingCharacteristics,
} from '@/types/types';
import { categories } from '@/lib/categories';
// import { TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants'; // Wird durch prozentuale Gebühr ersetzt
import { getBookingCharacteristics } from '../../../../auftrag/get-started/[unterkategorie]/adresse/components/lib/utils';

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
  [key: string]: unknown;
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
  onSuccess: () => void;
  currentUser: User;
  userProfile: UserProfileData;
  preselectedProviderId?: string; // Nur die Provider-ID statt ganzes Objekt
  preselectedCategory?: string;
  preselectedSubcategory?: string;
}

function parseDurationStringToHours(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const match = durationStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) {
    const hours = parseFloat(match[1]);
    return isNaN(hours) ? null : hours;
  }
  return isNaN(parseFloat(durationStr)) ? null : parseFloat(durationStr);
}

const db = getFirestore(app); // Initialisiere Firestore-Datenbank

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  onClose,
  onSuccess,
  currentUser,
  userProfile,
  preselectedProviderId,
  preselectedCategory,
  preselectedSubcategory,
}) => {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'success' | 'marketplace-success'>('details');
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

  // State für die Auswahl der Zahlungsmethode in diesem Modal
  const [useSavedPaymentMethod, setUseSavedPaymentMethod] = useState<'new' | string>('new');

  // NEU: Marketplace-Modus State
  const [isMarketplaceMode, setIsMarketplaceMode] = useState(false);
  const [marketplaceTitle, setMarketplaceTitle] = useState('');
  const [marketplaceBudgetMin, setMarketplaceBudgetMin] = useState('');
  const [marketplaceBudgetMax, setMarketplaceBudgetMax] = useState('');
  const [marketplaceTimeline, setMarketplaceTimeline] = useState('');
  const [marketplaceLocation, setMarketplaceLocation] = useState('');
  // Erweiterte Marketplace-Felder
  const [marketplaceBudgetType, setMarketplaceBudgetType] = useState<'fixed' | 'hourly' | 'negotiable'>('fixed');
  const [marketplaceProjectScope, setMarketplaceProjectScope] = useState<'einmalig' | 'wiederkehrend' | 'langfristig'>('einmalig');
  const [marketplaceIsRemote, setMarketplaceIsRemote] = useState(false);
  const [marketplaceWorkingHours, setMarketplaceWorkingHours] = useState<'werktags' | 'wochenende' | 'abends' | 'flexibel'>('flexibel');
  const [marketplaceSiteVisit, setMarketplaceSiteVisit] = useState(false);
  const [marketplaceContactPreference, setMarketplaceContactPreference] = useState<'telefon' | 'email' | 'chat'>('email');
  const [marketplaceQualifications, setMarketplaceQualifications] = useState('');
  const [marketplaceUrgency, setMarketplaceUrgency] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  useEffect(() => {
    if (userProfile?.savedAddresses && userProfile.savedAddresses.length > 0) {
      setUseSavedAddress(userProfile.savedAddresses[0].id);
    } else {
      setUseSavedAddress('new');
    }
  }, [userProfile?.savedAddresses]);

  // useEffect für vorausgewählten Provider
  useEffect(() => {
    const loadPreselectedProvider = async () => {
      if (!preselectedProviderId) return;

      try {
        // Zuerst Kategorie und Subkategorie setzen falls übergeben
        if (preselectedCategory) {
          setSelectedCategory(preselectedCategory);
        }
        if (preselectedSubcategory) {
          setSelectedSubcategory(preselectedSubcategory);
        }

        // Provider-Daten aus Firestore laden
        const providerDocRef = doc(db, 'companies', preselectedProviderId);
        const providerDoc = await getDoc(providerDocRef);

        if (providerDoc.exists()) {
          const providerData = providerDoc.data();

          // Erstelle AnbieterDetails-Objekt aus Firestore-Daten
          const providerDetails: AnbieterDetails = {
            id: preselectedProviderId,
            companyName: providerData.companyName || 'Unbekannter Anbieter',
            hourlyRate: providerData.hourlyRate || 0,
            profilePictureURL:
              providerData.profilePictureFirebaseUrl || providerData.profilePictureURL,
            description: providerData.description,
            selectedSubcategory: providerData.selectedSubcategory || preselectedSubcategory || '',
          };

          setSelectedProvider(providerDetails);

          // Kategorie/Subkategorie aus Provider-Daten setzen falls nicht übergeben
          if (!preselectedCategory && providerData.selectedCategory) {
            setSelectedCategory(providerData.selectedCategory);
          }
          if (!preselectedSubcategory && providerData.selectedSubcategory) {
            setSelectedSubcategory(providerData.selectedSubcategory);
          }
        }
      } catch {
        // Provider konnte nicht geladen werden
      }
    };

    loadPreselectedProvider();
  }, [preselectedProviderId, preselectedCategory, preselectedSubcategory]);

  const availableSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(cat => cat.title === selectedCategory);
    return category ? category.subcategories : [];
  }, [selectedCategory]);

  const currentBookingChars = useMemo<BookingCharacteristics>(
    () => getBookingCharacteristics(selectedSubcategory),
    [selectedSubcategory]
  );

  const handleOpenDatePicker = (provider: AnbieterDetails) => {
    setSelectedProvider(provider);
    setIsDatePickerOpen(true);
  };

  const handlePaymentSuccess = useCallback(
    async (_escrowId: string) => {
      setLoading(true);
      setError(null);

      setLoading(false);
      setCurrentStep('success');
      // Nach 3 Sekunden die Erfolgs-Callback-Funktion aufrufen, die das Modal schließt und die Daten neu lädt.
      setTimeout(onSuccess, 3000);
    },
    [onSuccess]
  );

  const handlePaymentError = useCallback((message: string | null) => {
    setLoading(false);
    setError(
      message ? `Zahlungsfehler: ${message}` : 'Ein unbekannter Zahlungsfehler ist aufgetreten.'
    );
  }, []);

  // NEU: Marketplace-Anfrage erstellen mit 3,75 EUR Veröffentlichungsgebühr
  const handleMarketplaceSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // Validierung
      if (!marketplaceTitle.trim()) {
        throw new Error('Bitte geben Sie einen Titel für Ihr Projekt ein.');
      }
      if (!description.trim()) {
        throw new Error('Bitte beschreiben Sie Ihr Projekt.');
      }
      if (!selectedCategory) {
        throw new Error('Bitte wählen Sie eine Kategorie.');
      }
      if (!selectedSubcategory) {
        throw new Error('Bitte wählen Sie eine Unterkategorie.');
      }

      // Adresse ermitteln
      const rawFinalAddress =
        useSavedAddress === 'new'
          ? newAddressDetails
          : userProfile.savedAddresses?.find(a => a.id === useSavedAddress);

      const location = rawFinalAddress
        ? `${rawFinalAddress.postal_code} ${rawFinalAddress.city}`.trim()
        : marketplaceLocation;

      // Budget als Objekt vorbereiten
      const budget = {
        min: marketplaceBudgetMin ? parseFloat(marketplaceBudgetMin) : null,
        max: marketplaceBudgetMax ? parseFloat(marketplaceBudgetMax) : null,
        type: marketplaceBudgetType,
      };

      // Qualifikationen als Array vorbereiten
      const requiredQualifications = marketplaceQualifications
        .split(',')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      // Firebase Token holen
      const token = await currentUser.getIdToken();

      // Publishing-Fee API aufrufen (erstellt Projekt und leitet zu Zahlung weiter)
      const response = await fetch('/api/marketplace/publishing-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectTitle: marketplaceTitle.trim(),
          projectDescription: description.trim(),
          budget,
          budgetType: marketplaceBudgetType,
          timeline: marketplaceTimeline,
          location,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          customerId: currentUser.uid,
          // Neue Felder
          projectScope: marketplaceProjectScope,
          isRemote: marketplaceIsRemote,
          urgency: marketplaceUrgency,
          workingHours: marketplaceWorkingHours,
          siteVisitPossible: marketplaceSiteVisit,
          contactPreference: marketplaceContactPreference,
          requiredQualifications,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Veröffentlichen');
      }

      // Zur Checkout-URL weiterleiten für 3,75 EUR Gebühr - im neuen Tab öffnen
      if (data.checkoutUrl) {
        // Checkout im neuen Tab öffnen
        const checkoutWindow = window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        if (checkoutWindow) {
          // Erfolgs-Meldung zeigen und Modal schließen
          toast.success('Checkout wurde in einem neuen Tab geöffnet. Nach erfolgreicher Zahlung wird Ihr Projekt veröffentlicht.');
          setCurrentStep('marketplace-success');
          // Modal nach kurzer Verzögerung schließen
          setTimeout(() => {
            onSuccess();
            router.push(`/dashboard/user/${currentUser.uid}/projects?pending=true&projectId=${data.projectId}`);
          }, 2000);
        } else {
          // Popup wurde blockiert - erneut versuchen mit direktem Klick
          toast.error('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite und versuchen Sie es erneut.');
        }
      } else {
        // Fallback: Direktes Speichern ohne Gebühr (für Tests/Dev)
        toast.success('Projekt erfolgreich im Marktplatz veröffentlicht');
        setCurrentStep('marketplace-success');
        setTimeout(() => {
          onSuccess();
          router.push(`/dashboard/user/${currentUser.uid}/projects`);
        }, 3000);
      }

    } catch (err: unknown) {
      let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    marketplaceTitle,
    description,
    selectedCategory,
    selectedSubcategory,
    marketplaceBudgetMin,
    marketplaceBudgetMax,
    marketplaceBudgetType,
    marketplaceTimeline,
    marketplaceLocation,
    marketplaceProjectScope,
    marketplaceIsRemote,
    marketplaceUrgency,
    marketplaceWorkingHours,
    marketplaceSiteVisit,
    marketplaceContactPreference,
    marketplaceQualifications,
    useSavedAddress,
    newAddressDetails,
    userProfile,
    currentUser,
    onSuccess,
    router,
  ]);

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (
    selection,
    time,
    durationString
  ) => {
    setError(null);
    setLoading(true);
    setIsDatePickerOpen(false);

    try {
      if (!selection || !time || !durationString || !selectedProvider || !selectedSubcategory) {
        throw new Error('Fehler: Unvollständige Angaben. Bitte versuchen Sie es erneut.');
      }

      let dateFromFormatted: string,
        dateToFormatted: string,
        calculatedNumberOfDays = 1;

      if (selection instanceof Date && isValid(selection)) {
        dateFromFormatted = format(selection, 'yyyy-MM-dd');
        dateToFormatted = dateFromFormatted;
      } else if (selection && 'from' in selection && selection.from && isValid(selection.from)) {
        const { from, to } = selection;
        dateFromFormatted = format(from, 'yyyy-MM-dd');
        dateToFormatted = to && isValid(to) ? format(to, 'yyyy-MM-dd') : dateFromFormatted;
        calculatedNumberOfDays = to && isValid(to) ? differenceInCalendarDays(to, from) + 1 : 1;
      } else {
        throw new Error('Ungültiges Datum ausgewählt. Bitte versuchen Sie es erneut.');
      }

      const hourlyRateNum = parseFloat(String(selectedProvider.hourlyRate || '0'));
      const hoursInput = parseDurationStringToHours(durationString);

      if (isNaN(hourlyRateNum) || hourlyRateNum <= 0 || !hoursInput || hoursInput <= 0) {
        throw new Error('Stundensatz oder Dauer sind ungültig.');
      }

      // NEUES DEBUGGING FÜR BERECHNUNG

      const totalHours = currentBookingChars.isDurationPerDay
        ? hoursInput * calculatedNumberOfDays
        : hoursInput;

      // ENDE DEBUGGING FÜR BERECHNUNG

      const servicePrice = totalHours * hourlyRateNum;
      const servicePriceInCents = Math.round(servicePrice * 100);
      // KORREKTUR: Die Servicegebühr wird jetzt serverseitig vom Anbieterguthaben abgezogen.
      // Der Kunde zahlt nur den reinen Auftragswert. Der Gesamtbetrag ist identisch mit dem Dienstleistungspreis.
      const totalPriceInCents = servicePriceInCents;

      // NEU: Client-seitige Validierung des Endpreises (Basispreis für den Draft)
      if (totalPriceInCents <= 0) {
        throw new Error(
          'Der berechnete Auftragswert muss positiv sein. Bitte überprüfen Sie Dauer und Stundensatz des Anbieters.'
        );
      }

      // Zusätzliche Prüfung für den reinen Dienstleistungspreis, der als Basispreis für den Draft dient
      if (servicePriceInCents <= 0) {
        throw new Error(
          'Der reine Dienstleistungspreis muss positiv sein. Überprüfen Sie Stundensatz und Dauer.'
        );
      }

      const rawFinalAddress =
        useSavedAddress === 'new'
          ? newAddressDetails
          : userProfile.savedAddresses?.find(a => a.id === useSavedAddress);

      if (
        !rawFinalAddress ||
        !rawFinalAddress.postal_code ||
        !rawFinalAddress.name?.trim() ||
        !rawFinalAddress.line1?.trim() ||
        !rawFinalAddress.city?.trim() ||
        !rawFinalAddress.country?.trim()
      ) {
        throw new Error('Adresse unvollständig. Bitte alle Adressfelder ausfüllen.');
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
        name:
          [
            `${userProfile.firstname || ''} ${userProfile.lastname || ''}`.trim(),
            typeof userProfile.companyName === 'string' ? userProfile.companyName.trim() : null,
            typeof currentUser.displayName === 'string' ? currentUser.displayName.trim() : null,
          ].find(n => n && n.length > 0) || 'Unbekannter Name',
        email: currentUser.email || userProfile.email || '',
        phone:
          [
            typeof userProfile.phoneNumber === 'string' ? userProfile.phoneNumber : null,
            typeof userProfile.companyPhoneNumber === 'string'
              ? userProfile.companyPhoneNumber
              : null,
          ].find(p => p && p.length > 0) || undefined,
        address: {
          line1: finalAddress.line1,
          line2: finalAddress.line2 || undefined, // Stelle sicher, dass line2 undefined ist, wenn leer
          city: finalAddress.city,
          postal_code: finalAddress.postal_code,
          country: finalAddress.country,
        },
      };

      const newTempJobDraftId = crypto.randomUUID();
      setFinalOrderData(orderDetailsForBackend); // FinalOrderData hier aktualisieren

      const tempDraftToSave = {
        ...orderDetailsForBackend,
        providerName: selectedProvider.companyName,
        providerId: selectedProvider.id,
        status: 'initial_draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'temporaryJobDrafts', newTempJobDraftId), tempDraftToSave);

      // Escrow-Eintrag erstellen
      const response = await fetch('/api/payment/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPriceInCents,
          currency: 'eur',
          providerId: selectedProvider.id,
          customerId: currentUser.uid,
          taskId: newTempJobDraftId,
          orderDetails: orderDetailsForBackend,
          billingDetails: billingDetailsForApi,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(
          data.error?.message || 'Fehler bei der Kommunikation mit dem Zahlungsserver.'
        );
      }

      setFinalTotalPriceInCents(totalPriceInCents);
      setCurrentStep('payment');
    } catch (err: unknown) {
      let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay - transparent ohne blur */}
      <div 
        className="fixed inset-0 transition-opacity duration-300"
        style={{ zIndex: 9998, top: '180px' }}
        onClick={onClose}
      />
      
      {/* Slide-In Panel von rechts - unter dem Header */}
      <div 
        className="fixed right-0 bg-white shadow-2xl flex flex-col animate-slide-in-right"
        style={{ 
          zIndex: 9999, 
          width: '50vw', 
          minWidth: '420px', 
          maxWidth: '800px',
          top: '180px',
          height: 'calc(100vh - 180px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - sticky */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#14ad9f] to-teal-600">
          <div>
            <h3 className="text-xl font-bold text-white">Neuen Auftrag erstellen</h3>
            <p className="text-white/80 text-sm">Finden Sie den perfekten Tasker für Ihr Projekt</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm mb-6 flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
            {error}
          </div>
        )}

        {currentStep === 'details' && (
          <div className="space-y-8">
            {/* Auftragsbeschreibung als erstes */}
            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">
                  1
                </div>
                <h4 className="text-xl font-semibold text-gray-800">
                  Beschreiben Sie Ihren Auftrag
                </h4>
              </div>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Auftragsbeschreibung *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Beschreiben Sie hier detailliert, was genau gemacht werden soll..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-colors min-h-[120px] resize-none"
                  />
                </div>
                
                {/* Taskilo KI Verbesserung */}
                <OrderAiEnhancer
                  description={description}
                  onDescriptionChange={setDescription}
                  category={selectedCategory}
                  subcategory={selectedSubcategory}
                  firebaseUser={currentUser}
                  userId={currentUser.uid}
                />
              </div>
            </div>

            {/* Kategorie-Auswahl nur wenn Beschreibung vorhanden */}
            {description.trim().length > 0 && (
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">
                    2
                  </div>
                  <h4 className="text-xl font-semibold text-gray-800">Was soll erledigt werden?</h4>
                </div>
                <div className="space-y-6">
                  <div>
                    <Label
                      htmlFor="category"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                    >
                      Hauptkategorie *
                    </Label>
                    <SimpleSelect
                      id="category"
                      options={categories.map(c => c.title)}
                      placeholder="Bitte wählen..."
                      value={selectedCategory || ''}
                      onChange={e => {
                        setSelectedCategory(e.target.value);
                        setSelectedSubcategory(null);
                        setSelectedProvider(null);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-colors"
                    />
                  </div>
                  {selectedCategory && (
                    <div>
                      <Label
                        htmlFor="subcategory"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Unterkategorie *
                      </Label>
                      <SimpleSelect
                        id="subcategory"
                        options={availableSubcategories}
                        placeholder="Bitte wählen..."
                        value={selectedSubcategory || ''}
                        onChange={e => {
                          setSelectedSubcategory(e.target.value);
                          setSelectedProvider(null);
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NEU: Marketplace-Toggle nach Kategorie-Auswahl */}
            {selectedSubcategory && description.trim().length > 0 && (
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">
                    3
                  </div>
                  <h4 className="text-xl font-semibold text-gray-800">Wie möchten Sie vorgehen?</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Tasker direkt wählen */}
                  <button
                    type="button"
                    onClick={() => setIsMarketplaceMode(false)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      !isMarketplaceMode
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        !isMarketplaceMode ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <span className={`font-semibold ${!isMarketplaceMode ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
                        Tasker direkt auswählen
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Wählen Sie einen verfügbaren Dienstleister in Ihrer Nähe und buchen Sie direkt.
                    </p>
                  </button>

                  {/* Option 2: Im Marktplatz veröffentlichen */}
                  <button
                    type="button"
                    onClick={() => setIsMarketplaceMode(true)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isMarketplaceMode
                        ? 'border-[#14ad9f] bg-[#14ad9f]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isMarketplaceMode ? 'bg-[#14ad9f] text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <span className={`font-semibold ${isMarketplaceMode ? 'text-[#14ad9f]' : 'text-gray-700'}`}>
                        Im Marktplatz veröffentlichen
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-13">
                      Erhalten Sie Angebote von allen registrierten Dienstleistern dieser Kategorie.
                    </p>
                  </button>
                </div>

                {isMarketplaceMode && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">So funktioniert es:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Zahlen Sie eine Veröffentlichungsgebühr von 3,75 EUR</li>
                        <li>Ihr Projekt wird im Marktplatz veröffentlicht</li>
                        <li>Dienstleister senden Ihnen Angebote</li>
                        <li>Bei Annahme eines Angebots zahlen Sie den Auftragsbetrag sicher ins Escrow</li>
                        <li>Danach werden die Kontaktdaten beidseitig freigeschaltet</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direkte Tasker-Auswahl (bestehender Flow) */}
            {selectedSubcategory && description.trim().length > 0 && !isMarketplaceMode && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <OrderAddressSelection
                  userProfile={userProfile}
                  useSavedAddress={useSavedAddress}
                  setUseSavedAddress={setUseSavedAddress}
                  newAddressDetails={newAddressDetails}
                  setNewAddressDetails={setNewAddressDetails}
                  selectedSubcategory={selectedSubcategory}
                  onProviderSelect={setSelectedProvider}
                  onOpenDatePicker={handleOpenDatePicker}
                  preselectedProvider={selectedProvider}
                />
              </div>
            )}

            {/* NEU: Marketplace-Formular */}
            {selectedSubcategory && description.trim().length > 0 && isMarketplaceMode && (
              <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">
                    4
                  </div>
                  <h4 className="text-xl font-semibold text-gray-800">Projektdetails</h4>
                </div>

                <div className="space-y-4">
                  {/* Titel */}
                  <div>
                    <Label htmlFor="marketplace-title" className="text-sm font-medium text-gray-700 mb-2 block">
                      Projekttitel *
                    </Label>
                    <Input
                      id="marketplace-title"
                      placeholder="z.B. Umzugshilfe für 2-Zimmer-Wohnung"
                      value={marketplaceTitle}
                      onChange={(e) => setMarketplaceTitle(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Budget */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Budget (optional)
                    </Label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Min. EUR"
                          value={marketplaceBudgetMin}
                          onChange={(e) => setMarketplaceBudgetMin(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <span className="self-center text-gray-500">bis</span>
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder="Max. EUR"
                          value={marketplaceBudgetMax}
                          onChange={(e) => setMarketplaceBudgetMax(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                    {/* Budget-Typ */}
                    <div className="flex gap-2 mt-2">
                      {[
                        { value: 'fixed', label: 'Festpreis' },
                        { value: 'hourly', label: 'Stundensatz' },
                        { value: 'negotiable', label: 'Verhandelbar' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMarketplaceBudgetType(option.value as 'fixed' | 'hourly' | 'negotiable')}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            marketplaceBudgetType === option.value
                              ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Projektart */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Projektart
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: 'einmalig', label: 'Einmalig' },
                        { value: 'wiederkehrend', label: 'Wiederkehrend' },
                        { value: 'langfristig', label: 'Langfristig' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMarketplaceProjectScope(option.value as 'einmalig' | 'wiederkehrend' | 'langfristig')}
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            marketplaceProjectScope === option.value
                              ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dringlichkeit */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Dringlichkeit
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: 'low', label: 'Niedrig' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'high', label: 'Hoch' },
                        { value: 'urgent', label: 'Dringend' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMarketplaceUrgency(option.value as 'low' | 'normal' | 'high' | 'urgent')}
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            marketplaceUrgency === option.value
                              ? option.value === 'urgent' 
                                ? 'bg-red-500 text-white border-red-500'
                                : option.value === 'high'
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-[#14ad9f] text-white border-[#14ad9f]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zeitrahmen */}
                  <div>
                    <Label htmlFor="marketplace-timeline" className="text-sm font-medium text-gray-700 mb-2 block">
                      Gewünschter Zeitrahmen (optional)
                    </Label>
                    <Input
                      id="marketplace-timeline"
                      placeholder="z.B. Innerhalb der nächsten 2 Wochen"
                      value={marketplaceTimeline}
                      onChange={(e) => setMarketplaceTimeline(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Standort + Remote Option */}
                  <div>
                    <Label htmlFor="marketplace-location" className="text-sm font-medium text-gray-700 mb-2 block">
                      Standort
                    </Label>
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <Input
                          id="marketplace-location"
                          placeholder="z.B. 10115 Berlin"
                          value={marketplaceLocation}
                          onChange={(e) => setMarketplaceLocation(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                        <Switch
                          checked={marketplaceIsRemote}
                          onCheckedChange={setMarketplaceIsRemote}
                        />
                        <span className="text-sm text-gray-700">Remote möglich</span>
                      </label>
                    </div>
                    {userProfile.savedAddresses && userProfile.savedAddresses.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Oder wählen Sie eine gespeicherte Adresse (wird automatisch verwendet)
                      </p>
                    )}
                  </div>

                  {/* Arbeitszeiten */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Bevorzugte Arbeitszeiten
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: 'werktags', label: 'Werktags' },
                        { value: 'wochenende', label: 'Wochenende' },
                        { value: 'abends', label: 'Abends' },
                        { value: 'flexibel', label: 'Flexibel' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMarketplaceWorkingHours(option.value as 'werktags' | 'wochenende' | 'abends' | 'flexibel')}
                          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                            marketplaceWorkingHours === option.value
                              ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vor-Ort Besichtigung & Kontaktpräferenz */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Vor-Ort Besichtigung möglich?
                      </Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMarketplaceSiteVisit(true)}
                          className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${
                            marketplaceSiteVisit
                              ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                          }`}
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarketplaceSiteVisit(false)}
                          className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${
                            !marketplaceSiteVisit
                              ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                          }`}
                        >
                          Nein
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Bevorzugter Kontakt
                      </Label>
                      <div className="flex gap-2">
                        {[
                          { value: 'email', label: 'E-Mail' },
                          { value: 'telefon', label: 'Telefon' },
                          { value: 'chat', label: 'Chat' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMarketplaceContactPreference(option.value as 'telefon' | 'email' | 'chat')}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                              marketplaceContactPreference === option.value
                                ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-[#14ad9f]'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Benötigte Qualifikationen */}
                  <div>
                    <Label htmlFor="marketplace-qualifications" className="text-sm font-medium text-gray-700 mb-2 block">
                      Benötigte Qualifikationen (optional)
                    </Label>
                    <Input
                      id="marketplace-qualifications"
                      placeholder="z.B. Meisterbrief, DATEV-Kenntnisse, Führerschein (kommagetrennt)"
                      value={marketplaceQualifications}
                      onChange={(e) => setMarketplaceQualifications(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mehrere Qualifikationen mit Komma trennen
                    </p>
                  </div>
                </div>

                {/* Submit Button für Marketplace */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Veröffentlichungsgebühr:</span>
                      <span className="font-semibold text-gray-900">3,75 EUR</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Einmalige Gebühr für die Veröffentlichung im Marktplatz
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleMarketplaceSubmit}
                    disabled={loading || !marketplaceTitle.trim()}
                    className="w-full bg-[#14ad9f] hover:bg-[#129488] text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Wird verarbeitet...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Globe className="w-5 h-5" />
                        Veröffentlichen (3,75 EUR)
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'payment' && finalOrderData && (
          <div className="space-y-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">
                3
              </div>
              <h4 className="text-xl font-semibold text-gray-800">Zahlung abschließen</h4>
            </div>

            <div className="bg-linear-to-r from-[#14ad9f]/5 to-teal-50 p-6 border border-[#14ad9f]/20 rounded-xl">
              <h5 className="font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-2 h-2 bg-[#14ad9f] rounded-full mr-3"></div>
                Auftragsübersicht
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm space-y-2 md:space-y-0">
                <div>
                  <span className="font-medium text-gray-600">Anbieter:</span>
                  <p className="text-gray-900">{selectedProvider?.companyName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Service:</span>
                  <p className="text-gray-900">{finalOrderData.selectedSubcategory}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Datum:</span>
                  <p className="text-gray-900">
                    {format(new Date(finalOrderData.jobDateFrom), 'PPP', { locale: de })}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Dauer:</span>
                  <p className="text-gray-900">{finalOrderData.jobDurationString}</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#14ad9f]/20">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-800">Gesamtpreis:</span>
                  <span className="text-2xl font-bold text-[#14ad9f]">
                    €{(finalOrderData.totalPriceInCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
              <PaymentSection
                userProfile={userProfile}
                useSavedPaymentMethod={useSavedPaymentMethod}
                setUseSavedPaymentMethod={setUseSavedPaymentMethod}
                clientSecret={null}
                isPaymentIntentLoading={loading}
                handleCheckoutFormProcessing={isProcessing => setLoading(isProcessing)}
                handleCheckoutFormError={handlePaymentError}
                handleCheckoutFormSuccess={handlePaymentSuccess}
                loading={loading}
                totalPriceInCents={finalTotalPriceInCents}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                fullOrderDetails={finalOrderData}
              />
            </div>

            <div className="flex justify-start pt-6 border-t border-gray-200">
              <Button
                type="button"
                onClick={() => {
                  setError(null);
                  setCurrentStep('details');
                }}
                variant="outline"
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Zurück
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="text-center py-16 px-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="text-4xl text-green-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">Auftrag erfolgreich erstellt!</h4>
            <p className="text-gray-600 mb-2">Ihr Auftrag wurde erfolgreich übermittelt.</p>
            <p className="text-sm text-gray-500">
              Das Modal wird in Kürze automatisch geschlossen.
            </p>

            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details zu Ihrem Auftrag.
              </p>
            </div>
          </div>
        )}

        {/* NEU: Marketplace Success Step */}
        {currentStep === 'marketplace-success' && (
          <div className="text-center py-16 px-8">
            <div className="w-20 h-20 bg-[#14ad9f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="text-4xl text-[#14ad9f]" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">Projekt veröffentlicht!</h4>
            <p className="text-gray-600 mb-2">
              Ihr Projekt ist jetzt im Marktplatz für alle registrierten Dienstleister sichtbar.
            </p>
            <p className="text-sm text-gray-500">
              Sie werden zur Projektübersicht weitergeleitet...
            </p>

            <div className="mt-8 p-4 bg-[#14ad9f]/5 border border-[#14ad9f]/20 rounded-lg">
              <p className="text-sm text-[#14ad9f]">
                Dienstleister können jetzt Angebote für Ihr Projekt abgeben. 
                Sie werden per E-Mail benachrichtigt, sobald ein Angebot eingeht.
              </p>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                Kontaktdaten werden erst nach Annahme und Zahlung der Vermittlungsgebühr (3,75 EUR) freigeschaltet.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      <DateTimeSelectionPopup
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onConfirm={handleDateTimeConfirm}
        bookingSubcategory={selectedSubcategory}
        providerId={selectedProvider?.id}
        contextCompany={selectedProvider}
      />
    </>
  );
};
export default CreateOrderModal;
