'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import BestaetigungsContent from './components/BestaetigungsContent';
import { StripeCardCheckout } from '@/components/CheckoutForm';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFunctions, httpsCallable, Functions, FunctionsError } from 'firebase/functions';
import { app } from '@/firebase/clients';
import { useRegistration } from '@/contexts/Registration-Context';
import { PAGE_LOG, PAGE_ERROR, PAGE_WARN } from '@/lib/constants';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE');

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
}

interface TemporaryJobDraftResult {
  tempDraftId: string;
  anbieterStripeAccountId?: string;
}

interface GetOrCreateStripeCustomerResult {
  stripeCustomerId: string;
}

// NEU: Interface für die Kundenadresse, um Typsicherheit zu gewährleisten
interface CustomerAddress {
  line1?: string;
  line2?: string; // Optional, falls du eine zweite Adresszeile hast
  city?: string;
  postal_code?: string;
  state?: string; // Optional, für Bundesland/Staat
  country?: string; // ISO 3166-1 alpha-2 code (z.B. "DE")
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

  const initialPriceFromContext = registration.jobCalculatedPriceInCents;
  const [finalTaskAmountInCents, setFinalTaskAmountInCents] = useState<number | null>(
    initialPriceFromContext === undefined ? null : initialPriceFromContext
  );

  const [platformFeeForStripe, setPlatformFeeForStripe] = useState<number | null>(
    (initialPriceFromContext && initialPriceFromContext > 0) ? Math.round(initialPriceFromContext * 0.10) : null
  );

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const anbieterIdFromUrl = useMemo(() => searchParams?.get('anbieterId') ?? '', [searchParams]);
  const unterkategorieAusPfad = useMemo(() => typeof pathParams?.unterkategorie === 'string' ? decodeURIComponent(pathParams.unterkategorie as string) : '', [pathParams]);
  const postalCodeFromUrl = useMemo(() => searchParams?.get('postalCode') ?? '', [searchParams]);

  // useRef, um die Initialisierung zu verfolgen. Dies ist der Schlüssel zur Lösung.
  const isInitializing = useRef(false);

