'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
  MapPin as FiMapPin,
  CreditCard as FiCreditCard,
} from 'lucide-react';
import BestaetigungsContent from './components/BestaetigungsContent';
import { StripeCardCheckout } from '@/components/CheckoutForm';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { app, functions, db } from '@/firebase/clients';
import { useRegistration } from '@/contexts/Registration-Context';
import { useAuth } from '@/contexts/AuthContext';
import { PAGE_LOG, PAGE_ERROR, PAGE_WARN } from '@/lib/constants';
import { findCategoryBySubcategory } from '@/lib/categoriesData';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { getOptimizedStripeElementsOptions } from '@/lib/stripeErrorHandler';
import { PaymentElement } from '@stripe/react-stripe-js';
import { doc, getDoc } from 'firebase/firestore';

// HIER WIRD DER STRIPE PUBLISHABLE KEY AKTUALISIERT

const auth = getAuth(app);

// Utility-Funktion um Stunden aus Duration-String zu extrahieren
function parseDurationStringToHours(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== 'string') {
    return null;
  }
  const match = durationStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) {
    const hours = parseFloat(match[1]);
    return isNaN(hours) ? null : hours;
  }
  const parsedNum = parseFloat(durationStr);
  if (!isNaN(parsedNum)) return parsedNum;

  return null;
}

// --- KORRIGIERTE INTERFACE DEFINITIONEN ---
interface TemporaryJobDraftData {
  customerType: 'private' | 'business' | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  description: string;
  jobStreet?: string | null;
  jobPostalCode?: string | null;
  jobCity?: string | null;
  jobCountry?: string | null;
  jobDateFrom?: string | null;
  jobDateTo?: string | null;
  jobTimePreference?: string | null;
  selectedAnbieterId?: string | null;
  jobDurationString?: string | null;
  jobTotalCalculatedHours?: number | null;
  jobCalculatedPriceInCents?: number | null; // Dies ist der Basispreis des Anbieters (vom Dienstleister festgelegt)
  tempDraftId?: string | null;
  billingDetails?: BillingDetailsPayload | null;
}

// NEU: Definition von CustomerAddress hier oben, VOR der ersten Verwendung
interface CustomerAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  state?: string | null;
  country?: string | null;
}

// NEU: Interface für den Payload der getOrCreateStripeCustomer Cloud Function
interface GetOrCreateStripeCustomerPayload {
  email: string;
  name?: string;
  phone?: string | null; // Telefon optional hinzufügen
  address?: CustomerAddress | null; // Adresse optional hinzufügen
}

interface TemporaryJobDraftResult {
  tempDraftId: string;
  anbieterStripeAccountId?: string;
}

interface GetOrCreateStripeCustomerResult {
  stripeCustomerId: string;
}

interface BillingDetailsPayload {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: CustomerAddress;
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
  // NEU: Props zur Anzeige der Preisaufschlüsselung in BestaetigungsContent (falls benötigt)
  jobPriceInCents: number | null;
  totalAmountPayableInCents: number | null;
}
// --- ENDE DER INTERFACE DEFINITIONEN ---

// Helper function to compute billing details. Moved outside the component to avoid re-declaration on every render.
const getBillingDetails = (
  registration: any,
  user: User | null,
  userProfileData?: any
): BillingDetailsPayload | null => {
  const baseAddress: CustomerAddress = {
    line1: null,
    line2: null,
    city: null,
    postal_code: null,
    country: null,
  };
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;

  // ERWEITERT: Fallback auf userProfileData aus Firebase-Datenbank
  const customerType = registration.customerType || userProfileData?.user_type || 'private';

  if (customerType === 'private' || customerType === 'kunde') {
    // Prüfe zuerst RegistrationContext, dann userProfileData aus Datenbank
    const personalStreet = registration.personalStreet || userProfileData?.street;
    const personalPostalCode = registration.personalPostalCode || userProfileData?.postalCode;
    const personalCity = registration.personalCity || userProfileData?.city;
    const personalCountry = registration.personalCountry || userProfileData?.country || 'DE';

    if (personalStreet && personalPostalCode && personalCity && personalCountry) {
      baseAddress.line1 = `${personalStreet}${registration.personalHouseNumber ? ` ${registration.personalHouseNumber}` : ''}`;
      baseAddress.postal_code = personalPostalCode;
      baseAddress.city = personalCity;
      baseAddress.country = personalCountry;
    }

    name =
      registration.firstName && registration.lastName
        ? `${registration.firstName} ${registration.lastName}`
        : userProfileData?.firstName && userProfileData?.lastName
          ? `${userProfileData.firstName} ${userProfileData.lastName}`
          : user?.displayName || null;
    email = registration.email || userProfileData?.email || user?.email || null;
    phone = registration.phoneNumber || userProfileData?.phoneNumber || null;
  } else if (customerType === 'business') {
    if (
      registration.companyStreet &&
      registration.companyPostalCode &&
      registration.companyCity &&
      registration.companyCountry
    ) {
      baseAddress.line1 = `${registration.companyStreet}${registration.companyHouseNumber ? ` ${registration.companyHouseNumber}` : ''}`;
      baseAddress.postal_code = registration.companyPostalCode;
      baseAddress.city = registration.companyCity;
      baseAddress.country = registration.companyCountry;
    }
    name = registration.companyName || null;
    email = registration.email || user?.email || null;
    phone = registration.phoneNumber || null;
  }

  // Only return if the main address fields are present
  if (baseAddress.line1 && baseAddress.postal_code && baseAddress.city && baseAddress.country) {
    return { name, email, phone, address: baseAddress };
  }
  return null; // Return null if the address is incomplete
};

