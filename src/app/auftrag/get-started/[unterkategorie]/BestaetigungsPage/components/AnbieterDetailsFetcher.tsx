// /Users/andystaudinger/taskilo/src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/components/AnbieterDetailsFetcher.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle } from 'lucide-react';
import { OrderSummary } from './OrderSummary';
import { DateTimeSelectionPopup } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FIREBASE_FUNCTIONS_BASE_URL } from '@/lib/constants';
import { calculateDaysBetween } from '@/utils/orderCalculations';

import type {
  Company as AnbieterDetailsType,
} from '@/types/types';

import {
  parseISO,
  isValid as isValidDate,
  format as formatDateFns,
} from 'date-fns';
import { DateRange } from 'react-day-picker';

import { useRegistration } from '@/contexts/Registration-Context';

function parseDurationStringToHours(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const match = durationStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) {
    const hours = parseFloat(match[1]);
    return isNaN(hours) ? null : hours;
  }
  const parsedNum = parseFloat(durationStr);
  return isNaN(parsedNum) ? null : parsedNum;
}

interface AnbieterDetailsFetcherProps {
  anbieterId: string;
  unterkategorie: string;
  postalCodeJob: string;
  initialJobDateFrom?: string | null;
  initialJobDateTo?: string | null;
  initialJobTime?: string | null;
  initialJobDescription?: string;
  initialJobDurationString?: string;
  onPriceCalculated: (finalPriceInCent: number) => void;
  onDetailsChange?: () => void;
}

