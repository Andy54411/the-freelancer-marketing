// src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/components/BestaetigungsContent.tsx
'use client';

import { useSearchParams, useParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { Loader2 as FiLoader, AlertCircle as FiAlertCircle } from 'lucide-react';
import AnbieterDetailsFetcher from './AnbieterDetailsFetcher';
import { PAGE_LOG, PAGE_WARN, PAGE_ERROR, TRUST_AND_SUPPORT_FEE_EUR } from '@/lib/constants';
// FEHLER BEHOBEN: 'format' zu den Importen hinzugefügt
import { differenceInCalendarDays, parseISO, isValid as isValidDate, format } from 'date-fns';

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
      } catch (e) {
        return undefined;
      }
    }
    const auftragsDauerFromQuery = searchParams?.get('auftragsDauer');
    if (auftragsDauerFromQuery) {
      try {
        return decodeURIComponent(auftragsDauerFromQuery);
      } catch (e) {
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
    </div>
  );
}