  // =================================================================================================
  // ERSTER useEffect-HOOK: Authentifizierung, Draft-Erstellung, Stripe Customer ID
  // =================================================================================================
  useEffect(() => {
    console.log(PAGE_LOG, "BestaetigungsPage: Erster useEffect WIRD AUSGEFÜHRT.");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(PAGE_LOG, "BestaetigungsPage: onAuthStateChanged-Callback, User:", user?.uid);
      if (user) {
        setCurrentUser(user);

        // Robuste Guard Clause: Wenn der Initialisierungsprozess bereits läuft oder abgeschlossen ist, sofort abbrechen.
        if (isInitializing.current) {
          console.log(PAGE_LOG, "BestaetigungsPage: Initialisierung bereits im Gange oder abgeschlossen. Überspringe.");
          setIsLoadingPageData(false); // Ladeanzeige ausblenden, falls sie noch aktiv war
          return;
        }
        // Das Flag SOFORT setzen, um doppelte Ausführungen (z.B. durch React Strict Mode) zu verhindern.
        isInitializing.current = true;

        console.log(PAGE_LOG, `BestaetigungsPage: User ${user.uid} authentifiziert. Starte einmalige Initialisierung.`);
        setIsLoadingPageData(true);
        setPageError(null);

        const {
          customerType, selectedCategory, selectedSubcategory, description,
          jobStreet, jobPostalCode, jobCity, jobCountry,
          jobDateFrom, jobDateTo, jobTimePreference,
          selectedAnbieterId, jobDurationString, jobTotalCalculatedHours,
          jobCalculatedPriceInCents
        } = registration;

        const priceCtx = jobCalculatedPriceInCents;
        if (priceCtx !== null && priceCtx !== undefined && priceCtx > 0) {
          if (finalTaskAmountInCents === null || finalTaskAmountInCents === 0) setFinalTaskAmountInCents(priceCtx);
          if (platformFeeForStripe === null) setPlatformFeeForStripe(Math.round(priceCtx * 0.10));
        } else {
          console.warn(PAGE_WARN, "BestaetigungsPage: jobCalculatedPriceInCents ist ungültig aus dem Context.");
        }

        const anbieterFirebaseUid = selectedAnbieterId || anbieterIdFromUrl;
        if (!anbieterFirebaseUid) {
          console.error(PAGE_ERROR, "BestaetigungsPage: Anbieter-ID (Firebase UID) fehlt.");
          setPageError("Fehler: Anbieter-ID fehlt für die Auftragserstellung.");
          setIsLoadingPageData(false);
          isInitializing.current = false; // Zurücksetzen bei Fehler
          return;
        }

        try {
          const draftData: TemporaryJobDraftData = {
            customerType, selectedCategory,
            selectedSubcategory: selectedSubcategory || unterkategorieAusPfad,
            description, jobStreet,
            jobPostalCode: jobPostalCode || postalCodeFromUrl,
            jobCity, jobCountry,
            jobDateFrom, jobDateTo, jobTimePreference,
            selectedAnbieterId: anbieterFirebaseUid,
            jobDurationString, jobTotalCalculatedHours, jobCalculatedPriceInCents,
          };

          console.log(PAGE_LOG, "BestaetigungsPage: Inhalt von draftData vor dem Senden:", JSON.stringify(draftData, null, 2));

          if (!draftData.customerType || !draftData.selectedCategory || !draftData.selectedSubcategory || !draftData.jobPostalCode || !draftData.selectedAnbieterId) {
            console.error(PAGE_ERROR, "BestaetigungsPage: Fehlende Pflichtdaten in draftData!", draftData);
            setPageError("Wichtige Auftragsinformationen fehlen. Bitte überprüfen Sie Ihre Eingaben.");
            setIsLoadingPageData(false);
            isInitializing.current = false; // Zurücksetzen bei Fehler
            return;
          }

          console.log(PAGE_LOG, "BestaetigungsPage: Rufe createTemporaryJobDraftCallable auf...");
          const createTemporaryJobDraftCallable = httpsCallable<TemporaryJobDraftData, TemporaryJobDraftResult>(functionsInstance, 'createTemporaryJobDraft');
          const draftResult = await createTemporaryJobDraftCallable(draftData);
          setTempJobDraftId(draftResult.data.tempDraftId);
          console.log(PAGE_LOG, `BestaetigungsPage: Temporärer Job-Entwurf erstellt: ${draftResult.data.tempDraftId}`);

          if (!draftResult.data.anbieterStripeAccountId) {
            console.error(PAGE_ERROR, "BestaetigungsPage: Anbieter Stripe Account ID NICHT vom Backend erhalten!");
            setPageError("Wichtige Zahlungsinformationen des Anbieters fehlen.");
            setIsLoadingPageData(false);
            isInitializing.current = false; // Zurücksetzen bei Fehler
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
          isInitializing.current = false; // Zurücksetzen bei Fehler
        } finally {
          setIsLoadingPageData(false);
        }
      } else {
        setCurrentUser(null);
        isInitializing.current = false; // Zurücksetzen, wenn User sich ausloggt/nicht gefunden wird
        console.warn(PAGE_WARN, "BestaetigungsPage: Kein Nutzer eingeloggt. Leite zum Login weiter...");
        const currentPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      }
    });

    return () => {
      console.log(PAGE_LOG, "BestaetigungsPage: Cleanup von useEffect und onAuthStateChanged.");
      unsubscribe();
    };
    // Bereinigtes Dependency Array: Die States, die im Hook gesetzt werden, sind keine Abhängigkeiten mehr.
  }, [
    router,
    registration, // Der gesamte registration-Kontext ist eine Abhängigkeit, da seine Daten hier gelesen werden
    anbieterIdFromUrl,
    unterkategorieAusPfad,
    postalCodeFromUrl,
    finalTaskAmountInCents,
    platformFeeForStripe,
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
      if (clientSecret && !loadingPaymentIntent) return;

      setLoadingPaymentIntent(true);
      setPaymentIntentError(null);

      try {
        // Kundenadresse aus dem registration Kontext extrahieren
        // Prüfe, ob es sich um einen privaten oder geschäftlichen Kunden handelt,
        // und nimm die entsprechende Adresse.
        let customerAddressToUse: CustomerAddress | undefined;

        if (registration.customerType === 'private' && registration.personalStreet && registration.personalPostalCode && registration.personalCity && registration.personalCountry) {
          customerAddressToUse = {
            line1: registration.personalStreet + (registration.personalHouseNumber ? ` ${registration.personalHouseNumber}` : ''), // Straße + Hausnummer
            postal_code: registration.personalPostalCode,
            city: registration.personalCity,
            country: registration.personalCountry, // ISO-Code wie "DE"
            // line2, state/province könnten hier auch hinzugefügt werden, wenn vorhanden
          };
        } else if (registration.customerType === 'business' && registration.companyStreet && registration.companyPostalCode && registration.companyCity && registration.companyCountry) {
          customerAddressToUse = {
            line1: registration.companyStreet + (registration.companyHouseNumber ? ` ${registration.companyHouseNumber}` : ''), // Straße + Hausnummer
            postal_code: registration.companyPostalCode,
            city: registration.companyCity,
            country: registration.companyCountry, // ISO-Code wie "DE"
            // line2, state/province könnten hier auch hinzugefügt werden, wenn vorhanden
          };
        }

        // Optional: Überprüfe, ob die Adresse gültig ist, bevor du sie sendest
        if (customerAddressToUse && (!customerAddressToUse.line1 || !customerAddressToUse.postal_code || !customerAddressToUse.city || !customerAddressToUse.country)) {
          console.warn(PAGE_WARN, "BestaetigungsPage: Unvollständige Kundenadresse für Steuerberechnung. Wird nicht gesendet.");
          customerAddressToUse = undefined; // Sende keine unvollständige Adresse
        }


        const payload = {
          amount: finalTaskAmountInCents,
          currency: 'eur',
          connectedAccountId: anbieterStripeConnectId,
          platformFee: platformFeeForStripe,
          taskId: tempJobDraftId,
          firebaseUserId: currentUser.uid,
          stripeCustomerId: kundeStripeCustomerId,
          customerName: currentUser.displayName || `${registration.firstName || ''} ${registration.lastName || ''}`,
          customerEmail: currentUser.email || registration.email,
          // =======================================================
          // HINZUGEFÜGT: KUNDENADRESSE FÜR STEUERBERECHNUNG
          // =======================================================
          customerAddress: customerAddressToUse, // Sende die ermittelte Adresse
        };

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
    finalTaskAmountInCents, platformFeeForStripe, clientSecret, loadingPaymentIntent,
    registration.firstName, registration.lastName, registration.email, // Diese waren schon da
    // =======================================================
    // ABHÄNGIGKEITEN HINZUFÜGEN, DA customerAddressData aus `registration` stammt
    // =======================================================
    registration.customerType,
    registration.personalStreet,
    registration.personalHouseNumber,
    registration.personalPostalCode,
    registration.personalCity,
    registration.personalCountry,
    registration.companyStreet,
    registration.companyHouseNumber,
    registration.companyPostalCode,
    registration.companyCity,
    registration.companyCountry,
  ]);

