// /Users/andystaudinger/Tasko/src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/page.tsx
'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { FiLoader, FiAlertCircle, FiMapPin, FiCreditCard } from 'react-icons/fi';
import BestaetigungsContent from './components/BestaetigungsContent';
import { StripeCardCheckout } from '@/components/CheckoutForm';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFunctions, httpsCallable, Functions, FunctionsError } from 'firebase/functions';
import { app } from '@/firebase/clients';
import { useRegistration } from '@/contexts/Registration-Context';
import { PAGE_LOG, PAGE_ERROR, PAGE_WARN } from '@/lib/constants';
import Stripe from 'stripe';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement } from '@stripe/react-stripe-js';


// HIER WIRD DER STRIPE PUBLISHABLE KEY AKTUALISIERT
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RXvRUD5Lvjon30aMzieGY1n513cwTd8wUGf6cmYphSWfdTpsjMzieGY1n513cwTd8wUGf6cmYphSWfdTpsjMzieGY1n513cwTd8wUGf6cmYphSWfdTpsK00N3Rtf7Dk');

const auth = getAuth(app);
const functionsInstance: Functions = getFunctions(app);

// --- INTERFACE DEFINITIONEN ---
interface TemporaryJobDraftData {
  customerType: 'private' | 'business' | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  description: string;
  jobStreet?: string;
  jobPostalCode?: string;
  jobCity?: string;
  jobCountry?: string | null;
  jobDateFrom?: string | null;
  jobDateTo?: string | null;
  jobTimePreference?: string | null;
  selectedAnbieterId?: string | null;
  jobDurationString?: string;
  jobTotalCalculatedHours?: number | null;
  jobCalculatedPriceInCents?: number | null;
  tempDraftId?: string;
}

interface TemporaryJobDraftResult {
  tempDraftId: string;
  anbieterStripeAccountId?: string;
}

interface GetOrCreateStripeCustomerResult {
  stripeCustomerId: string;
}

interface CustomerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  postal_code?: string;
  state?: string;
  country?: string;
}

interface BillingDetailsPayload {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postal_code?: string | null;
    state?: string | null;
    country?: string | null;
  };
}


interface BestaetigungsContentPropsForPage {
  anbieterId: string;
  unterkategorie: string;
  postalCodeJob: string;
  initialJobDateFrom?: string | null;
  initialJobDateTo?: string | null;
  initialJobTime?: string | null;
  initialJobDescription?: string;
  initialJobDurationString?: string;
  onPriceCalculated: (finalPriceInCents: number) => void;
  onDetailsChange?: () => void;
}
// --- ENDE DER INTERFACE DEFINITIONEN ---


