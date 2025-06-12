// src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/components/BestaetigungsContent.tsx
'use client';

import { useSearchParams, useParams } from 'next/navigation';
import React, { useState, useMemo, useCallback } from 'react';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import AnbieterDetailsFetcher from './AnbieterDetailsFetcher';
import { PAGE_LOG, PAGE_WARN, PAGE_ERROR, TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants';
// FEHLER BEHOBEN: 'format' zu den Importen hinzugefügt
import { differenceInCalendarDays, parseISO, isValid as isValidDate, format } from 'date-fns';
import { Label } from '@/components/ui/label';


function parseDurationStringToHours(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== 'string') { return null; }
  const match = durationStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) { const hours = parseFloat(match[1]); return isNaN(hours) ? null : hours; }
  const parsedNum = parseFloat(durationStr);
  if (!isNaN(parsedNum)) return parsedNum;
  console.warn(PAGE_WARN, `parseDuration: Konnte keine Zahl extrahieren aus "${durationStr}"`);
  return null;
}

interface BestaetigungsContentProps {
  onPriceCalculated: (finalPriceInCents: number) => void;
  onDetailsChange?: () => void;
  initialJobDateFrom?: string | null;
  initialJobDateTo?: string | null;
  initialJobTime?: string | null;
  initialJobDescription?: string;
  initialJobDurationString?: string;
  postalCodeJob: string;
  anbieterId: string;
  unterkategorie: string;
}