  const handlePriceCalculatedFromChild = (priceInCents: number) => {
    if (finalTaskAmountInCents !== priceInCents) setFinalTaskAmountInCents(priceInCents);
    if (priceInCents > 0) {
      const calculatedFee = Math.round(priceInCents * 0.10);
      if (platformFeeForStripe !== calculatedFee) setPlatformFeeForStripe(calculatedFee);
    } else {
      if (platformFeeForStripe !== null) setPlatformFeeForStripe(null);
    }
    if (registration.jobCalculatedPriceInCents !== priceInCents && registration.setJobCalculatedPriceInCents) {
      registration.setJobCalculatedPriceInCents(priceInCents);
    }
  };

  const handleDetailsChangeFromChild = () => {
    console.log(PAGE_LOG, "BestaetigungsPage: onDetailsChange von Kindkomponente empfangen.");
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log(PAGE_LOG, `BestaetigungsPage: Zahlung erfolgreich: ${paymentIntentId}`);
    setPaymentMessage(`Zahlung erfolgreich! ID: ${paymentIntentId}. Dein Auftrag ${tempJobDraftId || 'unbekannt'} wird bearbeitet.`);
    if (registration.resetRegistrationData) registration.resetRegistrationData();
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
    platformFeeForStripe !== null;

  const subcategoryForContent = registration.selectedSubcategory || unterkategorieAusPfad;
  const bestaetigungsContentProps: BestaetigungsContentPropsForPage = {
    anbieterId: anbieterIdFromUrl,
    unterkategorie: subcategoryForContent,
    postalCodeJob: registration.jobPostalCode || postalCodeFromUrl,
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

            {dataIsReadyForCheckoutForm && clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCardCheckout
                  taskAmount={finalTaskAmountInCents!}
                  taskCurrency="eur"
                  taskerStripeAccountId={anbieterStripeConnectId!}
                  platformFeeAmount={platformFeeForStripe!}
                  customerName={currentUser!.displayName || `${registration.firstName} ${registration.lastName}` || 'Kunde'}
                  customerEmail={currentUser!.email || registration.email || ''}
                  firebaseUserId={currentUser!.uid}
                  stripeCustomerId={kundeStripeCustomerId!}
                  taskId={tempJobDraftId!}
                  clientSecret={clientSecret!}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </Elements>
            ) : (
              !paymentMessage && !paymentIntentError && !pageError && (
                <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                  <FiLoader className="animate-spin text-3xl text-[#14ad9f] mb-3" />
                  <span>
                    {isLoadingOverall
                      ? 'Zahlungsoptionen werden vorbereitet...'
                      : 'Wichtige Informationen für die Zahlung fehlen. Bitte überprüfen Sie die vorherigen Schritte.'}
                  </span>
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