'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Loader2, AlertCircle, CreditCard, Shield, CheckCircle, ArrowLeft, Clock, MapPin, Calendar, FileText, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegistration } from '@/contexts/Registration-Context';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clients';
import SimpleStripeForm from '@/components/SimpleStripeForm';
import BestaetigungsContent from './components/BestaetigungsContent';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Interface für temporären Job-Entwurf
interface TemporaryJobDraftData {
  customerType: 'private' | 'business';
  selectedCategory: string;
  selectedSubcategory: string;
  description: string;
  jobPostalCode: string;
  jobDateFrom: string;
  jobTimePreference: string;
  selectedAnbieterId: string;
  jobDurationString: string;
  jobTotalCalculatedHours: number;
  jobCalculatedPriceInCents: number;
}

interface TemporaryJobDraftResult {
  tempDraftId: string;
  anbieterStripeAccountId: string;
}

// Interface für Firebase Callable Function Result
interface FirebaseCallableResult<T> {
  data: T;
}

export default function BestaetigungsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathParams = useParams();
  const { firebaseUser, loading: authLoading } = useAuth();
  const registration = useRegistration();

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [anbieterStripeAccountId, setAnbieterStripeAccountId] = useState<string | null>(null);
  const [tempJobDraftId, setTempJobDraftId] = useState<string | null>(null);
  const [forceRerender, setForceRerender] = useState(0); // Force re-render trigger

  // Debug: Log bei jedem Render

  // States für BestaetigungsContent
  const [jobPriceInCents, setJobPriceInCents] = useState<number | null>(null);
  const [_totalAmountPayableInCents, setTotalAmountPayableInCents] = useState<number | null>(null);

  // Callback für Preisberechnung von BestaetigungsContent
  const handlePriceCalculatedFromChild = useCallback(
    (priceInCents: number) => {
      setJobPriceInCents(priceInCents);
      setTotalAmountPayableInCents(priceInCents); // Gesamtbetrag = Jobpreis
      // PaymentIntent automatisch erstellen sobald Preis berechnet wurde
      if (firebaseUser && priceInCents > 0) {
        createPaymentIntent(priceInCents);
      }
    },
    [firebaseUser]
  );

  const handleDetailsChangeFromChild = useCallback(() => {
    // Reset clientSecret wenn sich Details ändern
    setClientSecret(null);
    setTempJobDraftId(null);
    // PaymentIntent neu erstellen wenn sich Details ändern
    if (firebaseUser && jobPriceInCents && jobPriceInCents > 0) {
      setTimeout(() => createPaymentIntent(jobPriceInCents), 100);
    }
  }, [firebaseUser, jobPriceInCents]);

  // URL Parameter extrahieren
  const urlParams = useMemo(() => {
    const unterkategorie =
      typeof pathParams?.unterkategorie === 'string'
        ? decodeURIComponent(pathParams.unterkategorie)
        : '';

    return {
      anbieterId: searchParams?.get('anbieterId') || '',
      unterkategorie,
      postalCode: searchParams?.get('postalCode') || '',
      dateFrom: searchParams?.get('dateFrom') || searchParams?.get('additionalData[date]') || '',
      dateTo: searchParams?.get('dateTo') || '',
      time: searchParams?.get('time') || searchParams?.get('additionalData[time]') || '',
      duration:
        searchParams?.get('auftragsDauer') || searchParams?.get('additionalData[duration]') || '',
      description: searchParams?.get('description') || '',
      price: (() => {
        const totalCost = searchParams?.get('additionalData[totalcost]');
        const price = searchParams?.get('price');
        if (totalCost) return parseInt(totalCost, 10);
        if (price) return Math.round(parseFloat(price) * 100);
        return 0;
      })(),
    };
  }, [searchParams, pathParams]);

  // Prüfe Authentication - NICHT während Payment Flow umleiten
  useEffect(() => {
    // Längere Wartezeit für Auth nach Registration
    const authCheckDelay = 2000; // 2 Sekunden warten

    const authCheckTimer = setTimeout(() => {
      if (authLoading) return;

      // WICHTIG: Nicht umleiten, wenn bereits ein Payment-Flow läuft (clientSecret vorhanden)
      if (!firebaseUser && !clientSecret && !isLoading) {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/register/user?redirectTo=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Alle URL-Parameter vorhanden?
      const {
        anbieterId,
        unterkategorie,
        postalCode,
        dateFrom,
        time,
        duration,
        description,
        price,
      } = urlParams;

      if (
        !anbieterId ||
        !unterkategorie ||
        !postalCode ||
        !dateFrom ||
        !time ||
        !duration ||
        !description ||
        !price
      ) {
        setError('Nicht alle erforderlichen Daten vorhanden. Bitte starten Sie den Auftrag neu.');
        return;
      }

      // Dauer validieren
      const hours = parseFloat(duration);
      if (isNaN(hours) || hours <= 0) {
        setError('Ungültige Auftragsdauer.');
        return;
      }
    }, authCheckDelay);

    // Cleanup timer
    return () => clearTimeout(authCheckTimer);
  }, [firebaseUser, authLoading, urlParams, router, clientSecret, isLoading, setError]);

  // Auto-PaymentIntent-Erstellung wenn User + Preis vorhanden
  useEffect(() => {
    if (firebaseUser && jobPriceInCents && jobPriceInCents > 0 && !clientSecret && !isLoading) {
      // Kleine Verzögerung um sicherzustellen, dass alle States gesetzt sind
      const timer = setTimeout(() => {
        createPaymentIntent(jobPriceInCents);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [firebaseUser, jobPriceInCents, clientSecret, isLoading]);

  // Payment Intent erstellen - extrahiert aus handlePaymentClick für automatische Erstellung
  const createPaymentIntent = async (priceInCents: number) => {
    if (!firebaseUser || !priceInCents || priceInCents <= 0) {
      return;
    }

    // Avoid duplicate PaymentIntent creation
    if (clientSecret || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Sofort ein fresh Auth Token holen
      const freshIdToken = await firebaseUser.getIdToken(true); // force refresh

      // 1. Stripe Customer ID erstellen oder abrufen
      const customerResponse = await fetch('/api/stripe/get-or-create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshIdToken}`,
        },
        body: JSON.stringify({
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'Kunde',
          firebaseUserId: firebaseUser.uid,
        }),
      });

      const customerData = await customerResponse.json();

      if (!customerResponse.ok || !customerData.stripeCustomerId) {
        throw new Error(customerData.error || 'Fehler beim Erstellen des Stripe Kunden');
      }

      const stripeCustomerId = customerData.stripeCustomerId;

      // 2. Temporären Job-Entwurf erstellen
      const hours = parseFloat(urlParams.duration);
      const orderDataForDraft: TemporaryJobDraftData = {
        customerType: hours >= 8 ? 'business' : 'private', // 8+ Stunden = B2B, weniger = B2C
        selectedCategory: urlParams.unterkategorie.split(' ')[0] || 'Service',
        selectedSubcategory: urlParams.unterkategorie,
        description: urlParams.description,
        jobPostalCode: urlParams.postalCode.split(',')[0] || urlParams.postalCode,
        jobDateFrom: urlParams.dateFrom + (urlParams.time ? ` ${urlParams.time}` : ''),
        jobTimePreference: urlParams.time || 'Ganztägig',
        selectedAnbieterId: urlParams.anbieterId,
        jobDurationString: urlParams.duration,
        jobTotalCalculatedHours: hours,
        jobCalculatedPriceInCents: priceInCents,
      };

      // Firebase Callable Function direkt aufrufen
      const createTemporaryJobDraft = httpsCallable(functions, 'createTemporaryJobDraft');
      const tempDraftResult = (await createTemporaryJobDraft(
        orderDataForDraft
      )) as FirebaseCallableResult<TemporaryJobDraftResult>;

      if (!tempDraftResult.data || !tempDraftResult.data.tempDraftId) {
        throw new Error('Fehler beim Erstellen des Job-Entwurfs');
      }

      const tempDraftId = tempDraftResult.data.tempDraftId;
      const stripeAccountId = tempDraftResult.data.anbieterStripeAccountId;

      setTempJobDraftId(tempDraftId);
      setAnbieterStripeAccountId(stripeAccountId);

      // 3. Billing Details vorbereiten
      const billingDetails: any = {
        name: firebaseUser.displayName || 'Kunde',
        email: firebaseUser.email || '',
        address: {
          line1: 'Musterstraße 1',
          line2: undefined,
          city: 'Berlin',
          postal_code: '10115',
          country: 'DE',
        },
      };

      // 4. Payment Intent erstellen
      const idToken = await firebaseUser.getIdToken();

      const paymentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: priceInCents,
          jobPriceInCents: priceInCents,
          currency: 'eur',
          connectedAccountId: stripeAccountId,
          taskId: tempDraftId,
          firebaseUserId: firebaseUser.uid,
          stripeCustomerId: stripeCustomerId,
          customerName: firebaseUser.displayName || 'Kunde',
          customerEmail: firebaseUser.email || '',
          billingDetails: billingDetails,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentData.clientSecret) {
        throw new Error(paymentData.error || 'Fehler beim Erstellen der Zahlung');
      }

      setClientSecret(paymentData.clientSecret);

      // Force re-render durch State-Update
      setForceRerender(prev => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unbekannter Fehler bei der Zahlungsvorbereitung'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Veralteter handlePaymentClick - wird jetzt nur noch für finale Zahlung verwendet
  const handlePaymentClick = async () => {
    if (!firebaseUser || !jobPriceInCents || jobPriceInCents <= 0) {
      setError(
        'Preis wurde noch nicht berechnet oder User nicht eingeloggt. Bitte warten Sie einen Moment.'
      );
      return;
    }

    // WICHTIG: Auth-Daten zwischenspeichern für den Fall, dass Auth während Payment verloren geht
    const authBackup = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    };

    setIsLoading(true);
    setError(null);

    try {
      // Sofort ein fresh Auth Token holen
      const freshIdToken = await firebaseUser.getIdToken(true); // force refresh

      // 1. Stripe Customer ID erstellen oder abrufen
      const customerResponse = await fetch('/api/stripe/get-or-create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshIdToken}`,
        },
        body: JSON.stringify({
          email: authBackup.email,
          name: authBackup.displayName || 'Kunde',
          firebaseUserId: authBackup.uid,
        }),
      });

      const customerData = await customerResponse.json();

      if (!customerResponse.ok || !customerData.stripeCustomerId) {
        throw new Error(customerData.error || 'Fehler beim Erstellen des Stripe Kunden');
      }

      const stripeCustomerId = customerData.stripeCustomerId;

      // 2. Temporären Job-Entwurf erstellen

      // Erstelle orderData aus URL-Parametern und berechneten Werten
      const hours = parseFloat(urlParams.duration);
      const orderDataForDraft: TemporaryJobDraftData = {
        customerType: registration.customerType || 'private',
        selectedCategory: registration.selectedCategory || 'Gastronomie',
        selectedSubcategory: urlParams.unterkategorie,
        description: decodeURIComponent(urlParams.description),
        jobPostalCode: urlParams.postalCode,
        jobDateFrom: urlParams.dateFrom,
        jobTimePreference: urlParams.time,
        selectedAnbieterId: urlParams.anbieterId,
        jobDurationString: `${urlParams.duration} Stunden`,
        jobTotalCalculatedHours: hours,
        jobCalculatedPriceInCents: jobPriceInCents,
      };

      // Debug: Log die Daten die gesendet werden

      const createDraftCallable = httpsCallable<TemporaryJobDraftData, TemporaryJobDraftResult>(
        functions,
        'createTemporaryJobDraft'
      );

      const draftResult = await createDraftCallable(orderDataForDraft);

      const { tempDraftId, anbieterStripeAccountId: stripeAccountId } = draftResult.data;

      setTempJobDraftId(tempDraftId);
      setAnbieterStripeAccountId(stripeAccountId);

      // 3. Lade Benutzeradresse für Billing Details

      let billingDetails: {
        name?: string;
        email?: string;
        address?: {
          line1?: string;
          line2?: string;
          city?: string;
          postal_code?: string;
          country?: string;
        };
      } | null = null;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/clients');

        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Erstelle Billing Details aus Firebase-Daten oder Registration Context
          const street = userData.street || registration.personalStreet;
          const postalCode = userData.postalCode || registration.personalPostalCode;
          const city = userData.city || registration.personalCity;
          const country = userData.country || registration.personalCountry || 'DE';

          if (street && postalCode && city) {
            billingDetails = {
              name: userData.displayName
                ? userData.displayName
                : firebaseUser.displayName || 'Kunde',
              email: userData.email || firebaseUser.email,
              address: {
                line1: street,
                line2: undefined,
                city: city,
                postal_code: postalCode,
                country: country,
              },
            };
          }
        }
      } catch (_addressError) {}

      // Fallback Billing Details wenn keine Adresse gefunden
      if (!billingDetails) {
        billingDetails = {
          name: firebaseUser.displayName || 'Kunde',
          email: firebaseUser.email || '',
          address: {
            line1: 'Musterstraße 1',
            line2: undefined,
            city: 'Berlin',
            postal_code: '10115',
            country: 'DE',
          },
        };
      }

      // 4. Payment Intent erstellen

      const idToken = await firebaseUser.getIdToken();

      const paymentResponse = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: jobPriceInCents,
          jobPriceInCents: jobPriceInCents,
          currency: 'eur',
          connectedAccountId: stripeAccountId,
          taskId: tempDraftId,
          firebaseUserId: firebaseUser.uid,
          stripeCustomerId: stripeCustomerId,
          customerName: firebaseUser.displayName || 'Kunde',
          customerEmail: firebaseUser.email || '',
          billingDetails: billingDetails,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentData.clientSecret) {
        throw new Error(paymentData.error || 'Fehler beim Erstellen der Zahlung');
      }

      setClientSecret(paymentData.clientSecret);

      // Force re-render durch State-Update
      setForceRerender(prev => prev + 1);
      setTimeout(() => {}, 100);
    } catch (err) {
      // Detaillierte Fehlerbehandlung für Firebase Functions
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string; details?: unknown };

        if (firebaseError.code === 'functions/invalid-argument') {
          setError(`Ungültige Auftragsdaten: ${firebaseError.message}`);
        } else if (firebaseError.code === 'functions/unauthenticated') {
          setError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
        } else {
          setError(`Firebase Fehler (${firebaseError.code}): ${firebaseError.message}`);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Fehler beim Vorbereiten der Zahlung');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Payment Success Handler
  const handlePaymentSuccess = (_paymentIntentId: string) => {
    // Reset Registration Context
    if (registration.resetRegistrationData) {
      registration.resetRegistrationData();
    }

    // Weiterleitung zum Dashboard
    setTimeout(() => {
      router.push(`/dashboard/user/${firebaseUser?.uid}`);
    }, 2000);
  };

  // Payment Error Handler
  const handlePaymentError = (errorMessage: string) => {
    setError(`Zahlungsfehler: ${errorMessage}`);
    setClientSecret(null); // Reset für erneuten Versuch
  };

  // Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 py-20">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex justify-center items-center">
            <Loader2 className="animate-spin text-4xl text-white mr-3" />
            <span className="text-white font-semibold text-lg">Seite wird vorbereitet...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link 
              href="/auftrag/get-started"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Zurueck</span>
            </Link>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 -mt-8 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Fehler</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/auftrag/get-started')}
              className="w-full h-12 bg-[#14ad9f] hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
            >
              Auftrag neu starten
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Validiere URL-Parameter
  const { anbieterId, unterkategorie, postalCode, dateFrom, time, duration, description, price } =
    urlParams;
  if (
    !anbieterId ||
    !unterkategorie ||
    !postalCode ||
    !dateFrom ||
    !time ||
    !duration ||
    !description ||
    !price
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link 
              href="/auftrag/get-started"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Zurueck</span>
            </Link>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 -mt-8 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Unvollstaendige Auftragsdaten</h3>
            <p className="text-gray-600 mb-6">Bitte starten Sie den Auftrag erneut.</p>
            <button
              onClick={() => router.push('/auftrag/get-started')}
              className="w-full h-12 bg-[#14ad9f] hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
            >
              Neuen Auftrag starten
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 py-20">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 flex justify-center items-center">
              <Loader2 className="animate-spin text-4xl text-white mr-3" />
              <span className="text-white font-semibold text-lg">Seite wird aufgebaut...</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-700 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: 'url(/images/hero-pattern.svg)' }}
          />
          <div className="absolute inset-0 bg-black/10" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Link 
                href="/auftrag/get-started"
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Zurueck zur Suche</span>
              </Link>
              <Link href="/" className="text-2xl font-bold text-white">
                Taskilo
              </Link>
            </div>
            
            {/* Hero Content */}
            <div className="text-center pb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Fast geschafft</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Bestaetigung & Zahlung
                </h1>
                <p className="text-lg text-white/90 max-w-2xl mx-auto">
                  Pruefen Sie Ihre Buchungsdetails und schliessen Sie die Zahlung sicher ab
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Order Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#14ad9f]" />
                    Auftragsdetails
                  </h2>
                </div>
                <div className="p-6">
                  <BestaetigungsContent
                    anbieterId={urlParams.anbieterId}
                    unterkategorie={urlParams.unterkategorie}
                    postalCodeJob={urlParams.postalCode}
                    initialJobDateFrom={urlParams.dateFrom}
                    initialJobDateTo={urlParams.dateTo}
                    initialJobTime={urlParams.time}
                    initialJobDescription={urlParams.description}
                    initialJobDurationString={urlParams.duration.toString()}
                    onPriceCalculated={handlePriceCalculatedFromChild}
                    onDetailsChange={handleDetailsChangeFromChild}
                  />
                </div>
              </div>

              {/* Order Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Datum</p>
                    <p className="text-sm font-semibold text-gray-900">{urlParams.dateFrom}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Dauer</p>
                    <p className="text-sm font-semibold text-gray-900">{urlParams.duration} Stunden</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-[#14ad9f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ort</p>
                    <p className="text-sm font-semibold text-gray-900">{urlParams.postalCode}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Payment */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-8">
                {/* Payment Header */}
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#14ad9f]" />
                    Sichere Zahlung
                  </h2>
                </div>

                <div className="p-6 space-y-6">
                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{error}</p>
                    </motion.div>
                  )}

                  {/* Price Summary */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Preisuebersicht</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Dienstleistung</span>
                        <span className="font-medium text-gray-900">
                          {jobPriceInCents ? (jobPriceInCents / 100).toFixed(2) : '0.00'} EUR
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-3 flex justify-between">
                        <span className="font-semibold text-gray-900">Gesamtbetrag</span>
                        <span className="text-xl font-bold text-[#14ad9f]">
                          {jobPriceInCents ? (jobPriceInCents / 100).toFixed(2) : '0.00'} EUR
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Inkl. MwSt. Servicegebuehr wird vom Dienstleister getragen.
                    </p>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Rechnungsadresse</h3>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium text-gray-900">{firebaseUser?.displayName || 'Kunde'}</p>
                      <p className="text-xs text-gray-500 mt-1">Adresse wird beim Bezahlen erfasst</p>
                    </div>
                  </div>

                  {/* Stripe Payment Form */}
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#14ad9f]" />
                      Zahlungsmethode
                    </h3>
                    
                    {clientSecret ? (
                      <SimpleStripeForm
                        clientSecret={clientSecret}
                        amount={urlParams.price}
                        anbieterDetails={{
                          id: urlParams.anbieterId,
                          companyName: 'Dienstleister',
                          category: urlParams.unterkategorie,
                        }}
                        jobDetails={{
                          category: urlParams.unterkategorie || '',
                          description: urlParams.description || '',
                          dateFrom: urlParams.dateFrom || '',
                          dateTo: urlParams.dateTo || '',
                          duration: urlParams.duration ? parseInt(urlParams.duration) : 0,
                        }}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <div className="relative">
                          <div className="animate-pulse space-y-3">
                            <div className="bg-gray-200 h-12 w-full rounded-xl"></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-gray-200 h-12 rounded-xl"></div>
                              <div className="bg-gray-200 h-12 rounded-xl"></div>
                            </div>
                            <div className="bg-gray-200 h-12 w-full rounded-xl"></div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                              <Loader2 className="animate-spin text-[#14ad9f]" size={20} />
                              <span className="text-sm font-medium text-gray-700">Wird geladen...</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trust Indicators */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#14ad9f]" />
                      <span>SSL verschluesselt</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#14ad9f]" />
                      <span>Stripe gesichert</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
