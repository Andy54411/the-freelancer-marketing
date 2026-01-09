// src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/components/BestaetigungsContent.tsx
'use client';

import { useSearchParams, useParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { AlertCircle as FiAlertCircle } from 'lucide-react';
import AnbieterDetailsFetcher from './AnbieterDetailsFetcher';
import { differenceInCalendarDays, parseISO, isValid as isValidDate } from 'date-fns';

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

  const unterkategorieAusPfad = useMemo(
    () =>
      pathParams && typeof pathParams.unterkategorie === 'string'
        ? decodeURIComponent(pathParams.unterkategorie)
        : '',
    [pathParams]
  );

  const decodedAuftragsDauer = useMemo(() => {
    if (initialJobDurationString) {
      try {
        return decodeURIComponent(initialJobDurationString);
      } catch {
        return undefined;
      }
    }
    const auftragsDauerFromQuery = searchParams?.get('auftragsDauer');
    if (auftragsDauerFromQuery) {
      try {
        return decodeURIComponent(auftragsDauerFromQuery);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [initialJobDurationString, searchParams]);

  const { durationError } = useMemo(() => {
    let hours: number = 0;
    let errorMsg: string | null = null;
    const userInputNumericalDuration = parseDurationStringToHours(decodedAuftragsDauer);
    const isMietkoch = unterkategorieAusPfad.toLowerCase().includes('mietkoch');
    const isDateRangeValid =
      initialJobDateFrom &&
      initialJobDateTo &&
      isValidDate(parseISO(initialJobDateFrom)) &&
      isValidDate(parseISO(initialJobDateTo));
    let numberOfDays = 1;

    if (isDateRangeValid) {
      const startDate = parseISO(initialJobDateFrom!);
      const endDate = parseISO(initialJobDateTo!);
      if (endDate >= startDate) {
        numberOfDays = differenceInCalendarDays(endDate, startDate) + 1;
      } else {
        errorMsg = 'Das Enddatum darf nicht vor dem Startdatum liegen.';
      }
    } else if (
      initialJobDateFrom &&
      !initialJobDateTo &&
      isValidDate(parseISO(initialJobDateFrom))
    ) {
      numberOfDays = 1;
    } else if ((initialJobDateFrom || initialJobDateTo) && !isDateRangeValid) {
      errorMsg = 'Ungültiges Datumsformat.';
    }

    if (!errorMsg) {
      if (userInputNumericalDuration !== null && userInputNumericalDuration > 0) {
        if (isMietkoch && numberOfDays > 1 && initialJobDateFrom !== initialJobDateTo) {
          hours = numberOfDays * userInputNumericalDuration;
        } else {
          hours = userInputNumericalDuration;
        }
      } else {
        if (isMietkoch && numberOfDays > 0) {
          hours = numberOfDays * 8;
        } else {
          hours = 1;
        }
      }
    }
    if (hours <= 0 && !errorMsg) {
      errorMsg = 'Die Auftragsdauer ist ungültig (0 oder negativ).';
    }
    return { durationError: errorMsg };
  }, [unterkategorieAusPfad, decodedAuftragsDauer, initialJobDateFrom, initialJobDateTo]);

  if (!anbieterId || !unterkategorie || !postalCodeJob) {
    const missingParams: string[] = [];
    if (!anbieterId) missingParams.push('Anbieter-ID');
    if (!unterkategorie) missingParams.push('Unterkategorie');
    if (!postalCodeJob) missingParams.push('Postleitzahl');

    return (
      <div className="flex flex-col justify-center items-center py-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <FiAlertCircle size={32} className="text-red-600" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-2">Fehlende Informationen</p>
        <p className="text-gray-600">Notwendige Parameter: {missingParams.join(', ')}.</p>
      </div>
    );
  }

  if (durationError) {
    return (
      <div className="flex flex-col justify-center items-center py-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <FiAlertCircle size={32} className="text-red-600" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-2">Fehler bei Auftragsdetails</p>
        <p className="text-gray-600">{durationError}</p>
      </div>
    );
  }

  return (
    <AnbieterDetailsFetcher
      anbieterId={anbieterId}
      unterkategorie={unterkategorie}
      postalCodeJob={postalCodeJob}
      initialJobDateFrom={initialJobDateFrom}
      initialJobDateTo={initialJobDateTo}
      initialJobTime={initialJobTime}
      initialJobDescription={initialJobDescription}
      initialJobDurationString={decodedAuftragsDauer}
      onPriceCalculated={onPriceCalculated}
      onDetailsChange={onDetailsChange}
    />
  );
}
