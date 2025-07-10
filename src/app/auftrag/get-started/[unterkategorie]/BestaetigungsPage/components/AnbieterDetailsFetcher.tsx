// /Users/andystaudinger/tasko/src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/components/AnbieterDetailsFetcher.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react'; // useMemo entfernt
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle } from 'lucide-react';
import { OrderSummary } from './OrderSummary';
import { DateTimeSelectionPopup } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/DateTimeSelectionPopup';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FIREBASE_FUNCTIONS_BASE_URL } from '@/lib/constants';

import type {
  Company as AnbieterDetailsType,
  // TaskDetails, // Nicht verwendet
  // ExpandedDescriptionsMap, // Nicht verwendet
  // RatingMap, // Nicht verwendet
} from '@/types/types';

import {
  PAGE_LOG, // Wird für Debug-Logs verwendet
  PAGE_WARN,
  PAGE_ERROR,
  TRUST_AND_SUPPORT_FEE_EUR,
} from '@/lib/constants';

import {
  differenceInCalendarDays,
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
  const [currentTaskDesc, setCurrentTaskDesc] = useState(initialJobDescription || registration.description || '');
  const [currentAuftragsDauerString, setCurrentAuftragsDauerString] = useState(initialJobDurationString || registration.jobDurationString || '');

  const [anbieterDetails, setAnbieterDetails] = useState<AnbieterDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSelection, setEditSelection] = useState<Date | DateRange | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  const calculateAndReportPrice = useCallback((
    fetchedAnbieterData: AnbieterDetailsType,
    dateF: string | null | undefined,
    dateT: string | null | undefined,
    timeVal: string | null | undefined,
    durationStr: string,
    taskDescVal: string
  ): { displayDuration: string, totalHours: number, finalPriceInCents: number, formattedAnbieterData: AnbieterDetailsType | null } => {

    console.log(PAGE_LOG, "AnbieterDetailsFetcher: calculateAndReportPrice gestartet mit:", {
      anbieterHourlyRate: fetchedAnbieterData?.hourlyRate,
      dateF,
      dateT,
      timeVal,
      durationStr,
      taskDescVal
    });

    if (!fetchedAnbieterData?.hourlyRate) {
      const errorMsg = "Stundensatz des Anbieters nicht verfügbar für Preisberechnung.";
      console.error(PAGE_ERROR, errorMsg, fetchedAnbieterData);
      return { displayDuration: "Fehler", totalHours: 0, finalPriceInCents: 0, formattedAnbieterData: fetchedAnbieterData };
    }

    let numberOfDays = 1;
    let localDurationError: string | null = null;

    if (dateF && isValidDate(parseISO(dateF))) {
      const startDate = parseISO(dateF);
      if (dateT && isValidDate(parseISO(dateT))) {
        const endDate = parseISO(dateT);
        if (endDate >= startDate) {
          numberOfDays = differenceInCalendarDays(endDate, startDate) + 1;
        } else {
          localDurationError = "Das Enddatum darf nicht vor dem Startdatum liegen.";
        }
      } else {
        numberOfDays = 1;
      }
    } else if (dateF || dateT) {
      localDurationError = "Ungültiges Datumsformat für Preisberechnung.";
    }

    const hoursPerDayOrTotalFromInput = parseDurationStringToHours(durationStr);
    if (!hoursPerDayOrTotalFromInput || hoursPerDayOrTotalFromInput <= 0) {
      localDurationError = localDurationError || "Ungültige Dauer für Preisberechnung.";
    }

    if (localDurationError) {
      console.error(PAGE_ERROR, "Preisberechnungsfehler:", localDurationError);
      const updatedAnbieterDetailsOnError = fetchedAnbieterData ?
        { ...fetchedAnbieterData, estimatedDuration: "Fehler", totalCalculatedPrice: 0, description: taskDescVal }
        : null;
      return { displayDuration: "Fehler", totalHours: 0, finalPriceInCents: 0, formattedAnbieterData: updatedAnbieterDetailsOnError };
    }

    let totalCalculatedHours: number;
    let displayDuration = "";
    const isMietkoch = unterkategorie?.toLowerCase().includes('mietkoch');

    if (isMietkoch && numberOfDays > 0) {
      totalCalculatedHours = numberOfDays * hoursPerDayOrTotalFromInput!;
      displayDuration = `${numberOfDays} Tag(e) à ${hoursPerDayOrTotalFromInput} Stunde(n) (Gesamt: ${totalCalculatedHours} Std.)`;
    } else if (hoursPerDayOrTotalFromInput) {
      totalCalculatedHours = hoursPerDayOrTotalFromInput;
      displayDuration = `${totalCalculatedHours} Stunde(n)`;
    } else {
      totalCalculatedHours = 1;
      displayDuration = "1 Stunde (Standard)";
    }

    if (totalCalculatedHours <= 0) {
      console.error(PAGE_ERROR, "Die berechnete Gesamtdauer ist ungültig.");
      const updatedAnbieterDetailsOnDurationError = fetchedAnbieterData ?
        { ...fetchedAnbieterData, estimatedDuration: "Dauer ungültig", totalCalculatedPrice: 0, description: taskDescVal }
        : null;
      return { displayDuration: "Dauer ungültig", totalHours: 0, finalPriceInCents: 0, formattedAnbieterData: updatedAnbieterDetailsOnDurationError };
    }

    const anbieterStundensatz = parseFloat(String(fetchedAnbieterData.hourlyRate));
    const servicePrice = anbieterStundensatz * totalCalculatedHours;
    // KORREKTUR: Die Servicegebühr wird jetzt serverseitig berechnet und vom Anbieterguthaben abgezogen.
    // Der Kunde zahlt nur den reinen Dienstleistungspreis.
    const finalPriceInCents = Math.round(servicePrice * 100);

    console.log(PAGE_LOG, "AnbieterDetailsFetcher: Preisberechnung abgeschlossen:", {
      anbieterStundensatz,
      totalCalculatedHours,
      servicePrice,
      finalPriceInCents,
      displayDuration
    });

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
      console.log(PAGE_LOG, "AnbieterDetailsFetcher: Rufe onPriceCalculated auf mit:", finalPriceInCents);
      onPriceCalculated(finalPriceInCents);
    }
    return { displayDuration, totalHours: totalCalculatedHours, finalPriceInCents, formattedAnbieterData: anbieterDataForDisplay };

  }, [anbieterId, postalCodeJob, unterkategorie, onPriceCalculated]);


  useEffect(() => {
    const fetchDataAndCalc = async () => {
      if (!anbieterId) {
        setError('Keine Anbieter-ID vorhanden für Detailabruf.');
        setIsLoading(false);
        return;
      }

      console.log(PAGE_LOG, "AnbieterDetailsFetcher: Starte Datenabfrage für Anbieter:", anbieterId);
      console.log(PAGE_LOG, "AnbieterDetailsFetcher: Empfangene Props:", {
        anbieterId,
        unterkategorie,
        postalCodeJob,
        initialJobDateFrom,
        initialJobDateTo,
        initialJobTime,
        initialJobDescription,
        initialJobDurationString
      });

      setIsLoading(true);
      setError(null);
      try {
        // FIX: Benutze die zentrale Konstante für die API-Base-URL, damit immer die richtige Umgebung verwendet wird.
        const apiBaseUrl = FIREBASE_FUNCTIONS_BASE_URL;
        const url = `${apiBaseUrl}/searchCompanyProfiles?id=${encodeURIComponent(anbieterId)}`;

        console.log(PAGE_LOG, "AnbieterDetailsFetcher: Rufe API auf:", url);

        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Anbieter mit ID '${anbieterId}' nicht gefunden.`);
          } else {
            const errData = await response.json().catch(() => ({ message: `Anbieterdetails nicht geladen (Status: ${response.status})` }));
            throw new Error(errData.message);
          }
        }

        const fetchedProviderData: AnbieterDetailsType = await response.json();
        console.log(PAGE_LOG, "AnbieterDetailsFetcher: API-Antwort erhalten:", fetchedProviderData);

        if (!fetchedProviderData || !fetchedProviderData.id) {
          throw new Error('Anbieter mit der angegebenen ID nicht gefunden oder API-Antwort unerwartet.');
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
        if (result.finalPriceInCents === 0 && result.displayDuration === "Fehler") {
          setError("Fehler bei der Preisberechnung. Bitte überprüfen Sie Ihre Eingaben.");
        } else if (result.finalPriceInCents === 0 && result.displayDuration === "Dauer ungültig") {
          setError("Die berechnete Gesamtdauer ist ungültig.");
        } else if (!fetchedProviderData?.hourlyRate) {
          setError("Stundensatz des Anbieters nicht verfügbar für Preisberechnung.");
        } else {
          setError(null); // Kein Fehler
        }

        console.log(PAGE_LOG, "AnbieterDetailsFetcher: Preisberechnung abgeschlossen, setze Anbieterdetails");
        setAnbieterDetails(result.formattedAnbieterData);

      } catch (err: unknown) {
        console.error(PAGE_ERROR, "Fehler in AnbieterDetailsFetcher fetchDataAndCalc:", err);
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

    // Nur ausführen wenn noch nicht geladen oder wichtige Parameter sich geändert haben
    if (!anbieterDetails || error) {
      fetchDataAndCalc();
    }
  }, [
    anbieterId,
    currentDateFrom,
    currentDateTo,
    currentTime,
    currentAuftragsDauerString,
    currentTaskDesc,
    calculateAndReportPrice,
    onPriceCalculated,
    // Entferne anbieterDetails und error aus den Dependencies um Endlosschleife zu vermeiden
    // unterkategorie und postalCodeJob sind schon in calculateAndReportPrice als Dependencies
  ]);

  const handleOpenEditModal = () => {
    let initialModalDateRange: DateRange | undefined = undefined;
    if (currentDateFrom && isValidDate(parseISO(currentDateFrom))) {
      const fromDate = parseISO(currentDateFrom);
      const toDate = currentDateTo && isValidDate(parseISO(currentDateTo)) ? parseISO(currentDateTo) : fromDate;
      initialModalDateRange = { from: fromDate, to: toDate };
    } else {
      const contextDateFrom = registration.jobDateFrom && isValidDate(parseISO(registration.jobDateFrom)) ? parseISO(registration.jobDateFrom) : new Date();
      const contextDateTo = registration.jobDateTo && isValidDate(parseISO(registration.jobDateTo)) ? parseISO(registration.jobDateTo) : contextDateFrom;
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
        finalDateTo = newSelection.to ? formatDateFns(newSelection.to, 'yyyy-MM-dd') : finalDateFrom;
      }
    }

    const finalTime = newTimeProp !== undefined ? newTimeProp : currentTime;
    const finalAuftragsDauerString = newDurationStringProp !== undefined ? newDurationStringProp : currentAuftragsDauerString;
    const finalTaskDesc = editDescription; // Verwende die aktuelle Beschreibung aus dem State

    console.log(PAGE_LOG, "AnbieterDetailsFetcher: handleConfirmEditsFromModal mit Werten:", {
      finalDateFrom,
      finalDateTo,
      finalTime,
      finalAuftragsDauerString,
      finalTaskDesc
    });

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

      console.log(PAGE_LOG, "AnbieterDetailsFetcher: Context wird aktualisiert mit jobDurationString:", finalAuftragsDauerString);

      if (typeof registration.setJobTotalCalculatedHours === 'function') {
        registration.setJobTotalCalculatedHours(totalHours);
      } else {
        console.warn(PAGE_WARN, "registration.setJobTotalCalculatedHours ist im Context nicht definiert oder keine Funktion.");
      }
      registration.setJobCalculatedPriceInCents(finalPriceInCents);
      registration.setDescription(finalTaskDesc);
    } else {
      console.warn(PAGE_WARN, "Anbieterdetails nicht geladen, Context konnte nach Edit nicht vollständig aktualisiert werden.");
      if (onPriceCalculated) onPriceCalculated(0);
    }

    if (onDetailsChange) {
      onDetailsChange();
    }
    setIsEditModalOpen(false);
  };

  if (isLoading && !anbieterDetails) {
    return (
      <div className="flex justify-center items-center min-h-[300px] h-full">
        <FiLoader className="animate-spin text-3xl text-[#14ad9f]" />
        <span className="ml-3 text-gray-700">Anbieterdetails werden geladen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center p-6 h-full flex flex-col items-center justify-center bg-red-50 rounded-lg">
        <FiAlertCircle size={32} className="mb-2" />
        <p className="font-semibold">Fehler:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!anbieterDetails) {
    return (
      <div className="flex justify-center items-center min-h-[300px] h-full">
        <FiAlertCircle className="text-2xl text-gray-500 mr-2" />
        <span className="text-gray-600">Keine Anbieterdetails zum Anzeigen vorhanden oder Fehler beim Laden.</span>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white shadow-lg rounded-lg p-6">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>
            <h3 className="text-xl font-semibold mb-6 text-center">
              Auftragsdetails bearbeiten
            </h3>
            <div className="mb-4 p-4 border rounded-md bg-gray-50">
              <DateTimeSelectionPopup
                isOpen={true}
                onClose={() => setIsEditModalOpen(false)}
                onConfirm={handleConfirmEditsFromModal}
                initialDateRange={
                  editSelection instanceof Date
                    ? { from: editSelection, to: editSelection }
                    : (editSelection && editSelection.from ?
                      { from: editSelection.from, to: editSelection.to || editSelection.from }
                      : undefined)
                }
                initialTime={editTime || undefined}
                initialDuration={editDuration}
                contextCompany={anbieterDetails}
                bookingSubcategory={unterkategorie}
              />
            </div>
            <div className="mt-4 mb-6">
              <Label htmlFor="editDescriptionModal" className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung anpassen
              </Label>
              <Textarea
                id="editDescriptionModal"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full mt-1 shadow-sm focus:ring-teal-500 focus:border-teal-500 border-gray-300 rounded-md"
                placeholder="Beschreiben Sie hier detailliert Ihre Wünsche..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
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