export default function BestaetigungsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathParams = useParams();
  const registration = useRegistration();
  const { user: authUser, firebaseUser, loading: authLoading } = useAuth();

  // Ref um sicherzustellen, dass URL-Parameter nur einmal geladen werden
  const urlParamsLoaded = useRef(false);

  // =================================================================================================
  // EFFECT 0: Load URL parameters into RegistrationContext to ensure data persistence
  // =================================================================================================
  React.useEffect(() => {
    if (urlParamsLoaded.current) {

      return;
    }

    // DEBUG: Zeige alle verfügbaren URL-Parameter
    if (searchParams) {

      for (const [key, value] of searchParams.entries()) {

      }
    } else {

    }

    // Hole alle URL-Parameter
    const anbieterIdFromUrl = searchParams?.get('anbieterId') ?? '';
    const unterkategorieAusPfad =
      typeof pathParams?.unterkategorie === 'string'
        ? decodeURIComponent(pathParams.unterkategorie as string)
        : '';
    const postalCodeFromUrl = searchParams?.get('postalCode') ?? '';

    // KORRIGIERT: Unterstütze sowohl neue (additionalData) als auch alte Parameter-Namen
    const dateFromUrl =
      (searchParams?.get('additionalData[date]') || searchParams?.get('dateFrom')) ?? '';
    const dateToUrl = searchParams?.get('dateTo') ?? '';
    const timeUrl = (searchParams?.get('additionalData[time]') || searchParams?.get('time')) ?? '';
    const auftragsDauerUrl =
      (searchParams?.get('additionalData[duration]') || searchParams?.get('auftragsDauer')) ?? '';
    const descriptionFromUrl = searchParams?.get('description') ?? '';

    // KORRIGIERT: Unterstütze additionalData[totalcost] für Gesamtkosten
    const priceFromUrl = (() => {
      const totalCostString = searchParams?.get('additionalData[totalcost]');
      const priceString = searchParams?.get('price');

      if (totalCostString) {
        // totalcost ist bereits in Cents, wenn es vom Frontend kommt
        const totalCents = parseInt(totalCostString, 10);
        return isNaN(totalCents) ? null : totalCents;
      } else if (priceString) {
        // price ist in Euro, konvertiere zu Cents
        return Math.round(parseFloat(priceString) * 100);
      }
      return null;
    })();

    // DEBUG: Log aller URL-Parameter

    // DEBUG: Prüfe, ob die URL vollständig ist
    const expectedParams = [
      'anbieterId',
      'postalCode',
      'dateFrom',
      'time',
      'auftragsDauer',
      'price',
    ];
    const missingParams = expectedParams.filter(param => !searchParams?.get(param));
    if (missingParams.length > 0) {

    } else {

    }

    // DEBUG: Zusätzliche Info über dateTo Parameter
    if (dateToUrl) {

    } else {

    }

    // KORREKTUR: Lade Parameter in den Context, auch wenn der Context bereits Werte hat
    // Dies ist wichtig, da die URL die "source of truth" für diese Seite ist

    // Unterkategorie aus dem Pfad
    if (unterkategorieAusPfad) {
      registration.setSelectedSubcategory?.(unterkategorieAusPfad);

    }

    // HINZUGEFÜGT: selectedCategory aus URL-Parameter, falls verfügbar
    const selectedCategoryFromUrl = searchParams?.get('selectedCategory');
    if (selectedCategoryFromUrl) {
      registration.setSelectedCategory?.(decodeURIComponent(selectedCategoryFromUrl));

    }

    if (anbieterIdFromUrl) {
      registration.setSelectedAnbieterId?.(anbieterIdFromUrl);

    }

    if (postalCodeFromUrl) {
      registration.setJobPostalCode?.(postalCodeFromUrl);

    }

    if (dateFromUrl) {
      registration.setJobDateFrom?.(dateFromUrl);

    }

    if (dateToUrl) {
      registration.setJobDateTo?.(dateToUrl);

    }

    if (timeUrl) {
      registration.setJobTimePreference?.(timeUrl);

    }

    if (auftragsDauerUrl) {
      registration.setJobDurationString?.(auftragsDauerUrl);
      const totalHours = parseDurationStringToHours(auftragsDauerUrl);
      if (totalHours !== null && totalHours > 0 && registration.setJobTotalCalculatedHours) {
        registration.setJobTotalCalculatedHours(totalHours);
      }

    }

    if (descriptionFromUrl) {
      try {
        const decodedDescription = decodeURIComponent(descriptionFromUrl);
        registration.setDescription?.(decodedDescription);

      } catch (e) {

        registration.setDescription?.(descriptionFromUrl);

      }
    }

    if (priceFromUrl) {
      registration.setJobCalculatedPriceInCents?.(priceFromUrl);

    }

    // Versuche, die Kategorie aus der Unterkategorie abzuleiten
    if (unterkategorieAusPfad) {
      const foundCategory = findCategoryBySubcategory(unterkategorieAusPfad);
      if (foundCategory) {
        registration.setSelectedCategory?.(foundCategory);

      }
    }

    // HINZUGEFÜGT: Setze customerType auf 'private' als Default, falls nicht gesetzt
    if (!registration.customerType) {
      registration.setCustomerType?.('private');

    }

    urlParamsLoaded.current = true;

  }, [searchParams, pathParams]);

  // --- NEU: Frühe Pflichtdaten-Prüfung und Redirect, nur wenn URL-Parameter geladen wurden ---
  React.useEffect(() => {
    // TEMPORÄR DEAKTIVIERT: Frühe Validierung, um Registrierungs-Redirect-Problem zu lösen

    return;

    // Prüfe, ob der Benutzer aus einer Registrierung kommt
    const fromRegistration =
      typeof window !== 'undefined' &&
      (window.location.href.includes('/register/') ||
        document.referrer.includes('/register/') ||
        window.history.state?.fromRegistration);

    if (fromRegistration) {

      return;
    }

    // Nur ausführen, wenn URL-Parameter bereits geladen wurden
    if (!urlParamsLoaded.current) {

      return;
    }

    // Zusätzliche Verzögerung, um sicherzustellen, dass alle Context-Updates abgeschlossen sind
    const timeoutId = setTimeout(() => {

      // DEBUG: Logge die komplette URL

      // Hilfsfunktionen für Pflichtdaten aus Context/URL
      const unterkategorieAusPfad =
        typeof pathParams?.unterkategorie === 'string'
          ? decodeURIComponent(pathParams.unterkategorie as string)
          : '';
      const anbieterIdFromUrl = searchParams?.get('anbieterId') ?? '';
      const postalCodeFromUrl = searchParams?.get('postalCode') ?? '';

      // KORRIGIERT: Unterstütze sowohl neue (additionalData) als auch alte Parameter-Namen
      const dateFromUrl =
        (searchParams?.get('additionalData[date]') || searchParams?.get('dateFrom')) ?? '';
      const timeUrl =
        (searchParams?.get('additionalData[time]') || searchParams?.get('time')) ?? '';
      const auftragsDauerUrl =
        (searchParams?.get('additionalData[duration]') || searchParams?.get('auftragsDauer')) ?? '';

      // KORRIGIERT: Unterstütze additionalData[totalcost] für Gesamtkosten
      const priceFromUrl = (() => {
        const totalCostString = searchParams?.get('additionalData[totalcost]');
        const priceString = searchParams?.get('price');

        if (totalCostString) {
          // totalcost ist bereits in Cents, wenn es vom Frontend kommt
          const totalCents = parseInt(totalCostString, 10);
          return isNaN(totalCents) ? null : totalCents;
        } else if (priceString) {
          // price ist in Euro, konvertiere zu Cents
          return Math.round(parseFloat(priceString) * 100);
        }
        return null;
      })();
      const descriptionFromUrl = searchParams?.get('description') ?? '';

      // Context/URL-Mix für Pflichtfelder
      const requiredFields = {
        customerType: registration.customerType,
        selectedCategory:
          registration.selectedCategory ||
          (unterkategorieAusPfad ? findCategoryBySubcategory(unterkategorieAusPfad) : null),
        selectedSubcategory: registration.selectedSubcategory || unterkategorieAusPfad,
        description: registration.description || descriptionFromUrl,
        jobPostalCode: registration.jobPostalCode || postalCodeFromUrl,
        jobDateFrom: registration.jobDateFrom || dateFromUrl,
        jobTimePreference: registration.jobTimePreference || timeUrl,
        selectedAnbieterId: anbieterIdFromUrl || registration.selectedAnbieterId,
        jobDurationString: registration.jobDurationString || auftragsDauerUrl,
        jobTotalCalculatedHours:
          registration.jobTotalCalculatedHours ||
          (auftragsDauerUrl ? parseDurationStringToHours(auftragsDauerUrl) : null),
        jobCalculatedPriceInCents: registration.jobCalculatedPriceInCents || priceFromUrl,
      };

      // GELOCKERTE VALIDIERUNG: Nur kritische Felder prüfen, die für die Zahlung absolut notwendig sind
      const criticalMissing: string[] = [];
      if (!requiredFields.selectedAnbieterId) criticalMissing.push('Anbieter');
      if (!requiredFields.jobPostalCode) criticalMissing.push('PLZ');
      if (!requiredFields.selectedSubcategory) criticalMissing.push('Unterkategorie');

      // Weniger strikte Prüfung für Beschreibung (erlaubt leere Beschreibung)
      if (!requiredFields.description || requiredFields.description.trim().length === 0) {

      }

      if (criticalMissing.length > 0) {

        // Sofortige Weiterleitung zurück zum Start der Auftragserstellung
        router.replace('/auftrag/get-started');
      } else {

        // Zusätzliche Logging für optionale Felder
        const optionalMissing: string[] = [];
        if (!requiredFields.customerType) optionalMissing.push('Kundentyp');
        if (!requiredFields.selectedCategory) optionalMissing.push('Kategorie');
        if (!requiredFields.jobDateFrom) optionalMissing.push('Datum');
        if (!requiredFields.jobTimePreference) optionalMissing.push('Uhrzeit');
        if (!requiredFields.jobDurationString) optionalMissing.push('Dauer');
        if (!requiredFields.jobTotalCalculatedHours || requiredFields.jobTotalCalculatedHours <= 0)
          optionalMissing.push('Gesamtdauer');
        if (
          !requiredFields.jobCalculatedPriceInCents ||
          requiredFields.jobCalculatedPriceInCents <= 0
        )
          optionalMissing.push('Preis');

        if (optionalMissing.length > 0) {

        }
      }
    }, 500); // Erhöhte Verzögerung auf 500ms für bessere Context-Updates

    return () => clearTimeout(timeoutId);
  }, [registration, searchParams, pathParams, router, urlParamsLoaded.current]);

  // KORRIGIERT: Verwende AuthContext statt lokaler State
  const [userProfileData, setUserProfileData] = useState<any>(null); // Für Firebase-Benutzerdaten
  const [kundeStripeCustomerId, setKundeStripeCustomerId] = useState<string | null>(null);
  const [tempJobDraftId, setTempJobDraftId] = useState<string | null>(null);
  const [anbieterStripeConnectId, setAnbieterStripeConnectId] = useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPaymentIntent, setLoadingPaymentIntent] = useState(false);
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);

  // NEU: Detailliertere Preis-States für die neue Gebührenstruktur
  const [jobPriceInCents, setJobPriceInCents] = useState<number | null>(null); // Preis, den der Anbieter festlegt
  const [totalAmountPayableInCents, setTotalAmountPayableInCents] = useState<number | null>(null); // Gesamtbetrag, den der Käufer zahlt

  // NEU: Speichere validierte Auftragsdaten für späteren Gebrauch beim Payment
  const [validatedDraftData, setValidatedDraftData] = useState<TemporaryJobDraftData | null>(null);

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const anbieterIdFromUrl = useMemo(() => searchParams?.get('anbieterId') ?? '', [searchParams]);
  const unterkategorieAusPfad = useMemo(
    () =>
      typeof pathParams?.unterkategorie === 'string'
        ? decodeURIComponent(pathParams.unterkategorie as string)
        : '',
    [pathParams]
  );
  const postalCodeFromUrl = useMemo(() => searchParams?.get('postalCode') ?? '', [searchParams]);

  // KORRIGIERT: Unterstütze sowohl neue (additionalData) als auch alte Parameter-Namen
  const dateFromUrl = useMemo(
    () => (searchParams?.get('additionalData[date]') || searchParams?.get('dateFrom')) ?? '',
    [searchParams]
  );
  const timeUrl = useMemo(
    () => (searchParams?.get('additionalData[time]') || searchParams?.get('time')) ?? '',
    [searchParams]
  );
  const auftragsDauerUrl = useMemo(
    () =>
      (searchParams?.get('additionalData[duration]') || searchParams?.get('auftragsDauer')) ?? '',
    [searchParams]
  );

  // KORRIGIERT: Unterstütze additionalData[totalcost] für Gesamtkosten
  const priceFromUrl = useMemo(() => {

    // DEBUG: Zeige alle verfügbaren searchParams
    if (searchParams) {

      for (const [key, value] of searchParams.entries()) {

      }
    }

    const totalCostString = searchParams?.get('additionalData[totalcost]');
    const priceString = searchParams?.get('price');

    if (totalCostString) {
      // totalcost ist bereits in Cents, wenn es vom Frontend kommt
      const totalCents = parseInt(totalCostString, 10);
      const result = isNaN(totalCents) ? null : totalCents;

      return result;
    } else if (priceString) {
      // price ist in Euro, konvertiere zu Cents
      const result = Math.round(parseFloat(priceString) * 100);

      return result;
    }

    return null;
  }, [searchParams]);
  const tempDraftIdFromUrl = useMemo(() => searchParams?.get('tempDraftId') ?? '', [searchParams]);
  const descriptionFromUrl = useMemo(() => searchParams?.get('description') ?? '', [searchParams]);

  const isInitializing = useRef(false);

  // Callback, der den vom BestaetigungsContent berechneten Preis (Basispreis) erhält
  const handlePriceCalculatedFromChild = useCallback(
    (priceInCents: number) => {

      // Nur aktualisieren und clientSecret zurücksetzen, wenn der Basis-Preis sich tatsächlich ändert
      if (jobPriceInCents !== priceInCents) {

        setJobPriceInCents(priceInCents);

        if (priceInCents > 0) {
          // ANPASSUNG: Der Gesamtbetrag, den der Käufer zahlt, ist jetzt identisch mit dem Auftragswert.
          // Die Servicegebühr wird serverseitig vom Guthaben des Anbieters abgezogen.
          setTotalAmountPayableInCents(priceInCents);

        } else {
          // Preise zurücksetzen, wenn Basispreis <= 0 ist
          setTotalAmountPayableInCents(null);
        }

        setClientSecret(null); // Client Secret zurücksetzen, da sich der zu zahlende Betrag geändert hat
        setPaymentIntentError(null);
      } else {

      }

      // `jobCalculatedPriceInCents` im Context aktualisieren (dies ist der Basispreis)
      if (
        registration.jobCalculatedPriceInCents !== priceInCents &&
        registration.setJobCalculatedPriceInCents
      ) {
        registration.setJobCalculatedPriceInCents(priceInCents);

      }
    },
    [
      jobPriceInCents,
      registration.jobCalculatedPriceInCents,
      registration.setJobCalculatedPriceInCents,
    ]
  ); // BUYER_SERVICE_FEE_RATE entfernt

  const handleDetailsChangeFromChild = useCallback(() => {

  }, []);

  // Call the helper function inside a useMemo hook at the top level of the component.
  // This follows the Rules of Hooks and ensures the value is only recomputed when its dependencies change.
  const billingAddressDetails = useMemo(() => {
    return getBillingDetails(registration, firebaseUser, userProfileData);
  }, [
    registration.customerType,
    registration.personalStreet,
    registration.personalHouseNumber,
    registration.personalPostalCode,
    registration.personalCity,
    registration.personalCountry,
    registration.firstName,
    registration.lastName,
    registration.email,
    registration.phoneNumber,
    registration.companyName,
    registration.companyStreet,
    registration.companyHouseNumber,
    registration.companyPostalCode,
    registration.companyCity,
    registration.companyCountry,
    firebaseUser,
    userProfileData, // Neue Abhängigkeit für Firebase-Daten
  ]);

  // =================================================================================================
  // EFFECT 1: Handle user authentication state using AuthContext
  // =================================================================================================
  useEffect(() => {

    if (authLoading) {

      return;
    }

    if (!firebaseUser) {

      const currentPath = `${window.location.pathname}${window.location.search}`;
      // TIMEOUT hinzufügen um Race Conditions zu vermeiden
      setTimeout(() => {
        router.push(`/register/user?redirectTo=${encodeURIComponent(currentPath)}`);
      }, 100);
    } else {

    }
  }, [firebaseUser, authLoading, authUser, router]);

  // =================================================================================================
  // EFFECT 2: Handle data initialization and server communication once the user is authenticated.
  // =================================================================================================
  useEffect(() => {
    const initializeOrder = async () => {
      if (firebaseUser) {
        if (isInitializing.current) {

          return;
        }
        isInitializing.current = true;

        setIsLoadingPageData(true);
        setPageError(null);

        // KORREKTUR: Lade das Benutzerprofil, um den Kundentyp zuverlässig zu bestimmen,
        // anstatt sich nur auf den RegistrationContext zu verlassen.
        let userProfileDataLocal: { user_type?: 'kunde' | 'firma' | 'support' | 'master' } = {};
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userProfileDataLocal = userDocSnap.data() as { user_type?: 'kunde' | 'firma' | 'support' | 'master' };
            setUserProfileData(userProfileDataLocal); // State für billingAddressDetails aktualisieren

          }
        } catch (e) {

        }

        // --- Datenquelle für DraftData (Priorität: Context > URL-Parameter > Fallbacks) ---
        // KORREKTUR: Verwende die URL-Parameter direkt, nicht die useMemo-Variablen
        const anbieterIdFromUrlDirect = searchParams?.get('anbieterId') ?? '';
        const unterkategorieAusPfadDirect =
          typeof pathParams?.unterkategorie === 'string'
            ? decodeURIComponent(pathParams.unterkategorie as string)
            : '';
        const postalCodeFromUrlDirect = searchParams?.get('postalCode') ?? '';
        const dateFromUrlDirect =
          (searchParams?.get('additionalData[date]') || searchParams?.get('dateFrom')) ?? '';
        const timeUrlDirect =
          (searchParams?.get('additionalData[time]') || searchParams?.get('time')) ?? '';
        const auftragsDauerUrlDirect =
          (searchParams?.get('additionalData[duration]') || searchParams?.get('auftragsDauer')) ??
          '';
        const descriptionFromUrlDirect = searchParams?.get('description') ?? '';

        // DEBUG: Zeige alle verwendeten Parameter

        // DEBUG: Zeige alle verfügbaren searchParams

        if (searchParams) {
          for (const [key, value] of searchParams.entries()) {

          }
        }

        // KORRIGIERT: Preis aus URL-Parameter direkt extrahieren
        const priceFromUrlDirect = (() => {
          // DEBUG: Zeige alle verfügbaren searchParams

          if (searchParams) {
            for (const [key, value] of searchParams.entries()) {

            }
          }

          const totalCostString = searchParams?.get('additionalData[totalcost]');
          const priceString = searchParams?.get('price');

          if (totalCostString) {
            const totalCents = parseInt(totalCostString, 10);
            const result = isNaN(totalCents) ? null : totalCents;

            return result;
          } else if (priceString) {
            const result = Math.round(parseFloat(priceString) * 100);

            return result;
          }

          return null;
        })();

        const customerTypeToUse =
          registration.customerType ||
          (userProfileDataLocal?.user_type === 'kunde' ? 'private' :
           userProfileDataLocal?.user_type === 'firma' ? 'business' : 'private');
        // VERSUCH, selectedCategory abzuleiten, falls nicht im Context
        let selectedCategoryToUse = registration.selectedCategory || null; // Beginne mit dem Wert aus dem Context
        if (!selectedCategoryToUse && unterkategorieAusPfadDirect) {
          // Wenn im Context keine Kategorie ist, versuche sie über die Unterkategorie aus dem Pfad zu finden
          const foundCategory = findCategoryBySubcategory(unterkategorieAusPfadDirect);
          if (foundCategory) {
            selectedCategoryToUse = foundCategory;

          } else {

          }
        }
        const selectedSubcategoryToUse =
          registration.selectedSubcategory || unterkategorieAusPfadDirect || null;
        const descriptionToUse = registration.description || descriptionFromUrlDirect || '';

        // FIX: Sicherstellen, dass Adressfelder niemals undefined sind, sondern null
        const jobStreetToUse = registration.jobStreet || null;
        const jobPostalCodeToUse = registration.jobPostalCode || postalCodeFromUrlDirect || null;
        const jobCityToUse = registration.jobCity || null;
        const jobCountryToUse = registration.jobCountry || null;

        const jobDateFromToUse = registration.jobDateFrom || dateFromUrlDirect || null;
        const jobDateToToUse = registration.jobDateTo || null;
        const jobTimePreferenceToUse = registration.jobTimePreference || timeUrlDirect || null;
        // FIX: Prioritize the anbieterId from the URL, as it's the source of truth for this page.
        const selectedAnbieterIdToUse =
          anbieterIdFromUrlDirect || registration.selectedAnbieterId || null;
        const jobDurationStringToUse =
          registration.jobDurationString || auftragsDauerUrlDirect || null;
        const jobTotalCalculatedHoursToUse =
          registration.jobTotalCalculatedHours ||
          (auftragsDauerUrlDirect ? parseDurationStringToHours(auftragsDauerUrlDirect) : null);
        const jobCalculatedPriceInCentsToUse =
          registration.jobCalculatedPriceInCents || priceFromUrlDirect || null;

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
          tempDraftId: tempDraftIdFromUrl || null,
          billingDetails: billingAddressDetails, // Rechnungsdetails hier hinzufügen
        };

        // --- DEBUG: Detaillierte Logs für jeden Wert ---

        // --- ENDE DEBUG LOGS ---

        // jobCalculatedPriceInCents ist der Basis-Preis des Anbieters
        const initialJobPrice = draftData.jobCalculatedPriceInCents;
        if (
          jobPriceInCents === null &&
          typeof initialJobPrice === 'number' &&
          initialJobPrice > 0
        ) {
          setJobPriceInCents(initialJobPrice);
          // ANPASSUNG: Der Gesamtbetrag ist jetzt identisch mit dem Auftragswert.
          setTotalAmountPayableInCents(initialJobPrice);

        } else if (jobPriceInCents === null && (initialJobPrice == null || initialJobPrice <= 0)) {

        } else {

        }

        // --- Hinzugefügter Debug-Log für draftData vor Validierung ---

        // --- ENDE Debug-Log ---

        // --- KORRIGIERTE PFLICHTDATEN-PRÜFUNG ---
        const missingFields: string[] = [];
        if (!draftData.customerType) missingFields.push('Kundentyp');
        // Kategorie und Unterkategorie können null sein, wenn sie nicht ermittelt werden konnten, aber für den Draft sind sie wichtig.
        if (
          draftData.selectedCategory === null ||
          draftData.selectedCategory === undefined ||
          draftData.selectedCategory.trim() === ''
        )
          missingFields.push('Kategorie');
        if (
          draftData.selectedSubcategory === null ||
          draftData.selectedSubcategory === undefined ||
          draftData.selectedSubcategory.trim() === ''
        )
          missingFields.push('Unterkategorie');
        if (!draftData.description || draftData.description.trim().length === 0)
          missingFields.push('Auftragsbeschreibung'); // <-- HIER WIRD AUF EINE NICHT-LEERE BESCHREIBUNG GEPRÜFT
        // jobPostalCode und selectedAnbieterId sind kritisch
        if (
          draftData.jobPostalCode === null ||
          draftData.jobPostalCode === undefined ||
          draftData.jobPostalCode.trim() === ''
        )
          missingFields.push('Job-Postleitzahl');
        if (
          draftData.selectedAnbieterId === null ||
          draftData.selectedAnbieterId === undefined ||
          draftData.selectedAnbieterId.trim() === ''
        )
          missingFields.push('Anbieter-ID');
        // jobDateFrom und jobTimePreference sind ebenfalls wichtig für den Draft
        if (
          draftData.jobDateFrom === null ||
          draftData.jobDateFrom === undefined ||
          draftData.jobDateFrom.trim() === ''
        )
          missingFields.push('Auftragsstartdatum');
        if (
          draftData.jobTimePreference === null ||
          draftData.jobTimePreference === undefined ||
          draftData.jobTimePreference.trim() === ''
        )
          missingFields.push('Bevorzugte Uhrzeit');
        if (draftData.jobTotalCalculatedHours == null || draftData.jobTotalCalculatedHours <= 0)
          missingFields.push('Berechnete Gesamtdauer (Stunden)'); // `== null` prüft auf null und undefined
        // Hier den jobCalculatedPriceInCents als Basispreis prüfen
        if (draftData.jobCalculatedPriceInCents == null || draftData.jobCalculatedPriceInCents <= 0)
          missingFields.push('Berechneter Preis (Cents)'); // `== null` prüft auf null und undefined
        // Prüfe Rechnungsadresse separat - fehlende Adresse führt zur Registrierung
        const hasBillingAddress =
          billingAddressDetails &&
          billingAddressDetails.address?.line1 &&
          billingAddressDetails.address?.postal_code &&
          billingAddressDetails.address?.city &&
          billingAddressDetails.address?.country;

        if (!hasBillingAddress) {

          // Erstelle die aktuelle URL für die Weiterleitung nach der Registrierung
          const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
          const registrationRedirectUrl = `/register/user?redirectTo=${encodeURIComponent(currentUrl)}`;

          setIsLoadingPageData(false);
          isInitializing.current = false;
          router.push(registrationRedirectUrl);
          return;
        }

        // Prüfe andere Pflichtfelder (ohne Rechnungsadresse)
        if (missingFields.length > 0) {
          // Detaillierteres Logging der fehlenden Felder

          setPageError(
            `Wichtige Auftragsinformationen fehlen: ${missingFields.join(', ')}. Bitte gehen Sie zurück und vervollständigen Sie Ihre Eingaben.`
          );
          setIsLoadingPageData(false);
          isInitializing.current = false;
          // Automatische Weiterleitung nach 2 Sekunden
          setTimeout(() => {
            router.push('/auftrag/get-started');
          }, 2000);
          return;
        }
        // --- ENDE KORRIGIERTE PFLICHTDATEN-PRÜFUNG ---

        // KORREKTUR: Temporärer Job-Entwurf wird NICHT mehr hier erstellt!
        // Das war das Hauptproblem - Aufträge sollen erst nach erfolgreicher Zahlung erstellt werden.

        // Speichere die validierten draftData für späteren Gebrauch beim Payment
        setValidatedDraftData(draftData);

        // Schritt 1: Anbieter Stripe Account ID abrufen (ohne Job-Entwurf)
        try {
          // Rufe die Anbieter-Details ab, um die Stripe Account ID zu erhalten
          const anbieterDetailsUrl = `https://europe-west1-tilvo-f142f.cloudfunctions.net/searchCompanyProfiles?id=${draftData.selectedAnbieterId}`;

          const anbieterResponse = await fetch(anbieterDetailsUrl);
          if (!anbieterResponse.ok) {
            throw new Error(`HTTP ${anbieterResponse.status}: ${anbieterResponse.statusText}`);
          }

          const anbieterData = await anbieterResponse.json();

          if (!anbieterData.stripeConnectAccountId) {

            setPageError(
              'Der ausgewählte Anbieter kann derzeit keine Zahlungen verarbeiten. Bitte wählen Sie einen anderen Anbieter aus.'
            );
            setIsLoadingPageData(false);
            isInitializing.current = false;
            return;
          }

          setAnbieterStripeConnectId(anbieterData.stripeConnectAccountId);

        } catch (error: unknown) {

          let specificErrorMessage = 'Fehler beim Laden der Anbieter-Informationen.';
          if (error instanceof Error) {
            specificErrorMessage = `Fehler beim Laden der Anbieter-Informationen: ${error.message}`;
          }
          setPageError(specificErrorMessage);
          setIsLoadingPageData(false);
          isInitializing.current = false;
          return;
        }

        // Schritt 2: Stripe-Kunden-ID abrufen oder erstellen
        try {
          // Daten für Stripe-Kundenaufruf vorbereiten
          const emailForStripe = billingAddressDetails?.email || firebaseUser.email;
          if (!emailForStripe) {

            setPageError(
              'E-Mail für die Zahlungsabwicklung fehlt. Bitte Profil vervollständigen oder erneut versuchen.'
            );
            setIsLoadingPageData(false);
            isInitializing.current = false;
            return;
          }

          // Daten für Stripe-Kundenaufruf vorbereiten
          const stripeCustomerPayload: GetOrCreateStripeCustomerPayload = {
            email: emailForStripe,
            name: billingAddressDetails?.name || firebaseUser.displayName || undefined,
            phone: billingAddressDetails?.phone || undefined,
            address: billingAddressDetails?.address || undefined,
          };

          const getOrCreateStripeCustomerCallable = httpsCallable<
            GetOrCreateStripeCustomerPayload,
            GetOrCreateStripeCustomerResult
          >(functions, 'getOrCreateStripeCustomer');
          const customerResult = await getOrCreateStripeCustomerCallable(stripeCustomerPayload);
          setKundeStripeCustomerId(customerResult.data.stripeCustomerId);

        } catch (error) {

          let specificErrorMessage =
            'Ein Fehler bei der Synchronisierung Ihres Kundenprofils ist aufgetreten.';
          if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
            // Hier ist 'not-found' ein technischer Fehler (Funktion nicht gefunden), keine Geschäftslogik.
            specificErrorMessage = `Fehler bei der Kommunikation mit dem Zahlungssystem (${error.code}): ${error.message}. Bitte versuchen Sie es später erneut.`;
          } else if (error instanceof Error) {
            specificErrorMessage = `Fehler bei der Kundenprofil-Synchronisierung: ${error.message}`;
          }
          setPageError(specificErrorMessage);
        } finally {
          setIsLoadingPageData(false);
          isInitializing.current = false;
        }
      }
    };

    initializeOrder();
  }, [
    firebaseUser,
    // Specific registration properties to avoid re-running on every context change
    registration.customerType,
    registration.selectedCategory,
    registration.selectedSubcategory,
    registration.description,
    registration.jobStreet,
    registration.jobPostalCode,
    registration.jobCity,
    registration.jobCountry,
    registration.jobDateFrom,
    registration.jobDateTo,
    registration.jobTimePreference,
    registration.selectedAnbieterId,
    registration.jobDurationString,
    registration.jobTotalCalculatedHours,
    registration.jobCalculatedPriceInCents,
    // URL params (memoized)
    anbieterIdFromUrl,
    unterkategorieAusPfad,
    postalCodeFromUrl,
    dateFromUrl,
    timeUrl,
    auftragsDauerUrl,
    priceFromUrl,
    tempDraftIdFromUrl,
    descriptionFromUrl,
    // Other state and memoized values
    jobPriceInCents,
    billingAddressDetails,
    router,
  ]);

  // =================================================================================================
  // NEUE PAYMENT-FUNKTION: Erstelle temporären Job-Entwurf und Client Secret beim Bezahlen
  // =================================================================================================
  const handlePaymentButtonClick = async () => {
    if (!validatedDraftData || !firebaseUser || !kundeStripeCustomerId || !anbieterStripeConnectId) {

      setPaymentIntentError('Zahlungsdaten sind unvollständig. Bitte laden Sie die Seite neu.');
      return;
    }

    setLoadingPaymentIntent(true);
    setPaymentIntentError(null);

    try {
      // Schritt 1: Erstelle temporären Job-Entwurf

      const createTemporaryJobDraftCallable = httpsCallable<
        TemporaryJobDraftData,
        TemporaryJobDraftResult
      >(functions, 'createTemporaryJobDraft');
      const draftResult = await createTemporaryJobDraftCallable(validatedDraftData);
      const draftResultData = draftResult.data;

      setTempJobDraftId(draftResultData.tempDraftId);

      // Schritt 2: Erstelle Payment Intent
      const payload = {
        amount: totalAmountPayableInCents,
        jobPriceInCents: jobPriceInCents,
        currency: 'eur',
        connectedAccountId: anbieterStripeConnectId,
        taskId: draftResultData.tempDraftId,
        firebaseUserId: firebaseUser.uid,
        stripeCustomerId: kundeStripeCustomerId,
        customerName: firebaseUser.displayName || `${registration.firstName || ''} ${registration.lastName || ''}`,
        customerEmail: firebaseUser.email || registration.email || '',
        billingDetails: billingAddressDetails,
      };

      const idToken = await firebaseUser.getIdToken();
      const serverResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await serverResponse.json();
      const { clientSecret: fetchedClientSecret, error: backendError } = responseData;

      if (!serverResponse.ok || backendError || !fetchedClientSecret) {
        const displayErrorMessage =
          typeof backendError === 'string'
            ? backendError
            : responseData?.error?.message || 'Fehler beim Erstellen der Zahlung.';
        throw new Error(displayErrorMessage);
      }

      setClientSecret(fetchedClientSecret);

    } catch (error: unknown) {

      let errorMessage = 'Fehler beim Starten des Bezahlvorgangs.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setPaymentIntentError(errorMessage);
    } finally {
      setLoadingPaymentIntent(false);
    }
  };

  // NEU: Redirection nach erfolgreicher Zahlung
  const handlePaymentSuccess = (paymentIntentId: string) => {

    setPaymentMessage(
      `Zahlung erfolgreich! ID: ${paymentIntentId}. Dein Auftrag ${tempJobDraftId || 'unbekannt'} wird bearbeitet.`
    );
    if (registration.resetRegistrationData) registration.resetRegistrationData();

    // Weiterleitung zum Dashboard nach erfolgreicher Zahlung.
    // Eine kurze Verzögerung gibt dem Benutzer Zeit, die Erfolgsmeldung zu lesen.
    setTimeout(() => {
      if (firebaseUser?.uid) {
        router.push(`/dashboard/user/${firebaseUser.uid}`);
      } else {
        router.push('/dashboard'); // Fallback, falls die User-ID nicht verfügbar ist
      }
    }, 3000); // 3 Sekunden Verzögerung
  };

  const handlePaymentError = (errorMessage: string) => {

    setPaymentMessage(`Fehler bei der Zahlung: ${errorMessage}`);
  };

  // Gesamtladezustand berücksichtigt nun auch das Laden der Registrierungsdaten
  const isLoadingOverall = isLoadingPageData || loadingPaymentIntent;

  const dataIsReadyForCheckoutForm =
    clientSecret &&
    kundeStripeCustomerId &&
    tempJobDraftId &&
    firebaseUser &&
    anbieterStripeConnectId &&
    !paymentIntentError &&
    !pageError &&
    totalAmountPayableInCents !== null &&
    totalAmountPayableInCents > 0 && // Verwende totalAmountPayableInCents
    jobPriceInCents !== null && // jobPriceInCents ist auch wichtig
    // NEU: Überprüfen, ob billingAddressDetails vorhanden und vollständig sind
    billingAddressDetails &&
    billingAddressDetails.address?.line1 &&
    billingAddressDetails.address?.postal_code &&
    billingAddressDetails.address?.city &&
    billingAddressDetails.address?.country;

  // Hilfsvariable, um zu prüfen, ob alle Voraussetzungen für das Abrufen eines clientSecret erfüllt sind
  const prerequisitesForClientSecretFetchAreMet =
    firebaseUser &&
    kundeStripeCustomerId &&
    tempJobDraftId &&
    anbieterStripeConnectId &&
    totalAmountPayableInCents !== null &&
    totalAmountPayableInCents > 0 &&
    jobPriceInCents !== null &&
    jobPriceInCents > 0 &&
    billingAddressDetails &&
    billingAddressDetails.address?.line1 &&
    billingAddressDetails.address?.postal_code &&
    billingAddressDetails.address?.city &&
    billingAddressDetails.address?.country &&
    !pageError &&
    !paymentIntentError;

  const subcategoryForContent = registration.selectedSubcategory || unterkategorieAusPfad;
  const bestaetigungsContentProps: BestaetigungsContentPropsForPage = {
    anbieterId: anbieterIdFromUrl,
    unterkategorie: subcategoryForContent || '',
    postalCodeJob: postalCodeFromUrl || registration.jobPostalCode || '',
    initialJobDateFrom: dateFromUrl || registration.jobDateFrom,
    initialJobDateTo: registration.jobDateTo, // This is less critical, often null
    initialJobTime: timeUrl || registration.jobTimePreference,
    initialJobDescription: descriptionFromUrl || registration.description,
    initialJobDurationString: auftragsDauerUrl || registration.jobDurationString,
    onPriceCalculated: handlePriceCalculatedFromChild,
    onDetailsChange: handleDetailsChangeFromChild,
    // NEU: Übergebe die berechneten Preisdetails zur Anzeige an BestaetigungsContent
    jobPriceInCents: jobPriceInCents,
    totalAmountPayableInCents: totalAmountPayableInCents,
  };

  // NEU: Optionen für das PaymentElement, um die Rechnungsdetails vorab auszufüllen.
  const paymentElementOptions = useMemo(
    () => ({
      defaultValues: {
        billingDetails: {
          name: billingAddressDetails?.name || '',
          email: billingAddressDetails?.email || '',
          phone: billingAddressDetails?.phone || '',
          address: {
            line1: billingAddressDetails?.address?.line1 || '',
            line2: billingAddressDetails?.address?.line2 || '',
            city: billingAddressDetails?.address?.city || '',
            postal_code: billingAddressDetails?.address?.postal_code || '',
            country: billingAddressDetails?.address?.country || '',
          },
        },
      },
      // Layout und Styling-Optionen
      layout: 'tabs' as const,
    }),
    [billingAddressDetails]
  );

  if (isLoadingOverall) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        {isLoadingOverall ? 'Seite wird vorbereitet...' : 'Zahlung wird initialisiert...'}
      </div>
    );
  }

  if (pageError && !paymentMessage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md"
          role="alert"
        >
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
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md"
          role="alert"
        >
          <FiAlertCircle size={24} className="inline mr-2" />
          <strong className="font-bold">Zahlungsinitialisierungsfehler:</strong>
          <span className="block sm:inline ml-1">{paymentIntentError}</span>
          <p className="mt-2 text-sm">
            Bitte versuchen Sie die Seite neu zu laden oder kontaktieren Sie den Support.
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser && !isLoadingOverall) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Weiterleitung zum Login... (oder Nutzer nicht gefunden)
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" /> Seite wird aufgebaut...
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-gray-800 mb-8 text-center">
          Bestätigung und Zahlung
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
          <div className="w-full order-last lg:order-first">
            {subcategoryForContent ? (
              <BestaetigungsContent {...bestaetigungsContentProps} />
            ) : (
              <p>Lade Auftragsdetails...</p>
            )}
          </div>

          <div className="w-full bg-gray-50 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Sichere Zahlung</h2>
            {paymentMessage && (
              <div
                className={`my-4 p-3 rounded-md text-sm ${paymentMessage.includes('erfolgreich') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} flex items-center`}
              >
                {!paymentMessage.includes('erfolgreich') &&
                  (paymentMessage.includes('Fehler') || paymentMessage.includes('Problem')) && (
                    <FiAlertCircle className="mr-2" />
                  )}
                {paymentMessage}
              </div>
            )}

            {/* NEU: Anzeige der Rechnungsadresse */}
            <div className="mb-6 p-4 border rounded-md bg-white">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                <FiMapPin className="mr-2" /> Ihre Rechnungsadresse
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Diese Adresse wird für Ihre Rechnung verwendet und bei der ersten Zahlung
                gespeichert.
              </p>
              {billingAddressDetails &&
              billingAddressDetails.address?.line1 &&
              billingAddressDetails.address?.postal_code ? (
                <div className="text-gray-800">
                  <p className="font-medium">
                    {billingAddressDetails.name ||
                      firebaseUser?.displayName ||
                      `${registration.firstName || ''} ${registration.lastName || ''}`}
                  </p>
                  <p>
                    {billingAddressDetails.address.line1} {billingAddressDetails.address.line2}
                  </p>
                  <p>
                    {billingAddressDetails.address.postal_code} {billingAddressDetails.address.city}
                  </p>
                  <p>{billingAddressDetails.address.country}</p>
                  {billingAddressDetails.email && (
                    <p className="text-sm text-gray-600">{billingAddressDetails.email}</p>
                  )}
                  {billingAddressDetails.phone && (
                    <p className="text-sm text-gray-600">{billingAddressDetails.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-red-500">
                  Rechnungsadresse nicht vollständig. Bitte gehen Sie zurück und vervollständigen
                  Sie Ihre Registrierungsdaten.
                </p>
              )}
            </div>

            {/* NEU: Vereinfachte Anzeige der Preisdetails */}
            {totalAmountPayableInCents !== null && (
              <div className="mb-6 p-4 border rounded-md bg-white">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                  <FiCreditCard className="mr-2" /> Preisübersicht
                </h3>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-lg">
                  <span>Gesamtbetrag:</span>
                  <span>{(totalAmountPayableInCents / 100).toFixed(2)} EUR</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Der angezeigte Betrag ist der Endpreis. Die Servicegebühr wird vom Dienstleister
                  getragen.
                </p>
              </div>
            )}

            {/* NEUE LOGIK: Zeige Button wenn Daten bereit sind, aber noch kein clientSecret */}
            {!clientSecret && validatedDraftData && kundeStripeCustomerId && anbieterStripeConnectId &&
             totalAmountPayableInCents !== null && jobPriceInCents !== null && !isLoadingPageData && !pageError ? (
              <div className="mb-6 p-4 border rounded-md bg-white text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center justify-center">
                  <FiCreditCard className="mr-2" /> Zahlungsvorgang starten
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Klicken Sie auf "Jetzt bezahlen", um den Bezahlvorgang zu starten.
                </p>
                <button
                  onClick={handlePaymentButtonClick}
                  disabled={loadingPaymentIntent}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-3 rounded-md font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                >
                  {loadingPaymentIntent ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Bereite Zahlung vor...
                    </>
                  ) : (
                    <>
                      <FiCreditCard className="mr-2" />
                      Jetzt bezahlen ({(totalAmountPayableInCents / 100).toFixed(2)} EUR)
                    </>
                  )}
                </button>
                {paymentIntentError && (
                  <p className="text-red-500 text-sm mt-3">{paymentIntentError}</p>
                )}
              </div>
            ) : /* Fall 1: Alles bereit, clientSecret vorhanden -> Formular anzeigen */
            clientSecret && validatedDraftData && kundeStripeCustomerId && anbieterStripeConnectId ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  ...getOptimizedStripeElementsOptions(),
                }}
                key={clientSecret}
              >
                <div>
                  {' '}
                  {/* Wrapper für PaymentElement und StripeCardCheckout */}
                  {/* Eingabe der Zahlungsmethode */}
                  <div className="mb-6 p-4 border rounded-md bg-white">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                      <FiCreditCard className="mr-2" /> Zahlungsmethode
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Geben Sie Ihre Zahlungsinformationen ein. Diese wird für zukünftige Buchungen
                      gespeichert.
                    </p>
                    <PaymentElement options={paymentElementOptions} />
                  </div>
                  {/* Checkout-Button-Bereich jetzt INNERHALB von Elements */}
                  {!paymentIntentError && !pageError && (
                    <StripeCardCheckout
                      clientSecret={clientSecret!}
                      taskAmount={totalAmountPayableInCents!} // Der Betrag, der dem Kunden angezeigt und abgebucht wird
                      taskCurrency="eur"
                      taskerStripeAccountId={anbieterStripeConnectId!}
                      // platformFeeAmount ist nicht mehr nötig, da Backend es berechnet
                      customerName={
                        firebaseUser!.displayName ||
                        `${registration.firstName || ''} ${registration.lastName || ''}`
                      }
                      customerEmail={firebaseUser!.email || registration.email || ''}
                      firebaseUserId={firebaseUser!.uid}
                      stripeCustomerId={kundeStripeCustomerId!}
                      taskId={tempJobDraftId!}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  )}
                </div>
              </Elements>
            ) : /* Fall 2: Entweder allgemeines Laden ODER clientSecret wird gerade (neu) geladen */
            isLoadingOverall ||
              (prerequisitesForClientSecretFetchAreMet &&
                !clientSecret &&
                !paymentIntentError &&
                !pageError) ? (
              <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                <FiLoader className="animate-spin text-3xl text-[#14ad9f] mb-3" />
                <span>
                  {isLoadingPageData
                    ? 'Seitendaten werden geladen...'
                    : 'Zahlungsformular wird vorbereitet...'}
                </span>
              </div>
            ) : (
              /* Fall 3: Grundlegende Daten fehlen oder es gibt einen Fehler, der das Laden des clientSecret verhindert */
              // Dies ist der 'else'-Teil des zweiten Ternary-Operators
              !paymentMessage && ( // Bedingtes Rendern innerhalb des 'else'-Blocks
                <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                  <span>
                    {pageError ||
                      paymentIntentError ||
                      'Wichtige Informationen für die Zahlung fehlen. Bitte überprüfen Sie die vorherigen Schritte.'}
                  </span>
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 text-xs text-left bg-gray-100 p-2 rounded">
                      <p className="font-semibold">
                        Debug-Info (Bedingung für Zahlungsformular nicht erfüllt):
                      </p>
                      <p>clientSecret: {String(!!clientSecret)}</p>
                      <p>kundeStripeCustomerId: {String(!!kundeStripeCustomerId)}</p>
                      <p>tempJobDraftId: {String(!!tempJobDraftId)}</p>
                      <p>firebaseUser: {String(!!firebaseUser)}</p>
                      <p>anbieterStripeConnectId: {String(!!anbieterStripeConnectId)}</p>
                      <p>pageError: {String(!!pageError)}</p>
                      <p>paymentIntentError: {String(!!paymentIntentError)}</p>
                      <p>jobPriceInCents: {String(!!jobPriceInCents)}</p>
                      <p>totalAmountPayableInCents: {String(!!totalAmountPayableInCents)}</p>
                      <p className="font-semibold mt-2">Billing Address Details Debug:</p>
                      <p>billingAddressDetails: {String(!!billingAddressDetails)}</p>
                      <p>address.line1: {String(billingAddressDetails?.address?.line1)}</p>
                      <p>
                        address.postal_code: {String(billingAddressDetails?.address?.postal_code)}
                      </p>
                      <p>address.city: {String(billingAddressDetails?.address?.city)}</p>
                      <p>address.country: {String(billingAddressDetails?.address?.country)}</p>
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