export default function BestaetigungsContent({
  onPriceCalculated,
  onDetailsChange,
  initialJobDateFrom,
  initialJobDateTo,
  initialJobTime,
  initialJobDescription,
  initialJobDurationString,
  postalCodeJob,
  anbieterId,
  unterkategorie,
}: BestaetigungsContentProps) {
  const searchParams = useSearchParams();
  const pathParams = useParams();

  const [taskDescription, setTaskDescription] = useState(initialJobDescription || '');

  const unterkategorieAusPfad = useMemo(() =>
    pathParams && typeof pathParams.unterkategorie === 'string' ? decodeURIComponent(pathParams.unterkategorie) : '',
    [pathParams]);

  const decodedAuftragsDauer = useMemo(() => {
    if (initialJobDurationString) {
      try { return decodeURIComponent(initialJobDurationString); } catch (e) { console.error(PAGE_ERROR, "Fehler Dekod. initialJobDurationString:", e); return undefined; }
    }
    const auftragsDauerFromQuery = searchParams?.get('auftragsDauer');
    if (auftragsDauerFromQuery) {
      try { return decodeURIComponent(auftragsDauerFromQuery); } catch (e) { console.error(PAGE_ERROR, "Fehler Dekod. auftragsDauer:", e); return undefined; }
    }
    return undefined;
  }, [initialJobDurationString, searchParams]);


  const { durationError } = useMemo(() => {
    let hours: number = 0;
    let errorMsg: string | null = null;
    const userInputNumericalDuration = parseDurationStringToHours(decodedAuftragsDauer);
    const isMietkoch = unterkategorieAusPfad.toLowerCase().includes('mietkoch');
    const isDateRangeValid = initialJobDateFrom && initialJobDateTo && isValidDate(parseISO(initialJobDateFrom)) && isValidDate(parseISO(initialJobDateTo));
    let numberOfDays = 1;

    if (isDateRangeValid) {
      const startDate = parseISO(initialJobDateFrom!); const endDate = parseISO(initialJobDateTo!);
      if (endDate >= startDate) { numberOfDays = differenceInCalendarDays(endDate, startDate) + 1; }
      else { errorMsg = "Das Enddatum darf nicht vor dem Startdatum liegen."; }
    } else if (initialJobDateFrom && !initialJobDateTo && isValidDate(parseISO(initialJobDateFrom))) {
      numberOfDays = 1;
    } else if ((initialJobDateFrom || initialJobDateTo) && !isDateRangeValid) {
      errorMsg = "Ungültiges Datumsformat.";
    }

    if (!errorMsg) {
      if (userInputNumericalDuration !== null && userInputNumericalDuration > 0) {
        if (isMietkoch && numberOfDays > 1 && initialJobDateFrom !== initialJobDateTo) { hours = numberOfDays * userInputNumericalDuration; }
        else { hours = userInputNumericalDuration; }
      } else {
        if (isMietkoch && numberOfDays > 0) { hours = numberOfDays * 8; }
        else { hours = 1; }
      }
    }
    if (hours <= 0 && !errorMsg) { errorMsg = "Die Auftragsdauer ist ungültig (0 oder negativ)."; }
    return { durationError: errorMsg };
  }, [unterkategorieAusPfad, decodedAuftragsDauer, initialJobDateFrom, initialJobDateTo]);


  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTaskDescription(e.target.value);
    if (onDetailsChange) {
      onDetailsChange();
    }
  }, [onDetailsChange]);


  if (!anbieterId || !unterkategorie || !postalCodeJob) {
    console.log(PAGE_LOG, "BestaetigungsContent: Notwendige Props noch nicht verfügbar.");
    const missingParams: string[] = [];
    if (!anbieterId) missingParams.push("Anbieter-ID");
    if (!unterkategorie) missingParams.push("Unterkategorie");
    if (!postalCodeJob) missingParams.push("Postleitzahl");

    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center text-red-600">
        <FiAlertCircle size={48} className="mb-4" />
        <p className="text-lg font-semibold">Fehlende Informationen</p>
        <p>Notwendige Parameter: {missingParams.join(', ')}.</p>
      </div>
    );
  }

  if (durationError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4 text-center text-red-600">
        <FiAlertCircle size={48} className="mb-4" />
        <p className="text-lg font-semibold">Fehler bei Auftragsdetails</p>
        <p>{durationError}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Auftragsdetails</h2>

      <div className="mb-4">
        <Label htmlFor="taskDescription" className="block text-md font-medium text-gray-700 mb-2">Ihre Auftragsbeschreibung:</Label>
        <textarea
          id="taskDescription"
          value={taskDescription}
          onChange={handleDescriptionChange}
          rows={5}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f] sm:text-sm resize-y"
          placeholder="Beschreiben Sie hier Ihren Auftrag im Detail..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-gray-700 font-medium">Datum:</p>
          {/* FEHLER BEHOBEN: format-Funktion hier verwendet */}
          <p className="text-gray-900">{initialJobDateFrom && format(parseISO(initialJobDateFrom), 'dd.MM.yyyy')}</p>
          {initialJobDateTo && initialJobDateTo !== initialJobDateFrom && (
            <p className="text-gray-900"> bis {format(parseISO(initialJobDateTo), 'dd.MM.yyyy')}</p>
          )}
        </div>
        <div>
          <p className="text-gray-700 font-medium">Uhrzeit:</p>
          <p className="text-gray-900">{initialJobTime || 'Ganztägig'}</p>
        </div>
        <div>
          <p className="text-gray-700 font-medium">Dauer:</p>
          <p className="text-gray-900">{decodedAuftragsDauer || 'Nicht angegeben'}</p>
        </div>
        <div>
          <p className="text-gray-700 font-medium">Postleitzahl:</p>
          <p className="text-gray-900">{postalCodeJob}</p>
        </div>
      </div>

      <AnbieterDetailsFetcher
        anbieterId={anbieterId}
        unterkategorie={unterkategorie}
        postalCodeJob={postalCodeJob}
        initialJobDateFrom={initialJobDateFrom}
        initialJobDateTo={initialJobDateTo}
        initialJobTime={initialJobTime}
        initialJobDescription={taskDescription}
        initialJobDurationString={decodedAuftragsDauer}
        onPriceCalculated={onPriceCalculated}
        onDetailsChange={onDetailsChange}
      />
    </div>
  );
}