export default function AnbieterDetailsFetcher({
  anbieterId,
  unterkategorie,
  postalCodeJob,
  initialJobDateFrom,
  initialJobDateTo,
  initialJobTime,
  initialJobDescription,
  initialJobDurationString,
  onPriceCalculated,
  onDetailsChange,
}: AnbieterDetailsFetcherProps) {
  const registration = useRegistration();

  const [currentDateFrom, setCurrentDateFrom] = useState(initialJobDateFrom);
  const [currentDateTo, setCurrentDateTo] = useState(initialJobDateTo);
  const [currentTime, setCurrentTime] = useState(initialJobTime);
  const [currentTaskDesc, setCurrentTaskDesc] = useState(
    initialJobDescription || registration.description || ''
  );
  const [currentAuftragsDauerString, setCurrentAuftragsDauerString] = useState(
    initialJobDurationString || registration.jobDurationString || ''
  );

  const [anbieterDetails, setAnbieterDetails] = useState<AnbieterDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSelection, setEditSelection] = useState<Date | DateRange | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  const calculateAndReportPrice = useCallback(
    (
      fetchedAnbieterData: AnbieterDetailsType,
      dateF: string | null | undefined,
      dateT: string | null | undefined,
      timeVal: string | null | undefined,
      durationStr: string,
      taskDescVal: string
    ): {
      displayDuration: string;
      totalHours: number;
      finalPriceInCents: number;
      formattedAnbieterData: AnbieterDetailsType | null;
    } => {
      if (!fetchedAnbieterData?.hourlyRate) {
        const _errorMsg = 'Stundensatz des Anbieters nicht verfuegbar fuer Preisberechnung.';

        return {
          displayDuration: 'Fehler',
          totalHours: 0,
          finalPriceInCents: 0,
          formattedAnbieterData: fetchedAnbieterData,
        };
      }

      let numberOfDays = 1;
      let localDurationError: string | null = null;

      if (dateF && isValidDate(parseISO(dateF))) {
        const startDate = parseISO(dateF);
        if (dateT && isValidDate(parseISO(dateT))) {
          const endDate = parseISO(dateT);
          if (endDate >= startDate) {
            // KORREKTE BERECHNUNG: Alle Tage zählen, nicht nur Werktage
            // Für Mietkoch und andere Services alle 7 Tage der Woche
            numberOfDays = calculateDaysBetween(dateF, dateT);
          } else {
            localDurationError = 'Das Enddatum darf nicht vor dem Startdatum liegen.';
          }
        } else {
          // KORRIGIERT: Wenn nur dateFrom gesetzt ist, prüfe ob dateTo aus dem Context verfügbar ist
          const contextDateTo = registration.jobDateTo;
          if (contextDateTo && isValidDate(parseISO(contextDateTo))) {
            const endDate = parseISO(contextDateTo);
            if (endDate >= startDate) {
              numberOfDays = calculateDaysBetween(dateF, contextDateTo);
            } else {
              localDurationError = 'Das Enddatum darf nicht vor dem Startdatum liegen.';
            }
          } else {
            numberOfDays = 1;
          }
        }
      } else if (dateF || dateT) {
        localDurationError = 'Ungültiges Datumsformat für Preisberechnung.';
      }

      const hoursPerDayOrTotalFromInput = parseDurationStringToHours(durationStr);
      if (!hoursPerDayOrTotalFromInput || hoursPerDayOrTotalFromInput <= 0) {
        localDurationError = localDurationError || 'Ungültige Dauer für Preisberechnung.';
      }

      if (localDurationError) {
        const updatedAnbieterDetailsOnError = fetchedAnbieterData
          ? {
              ...fetchedAnbieterData,
              estimatedDuration: 'Fehler',
              totalCalculatedPrice: 0,
              description: taskDescVal,
            }
          : null;
        return {
          displayDuration: 'Fehler',
          totalHours: 0,
          finalPriceInCents: 0,
          formattedAnbieterData: updatedAnbieterDetailsOnError,
        };
      }

      let totalCalculatedHours: number;
      let displayDuration = '';
      const isMietkoch = unterkategorie?.toLowerCase().includes('mietkoch');

      if (isMietkoch && numberOfDays > 0) {
        totalCalculatedHours = numberOfDays * hoursPerDayOrTotalFromInput!;
        displayDuration = `${numberOfDays} Tag(e) à ${hoursPerDayOrTotalFromInput} Stunde(n) (Gesamt: ${totalCalculatedHours} Std.)`;
      } else if (hoursPerDayOrTotalFromInput) {
        totalCalculatedHours = hoursPerDayOrTotalFromInput;
        displayDuration = `${totalCalculatedHours} Stunde(n)`;
      } else {
        totalCalculatedHours = 1;
        displayDuration = '1 Stunde (Standard)';
      }

      if (totalCalculatedHours <= 0) {
        const updatedAnbieterDetailsOnDurationError = fetchedAnbieterData
          ? {
              ...fetchedAnbieterData,
              estimatedDuration: 'Dauer ungültig',
              totalCalculatedPrice: 0,
              description: taskDescVal,
            }
          : null;
        return {
          displayDuration: 'Dauer ungültig',
          totalHours: 0,
          finalPriceInCents: 0,
          formattedAnbieterData: updatedAnbieterDetailsOnDurationError,
        };
      }

      const anbieterStundensatz = parseFloat(String(fetchedAnbieterData.hourlyRate));
      const servicePrice = anbieterStundensatz * totalCalculatedHours;
      // KORREKTUR: Die Servicegebühr wird jetzt serverseitig berechnet und vom Anbieterguthaben abgezogen.
      // Der Kunde zahlt nur den reinen Dienstleistungspreis.
      const finalPriceInCents = Math.round(servicePrice * 100);

      const anbieterDataForDisplay: AnbieterDetailsType = {
        ...fetchedAnbieterData,
        id: fetchedAnbieterData.id || anbieterId,
        hourlyRate: anbieterStundensatz,
        location: `${postalCodeJob}${fetchedAnbieterData.city ? ' ' + fetchedAnbieterData.city : ''}`,
        estimatedDuration: displayDuration,
        totalCalculatedPrice: servicePrice, // Zeige den reinen Dienstleistungspreis an
        description: taskDescVal,
      };

      if (onPriceCalculated) {
        onPriceCalculated(finalPriceInCents);
      }
      return {
        displayDuration,
        totalHours: totalCalculatedHours,
        finalPriceInCents,
        formattedAnbieterData: anbieterDataForDisplay,
      };
    },
    [anbieterId, postalCodeJob, unterkategorie, onPriceCalculated, registration.jobDateTo]
  );

  // Use ref to track if initial fetch has happened
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch once initially, or when key parameters change
    if (hasFetchedRef.current && anbieterDetails) {
      return;
    }

    const fetchDataAndCalc = async () => {
      if (!anbieterId) {
        setError('Keine Anbieter-ID vorhanden fuer Detailabruf.');
        setIsLoading(false);
        return;
      }

      hasFetchedRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        // FIX: Benutze die zentrale Konstante fuer die API-Base-URL, damit immer die richtige Umgebung verwendet wird.
        const apiBaseUrl = FIREBASE_FUNCTIONS_BASE_URL;
        const url = `${apiBaseUrl}/searchCompanyProfiles?id=${encodeURIComponent(anbieterId)}`;

        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Anbieter mit ID '${anbieterId}' nicht gefunden.`);
          } else {
            const errData = await response.json().catch(() => ({
              message: `Anbieterdetails nicht geladen (Status: ${response.status})`,
            }));
            throw new Error(errData.message);
          }
        }

        const fetchedProviderData: AnbieterDetailsType = await response.json();

        if (!fetchedProviderData || !fetchedProviderData.id) {
          throw new Error(
            'Anbieter mit der angegebenen ID nicht gefunden oder API-Antwort unerwartet.'
          );
        }

        const result = calculateAndReportPrice(
          fetchedProviderData,
          currentDateFrom,
          currentDateTo,
          currentTime,
          currentAuftragsDauerString,
          currentTaskDesc
        );

        // Fehlerbehandlung basierend auf dem Ergebnis der Preisberechnung
        if (result.finalPriceInCents === 0 && result.displayDuration === 'Fehler') {
          setError('Fehler bei der Preisberechnung. Bitte überprüfen Sie Ihre Eingaben.');
        } else if (result.finalPriceInCents === 0 && result.displayDuration === 'Dauer ungültig') {
          setError('Die berechnete Gesamtdauer ist ungültig.');
        } else if (!fetchedProviderData?.hourlyRate) {
          setError('Stundensatz des Anbieters nicht verfügbar für Preisberechnung.');
        } else {
          setError(null); // Kein Fehler
        }

        setAnbieterDetails(result.formattedAnbieterData);
      } catch (err: unknown) {
        let message = 'Fehler beim Laden der Anbieterdetails.';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        setAnbieterDetails(null);
        if (onPriceCalculated) onPriceCalculated(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataAndCalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    anbieterId,
    currentDateFrom,
    currentDateTo,
    currentTime,
    currentAuftragsDauerString,
    currentTaskDesc,
    calculateAndReportPrice,
    onPriceCalculated,
  ]);

  const handleOpenEditModal = () => {
    let initialModalDateRange: DateRange | undefined = undefined;
    if (currentDateFrom && isValidDate(parseISO(currentDateFrom))) {
      const fromDate = parseISO(currentDateFrom);
      const toDate =
        currentDateTo && isValidDate(parseISO(currentDateTo)) ? parseISO(currentDateTo) : fromDate;
      initialModalDateRange = { from: fromDate, to: toDate };
    } else {
      const contextDateFrom =
        registration.jobDateFrom && isValidDate(parseISO(registration.jobDateFrom))
          ? parseISO(registration.jobDateFrom)
          : new Date();
      const contextDateTo =
        registration.jobDateTo && isValidDate(parseISO(registration.jobDateTo))
          ? parseISO(registration.jobDateTo)
          : contextDateFrom;
      initialModalDateRange = { from: contextDateFrom, to: contextDateTo };
    }

    setEditSelection(initialModalDateRange);
    setEditTime(currentTime || registration.jobTimePreference || '');
    setEditDuration(currentAuftragsDauerString || registration.jobDurationString || '');
    setEditDescription(currentTaskDesc || registration.description || '');
    setIsEditModalOpen(true);
  };

  const handleConfirmEditsFromModal = (
    newSelection?: Date | DateRange,
    newTimeProp?: string,
    newDurationStringProp?: string
  ) => {
    let finalDateFrom: string | undefined = currentDateFrom ?? undefined;
    let finalDateTo: string | undefined = currentDateTo ?? undefined;

    if (newSelection) {
      if (newSelection instanceof Date) {
        const formatted = formatDateFns(newSelection, 'yyyy-MM-dd');
        finalDateFrom = formatted;
        finalDateTo = formatted;
      } else if (newSelection.from) {
        finalDateFrom = formatDateFns(newSelection.from, 'yyyy-MM-dd');
        finalDateTo = newSelection.to
          ? formatDateFns(newSelection.to, 'yyyy-MM-dd')
          : finalDateFrom;
      }
    }

    const finalTime = newTimeProp !== undefined ? newTimeProp : currentTime;
    const finalAuftragsDauerString =
      newDurationStringProp !== undefined ? newDurationStringProp : currentAuftragsDauerString;
    const finalTaskDesc = editDescription; // Verwende die aktuelle Beschreibung aus dem State

    setCurrentDateFrom(finalDateFrom);
    setCurrentDateTo(finalDateTo);
    setCurrentTime(finalTime);
    setCurrentAuftragsDauerString(finalAuftragsDauerString);
    setCurrentTaskDesc(finalTaskDesc);

    if (anbieterDetails) {
      const { totalHours, finalPriceInCents, formattedAnbieterData } = calculateAndReportPrice(
        anbieterDetails,
        finalDateFrom,
        finalDateTo,
        finalTime,
        finalAuftragsDauerString,
        finalTaskDesc
      );

      if (formattedAnbieterData) setAnbieterDetails(formattedAnbieterData);

      registration.setJobDateFrom(finalDateFrom || null);
      registration.setJobDateTo(finalDateTo || null);
      registration.setJobTimePreference(finalTime || null);
      registration.setJobDurationString(finalAuftragsDauerString || '');

      if (typeof registration.setJobTotalCalculatedHours === 'function') {
        registration.setJobTotalCalculatedHours(totalHours);
      } else {
      }
      registration.setJobCalculatedPriceInCents(finalPriceInCents);
      registration.setDescription(finalTaskDesc);
    } else {
      if (onPriceCalculated) onPriceCalculated(0);
    }

    if (onDetailsChange) {
      onDetailsChange();
    }
    setIsEditModalOpen(false);
  };

  if (isLoading && !anbieterDetails) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f] mx-auto mb-4" />
          <span className="text-gray-600 font-medium">Anbieterdetails werden geladen...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto bg-red-50 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <p className="font-semibold text-gray-900 mb-2">Fehler</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!anbieterDetails) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <FiAlertCircle className="text-3xl text-gray-400 mx-auto mb-3" />
          <span className="text-gray-600">
            Keine Anbieterdetails zum Anzeigen vorhanden.
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        <OrderSummary
          anbieterDetails={anbieterDetails}
          taskDetails={{ description: currentTaskDesc }}
          dateFrom={currentDateFrom ?? null}
          dateTo={currentDateTo ?? null}
          time={currentTime ?? null}
          onEditTask={handleOpenEditModal}
        />
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            >
              <span className="sr-only">Schliessen</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Auftragsdetails bearbeiten</h3>
            <div className="mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
              <DateTimeSelectionPopup
                isOpen={true}
                onClose={() => setIsEditModalOpen(false)}
                onConfirm={handleConfirmEditsFromModal}
                initialDateRange={
                  editSelection instanceof Date
                    ? { from: editSelection, to: editSelection }
                    : editSelection && editSelection.from
                      ? { from: editSelection.from, to: editSelection.to || editSelection.from }
                      : undefined
                }
                initialTime={editTime || undefined}
                initialDuration={editDuration}
                contextCompany={anbieterDetails}
                bookingSubcategory={unterkategorie}
              />
            </div>
            <div className="mt-4 mb-6">
              <Label
                htmlFor="editDescriptionModal"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Beschreibung anpassen
              </Label>
              <Textarea
                id="editDescriptionModal"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={4}
                className="w-full mt-1 rounded-xl border-2 border-gray-200 focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-all"
                placeholder="Beschreiben Sie hier detailliert Ihre Wuensche..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
