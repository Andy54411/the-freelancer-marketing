'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Loader2, AlertCircle, CreditCard, Shield, CheckCircle, ArrowLeft, Clock, MapPin, Calendar, FileText, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegistration } from '@/contexts/Registration-Context';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { EscrowPaymentComponent } from '@/components/EscrowPaymentComponent';
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
  const _registration = useRegistration();

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEscrowPayment, setShowEscrowPayment] = useState(false);
  const [tempJobDraftId, setTempJobDraftId] = useState<string | null>(null);
  const [_forceRerender, setForceRerender] = useState(0); // Force re-render trigger

  // Debug: Log bei jedem Render

  // States für BestaetigungsContent
  const [jobPriceInCents, setJobPriceInCents] = useState<number | null>(null);
  const [_totalAmountPayableInCents, setTotalAmountPayableInCents] = useState<number | null>(null);
  
  // State für Kundendaten (Rechnungsadresse)
  const [customerData, setCustomerData] = useState<{
    firstName?: string;
    lastName?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    companyName?: string;
  } | null>(null);

  // Kundendaten aus Firestore laden
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!firebaseUser?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCustomerData({
            firstName: data.firstName,
            lastName: data.lastName,
            street: data.street,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            companyName: data.companyName,
          });
        }
      } catch {
        // Fehler beim Laden der Kundendaten - UI zeigt Fallback
      }
    };
    
    loadCustomerData();
  }, [firebaseUser?.uid]);

  // Callback für Preisberechnung von BestaetigungsContent
  const handlePriceCalculatedFromChild = useCallback(
    (priceInCents: number) => {
      setJobPriceInCents(priceInCents);
      setTotalAmountPayableInCents(priceInCents); // Gesamtbetrag = Jobpreis
    },
    []
  );

  const handleDetailsChangeFromChild = useCallback(() => {
    // Reset wenn sich Details ändern
    setTempJobDraftId(null);
    setShowEscrowPayment(false);
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

      // WICHTIG: Nicht umleiten, wenn bereits ein Payment-Flow läuft
      if (!firebaseUser && !showEscrowPayment && !isLoading) {
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
        duration,
      } = urlParams;

      // Nur die wichtigsten Parameter prüfen - time, description und price können optional sein
      const missingParams: string[] = [];
      if (!anbieterId) missingParams.push('Anbieter');
      if (!unterkategorie) missingParams.push('Kategorie');
      if (!postalCode) missingParams.push('Postleitzahl');
      if (!dateFrom) missingParams.push('Datum');
      if (!duration) missingParams.push('Dauer');

      if (missingParams.length > 0) {
        console.error('[BestaetigungsPage] Fehlende Parameter:', missingParams);
        setError(`Fehlende Daten: ${missingParams.join(', ')}. Bitte starten Sie den Auftrag neu.`);
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
  }, [firebaseUser, authLoading, urlParams, router, showEscrowPayment, isLoading, setError]);

  // Job-Entwurf erstellen und Escrow-Payment öffnen
  const handleOpenEscrowPayment = async () => {
    if (!firebaseUser || !jobPriceInCents || jobPriceInCents <= 0) {
      setError(
        'Preis wurde noch nicht berechnet oder User nicht eingeloggt. Bitte warten Sie einen Moment.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Temporären Job-Entwurf erstellen
      const hours = parseFloat(urlParams.duration);
      
      // Description ist Pflichtfeld - Fehler wenn nicht vorhanden
      if (!urlParams.description || !urlParams.description.trim()) {
        throw new Error('Beschreibung fehlt. Bitte gehen Sie zurück und geben Sie eine Beschreibung ein.');
      }
      
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
        jobCalculatedPriceInCents: jobPriceInCents,
      };

      // Firebase Callable Function direkt aufrufen
      const createTemporaryJobDraft = httpsCallable(functions, 'createTemporaryJobDraft');
      const tempDraftResult = (await createTemporaryJobDraft(
        orderDataForDraft
      )) as FirebaseCallableResult<TemporaryJobDraftResult>;

      if (!tempDraftResult.data || !tempDraftResult.data.tempDraftId) {
        throw new Error('Fehler beim Erstellen des Job-Entwurfs');
      }

      setTempJobDraftId(tempDraftResult.data.tempDraftId);
      setShowEscrowPayment(true);
      setForceRerender(prev => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unbekannter Fehler bei der Zahlungsvorbereitung'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Escrow Payment Success Handler
  const handleEscrowSuccess = (escrowId: string) => {
    setShowEscrowPayment(false);
    // Weiterleitung zur Erfolgsseite
    router.push(`/auftrag/erfolg?orderId=${tempJobDraftId}&escrowId=${escrowId}`);
  };

  // Escrow Payment Error Handler
  const handleEscrowError = (errorMsg: string) => {
    setError(errorMsg);
    setShowEscrowPayment(false);
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

  // Validiere URL-Parameter - nur die wichtigsten
  const { anbieterId, unterkategorie, postalCode, dateFrom, duration } =
    urlParams;
  if (
    !anbieterId ||
    !unterkategorie ||
    !postalCode ||
    !dateFrom ||
    !duration
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
                  Bestätigung & Zahlung
                </h1>
                <p className="text-lg text-white/90 max-w-2xl mx-auto">
                  Prüfen Sie Ihre Buchungsdetails und schließen Sie die Zahlung sicher ab
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
                    <div className="text-sm text-gray-600 space-y-1">
                      {customerData?.companyName && (
                        <p className="font-medium text-gray-900">{customerData.companyName}</p>
                      )}
                      <p className="font-medium text-gray-900">
                        {customerData?.firstName || customerData?.lastName 
                          ? `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim()
                          : firebaseUser?.displayName || 'Kunde'}
                      </p>
                      {customerData?.street && (
                        <p>{customerData.street}</p>
                      )}
                      {(customerData?.postalCode || customerData?.city) && (
                        <p>
                          {customerData.postalCode && `${customerData.postalCode} `}
                          {customerData.city}
                        </p>
                      )}
                      {customerData?.country && (
                        <p>{customerData.country}</p>
                      )}
                      {!customerData?.street && !customerData?.postalCode && !customerData?.city && (
                        <p className="text-xs text-gray-500 mt-1">Adresse wird beim Bezahlen erfasst</p>
                      )}
                    </div>
                  </div>

                  {/* Escrow Payment Section */}
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#14ad9f]" />
                      Zahlungsmethode
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-teal-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-teal-800">Sichere Treuhand-Zahlung</p>
                            <p className="text-xs text-teal-600 mt-1">
                              Ihr Geld wird sicher verwahrt und erst nach Auftragsabschluss an den Dienstleister freigegeben.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleOpenEscrowPayment}
                        disabled={isLoading || !jobPriceInCents || jobPriceInCents <= 0}
                        className="w-full py-4 px-6 bg-[#14ad9f] hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Wird vorbereitet...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={20} />
                            <span>Jetzt bezahlen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#14ad9f]" />
                      <span>SSL verschlüsselt</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#14ad9f]" />
                      <span>Treuhand gesichert</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Escrow Payment Modal */}
      {showEscrowPayment && jobPriceInCents && (
        <EscrowPaymentComponent
          projectData={{
            projectId: tempJobDraftId || 'new-order',
            projectTitle: `Auftrag: ${urlParams.unterkategorie}`,
            projectDescription: urlParams.description,
            amount: jobPriceInCents,
            currency: 'EUR',
            paymentType: 'project_deposit',
            providerId: urlParams.anbieterId,
          }}
          customerData={{
            customerId: firebaseUser?.uid || 'guest',
            name: firebaseUser?.displayName || 'Kunde',
            email: firebaseUser?.email || '',
          }}
          isOpen={showEscrowPayment}
          onClose={() => setShowEscrowPayment(false)}
          onSuccess={handleEscrowSuccess}
          onError={handleEscrowError}
        />
      )}
    </Suspense>
  );
}
