'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegistration } from '@/contexts/Registration-Context';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clients';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { StripeCardCheckout } from '@/components/CheckoutForm';
import BestaetigungsContent from './components/BestaetigungsContent';

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
  console.log(
    '[DEBUG] Component Render - clientSecret:',
    clientSecret ? 'vorhanden' : 'null',
    'forceRerender:',
    forceRerender
  );

  // States für BestaetigungsContent
  const [jobPriceInCents, setJobPriceInCents] = useState<number | null>(null);
  const [_totalAmountPayableInCents, setTotalAmountPayableInCents] = useState<number | null>(null);

  // Callback für Preisberechnung von BestaetigungsContent
  const handlePriceCalculatedFromChild = useCallback((priceInCents: number) => {
    setJobPriceInCents(priceInCents);
    setTotalAmountPayableInCents(priceInCents); // Gesamtbetrag = Jobpreis
  }, []);

  const handleDetailsChangeFromChild = useCallback(() => {
    // Reset clientSecret wenn sich Details ändern
    setClientSecret(null);
  }, []);

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
        console.log('[DEBUG] Auth-Guard: User nicht eingeloggt nach 2s, leite zur Registration um');
        const currentPath = `${window.location.pathname}${window.location.search}`;
        router.push(`/register/user?redirectTo=${encodeURIComponent(currentPath)}`);
        return;
      }

      console.log('[DEBUG] Auth-Guard: User eingeloggt:', firebaseUser?.uid);

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

  // Payment Intent erstellen
  const handlePaymentClick = async () => {
    if (!firebaseUser || !jobPriceInCents || jobPriceInCents <= 0) {
      setError(
        'Preis wurde noch nicht berechnet oder User nicht eingeloggt. Bitte warten Sie einen Moment.'
      );
      return;
    }

    console.log('[DEBUG] Payment-Flow startet, Auth-State:', {
      firebaseUser: firebaseUser ? 'vorhanden' : 'null',
      uid: firebaseUser?.uid,
      email: firebaseUser?.email,
    });

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
      console.log('[DEBUG] Fresh Auth Token erhalten');

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
      console.log('[DEBUG] orderDataForDraft:', orderDataForDraft);
      console.log('[DEBUG] registration context:', {
        customerType: registration.customerType,
        selectedCategory: registration.selectedCategory,
      });

      const createDraftCallable = httpsCallable<TemporaryJobDraftData, TemporaryJobDraftResult>(
        functions,
        'createTemporaryJobDraft'
      );

      console.log('[DEBUG] Calling createTemporaryJobDraft with data:', orderDataForDraft);

      const draftResult = await createDraftCallable(orderDataForDraft);

      console.log('[DEBUG] createTemporaryJobDraft result:', draftResult);

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
      console.log('[DEBUG] Payment API Response:', {
        ok: paymentResponse.ok,
        status: paymentResponse.status,
        data: paymentData,
      });

      if (!paymentResponse.ok || !paymentData.clientSecret) {
        console.error('[DEBUG] Payment API Fehler:', paymentData);
        throw new Error(paymentData.error || 'Fehler beim Erstellen der Zahlung');
      }

      console.log('[DEBUG] PaymentIntent erfolgreich erstellt:', {
        clientSecret: paymentData.clientSecret ? 'vorhanden' : 'fehlt',
        paymentIntentId: paymentData.paymentIntentId,
      });

      setClientSecret(paymentData.clientSecret);
      console.log('[DEBUG] ClientSecret gesetzt, Payment Element sollte jetzt angezeigt werden');

      // Force re-render durch State-Update
      setForceRerender(prev => prev + 1);
      setTimeout(() => {
        console.log(
          '[DEBUG] Nach State-Update - clientSecret:',
          paymentData.clientSecret ? 'vorhanden' : 'fehlt'
        );
      }, 100);
    } catch (err) {
      console.error('[DEBUG] Fehler beim Vorbereiten der Zahlung:', err);

      // Detaillierte Fehlerbehandlung für Firebase Functions
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseError = err as { code: string; message: string; details?: unknown };
        console.error('[DEBUG] Firebase Error Details:', {
          code: firebaseError.code,
          message: firebaseError.message,
          details: firebaseError.details,
        });

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
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        <span>Seite wird vorbereitet...</span>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md text-center">
          <AlertCircle className="mx-auto mb-2" size={24} />
          <h3 className="font-bold mb-2">Fehler</h3>
          <p>{error}</p>
          <button
            onClick={() => router.push('/auftrag/get-started')}
            className="mt-4 bg-[#14ad9f] hover:bg-[#129488] text-white px-4 py-2 rounded"
          >
            Auftrag neu starten
          </button>
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
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h3 className="text-xl font-bold mb-2">Unvollständige Auftragsdaten</h3>
          <p className="text-gray-600 mb-4">Bitte starten Sie den Auftrag erneut.</p>
          <button
            onClick={() => router.push('/auftrag/get-started')}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-3 rounded"
          >
            Neuen Auftrag starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin text-4xl text-white mr-3" />
          <span className="text-white">Seite wird aufgebaut...</span>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-white mb-8 text-center">
          Bestätigung und Zahlung
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
          {/* Auftragsdetails - Links */}
          <div className="w-full order-last lg:order-first">
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

          {/* Payment Section - Rechts */}
          <div className="w-full bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-6">Sichere Zahlung</h2>

            {/* Payment Message */}
            {error && (
              <div className="my-4 p-3 rounded-md text-sm bg-red-100 text-red-700 flex items-center">
                <AlertCircle className="mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Billing Address Section */}
            <div className="mb-6 p-4 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <CreditCard className="mr-2" /> Rechnungsadresse
              </h3>
              <p className="text-sm text-white/80 mb-3">
                Diese Adresse wird für Ihre Rechnung verwendet.
              </p>
              <div className="text-white text-sm">
                <p className="font-medium">{firebaseUser?.displayName || 'Kunde'}</p>
                <p className="text-xs text-white/60">Adresse wird beim Bezahlen erfasst</p>
              </div>
            </div>

            {/* Price Overview */}
            <div className="mb-6 p-4 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <CreditCard className="mr-2" /> Preisübersicht
              </h3>
              <div className="border-t border-white/30 mt-2 pt-2 flex justify-between font-bold text-lg">
                <span className="text-white">Gesamtbetrag:</span>
                <span className="text-white">
                  {jobPriceInCents ? (jobPriceInCents / 100).toFixed(2) : '0.00'} EUR
                </span>
              </div>
              <p className="text-xs text-white/60 mt-2">
                Der angezeigte Betrag ist der Endpreis. Die Servicegebühr wird vom Dienstleister
                getragen.
              </p>
            </div>

            {/* Payment Section */}
            {!clientSecret ? (
              <div className="mb-6 p-4 border border-white/30 rounded-md bg-white/20 backdrop-blur-sm text-center">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-center">
                  <CreditCard className="mr-2" /> Zahlungsvorgang starten
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  Klicken Sie auf &quot;Jetzt bezahlen&quot;, um den Bezahlvorgang zu starten.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-white/60 mb-2">
                    Debug: clientSecret = {clientSecret || 'null'}
                  </div>
                )}
                <button
                  onClick={handlePaymentClick}
                  disabled={isLoading}
                  className="bg-[#14ad9f] hover:bg-[#129488] text-white px-6 py-3 rounded-md font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Bereite Zahlung vor...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2" size={16} />
                      Jetzt bezahlen (
                      {jobPriceInCents ? (jobPriceInCents / 100).toFixed(2) : '0.00'} EUR)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <CreditCard className="mr-2" /> Zahlungsmethode
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  Geben Sie Ihre Zahlungsinformationen ein. Diese wird für zukünftige Buchungen
                  gespeichert.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-white/60 mb-2">
                    Debug: stripePromise = geladen, clientSecret ={' '}
                    {clientSecret ? 'vorhanden' : 'null'}, tempJobDraftId ={' '}
                    {tempJobDraftId || 'null'}, jobPriceInCents = {jobPriceInCents || 'null'},
                    anbieterStripeAccountId = {anbieterStripeAccountId || 'null'}
                  </div>
                )}
                {stripePromise ? (
                  <div>
                    <div className="text-xs text-white/60 mb-2">
                      Stripe Promise geladen - Erstelle Elements...
                    </div>
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                        appearance: {
                          theme: 'stripe',
                          variables: {
                            colorPrimary: '#14ad9f',
                            colorBackground: '#ffffff',
                            colorText: '#1f2937',
                            colorDanger: '#dc2626',
                            fontFamily: 'system-ui, sans-serif',
                            spacingUnit: '4px',
                            borderRadius: '8px',
                          },
                        },
                      }}
                    >
                      <StripeCardCheckout
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={handlePaymentError}
                        taskId={tempJobDraftId || ''}
                        taskAmount={jobPriceInCents || 0}
                        taskerStripeAccountId={anbieterStripeAccountId || ''}
                        clientSecret={clientSecret}
                      />
                    </Elements>
                  </div>
                ) : (
                  <div className="text-sm text-white/80">Stripe wird geladen...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Suspense>
  );
}
