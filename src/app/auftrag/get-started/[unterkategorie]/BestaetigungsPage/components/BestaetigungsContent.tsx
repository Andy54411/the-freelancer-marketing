// src/app/auftrag/get-started/[unterkategorie]/BestaetigungsPage/components/BestaetigungsContent.tsx
'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import AnbieterDetailsFetcher from './AnbieterDetailsFetcher';
import { PAGE_LOG, PAGE_WARN, PAGE_ERROR } from '@/lib/constants';
import { differenceInCalendarDays, parseISO, isValid as isValidDate } from 'date-fns';

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
}

export default function BestaetigungsContent({ onPriceCalculated, onDetailsChange }: BestaetigungsContentProps) {
  const searchParams = useSearchParams();
  const pathParams = useParams();

  const unterkategorieAusPfad = useMemo(() =>
    pathParams && typeof pathParams.unterkategorie === 'string' ? decodeURIComponent(pathParams.unterkategorie) : '',
    [pathParams]);

  const anbieterId = useMemo(() => searchParams?.get('anbieterId') ?? '', [searchParams]);
  const postalCode = useMemo(() => searchParams?.get('postalCode') ?? '', [searchParams]);

  const decodedTaskDescription = useMemo(() => {
    const taskDescriptionFromQuery = searchParams?.get('taskDescription');
    if (taskDescriptionFromQuery) {
      try { return decodeURIComponent(taskDescriptionFromQuery); } catch (e) { console.error(PAGE_ERROR, "Fehler Dekod. taskDescription:", e); return ''; }
    }
    return '';
  }, [searchParams]);

  const decodedAuftragsDauer = useMemo(() => {
    const auftragsDauerFromQuery = searchParams?.get('auftragsDauer');
    if (auftragsDauerFromQuery) {
      try { return decodeURIComponent(auftragsDauerFromQuery); } catch (e) { console.error(PAGE_ERROR, "Fehler Dekod. auftragsDauer:", e); return undefined; }
    }
    return undefined;
  }, [searchParams]);

  const dateFrom = useMemo(() => searchParams?.get('dateFrom') ?? undefined, [searchParams]);
  const dateTo = useMemo(() => searchParams?.get('dateTo') ?? undefined, [searchParams]);
  const time = useMemo(() => searchParams?.get('time') ?? undefined, [searchParams]);
  // const priceParam = useMemo(() => searchParams?.get('price') ?? undefined, [searchParams]); // ENTFERNT, da nicht verwendet

  const { durationError } = useMemo(() => {
    if (!pathParams || !searchParams) return { durationError: null };

    let hours: number = 0;
    let errorMsg: string | null = null;
    const userInputNumericalDuration = parseDurationStringToHours(decodedAuftragsDauer);
    const isMietkoch = unterkategorieAusPfad.toLowerCase().includes('mietkoch');
    const isDateRangeValid = dateFrom && dateTo && isValidDate(parseISO(dateFrom)) && isValidDate(parseISO(dateTo));
    let numberOfDays = 1;

    if (isDateRangeValid) {
      const startDate = parseISO(dateFrom!); const endDate = parseISO(dateTo!);
      if (endDate >= startDate) { numberOfDays = differenceInCalendarDays(endDate, startDate) + 1; }
      else { errorMsg = "Das Enddatum darf nicht vor dem Startdatum liegen."; }
    } else if (dateFrom && !dateTo && isValidDate(parseISO(dateFrom))) {
      numberOfDays = 1;
    } else if ((dateFrom || dateTo) && !isDateRangeValid) {
      errorMsg = "Ungültiges Datumsformat.";
    }

    if (!errorMsg) {
      if (userInputNumericalDuration !== null && userInputNumericalDuration > 0) {
        if (isMietkoch && numberOfDays > 1 && dateFrom !== dateTo) { hours = numberOfDays * userInputNumericalDuration; }
        else { hours = userInputNumericalDuration; }
      } else {
        if (isMietkoch && numberOfDays > 0) { hours = numberOfDays * 8; }
        else { hours = 1; }
      }
    }
    if (hours <= 0 && !errorMsg) { errorMsg = "Die Auftragsdauer ist ungültig (0 oder negativ)."; }
    return { durationError: errorMsg };
  }, [pathParams, searchParams, unterkategorieAusPfad, decodedAuftragsDauer, dateFrom, dateTo]);


  if (!pathParams || !searchParams) {
    console.log(PAGE_LOG, "BestaetigungsContent: pathParams oder searchParams noch nicht verfügbar für Haupt-Render.");
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Parameter werden geladen...
      </div>
    );
  }

  const missingParams: string[] = []; // Geändert zu const
  if (!anbieterId) missingParams.push("Anbieter-ID");
  if (!unterkategorieAusPfad) missingParams.push("Unterkategorie");
  if (!postalCode) missingParams.push("Postleitzahl");

  if (missingParams.length > 0) {
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
    <AnbieterDetailsFetcher
      anbieterId={anbieterId}
      unterkategorie={unterkategorieAusPfad}
      postalCodeJob={postalCode}
      initialJobDateFrom={dateFrom}
      initialJobDateTo={dateTo}
      initialJobTime={time}
      initialJobDescription={decodedTaskDescription}
      initialJobDurationString={decodedAuftragsDauer}
      onPriceCalculated={onPriceCalculated}
      onDetailsChange={onDetailsChange}
    // priceParam={priceParam} // ENTFERNT
    />
  );
}