export default function BestaetigungsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathParams = useParams();
  const registration = useRegistration();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [kundeStripeCustomerId, setKundeStripeCustomerId] = useState<string | null>(null);
  const [tempJobDraftId, setTempJobDraftId] = useState<string | null>(null);
  const [anbieterStripeConnectId, setAnbieterStripeConnectId] = useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPaymentIntent, setLoadingPaymentIntent] = useState(false);
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);

  const [finalTaskAmountInCents, setFinalTaskAmountInCents] = useState<number | null>(null);
  const [platformFeeForStripe, setPlatformFeeForStripe] = useState<number | null>(null);

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const [billingAddressDetails, setBillingAddressDetails] = useState<BillingDetailsPayload | null>(null);


  const anbieterIdFromUrl = useMemo(() => searchParams?.get('anbieterId') ?? '', [searchParams]);
  const unterkategorieAusPfad = useMemo(() => typeof pathParams?.unterkategorie === 'string' ? decodeURIComponent(pathParams.unterkategorie as string) : '', [pathParams]);
  const postalCodeFromUrl = useMemo(() => searchParams?.get('postalCode') ?? '', [searchParams]);
  const dateFromUrl = useMemo(() => searchParams?.get('dateFrom') ?? '', [searchParams]);
  const timeUrl = useMemo(() => searchParams?.get('time') ?? '', [searchParams]);
  const auftragsDauerUrl = useMemo(() => searchParams?.get('auftragsDauer') ?? '', [searchParams]);
  const priceFromUrl = useMemo(() => {
    const priceString = searchParams?.get('price');
    return priceString ? Math.round(parseFloat(priceString) * 100) : null;
  }, [searchParams]);
  const tempDraftIdFromUrl = useMemo(() => searchParams?.get('tempDraftId') ?? '', [searchParams]);
  const descriptionFromUrl = useMemo(() => searchParams?.get('description') ?? '', [searchParams]);

  const isInitializing = useRef(false);

  const handlePriceCalculatedFromChild = useCallback((priceInCents: number) => {
    console.log(PAGE_LOG, `handlePriceCalculatedFromChild: Neuer Preis von Kindkomponente: ${priceInCents} Cents.`);

    if (finalTaskAmountInCents !== priceInCents) {
      setFinalTaskAmountInCents(priceInCents);
      setClientSecret(null);
      setPaymentIntentError(null);
      console.log(PAGE_LOG, "finalTaskAmountInCents aktualisiert. clientSecret auf null gesetzt.");
    }

    if (priceInCents > 0) {
      const calculatedFee = Math.round(priceInCents * 0.10);
      if (platformFeeForStripe !== calculatedFee) {
        setPlatformFeeForStripe(calculatedFee);
        console.log(PAGE_LOG, "platformFeeForStripe aktualisiert.");
      }
    } else {
      if (platformFeeForStripe !== null) {
        setPlatformFeeForStripe(null);
        console.log(PAGE_LOG, "platformFeeForStripe auf null gesetzt.");
      }
    }

    if (registration.jobCalculatedPriceInCents !== priceInCents && registration.setJobCalculatedPriceInCents) {
      registration.setJobCalculatedPriceInCents(priceInCents);
      console.log(PAGE_LOG, "registration.jobCalculatedPriceInCents im Context aktualisiert.");
    }
  }, [finalTaskAmountInCents, platformFeeForStripe, registration.jobCalculatedPriceInCents, registration.setJobCalculatedPriceInCents]);


  const handleDetailsChangeFromChild = useCallback(() => {
    console.log(PAGE_LOG, "BestaetigungsPage: onDetailsChange von Kindkomponente empfangen.");
  }, []);

  // =================================================================================================
  // ERSTER useEffect-HOOK: Authentifizierung, Draft-Erstellung, Stripe Customer ID
  // Hier werden auch die Rechnungsadressdetails aus dem Registration-Context gesammelt
  // =================================================================================================
  useEffect(() => {
    console.log(PAGE_LOG, "BestaetigungsPage: Erster useEffect WIRD AUSGEFÜHRT.");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(PAGE_LOG, "BestaetigungsPage: onAuthStateChanged-Callback, User:", user?.uid);
      if (user) {
        setCurrentUser(user);

        if (isInitializing.current) {
          console.log(PAGE_LOG, "BestaetigungsPage: Initialisierung bereits im Gange oder abgeschlossen. Überspringe.");
          setIsLoadingPageData(false);
          return;
        }
        isInitializing.current = true;

        console.log(PAGE_LOG, `BestaetigungsPage: User ${user.uid} authentifiziert. Starte einmalige Initialisierung.`);
        setIsLoadingPageData(true);
        setPageError(null);

        // --- Datenquelle für DraftData (Priorität: Context > URL-Parameter > Fallbacks) ---
        const customerTypeToUse = registration.customerType || null;
        const selectedCategoryToUse = registration.selectedCategory || null;
        const selectedSubcategoryToUse = registration.selectedSubcategory || unterkategorieAusPfad || null;
        const descriptionToUse = registration.description || descriptionFromUrl || '';
        const jobStreetToUse = registration.jobStreet || undefined;
        const jobPostalCodeToUse = registration.jobPostalCode || postalCodeFromUrl || undefined;
        const jobCityToUse = registration.jobCity || undefined;
        const jobCountryToUse = registration.jobCountry || undefined;
        const jobDateFromToUse = registration.jobDateFrom || dateFromUrl || null;
        const jobDateToToUse = registration.jobDateTo || null;
        const jobTimePreferenceToUse = registration.jobTimePreference || timeUrl || null;
        const selectedAnbieterIdToUse = registration.selectedAnbieterId || anbieterIdFromUrl || null;
        const jobDurationStringToUse = registration.jobDurationString || auftragsDauerUrl || '';
        const jobTotalCalculatedHoursToUse = registration.jobTotalCalculatedHours || (auftragsDauerUrl ? parseInt(auftragsDauerUrl, 10) : null);
        const jobCalculatedPriceInCentsToUse = registration.jobCalculatedPriceInCents || priceFromUrl || null;

        // NEU: Rechnungsadressdetails aus dem registration-Context sammeln
        const collectedBillingAddressDetails: BillingDetailsPayload | null = (() => {
          const baseAddress: CustomerAddress = {
            line1: undefined, line2: undefined, city: undefined, postal_code: undefined, country: undefined,
          };
          let name: string | undefined = undefined;
          let email: string | undefined = undefined;
          let phone: string | undefined = undefined;

          if (registration.customerType === 'private') {
            if (registration.personalStreet && registration.personalPostalCode && registration.personalCity && registration.personalCountry) {
              baseAddress.line1 = registration.personalStreet + (registration.personalHouseNumber ? ` ${registration.personalHouseNumber}` : '');
              baseAddress.postal_code = registration.personalPostalCode;
              baseAddress.city = registration.personalCity;
              baseAddress.country = registration.personalCountry;
            }
            name = (registration.firstName && registration.lastName) ? `${registration.firstName} ${registration.lastName}` : user.displayName || undefined;
            email = registration.email || user.email || undefined;
            phone = registration.phoneNumber || undefined;
          } else if (registration.customerType === 'business') {
            if (registration.companyStreet && registration.companyPostalCode && registration.companyCity && registration.companyCountry) {
              baseAddress.line1 = registration.companyStreet + (registration.companyHouseNumber ? ` ${registration.companyHouseNumber}` : '');
              baseAddress.postal_code = registration.companyPostalCode;
              baseAddress.city = registration.companyCity;
              baseAddress.country = registration.companyCountry;
            }
            name = registration.companyName || undefined; // Firmenname als Name der Rechnungsadresse
            email = registration.email || user.email || undefined;
            phone = registration.phoneNumber || undefined;
          }

          // Nur zurückgeben, wenn zumindest die Hauptadressfelder vorhanden sind
          if (baseAddress.line1 && baseAddress.postal_code && baseAddress.city && baseAddress.country) {
            return {
              name: name,
              email: email,
              phone: phone,
              address: baseAddress,
            };
          }
          return null; // Wenn Adresse unvollständig
        })();

        // Setze die Billing Address Details in den State
        setBillingAddressDetails(collectedBillingAddressDetails);


        const draftData: TemporaryJobDraftData = {
          customerType: customerTypeToUse,
          selectedCategory: selectedCategoryToUse,
          selectedSubcategory: selectedSubcategoryToUse,
          description: descriptionToUse,
          jobStreet: jobStreetToUse,
          jobPostalCode: jobPostalCodeToUse,
          jobCity: jobCityToUse,
          jobCountry: jobCountryToUse,
          jobDateFrom: jobDateFromToUse,
          jobDateTo: jobDateToToUse,
          jobTimePreference: jobTimePreferenceToUse,
          selectedAnbieterId: selectedAnbieterIdToUse,
          jobDurationString: jobDurationStringToUse,
          jobTotalCalculatedHours: jobTotalCalculatedHoursToUse,
          jobCalculatedPriceInCents: jobCalculatedPriceInCentsToUse,
          tempDraftId: tempDraftIdFromUrl || undefined,
        };

        // FEHLER BEHOBEN: Striktere Typ-Prüfung für jobCalculatedPriceInCents (mit Zwischenvariable)
        if (finalTaskAmountInCents === null && typeof draftData.jobCalculatedPriceInCents === 'number' && draftData.jobCalculatedPriceInCents > 0) {
          setFinalTaskAmountInCents(draftData.jobCalculatedPriceInCents);
          // Zwischenvariable mit expliziter Typ-Assertion, um TypeScript zu beruhigen
          const validatedPrice = draftData.jobCalculatedPriceInCents as number;
          setPlatformFeeForStripe(Math.round(validatedPrice * 0.10));
          console.log(PAGE_LOG, "BestaetigungsPage: Initialer Preis aus draftData gesetzt.");
        } else if (finalTaskAmountInCents === null && (draftData.jobCalculatedPriceInCents == null || draftData.jobCalculatedPriceInCents <= 0)) {
          console.warn(PAGE_WARN, "BestaetigungsPage: jobCalculatedPriceInCents ist ungültig oder 0 aus draftData bei Initialisierung. Preis kann nicht gesetzt werden.");
        }


        // --- KORRIGIERTE PFLICHTDATEN-PRÜFUNG ---
        const missingFields: string[] = [];
        if (!draftData.customerType) missingFields.push('Kundentyp');
        if (!draftData.selectedCategory) missingFields.push('Kategorie');
        if (!draftData.selectedSubcategory) missingFields.push('Unterkategorie');
        if (!draftData.description || draftData.description.trim().length === 0) missingFields.push('Auftragsbeschreibung');
        if (!draftData.jobPostalCode) missingFields.push('Job-Postleitzahl');
        if (!draftData.selectedAnbieterId) missingFields.push('Anbieter-ID');
        if (!draftData.jobDateFrom) missingFields.push('Auftragsstartdatum');
        if (!draftData.jobTimePreference) missingFields.push('Bevorzugte Uhrzeit');
        if (!draftData.jobTotalCalculatedHours || draftData.jobTotalCalculatedHours <= 0) missingFields.push('Berechnete Gesamtdauer (Stunden)');
        if (!draftData.jobCalculatedPriceInCents || draftData.jobCalculatedPriceInCents <= 0) missingFields.push('Berechneter Preis (Cents)');
        // NEU: Rechnungsadresse ist jetzt auch Pflicht für den PaymentIntent
        if (!collectedBillingAddressDetails || !collectedBillingAddressDetails.address?.line1 || !collectedBillingAddressDetails.address?.postal_code || !collectedBillingAddressDetails.address?.city || !collectedBillingAddressDetails.address?.country) {
          missingFields.push('Vollständige Rechnungsadresse');
        }


        if (missingFields.length > 0) {
          console.error(PAGE_ERROR, "BestaetigungsPage: Fehlende Pflichtdaten in draftData!", { missingFields, fullDraftData: draftData });
          setPageError(`Wichtige Auftragsinformationen fehlen: ${missingFields.join(', ')}. Bitte gehen Sie zurück und vervollständigen Sie Ihre Eingaben.`);
          setIsLoadingPageData(false);
          isInitializing.current = false;
          router.push('/auftrag/get-started');
          return;
        }
        // --- ENDE KORRIGIERTE PFLICHTDATEN-PRÜFUNG ---

        try {
          console.log(PAGE_LOG, "BestaetigungsPage: Inhalt von draftData vor dem Senden:", JSON.stringify(draftData, null, 2));

          console.log(PAGE_LOG, "BestaetigungsPage: Rufe createTemporaryJobDraftCallable auf...");
          const createTemporaryJobDraftCallable = httpsCallable<TemporaryJobDraftData, TemporaryJobDraftResult>(functionsInstance, 'createTemporaryJobDraft');
          const draftResult = await createTemporaryJobDraftCallable(draftData);
          setTempJobDraftId(draftResult.data.tempDraftId);
          console.log(PAGE_LOG, `BestaetigungsPage: Temporärer Job-Entwurf erstellt/aktualisiert: ${draftResult.data.tempDraftId}`);

          if (!draftResult.data.anbieterStripeAccountId) {
            console.error(PAGE_ERROR, "BestaetigungsPage: Anbieter Stripe Account ID NICHT vom Backend erhalten!");
            setPageError("Wichtige Zahlungsinformationen des Anbieters fehlen.");
            setIsLoadingPageData(false);
            isInitializing.current = false;
            return;
          }
          setAnbieterStripeConnectId(draftResult.data.anbieterStripeAccountId);
          console.log(PAGE_LOG, "BestaetigungsPage: Anbieter Stripe Account ID erhalten.");

          console.log(PAGE_LOG, `BestaetigungsPage: Rufe getOrCreateStripeCustomer für User ${user.uid} auf...`);
          const getOrCreateStripeCustomerCallable = httpsCallable<Record<string, never>, GetOrCreateStripeCustomerResult>(functionsInstance, 'getOrCreateStripeCustomer');
          const customerResult = await getOrCreateStripeCustomerCallable({});
          setKundeStripeCustomerId(customerResult.data.stripeCustomerId);
          console.log(PAGE_LOG, `BestaetigungsPage: Stripe Customer ID erhalten: ${customerResult.data.stripeCustomerId}`);

        } catch (error: unknown) {
          console.error(PAGE_ERROR, "BestaetigungsPage: FEHLER bei Initialisierung:", error);
          let specificErrorMessage = 'Ein unbekannter Fehler ist bei der Zahlungsvorbereitung aufgetreten.';
          if (error instanceof FunctionsError) {
            specificErrorMessage = `Fehler bei der Zahlungsvorbereitung (${error.code}): ${error.message}`;
          } else if (error instanceof Error) {
            specificErrorMessage = `Fehler bei der Zahlungsvorbereitung: ${error.message}`;
          }
          setPageError(specificErrorMessage);
          isInitializing.current = false;
        } finally {
          setIsLoadingPageData(false);
        }
      } else {
        setCurrentUser(null);
        isInitializing.current = false;
        console.warn(PAGE_WARN, "BestaetigungsPage: Kein Nutzer eingeloggt. Leite zum Login weiter...");
        const currentPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      }
    });

    return () => {
      console.log(PAGE_LOG, "BestaetigungsPage: Cleanup von useEffect und onAuthStateChanged.");
      unsubscribe();
    };
  }, [
    router,
    // Abhängigkeiten aus dem registration-Context (alle weiterhin relevant)
    registration.customerType, registration.selectedCategory, registration.selectedSubcategory,
    registration.description, registration.jobStreet, registration.jobPostalCode, registration.jobCity,
    registration.jobCountry, registration.jobDateFrom, registration.jobDateTo, registration.jobTimePreference,
    registration.selectedAnbieterId, registration.jobDurationString, registration.jobTotalCalculatedHours,
    registration.jobCalculatedPriceInCents,
    // NEU: Hinzugefügte persönliche/Firmen-Details aus dem Registration-Context, die für billingDetails benötigt werden
    registration.personalStreet, registration.personalHouseNumber, registration.personalPostalCode,
    registration.personalCity, registration.personalCountry, registration.phoneNumber, registration.email,
    registration.firstName, registration.lastName,
    registration.companyStreet, registration.companyHouseNumber, registration.companyPostalCode,
    registration.companyCity, registration.companyCountry, registration.companyName, // companyName für BillingDetails name
    // Abhängigkeiten aus URL-Parametern (alle weiterhin relevant)
    anbieterIdFromUrl, unterkategorieAusPfad, postalCodeFromUrl, dateFromUrl, timeUrl, auftragsDauerUrl,
    priceFromUrl, tempDraftIdFromUrl, descriptionFromUrl,
    // Lokale States, die hier gelesen/gesetzt werden
    finalTaskAmountInCents, platformFeeForStripe,
    // billingAddressDetails ist jetzt eine Abhängigkeit, da es im useEffect gesetzt wird
    billingAddressDetails,
  ]);

  // =================================================================================================
  // ZWEITER useEffect-HOOK: Abrufen des clientSecret für Stripe Payments
  // =================================================================================================
  useEffect(() => {
    const fetchStripeClientSecret = async () => {
      if (
        !currentUser || !kundeStripeCustomerId || !tempJobDraftId || !anbieterStripeConnectId ||
        finalTaskAmountInCents === null || finalTaskAmountInCents <= 0 || platformFeeForStripe === null
      ) {
        return;
      }

      // Rechnungsadresse ist jetzt Pflicht für den PaymentIntent
      if (!billingAddressDetails || !billingAddressDetails.address?.line1 || !billingAddressDetails.address?.postal_code || !billingAddressDetails.address?.city || !billingAddressDetails.address?.country) {
        setPaymentIntentError("Bitte stellen Sie eine vollständige Rechnungsadresse bereit.");
        return;
      }

      // Da es sich immer um eine NEUE Karte handelt, muss immer ein neues clientSecret geholt werden.
      if (clientSecret && !loadingPaymentIntent) {
        console.log(PAGE_LOG, "Client Secret ist bereits vorhanden. Kein Neuladen erzwungen.");
        return;
      }

      setLoadingPaymentIntent(true);
      setPaymentIntentError(null);
      setClientSecret(null); // Setze clientSecret auf null, um ein neues zu erzwingen

      try {
        const payload: {
          amount: number;
          currency: string;
          connectedAccountId: string;
          platformFee: number;
          taskId: string;
          firebaseUserId: string;
          stripeCustomerId: string;
          customerName?: string;
          customerEmail?: string;
          billingDetails?: BillingDetailsPayload; // Relevant für neue Karte
        } = {
          amount: finalTaskAmountInCents,
          currency: 'eur',
          connectedAccountId: anbieterStripeConnectId,
          platformFee: platformFeeForStripe,
          taskId: tempJobDraftId,
          firebaseUserId: currentUser.uid,
          stripeCustomerId: kundeStripeCustomerId,
          customerName: currentUser.displayName || `${registration.firstName || ''} ${registration.lastName || ''}`,
          customerEmail: currentUser.email || registration.email,
          billingDetails: billingAddressDetails, // Hier den gesammelten State übergeben
        };

        console.log(PAGE_LOG, "BestaetigungsPage: Sende Payload an /api/create-payment-intent:", JSON.stringify(payload, null, 2));

        const idToken = await currentUser.getIdToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` };
        const serverResponse = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
        });
        const responseData = await serverResponse.json();
        const { clientSecret: fetchedClientSecret, error: backendError } = responseData;
        if (!serverResponse.ok || backendError || !fetchedClientSecret) {
          const displayErrorMessage = typeof backendError === 'string' ? backendError : (responseData?.error?.message || 'Fehler: Client Secret nicht vom Server erhalten.');
          throw new Error(displayErrorMessage);
        }
        setClientSecret(fetchedClientSecret);
        console.log(PAGE_LOG, "BestaetigungsPage: clientSecret erfolgreich abgerufen.");
      } catch (error: unknown) {
        console.error(PAGE_ERROR, "BestaetigungsPage: FEHLER beim Abrufen des clientSecret:", error);
        let errorMessage = 'Fehler beim Laden der Zahlungsdaten.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        setPaymentIntentError(errorMessage);
      } finally {
        setLoadingPaymentIntent(false);
      }
    };

    fetchStripeClientSecret();
  }, [
    kundeStripeCustomerId, tempJobDraftId, currentUser, anbieterStripeConnectId,
    finalTaskAmountInCents, platformFeeForStripe, loadingPaymentIntent, clientSecret,
    // Abhängigkeiten für die Rechnungsadresse
    billingAddressDetails, // Dies ist der wichtigste Auslöser für Änderungen in diesem Hook
    registration.firstName, registration.lastName, registration.email, registration.phoneNumber,
    registration.customerType, registration.personalStreet, registration.personalHouseNumber,
    registration.personalPostalCode, registration.personalCity, registration.personalCountry,
    registration.companyStreet, registration.companyHouseNumber, registration.companyPostalCode,
    registration.companyCity, registration.companyCountry, registration.companyName,
  ]);

  // NEU: Redirection nach erfolgreicher Zahlung
  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log(PAGE_LOG, `BestaetigungsPage: Zahlung erfolgreich: ${paymentIntentId}. Leite zu Dashboard weiter.`);
    setPaymentMessage(`Zahlung erfolgreich! ID: ${paymentIntentId}. Dein Auftrag ${tempJobDraftId || 'unbekannt'} wird bearbeitet.`);
    if (registration.resetRegistrationData) registration.resetRegistrationData();

    // WICHTIG: Weiterleitung zum Dashboard nach erfolgreicher Zahlung und Speicherung
    if (currentUser?.uid) {
      router.push(`/dashboard/user/${currentUser.uid}`);
    } else {
      // Fallback, falls currentUser aus irgendeinem Grund nicht verfügbar ist
      router.push('/dashboard'); // Oder eine generische Erfolgsseite
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error(PAGE_ERROR, `BestaetigungsPage: Zahlungsfehler von StripeCardCheckout: ${errorMessage}`);
    setPaymentMessage(`Fehler bei der Zahlung: ${errorMessage}`);
  };

  const isLoadingOverall = isLoadingPageData || loadingPaymentIntent;

  const dataIsReadyForCheckoutForm =
    clientSecret && kundeStripeCustomerId && tempJobDraftId && currentUser &&
    anbieterStripeConnectId && !paymentIntentError && !pageError &&
    finalTaskAmountInCents !== null && finalTaskAmountInCents > 0 &&
    platformFeeForStripe !== null &&
    // NEU: Überprüfen, ob billingAddressDetails vorhanden und vollständig sind
    billingAddressDetails && billingAddressDetails.address?.line1 && billingAddressDetails.address?.postal_code &&
    billingAddressDetails.address?.city && billingAddressDetails.address?.country;


  const subcategoryForContent = registration.selectedSubcategory || unterkategorieAusPfad;
  const bestaetigungsContentProps: BestaetigungsContentPropsForPage = {
    anbieterId: anbieterIdFromUrl,
    unterkategorie: subcategoryForContent || '',
    postalCodeJob: registration.jobPostalCode || postalCodeFromUrl || '',
    initialJobDateFrom: registration.jobDateFrom,
    initialJobDateTo: registration.jobDateTo,
    initialJobTime: registration.jobTimePreference,
    initialJobDescription: registration.description,
    initialJobDurationString: registration.jobDurationString,
    onPriceCalculated: handlePriceCalculatedFromChild,
    onDetailsChange: handleDetailsChangeFromChild,
  };

  if (isLoadingOverall) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        {isLoadingPageData ? "Seite wird vorbereitet..." : "Zahlung wird initialisiert..."}
      </div>
    );
  }

  if (pageError && !paymentMessage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Ein Fehler ist aufgetreten:</strong>
          <span className="block sm:inline ml-1">{pageError}</span>
        </div>
      </div>
    );
  }

  if (paymentIntentError && !paymentMessage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Zahlungsinitialisierungsfehler:</strong>
          <span className="block sm:inline ml-1">{paymentIntentError}</span>
          <p className="mt-2 text-sm">Bitte versuchen Sie die Seite neu zu laden oder kontaktieren Sie den Support.</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isLoadingOverall) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Weiterleitung zum Login... (oder Nutzer nicht gefunden)
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Seite wird aufgebaut...
      </div>
    }
    >
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-gray-800 mb-8 text-center">Bestätigung und Zahlung</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">

          <div className="w-full order-last lg:order-first">
            {subcategoryForContent ?
              <BestaetigungsContent {...bestaetigungsContentProps} /> :
              <p>Lade Auftragsdetails...</p>
            }
          </div>

          <div className="w-full bg-gray-50 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Sichere Zahlung
            </h2>
            {paymentMessage && (
              <div className={`my-4 p-3 rounded-md text-sm ${paymentMessage.includes('erfolgreich') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center`}>
                {!paymentMessage.includes('erfolgreich') && (paymentMessage.includes('Fehler') || paymentMessage.includes('Problem')) && <FiAlertCircle className="mr-2" />}
                {paymentMessage}
              </div>
            )}

            {/* NEU: Anzeige der Rechnungsadresse */}
            <div className="mb-6 p-4 border rounded-md bg-white">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><FiMapPin className="mr-2" /> Ihre Rechnungsadresse</h3>
              <p className="text-sm text-gray-600 mb-3">Diese Adresse wird für Ihre Rechnung verwendet und bei der ersten Zahlung gespeichert.</p>
              {billingAddressDetails && billingAddressDetails.address?.line1 && billingAddressDetails.address?.postal_code ? (
                <div className="text-gray-800">
                  <p className="font-medium">{billingAddressDetails.name || currentUser?.displayName || `${registration.firstName} ${registration.lastName}`}</p>
                  <p>{billingAddressDetails.address.line1} {billingAddressDetails.address.line2}</p>
                  <p>{billingAddressDetails.address.postal_code} {billingAddressDetails.address.city}</p>
                  <p>{billingAddressDetails.address.country}</p>
                  {billingAddressDetails.email && <p className="text-sm text-gray-600">{billingAddressDetails.email}</p>}
                  {billingAddressDetails.phone && <p className="text-sm text-gray-600">{billingAddressDetails.phone}</p>}
                </div>
              ) : (
                <p className="text-red-500">Rechnungsadresse nicht vollständig. Bitte gehen Sie zurück und vervollständigen Sie Ihre Registrierungsdaten.</p>
              )}
            </div>

            {/* NEU: Eingabe der Zahlungsmethode */}
            <div className="mb-6 p-4 border rounded-md bg-white">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><FiCreditCard className="mr-2" /> Zahlungsmethode</h3>
              <p className="text-sm text-gray-600 mb-3">Geben Sie Ihre Zahlungsinformationen ein. Diese wird für zukünftige Buchungen gespeichert.</p>
              {dataIsReadyForCheckoutForm && clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentElement />
                </Elements>
              ) : (
                !paymentMessage && !paymentIntentError && !pageError && (
                  <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                    <FiLoader className="animate-spin text-3xl text-[#14ad9f] mb-3" />
                    <span>{isLoadingOverall ? 'Zahlungsformular wird geladen...' : 'Daten für Formular fehlen...'}</span>
                  </div>
                )
              )}
            </div>

            {/* Originaler Checkout-Button-Bereich */}
            {dataIsReadyForCheckoutForm && !paymentIntentError && !pageError ? (
              <StripeCardCheckout
                clientSecret={clientSecret!}
                taskAmount={finalTaskAmountInCents!}
                taskCurrency="eur"
                taskerStripeAccountId={anbieterStripeConnectId!}
                platformFeeAmount={platformFeeForStripe!}
                customerName={currentUser!.displayName || `${registration.firstName} ${registration.lastName}` || 'Kunde'}
                customerEmail={currentUser!.email || registration.email || ''}
                firebaseUserId={currentUser!.uid}
                stripeCustomerId={kundeStripeCustomerId!}
                taskId={tempJobDraftId!}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            ) : (
              !paymentMessage && !paymentIntentError && !pageError && (
                <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                  {isLoadingOverall ? (
                    <>
                      <FiLoader className="animate-spin text-3xl text-[#14ad9f] mb-3" />
                      <span>Zahlungsoptionen werden vorbereitet...</span>
                    </>
                  ) : (
                    <span>Wichtige Informationen für die Zahlung fehlen. Bitte überprüfen Sie die vorherigen Schritte.</span>
                  )}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 text-xs text-left bg-gray-100 p-2 rounded">
                      <p className="font-semibold">Debug-Info (Bedingung für Zahlungsformular nicht erfüllt):</p>
                      <p>clientSecret: {String(!!clientSecret)}</p>
                      <p>kundeStripeCustomerId: {String(kundeStripeCustomerId)}</p>
                      <p>tempJobDraftId: {String(tempJobDraftId)}</p>
                      <p>currentUser: {String(!!currentUser)}</p>
                      <p>anbieterStripeConnectId: {String(anbieterStripeConnectId)}</p>
                      <p>pageError: {String(pageError)}</p>
                      <p>paymentIntentError: {String(paymentIntentError)}</p>
                      <p>finalTaskAmountInCents: {String(finalTaskAmountInCents)}</p>
                      <p>platformFeeForStripe: {String(platformFeeForStripe)}</p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
}