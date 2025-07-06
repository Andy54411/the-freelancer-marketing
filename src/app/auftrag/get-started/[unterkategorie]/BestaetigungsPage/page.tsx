'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { FiLoader, FiAlertCircle, FiMapPin, FiCreditCard } from 'react-icons/fi';
import BestaetigungsContent from './components/BestaetigungsContent';
import { StripeCardCheckout } from '@/components/CheckoutForm';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { app, functions, db } from '@/firebase/clients';
import { useRegistration } from '@/contexts/Registration-Context';
import { PAGE_LOG, PAGE_ERROR, PAGE_WARN } from '@/lib/constants';
import { findCategoryBySubcategory } from '@/lib/categoriesData';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement } from '@stripe/react-stripe-js';
import { doc, getDoc } from 'firebase/firestore';


// HIER WIRD DER STRIPE PUBLISHABLE KEY AKTUALISIERT
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51RXvRUD5Lvjon30aMzieGY1n513cwTd8wUG6cmYphSWfdTpsjMzieGY1n513cwTd8wUG6cmYphSWfdTpsK00N3Rtf7Dk');

const auth = getAuth(app);

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
const getBillingDetails = (registration: any, user: User | null): BillingDetailsPayload | null => {
  const baseAddress: CustomerAddress = {
    line1: null, line2: null, city: null, postal_code: null, country: null,
  };
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;

  if (registration.customerType === 'private') {
    if (registration.personalStreet && registration.personalPostalCode && registration.personalCity && registration.personalCountry) {
      baseAddress.line1 = `${registration.personalStreet}${registration.personalHouseNumber ? ` ${registration.personalHouseNumber}` : ''}`;
      baseAddress.postal_code = registration.personalPostalCode;
      baseAddress.city = registration.personalCity;
      baseAddress.country = registration.personalCountry;
    }

    name = (registration.firstName && registration.lastName) ? `${registration.firstName} ${registration.lastName}` : user?.displayName || null;
    email = registration.email || user?.email || null;
    phone = registration.phoneNumber || null;
  } else if (registration.customerType === 'business') {
    if (registration.companyStreet && registration.companyPostalCode && registration.companyCity && registration.companyCountry) {
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

  // --- NEU: Frühe Pflichtdaten-Prüfung und Redirect, bevor irgendetwas anderes passiert ---
  React.useEffect(() => {
    // Hilfsfunktionen für Pflichtdaten aus Context/URL
    const unterkategorieAusPfad = typeof pathParams?.unterkategorie === 'string' ? decodeURIComponent(pathParams.unterkategorie as string) : '';
    const anbieterIdFromUrl = searchParams?.get('anbieterId') ?? '';
    const postalCodeFromUrl = searchParams?.get('postalCode') ?? '';
    const dateFromUrl = searchParams?.get('dateFrom') ?? '';
    const timeUrl = searchParams?.get('time') ?? '';
    const auftragsDauerUrl = searchParams?.get('auftragsDauer') ?? '';
    const priceFromUrl = (() => {
      const priceString = searchParams?.get('price');
      return priceString ? Math.round(parseFloat(priceString) * 100) : null;
    })();
    const descriptionFromUrl = searchParams?.get('description') ?? '';

    // Context/URL-Mix für Pflichtfelder
    const requiredFields = {
      customerType: registration.customerType,
      selectedCategory: registration.selectedCategory || (unterkategorieAusPfad ? findCategoryBySubcategory(unterkategorieAusPfad) : null),
      selectedSubcategory: registration.selectedSubcategory || unterkategorieAusPfad,
      description: registration.description || descriptionFromUrl,
      jobPostalCode: registration.jobPostalCode || postalCodeFromUrl,
      jobDateFrom: registration.jobDateFrom || dateFromUrl,
      jobTimePreference: registration.jobTimePreference || timeUrl,
      selectedAnbieterId: anbieterIdFromUrl || registration.selectedAnbieterId,
      jobDurationString: registration.jobDurationString || auftragsDauerUrl,
      jobTotalCalculatedHours: registration.jobTotalCalculatedHours || (auftragsDauerUrl ? parseInt(auftragsDauerUrl, 10) : null),
      jobCalculatedPriceInCents: registration.jobCalculatedPriceInCents || priceFromUrl,
    };
    // Prüfe auf fehlende Pflichtfelder
    const missing = [];
    if (!requiredFields.customerType) missing.push('Kundentyp');
    if (!requiredFields.selectedCategory) missing.push('Kategorie');
    if (!requiredFields.selectedSubcategory) missing.push('Unterkategorie');
    if (!requiredFields.description || requiredFields.description.trim().length === 0) missing.push('Beschreibung');
    if (!requiredFields.jobPostalCode) missing.push('PLZ');
    if (!requiredFields.jobDateFrom) missing.push('Datum');
    if (!requiredFields.jobTimePreference) missing.push('Uhrzeit');
    if (!requiredFields.selectedAnbieterId) missing.push('Anbieter');
    if (!requiredFields.jobDurationString) missing.push('Dauer');
    if (!requiredFields.jobTotalCalculatedHours || requiredFields.jobTotalCalculatedHours <= 0) missing.push('Gesamtdauer');
    if (!requiredFields.jobCalculatedPriceInCents || requiredFields.jobCalculatedPriceInCents <= 0) missing.push('Preis');

    if (missing.length > 0) {
      // Sofortige Weiterleitung zurück zum Start der Auftragserstellung
      router.replace('/auftrag/get-started');
    }
  }, [registration, searchParams, pathParams, router]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

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

  // Callback, der den vom BestaetigungsContent berechneten Preis (Basispreis) erhält
  const handlePriceCalculatedFromChild = useCallback((priceInCents: number) => {
    console.log(PAGE_LOG, `handlePriceCalculatedFromChild: Neuer Basis-Preis (jobPrice) von Kindkomponente: ${priceInCents} Cents.`);

    // Nur aktualisieren und clientSecret zurücksetzen, wenn der Basis-Preis sich tatsächlich ändert
    if (jobPriceInCents !== priceInCents) {
      console.log(PAGE_LOG, "Basis-Preis (jobPrice) hat sich geändert. Aktualisiere Preise und setze clientSecret zurück.");
      setJobPriceInCents(priceInCents);

      if (priceInCents > 0) {
        // ANPASSUNG: Der Gesamtbetrag, den der Käufer zahlt, ist jetzt identisch mit dem Auftragswert.
        // Die Servicegebühr wird serverseitig vom Guthaben des Anbieters abgezogen.
        setTotalAmountPayableInCents(priceInCents);
        console.log(PAGE_LOG, `Neuer Job-Preis und Gesamtbetrag: ${priceInCents}`);
      } else {
        // Preise zurücksetzen, wenn Basispreis <= 0 ist
        setTotalAmountPayableInCents(null);
      }

      setClientSecret(null); // Client Secret zurücksetzen, da sich der zu zahlende Betrag geändert hat
      setPaymentIntentError(null);
    } else {
      console.log(PAGE_LOG, "Basis-Preis (jobPrice) ist gleich geblieben. Keine Änderungen an clientSecret.");
    }

    // `jobCalculatedPriceInCents` im Context aktualisieren (dies ist der Basispreis)
    if (registration.jobCalculatedPriceInCents !== priceInCents && registration.setJobCalculatedPriceInCents) {
      registration.setJobCalculatedPriceInCents(priceInCents);
      console.log(PAGE_LOG, "registration.jobCalculatedPriceInCents (Basis-Preis) im Context aktualisiert.");
    }
  }, [jobPriceInCents, registration.jobCalculatedPriceInCents, registration.setJobCalculatedPriceInCents]); // BUYER_SERVICE_FEE_RATE entfernt

  const handleDetailsChangeFromChild = useCallback(() => {
    console.log(PAGE_LOG, "BestaetigungsPage: onDetailsChange von Kindkomponente empfangen.");
  }, []);

  // Call the helper function inside a useMemo hook at the top level of the component.
  // This follows the Rules of Hooks and ensures the value is only recomputed when its dependencies change.
  const billingAddressDetails = useMemo(() => {
    return getBillingDetails(registration, currentUser);
  }, [
    registration.customerType,
    registration.personalStreet, registration.personalHouseNumber, registration.personalPostalCode, registration.personalCity, registration.personalCountry,
    registration.firstName, registration.lastName, registration.email, registration.phoneNumber,
    registration.companyName, registration.companyStreet, registration.companyHouseNumber, registration.companyPostalCode, registration.companyCity, registration.companyCountry,
    currentUser
  ]);

  // =================================================================================================
  // EFFECT 1: Handle user authentication state
  // =================================================================================================
  useEffect(() => {
    console.log(PAGE_LOG, "BestaetigungsPage: Auth listener effect setup.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(PAGE_LOG, "BestaetigungsPage: Auth state changed, user:", user?.uid);
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        console.warn(PAGE_WARN, "BestaetigungsPage: No user logged in. Redirecting to login...");
        const currentPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      }
    });
    return () => {
      console.log(PAGE_LOG, "BestaetigungsPage: Cleaning up auth listener effect.");
      unsubscribe();
    };
  }, [router]); // This effect should only run once to set up the listener.

  // =================================================================================================
  // EFFECT 2: Handle data initialization and server communication once the user is authenticated.
  // =================================================================================================
  useEffect(() => {
    const initializeOrder = async () => {
      if (currentUser) {
        if (isInitializing.current) {
          console.log(PAGE_LOG, "BestaetigungsPage: Initialisierung bereits im Gange oder abgeschlossen. Überspringe.");
          return;
        }
        isInitializing.current = true;

        console.log(PAGE_LOG, `BestaetigungsPage: User ${currentUser.uid} authenticated. Starting one-time initialization.`);
        setIsLoadingPageData(true);
        setPageError(null);

        // KORREKTUR: Lade das Benutzerprofil, um den Kundentyp zuverlässig zu bestimmen,
        // anstatt sich nur auf den RegistrationContext zu verlassen.
        let userProfileData: { user_type?: 'private' | 'business' } = {};
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userProfileData = userDocSnap.data() as { user_type?: 'private' | 'business' };
            console.log(PAGE_LOG, `Benutzerprofil für ${currentUser.uid} geladen. Kundentyp: ${userProfileData.user_type}`);
          }
        } catch (e) {
          console.error(PAGE_ERROR, "Fehler beim Laden des Benutzerprofils:", e);
        }

        // --- Datenquelle für DraftData (Priorität: Context > URL-Parameter > Fallbacks) ---
        const customerTypeToUse = registration.customerType || userProfileData.user_type || null;
        // VERSUCH, selectedCategory abzuleiten, falls nicht im Context
        let selectedCategoryToUse = registration.selectedCategory || null; // Beginne mit dem Wert aus dem Context
        if (!selectedCategoryToUse && unterkategorieAusPfad) {
          // Wenn im Context keine Kategorie ist, versuche sie über die Unterkategorie aus dem Pfad zu finden
          const foundCategory = findCategoryBySubcategory(unterkategorieAusPfad);
          if (foundCategory) {
            selectedCategoryToUse = foundCategory;
            console.log(PAGE_LOG, `BestaetigungsPage: Kategorie "${foundCategory}" wurde für Unterkategorie "${unterkategorieAusPfad}" über Mapping gefunden.`);
          } else {
            console.warn(PAGE_WARN, `BestaetigungsPage: Keine Hauptkategorie für Unterkategorie "${unterkategorieAusPfad}" im Mapping gefunden. 'selectedCategoryToUse' bleibt: ${selectedCategoryToUse}`);
          }
        }
        const selectedSubcategoryToUse = registration.selectedSubcategory || unterkategorieAusPfad || null;
        const descriptionToUse = registration.description || descriptionFromUrl || '';
        // FIX: Sicherstellen, dass Adressfelder niemals undefined sind, sondern null
        const jobStreetToUse = registration.jobStreet || null;
        const jobPostalCodeToUse = registration.jobPostalCode || postalCodeFromUrl || null;
        const jobCityToUse = registration.jobCity || null;
        const jobCountryToUse = registration.jobCountry || null;

        const jobDateFromToUse = registration.jobDateFrom || dateFromUrl || null;
        const jobDateToToUse = registration.jobDateTo || null;
        const jobTimePreferenceToUse = registration.jobTimePreference || timeUrl || null;
        // FIX: Prioritize the anbieterId from the URL, as it's the source of truth for this page.
        const selectedAnbieterIdToUse = anbieterIdFromUrl || registration.selectedAnbieterId || null;
        const jobDurationStringToUse = registration.jobDurationString || auftragsDauerUrl || null;
        const jobTotalCalculatedHoursToUse = registration.jobTotalCalculatedHours || (auftragsDauerUrl ? parseInt(auftragsDauerUrl, 10) : null);
        const jobCalculatedPriceInCentsToUse = registration.jobCalculatedPriceInCents || priceFromUrl || null;

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

        // jobCalculatedPriceInCents ist der Basis-Preis des Anbieters
        const initialJobPrice = draftData.jobCalculatedPriceInCents;
        if (jobPriceInCents === null && typeof initialJobPrice === 'number' && initialJobPrice > 0) {
          setJobPriceInCents(initialJobPrice);
          // ANPASSUNG: Der Gesamtbetrag ist jetzt identisch mit dem Auftragswert.
          setTotalAmountPayableInCents(initialJobPrice);
          console.log(PAGE_LOG, "BestaetigungsPage: Initialer Basis-Preis (jobPrice) und Gesamtbetrag aus draftData gesetzt.");
        } else if (jobPriceInCents === null && (initialJobPrice == null || initialJobPrice <= 0)) {
          console.warn(PAGE_WARN, "BestaetigungsPage: jobCalculatedPriceInCents (Basis-Preis) ist ungültig oder 0 aus draftData bei Initialisierung. Preis kann nicht gesetzt werden.");
        }


        // --- Hinzugefügter Debug-Log für draftData vor Validierung ---
        console.log(PAGE_LOG, "BestaetigungsPage: fullDraftData vor Pflichtdatenprüfung:", JSON.stringify(draftData, null, 2));
        // --- ENDE Debug-Log ---

        // --- KORRIGIERTE PFLICHTDATEN-PRÜFUNG ---
        const missingFields: string[] = [];
        if (!draftData.customerType) missingFields.push('Kundentyp');
        // Kategorie und Unterkategorie können null sein, wenn sie nicht ermittelt werden konnten, aber für den Draft sind sie wichtig.
        if (draftData.selectedCategory === null || draftData.selectedCategory === undefined || draftData.selectedCategory.trim() === '') missingFields.push('Kategorie');
        if (draftData.selectedSubcategory === null || draftData.selectedSubcategory === undefined || draftData.selectedSubcategory.trim() === '') missingFields.push('Unterkategorie');
        if (!draftData.description || draftData.description.trim().length === 0) missingFields.push('Auftragsbeschreibung'); // <-- HIER WIRD AUF EINE NICHT-LEERE BESCHREIBUNG GEPRÜFT
        // jobPostalCode und selectedAnbieterId sind kritisch
        if (draftData.jobPostalCode === null || draftData.jobPostalCode === undefined || draftData.jobPostalCode.trim() === '') missingFields.push('Job-Postleitzahl');
        if (draftData.selectedAnbieterId === null || draftData.selectedAnbieterId === undefined || draftData.selectedAnbieterId.trim() === '') missingFields.push('Anbieter-ID');
        // jobDateFrom und jobTimePreference sind ebenfalls wichtig für den Draft
        if (draftData.jobDateFrom === null || draftData.jobDateFrom === undefined || draftData.jobDateFrom.trim() === '') missingFields.push('Auftragsstartdatum');
        if (draftData.jobTimePreference === null || draftData.jobTimePreference === undefined || draftData.jobTimePreference.trim() === '') missingFields.push('Bevorzugte Uhrzeit');
        if (draftData.jobTotalCalculatedHours == null || draftData.jobTotalCalculatedHours <= 0) missingFields.push('Berechnete Gesamtdauer (Stunden)'); // `== null` prüft auf null und undefined
        // Hier den jobCalculatedPriceInCents als Basispreis prüfen
        if (draftData.jobCalculatedPriceInCents == null || draftData.jobCalculatedPriceInCents <= 0) missingFields.push('Berechneter Preis (Cents)'); // `== null` prüft auf null und undefined
        // Rechnungsadresse ist jetzt auch Pflicht für den PaymentIntent
        if (!billingAddressDetails || !billingAddressDetails.address?.line1 || !billingAddressDetails.address?.postal_code || !billingAddressDetails.address?.city || !billingAddressDetails.address?.country) {
          missingFields.push('Vollständige Rechnungsadresse');
        }


        if (missingFields.length > 0) {
          // Detaillierteres Logging der fehlenden Felder
          console.log(PAGE_LOG, "BestaetigungsPage: Inhalt von missingFields Array:", missingFields);
          console.log(PAGE_LOG, "BestaetigungsPage: Ergebnis von missingFields.join(', '):", missingFields.join(', '));
          console.error(PAGE_ERROR, "BestaetigungsPage: Fehlende Pflichtdaten in draftData!", { missingFieldsArray: missingFields, missingFieldsJoined: missingFields.join(', '), fullDraftData: draftData });
          setPageError(`Wichtige Auftragsinformationen fehlen: ${missingFields.join(', ')}. Bitte gehen Sie zurück und vervollständigen Sie Ihre Eingaben.`);
          setIsLoadingPageData(false);
          isInitializing.current = false;
          // Automatische Weiterleitung nach 2 Sekunden
          setTimeout(() => {
            router.push('/auftrag/get-started');
          }, 2000);
          return;
        }
        // --- ENDE KORRIGIERTE PFLICHTDATEN-PRÜFUNG ---

        try {
          // Schritt 1: Temporären Job-Entwurf erstellen oder aktualisieren
          console.log(PAGE_LOG, "BestaetigungsPage: Inhalt von draftData vor dem Senden an createTemporaryJobDraftCallable:", JSON.stringify(draftData, null, 2));

          console.log(PAGE_LOG, "BestaetigungsPage: Rufe createTemporaryJobDraft Callable auf...");
          console.log(PAGE_LOG, `BestaetigungsPage: Sende DraftData für Anbieter-ID: ${draftData.selectedAnbieterId}`); // Added debug log

          // --- KORREKTUR: Zurück zu httpsCallable, um CORS-Probleme zu vermeiden. ---
          // Dies erfordert, dass die 'createTemporaryJobDraft' Firebase Function eine 'onCall' Funktion ist,
          // was die empfohlene Vorgehensweise für Aufrufe aus Client-Anwendungen ist.
          const createTemporaryJobDraftCallable = httpsCallable<TemporaryJobDraftData, TemporaryJobDraftResult>(
            functions,
            'createTemporaryJobDraft'
          );
          const draftResult = await createTemporaryJobDraftCallable(draftData);
          const draftResultData = draftResult.data;

          setTempJobDraftId(draftResultData.tempDraftId);
          console.log(PAGE_LOG, `BestaetigungsPage: Temporärer Job-Entwurf erstellt/aktualisiert: ${draftResultData.tempDraftId}`);

          if (!draftResultData.anbieterStripeAccountId) {
            console.error(PAGE_ERROR, "BestaetigungsPage: Anbieter Stripe Account ID NICHT vom Backend erhalten!");
            setPageError("Wichtige Zahlungsinformationen des Anbieters fehlen. Bitte stellen Sie sicher, dass der Anbieter korrekt registriert ist."); // Klarere Fehlermeldung
            setIsLoadingPageData(false);
            isInitializing.current = false;
            return;
          }
          setAnbieterStripeConnectId(draftResultData.anbieterStripeAccountId);
          console.log(PAGE_LOG, "BestaetigungsPage: Anbieter Stripe Account ID erhalten.");

        } catch (error: unknown) {
          console.error(PAGE_ERROR, "BestaetigungsPage: FEHLER bei createTemporaryJobDraft:", error);
          let specificErrorMessage = 'Ein Fehler ist bei der Auftragsvorbereitung aufgetreten.';
          if (error instanceof FunctionsError) {
            if (error.code === 'not-found' || error.code === 'failed-precondition') {
              specificErrorMessage = 'Der ausgewählte Anbieter ist nicht mehr verfügbar oder existiert nicht. Bitte wählen Sie einen anderen Anbieter aus.';
            } else {
              specificErrorMessage = `Fehler bei der Auftragsvorbereitung (${error.code}): ${error.message}`;
            }
          } else if (error instanceof Error) {
            specificErrorMessage = `Fehler bei der Auftragsvorbereitung: ${error.message}`;
          }
          setPageError(specificErrorMessage);
          setIsLoadingPageData(false);
          isInitializing.current = false;
          return; // Breche die Initialisierung hier ab
        }

        // Schritt 2: Stripe-Kunden-ID abrufen oder erstellen
        try {
          // Daten für Stripe-Kundenaufruf vorbereiten
          const emailForStripe = billingAddressDetails?.email || currentUser.email;
          if (!emailForStripe) {
            console.error(PAGE_ERROR, "BestaetigungsPage: E-Mail für Stripe-Kunden konnte nicht ermittelt werden.");
            setPageError("E-Mail für die Zahlungsabwicklung fehlt. Bitte Profil vervollständigen oder erneut versuchen.");
            setIsLoadingPageData(false);
            isInitializing.current = false;
            return;
          }

          // Daten für Stripe-Kundenaufruf vorbereiten
          const stripeCustomerPayload: GetOrCreateStripeCustomerPayload = {
            email: emailForStripe,
            name: billingAddressDetails?.name || currentUser.displayName || undefined,
            phone: billingAddressDetails?.phone || undefined,
            address: billingAddressDetails?.address || undefined,
          };


          console.log(PAGE_LOG, `BestaetigungsPage: Rufe getOrCreateStripeCustomer für User ${currentUser.uid} auf mit Payload:`, JSON.stringify(stripeCustomerPayload, null, 2));
          const getOrCreateStripeCustomerCallable = httpsCallable<GetOrCreateStripeCustomerPayload, GetOrCreateStripeCustomerResult>(
            functions,
            'getOrCreateStripeCustomer'
          );
          const customerResult = await getOrCreateStripeCustomerCallable(stripeCustomerPayload);
          setKundeStripeCustomerId(customerResult.data.stripeCustomerId);
          console.log(PAGE_LOG, `BestaetigungsPage: Stripe Customer ID erhalten: ${customerResult.data.stripeCustomerId}`);

        } catch (error) {
          console.error(PAGE_ERROR, "BestaetigungsPage: FEHLER bei getOrCreateStripeCustomer:", error);
          let specificErrorMessage = 'Ein Fehler bei der Synchronisierung Ihres Kundenprofils ist aufgetreten.';
          if (error instanceof FunctionsError) {
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
    currentUser,
    // Specific registration properties to avoid re-running on every context change
    registration.customerType, registration.selectedCategory, registration.selectedSubcategory,
    registration.description, registration.jobStreet, registration.jobPostalCode,
    registration.jobCity, registration.jobCountry, registration.jobDateFrom,
    registration.jobDateTo, registration.jobTimePreference, registration.selectedAnbieterId,
    registration.jobDurationString, registration.jobTotalCalculatedHours, registration.jobCalculatedPriceInCents,
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
    router
  ]);

  // =================================================================================================
  // ZWEITER useEffect-HOOK: Abrufen des clientSecret für Stripe Payments
  // =================================================================================================
  useEffect(() => {
    const fetchStripeClientSecret = async () => {
      if (
        !currentUser || !kundeStripeCustomerId || !tempJobDraftId || !anbieterStripeConnectId ||
        totalAmountPayableInCents === null || totalAmountPayableInCents <= 0 || // Prüfe totalAmountPayableInCents
        jobPriceInCents === null || jobPriceInCents <= 0 // jobPriceInCents wird an Backend gesendet
      ) {
        // console.log(PAGE_LOG, "Bedingungen für fetchStripeClientSecret NICHT erfüllt.", {
        //   currentUser: !!currentUser, kundeStripeCustomerId: !!kundeStripeCustomerId, tempJobDraftId: !!tempJobDraftId, anbieterStripeConnectId: !!anbieterStripeConnectId,
        //   totalAmountPayableInCents, jobPriceInCents
        // });
        return;
      }

      // Rechnungsadresse ist jetzt Pflicht für den PaymentIntent
      if (!billingAddressDetails || !billingAddressDetails.address?.line1 || !billingAddressDetails.address?.postal_code || !billingAddressDetails.address?.city || !billingAddressDetails.address?.country) {
        setPaymentIntentError("Bitte stellen Sie eine vollständige Rechnungsadresse bereit.");
        return;
      }

      // Hole nur ein neues clientSecret, wenn es noch keins gibt ODER wenn sich die Preisdetails geändert haben.
      // Die Bedingung `!clientSecret` deckt den Fall ab, dass es initial null ist oder durch Preisänderung zurückgesetzt wurde.
      if (clientSecret && !loadingPaymentIntent /* Preisänderung setzt clientSecret zurück, daher keine explizite Preisprüfung hier nötig */) {
        console.log(PAGE_LOG, "Client Secret ist bereits vorhanden und Betrag unverändert. Kein Neuladen erzwungen.");
        return;
      }
      console.log(PAGE_LOG, "Bedingungen für fetchStripeClientSecret erfüllt. Lade/Aktualisiere clientSecret.");

      setLoadingPaymentIntent(true);
      setPaymentIntentError(null);
      // setClientSecret(null); // Nicht hier explizit auf null setzen, das passiert bei Preisänderung

      try {
        const payload: {
          amount: number; // Gesamtbetrag, den der Käufer zahlt (für den PaymentIntent)
          jobPriceInCents: number; // Ursprünglicher Preis des Dienstleisters (für Backend-Berechnung der Fees)
          currency: string;
          connectedAccountId: string;
          // platformFee wird NICHT mehr hier gesendet, da Backend es aus jobPriceInCents berechnet
          taskId: string;
          firebaseUserId: string;
          stripeCustomerId: string;
          customerName?: string;
          customerEmail?: string;
          billingDetails?: BillingDetailsPayload;
        } = {
          amount: totalAmountPayableInCents, // HIER der GESAMT-Betrag, den der Kunde zahlt
          jobPriceInCents: jobPriceInCents, // HIER der BASI-Preis, den der Anbieter festlegt
          currency: 'eur',
          connectedAccountId: anbieterStripeConnectId,
          taskId: tempJobDraftId,
          firebaseUserId: currentUser.uid,
          stripeCustomerId: kundeStripeCustomerId,
          customerName: currentUser.displayName || `${registration.firstName || ''} ${registration.lastName || ''}`,
          customerEmail: currentUser.email || registration.email || '',
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
    currentUser, kundeStripeCustomerId, tempJobDraftId, anbieterStripeConnectId, // Core IDs
    totalAmountPayableInCents, jobPriceInCents, // Preis-States
    clientSecret, loadingPaymentIntent, // States für den Ladevorgang
    // Abhängigkeiten für die Rechnungsadresse (falls sie sich ändern, muss clientSecret neu geladen werden)
    billingAddressDetails,
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

    // Weiterleitung zum Dashboard nach erfolgreicher Zahlung.
    // Eine kurze Verzögerung gibt dem Benutzer Zeit, die Erfolgsmeldung zu lesen.
    setTimeout(() => {
      if (currentUser?.uid) {
        router.push(`/dashboard/user/${currentUser.uid}`);
      } else {
        router.push('/dashboard'); // Fallback, falls die User-ID nicht verfügbar ist
      }
    }, 3000); // 3 Sekunden Verzögerung
  };

  const handlePaymentError = (errorMessage: string) => {
    console.error(PAGE_ERROR, `BestaetigungsPage: Zahlungsfehler von StripeCardCheckout: ${errorMessage}`);
    setPaymentMessage(`Fehler bei der Zahlung: ${errorMessage}`);
  };

  // Gesamtladezustand berücksichtigt nun auch das Laden der Registrierungsdaten
  const isLoadingOverall = isLoadingPageData || loadingPaymentIntent;

  const dataIsReadyForCheckoutForm =
    clientSecret && kundeStripeCustomerId && tempJobDraftId && currentUser &&
    anbieterStripeConnectId && !paymentIntentError && !pageError &&
    totalAmountPayableInCents !== null && totalAmountPayableInCents > 0 && // Verwende totalAmountPayableInCents
    jobPriceInCents !== null && // jobPriceInCents ist auch wichtig
    // NEU: Überprüfen, ob billingAddressDetails vorhanden und vollständig sind
    billingAddressDetails && billingAddressDetails.address?.line1 && billingAddressDetails.address?.postal_code &&
    billingAddressDetails.address?.city && billingAddressDetails.address?.country;

  // Hilfsvariable, um zu prüfen, ob alle Voraussetzungen für das Abrufen eines clientSecret erfüllt sind
  const prerequisitesForClientSecretFetchAreMet =
    currentUser && kundeStripeCustomerId && tempJobDraftId && anbieterStripeConnectId &&
    totalAmountPayableInCents !== null && totalAmountPayableInCents > 0 && jobPriceInCents !== null && jobPriceInCents > 0 &&
    billingAddressDetails && billingAddressDetails.address?.line1 && billingAddressDetails.address?.postal_code &&
    billingAddressDetails.address?.city && billingAddressDetails.address?.country &&
    !pageError && !paymentIntentError;

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
  const paymentElementOptions = useMemo(() => ({
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
    // Optional: Layout anpassen
    layout: 'tabs' as const,
  }), [billingAddressDetails]);

  if (isLoadingOverall) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        {isLoadingOverall ? "Seite wird vorbereitet..." : "Zahlung wird initialisiert..."}
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
                  <p className="font-medium">{billingAddressDetails.name || currentUser?.displayName || `${registration.firstName || ''} ${registration.lastName || ''}`}</p>
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

            {/* NEU: Vereinfachte Anzeige der Preisdetails */}
            {totalAmountPayableInCents !== null && (
              <div className="mb-6 p-4 border rounded-md bg-white">
                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><FiCreditCard className="mr-2" /> Preisübersicht</h3>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-lg">
                  <span>Gesamtbetrag:</span>
                  <span>{(totalAmountPayableInCents / 100).toFixed(2)} EUR</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Der angezeigte Betrag ist der Endpreis. Die Servicegebühr wird vom Dienstleister getragen.
                </p>
              </div>
            )}


            {/* Fall 1: Alles bereit, clientSecret vorhanden -> Formular anzeigen */}
            {clientSecret && dataIsReadyForCheckoutForm ? (
              <Elements stripe={stripePromise} options={{ clientSecret }} key={clientSecret}>
                <div> {/* Wrapper für PaymentElement und StripeCardCheckout */}
                  {/* Eingabe der Zahlungsmethode */}
                  <div className="mb-6 p-4 border rounded-md bg-white">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><FiCreditCard className="mr-2" /> Zahlungsmethode</h3>
                    <p className="text-sm text-gray-600 mb-3">Geben Sie Ihre Zahlungsinformationen ein. Diese wird für zukünftige Buchungen gespeichert.</p>
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
                      customerName={currentUser!.displayName || `${registration.firstName || ''} ${registration.lastName || ''}`}
                      customerEmail={currentUser!.email || registration.email || ''}
                      firebaseUserId={currentUser!.uid}
                      stripeCustomerId={kundeStripeCustomerId!}
                      taskId={tempJobDraftId!}
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                    />
                  )}
                </div>
              </Elements>
              /* Fall 2: Entweder allgemeines Laden ODER clientSecret wird gerade (neu) geladen */
            ) : isLoadingOverall || (prerequisitesForClientSecretFetchAreMet && !clientSecret && !paymentIntentError && !pageError) ? (
              <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                <FiLoader className="animate-spin text-3xl text-[#14ad9f] mb-3" />
                <span>
                  {isLoadingPageData
                    ? "Seitendaten werden geladen..."
                    : "Zahlungsformular wird vorbereitet..."}
                </span>
              </div>
              /* Fall 3: Grundlegende Daten fehlen oder es gibt einen Fehler, der das Laden des clientSecret verhindert */
            ) : ( // Dies ist der 'else'-Teil des zweiten Ternary-Operators
              !paymentMessage && ( // Bedingtes Rendern innerhalb des 'else'-Blocks
                <div className="flex flex-col items-center justify-center p-6 text-gray-600">
                  <span>{pageError || paymentIntentError || "Wichtige Informationen für die Zahlung fehlen. Bitte überprüfen Sie die vorherigen Schritte."}</span>
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 text-xs text-left bg-gray-100 p-2 rounded">
                      <p className="font-semibold">Debug-Info (Bedingung für Zahlungsformular nicht erfüllt):</p>
                      <p>clientSecret: {String(!!clientSecret)}</p>
                      <p>kundeStripeCustomerId: {String(!!kundeStripeCustomerId)}</p>
                      <p>tempJobDraftId: {String(!!tempJobDraftId)}</p>
                      <p>currentUser: {String(!!currentUser)}</p>
                      <p>anbieterStripeConnectId: {String(!!anbieterStripeConnectId)}</p>
                      <p>pageError: {String(!!pageError)}</p>
                      <p>paymentIntentError: {String(!!paymentIntentError)}</p>
                      <p>jobPriceInCents: {String(!!jobPriceInCents)}</p>
                      <p>totalAmountPayableInCents: {String(!!totalAmountPayableInCents)}</p>
                      <p className="font-semibold mt-2">Billing Address Details Debug:</p>
                      <p>billingAddressDetails: {String(!!billingAddressDetails)}</p>
                      <p>address.line1: {String(billingAddressDetails?.address?.line1)}</p>
                      <p>address.postal_code: {String(billingAddressDetails?.address?.postal_code)}</p>
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