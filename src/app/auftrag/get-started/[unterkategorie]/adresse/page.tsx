'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FiArrowLeft, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useJsApiLoader } from '@react-google-maps/api';
import CompanyProfileDetail from './components/CompanyProfileDetail';
import { DateTimeSelectionPopup, DateTimeSelectionPopupProps } from './components/DateTimeSelectionPopup';
import type { Company, RatingMap, ExpandedDescriptionsMap } from './components/lib/types';
import { DateRange } from 'react-day-picker';
import { format, isValid, parseISO, differenceInCalendarDays } from 'date-fns';
import { SEARCH_API_URL, DATA_FOR_SUBCATEGORY_API_URL, GLOBAL_FALLBACK_MIN_PRICE, GLOBAL_FALLBACK_MAX_PRICE, PAGE_ERROR, PAGE_LOG, PAGE_WARN, TRUST_AND_SUPPORT_FEE_EUR } from '../../../../../lib/constants';
import SidebarFilters from './components/SidebarFilters';
import CompanyResultsList from './components/CompanyResultsList';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/clients';
import { useRegistration } from '@/contexts/Registration-Context';
import { getBookingCharacteristics } from './components/lib/utils';

const auth = getAuth(app);
// ✅ KORREKTUR: "as const" entfernt
const libraries: ("places")[] = ['places'];

function parseDurationStringToHours(durationStr?: string): number | null {
  if (!durationStr || typeof durationStr !== 'string') return null;
  const match = durationStr.match(/(\d+(\.\d+)?)/);
  if (match && match[1]) { const hours = parseFloat(match[1]); return isNaN(hours) ? null : hours; }
  const parsedNum = parseFloat(durationStr);
  return isNaN(parsedNum) ? null : parsedNum;
}

export default function AddressPage() {
  const router = useRouter();
  const pathParams = useParams();
  const registration = useRegistration();

  const [street, setStreetState] = useState(registration.jobStreet || '');
  const [city, setCityState] = useState(registration.jobCity || '');
  const [postalCode, setPostalCodeState] = useState(registration.jobPostalCode || '');
  const [country, setCountryState] = useState(registration.jobCountry || 'Deutschland');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!,
    libraries: libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      let foundCity = '';
      let foundPostalCode = '';
      place.address_components?.forEach((component) => {
        if (component.types.includes('locality')) {
          foundCity = component.long_name;
        } else if (component.types.includes('postal_town') && !foundCity) {
          foundCity = component.long_name;
        } else if (component.types.includes('sublocality') && !foundCity) {
          foundCity = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          foundPostalCode = component.long_name;
        }
      });
      setCityState(foundCity);
      if (foundPostalCode) {
        setPostalCodeState(foundPostalCode);
      }
    }
  };

  const [companyProfiles, setCompanyProfiles] = useState<Company[]>([]);
  const [selectedCompanyForPopup, setSelectedCompanyForPopup] = useState<Company | null>(null);
  const [previewCompany, setPreviewCompany] = useState<Company | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [ratingMap, setRatingMap] = useState<RatingMap>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<ExpandedDescriptionsMap>({});
  const [dynamicSliderMin, setDynamicSliderMin] = useState(GLOBAL_FALLBACK_MIN_PRICE);
  const [dynamicSliderMax, setDynamicSliderMax] = useState(GLOBAL_FALLBACK_MAX_PRICE);
  const [currentMaxPrice, setCurrentMaxPrice] = useState(GLOBAL_FALLBACK_MAX_PRICE);
  const [averagePriceForSubcategory, setAveragePriceForSubcategory] = useState<number | null>(null);
  const [priceDistribution, setPriceDistribution] = useState<({ range: string; count: number }[] | null)>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingSubcategoryData, setLoadingSubcategoryData] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [finalSelectedDateRange, setFinalSelectedDateRange] = useState<DateRange | undefined>(() => {
    if (registration.jobDateFrom && isValid(parseISO(registration.jobDateFrom))) {
      const from = parseISO(registration.jobDateFrom);
      const to = registration.jobDateTo && isValid(parseISO(registration.jobDateTo)) ? parseISO(registration.jobDateTo) : from;
      return { from, to };
    }
    return undefined;
  });
  const [finalSelectedTime, setFinalSelectedTimeState] = useState<string>(registration.jobTimePreference || "");
  const [error, setError] = useState<string | null>(null);
  const [editSelection, setEditSelection] = useState<Date | DateRange | undefined>(undefined);
  const [editTime, setEditTime] = useState<string>('');
  const [editDuration, setEditDuration] = useState<string>('');

  useEffect(() => {
    const paramSubcategory = pathParams?.unterkategorie;
    let initialSubcategory: string | null = null;
    if (paramSubcategory && typeof paramSubcategory === 'string') {
      initialSubcategory = decodeURIComponent(paramSubcategory);
    } else {
      initialSubcategory = registration.selectedSubcategory || localStorage.getItem('selectedSubcategory');
    }
    if (initialSubcategory) {
      setSelectedSubcategory(initialSubcategory);
      if (registration.selectedSubcategory !== initialSubcategory) {
        registration.setSelectedSubcategory(initialSubcategory);
      }
    } else { console.warn(PAGE_WARN, "Keine initiale Unterkategorie für AddressPage gefunden."); }
    if (registration.jobStreet) setStreetState(registration.jobStreet);
    if (registration.jobPostalCode) setPostalCodeState(registration.jobPostalCode);
    if (registration.jobCity) setCityState(registration.jobCity);
    if (registration.jobCountry) setCountryState(registration.jobCountry);
  }, [pathParams, registration]);

  const currentBookingChars = useMemo(() =>
    getBookingCharacteristics(selectedSubcategory),
    [selectedSubcategory]
  );

  const fetchDataForSubcategory = useCallback(async (subcategory: string) => {
    if (!subcategory) {
      setAveragePriceForSubcategory(null); setDynamicSliderMin(GLOBAL_FALLBACK_MIN_PRICE); setDynamicSliderMax(GLOBAL_FALLBACK_MAX_PRICE); setCurrentMaxPrice(GLOBAL_FALLBACK_MAX_PRICE); setPriceDistribution(null); return;
    }
    setLoadingSubcategoryData(true);
    try {
      const res = await fetch(`${DATA_FOR_SUBCATEGORY_API_URL}?subcategory=${encodeURIComponent(subcategory)}`);
      if (!res.ok) {
        const errorText = await res.text(); console.error(`${PAGE_ERROR} API getDataForSubcategory FAILED: ${res.status} ${res.statusText}. Response: ${errorText}`); throw new Error(`API Error ${res.status}`);
      }
      const data = await res.json();
      const newMin = data.minPossiblePriceInSubcategory ?? GLOBAL_FALLBACK_MIN_PRICE;
      const newMax = data.maxPossiblePriceInSubcategory ?? GLOBAL_FALLBACK_MAX_PRICE;
      setDynamicSliderMin(newMin); setCurrentMaxPrice(Math.max(newMin, newMax)); setAveragePriceForSubcategory(data.averagePrice || null); setDynamicSliderMax(newMax); setPriceDistribution(data.distribution || null);
    } catch (err: unknown) {
      console.error(`${PAGE_ERROR} Critical error in fetchDataForSubcategory:`, err);
      setAveragePriceForSubcategory(null); setDynamicSliderMin(GLOBAL_FALLBACK_MIN_PRICE); setDynamicSliderMax(GLOBAL_FALLBACK_MAX_PRICE); setCurrentMaxPrice(GLOBAL_FALLBACK_MAX_PRICE); setPriceDistribution(null);
    } finally { setLoadingSubcategoryData(false); }
  }, []);

  useEffect(() => {
    if (selectedSubcategory) { fetchDataForSubcategory(selectedSubcategory); }
    else {
      setDynamicSliderMin(GLOBAL_FALLBACK_MIN_PRICE); setDynamicSliderMax(GLOBAL_FALLBACK_MAX_PRICE); setCurrentMaxPrice(GLOBAL_FALLBACK_MAX_PRICE); setAveragePriceForSubcategory(null); setPriceDistribution(null);
    }
  }, [selectedSubcategory, fetchDataForSubcategory]);

  const fetchCompanyProfiles = useCallback(async () => {
    if (!postalCode || !selectedSubcategory) { setCompanyProfiles([]); return; }
    setLoadingProfiles(true); setError(null);
    try {
      let apiUrl = `${SEARCH_API_URL}?postalCode=${postalCode}&selectedSubcategory=${encodeURIComponent(selectedSubcategory)}&minPrice=${dynamicSliderMin}&maxPrice=${currentMaxPrice}`;
      if (finalSelectedDateRange?.from && isValid(finalSelectedDateRange.from)) {
        apiUrl += `&dateFrom=${format(finalSelectedDateRange.from, "yyyy-MM-dd")}`;
        if (finalSelectedDateRange.to && finalSelectedDateRange.to.getTime() !== finalSelectedDateRange.from.getTime() && isValid(finalSelectedDateRange.to)) {
          apiUrl += `&dateTo=${format(finalSelectedDateRange.to, "yyyy-MM-dd")}`;
        }
      }
      if (finalSelectedTime) { apiUrl += `&time=${encodeURIComponent(finalSelectedTime)}`; }
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errorText = await res.text(); console.error(`${PAGE_ERROR} API searchCompanyProfiles FAILED: ${res.status} ${res.statusText}. Response: ${errorText}`); throw new Error(`Anbieter konnten nicht geladen werden (Fehler ${res.status})`);
      }
      const data: Company[] = await res.json();
      setCompanyProfiles(data);
      const newRatingMap: RatingMap = {};
      for (const company of data) { if (company.id) { } }
      setRatingMap(newRatingMap);
    } catch (err: unknown) {
      console.error(`${PAGE_ERROR} Critical error in fetchCompanyProfiles:`, err);
      let message = 'Fehler beim Laden der Anbieter.';
      if (err instanceof Error) { message = err.message; }
      setError(message);
      setCompanyProfiles([]);
    } finally { setLoadingProfiles(false); }
  }, [postalCode, selectedSubcategory, currentMaxPrice, dynamicSliderMin, finalSelectedDateRange, finalSelectedTime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (postalCode && selectedSubcategory) fetchCompanyProfiles(); else setCompanyProfiles([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchCompanyProfiles, postalCode, selectedSubcategory]);

  const toggleDescriptionExpand = (companyId: string) => {
    setExpandedDescriptions((prev: ExpandedDescriptionsMap) => ({ ...prev, [companyId]: !prev[companyId] }));
  };
  const handlePriceSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(event.target.value);
    setCurrentMaxPrice(newMax >= dynamicSliderMin ? newMax : dynamicSliderMin);
  };
  const resetPriceFilter = () => { setCurrentMaxPrice(dynamicSliderMax); };
  const handleOpenDatePicker = (companyContext?: Company) => {
    setSelectedCompanyForPopup(companyContext || null);
    const initialDur = registration.jobDurationString || currentBookingChars.defaultDurationHours?.toString() || "";
    const initialT = finalSelectedTime || registration.jobTimePreference || "";
    let initialDR = finalSelectedDateRange;
    if (!initialDR && registration.jobDateFrom && isValid(parseISO(registration.jobDateFrom))) {
      const from = parseISO(registration.jobDateFrom);
      const to = registration.jobDateTo && isValid(parseISO(registration.jobDateTo)) ? parseISO(registration.jobDateTo) : from;
      initialDR = { from, to };
    } else if (!initialDR) {
      const today = new Date();
      initialDR = { from: today, to: today };
    }
    setEditSelection(initialDR);
    setEditTime(initialT);
    setEditDuration(initialDur);
    setIsDatePickerOpen(true);
  };
  const handleCloseDatePicker = () => { setIsDatePickerOpen(false); };
  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = async (selection?: Date | DateRange, time?: string, durationStringFromPopup?: string) => {
    setError(null);
    console.log(PAGE_LOG, "AddressPage: handleDateTimeConfirm mit:", { selection, time, durationStringFromPopup });
    let dateFromFormatted: string | undefined = undefined;
    let dateToFormatted: string | undefined = undefined;
    let calculatedNumberOfDays = 1;
    if (selection) {
      if (selection instanceof Date && isValid(selection)) {
        dateFromFormatted = format(selection, "yyyy-MM-dd");
        dateToFormatted = dateFromFormatted;
        calculatedNumberOfDays = 1;
        setFinalSelectedDateRange({ from: selection, to: selection });
      } else if (typeof selection === 'object' && (selection as DateRange).from && isValid((selection as DateRange).from!)) {
        const rangeSelection = selection as DateRange;
        const effectiveFrom = rangeSelection.from!;
        const effectiveTo = (rangeSelection.to && isValid(rangeSelection.to)) ? rangeSelection.to : effectiveFrom;
        if (effectiveTo < effectiveFrom) {
          setError("Das Enddatum darf nicht vor dem Startdatum liegen."); setSelectedCompanyForPopup(null); return;
        }
        dateFromFormatted = format(effectiveFrom, "yyyy-MM-dd");
        dateToFormatted = format(effectiveTo, "yyyy-MM-dd");
        calculatedNumberOfDays = (effectiveTo > effectiveFrom) ? differenceInCalendarDays(effectiveTo, effectiveFrom) + 1 : 1;
        setFinalSelectedDateRange({ from: effectiveFrom, to: effectiveTo });
      } else {
        setError("Ungültige Datumsauswahl."); setSelectedCompanyForPopup(null); return;
      }
    } else {
      setError("Bitte wählen Sie ein Datum oder einen Zeitraum aus."); setSelectedCompanyForPopup(null); return;
    }
    const finalTimeParam = time || "";
    setFinalSelectedTimeState(finalTimeParam);
    const finalDurationStringInput = durationStringFromPopup || "";
    setIsDatePickerOpen(false);
    if (selectedCompanyForPopup && dateFromFormatted) {
      const anbieterStundensatzNum = typeof selectedCompanyForPopup.hourlyRate === 'number' ? selectedCompanyForPopup.hourlyRate : parseFloat(selectedCompanyForPopup.hourlyRate || '0');
      const characteristicsForCalc = getBookingCharacteristics(selectedSubcategory ?? selectedCompanyForPopup.selectedSubcategory ?? null);
      const hoursPerDayOrTotalInput = parseDurationStringToHours(finalDurationStringInput);
      if (isNaN(anbieterStundensatzNum) || anbieterStundensatzNum <= 0) {
        setError("Stundensatz des Anbieters ist ungültig."); setSelectedCompanyForPopup(null); return;
      }
      if (!hoursPerDayOrTotalInput || hoursPerDayOrTotalInput <= 0) {
        setError("Auftragsdauer ist ungültig."); setSelectedCompanyForPopup(null); return;
      }
      let totalCalculatedHours: number;
      if (characteristicsForCalc.isDurationPerDay && calculatedNumberOfDays > 0) {
        totalCalculatedHours = calculatedNumberOfDays * hoursPerDayOrTotalInput;
      } else {
        totalCalculatedHours = hoursPerDayOrTotalInput;
      }
      if (totalCalculatedHours <= 0) {
        setError("Die berechnete Gesamtdauer ist ungültig."); setSelectedCompanyForPopup(null); return;
      }
      const calculatedServicePrice = anbieterStundensatzNum * totalCalculatedHours;
      const totalPriceWithFee = calculatedServicePrice + TRUST_AND_SUPPORT_FEE_EUR;
      const totalPriceInCents = Math.round(totalPriceWithFee * 100);
      registration.setJobStreet(street);
      registration.setJobPostalCode(postalCode);
      registration.setJobCity(city);
      registration.setJobCountry(country);
      if (registration.setSelectedAnbieterId) registration.setSelectedAnbieterId(selectedCompanyForPopup.id);
      registration.setJobDateFrom(dateFromFormatted);
      registration.setJobDateTo(dateToFormatted);
      registration.setJobTimePreference(finalTimeParam || null);
      if (registration.setJobDurationString) registration.setJobDurationString(finalDurationStringInput);
      if (registration.setJobTotalCalculatedHours) registration.setJobTotalCalculatedHours(totalCalculatedHours);
      if (registration.setJobCalculatedPriceInCents) registration.setJobCalculatedPriceInCents(totalPriceInCents);
      const subcategoryForPath = selectedSubcategory || selectedCompanyForPopup.selectedSubcategory || 'Allgemein';
      const encodedSubcategoryForPath = encodeURIComponent(subcategoryForPath);
      const bestaetigungsPageParams = new URLSearchParams();
      bestaetigungsPageParams.append('anbieterId', selectedCompanyForPopup.id);
      if (postalCode) bestaetigungsPageParams.append('postalCode', postalCode);
      bestaetigungsPageParams.append('dateFrom', dateFromFormatted);
      if (dateToFormatted && dateToFormatted !== dateFromFormatted) bestaetigungsPageParams.append('dateTo', dateToFormatted);
      if (finalTimeParam) bestaetigungsPageParams.append('time', finalTimeParam);
      if (finalDurationStringInput) bestaetigungsPageParams.append('auftragsDauer', encodeURIComponent(finalDurationStringInput));
      if (totalPriceInCents) bestaetigungsPageParams.append('price', (totalPriceInCents / 100).toFixed(2));
      const bestaetigungsPagePath = `/auftrag/get-started/${encodedSubcategoryForPath}/BestaetigungsPage?${bestaetigungsPageParams.toString()}`;
      const user = auth.currentUser;
      if (user) {
        router.push(bestaetigungsPagePath);
      } else {
        router.push(`/register/user?redirectTo=${encodeURIComponent(bestaetigungsPagePath)}`);
      }
    } else if (dateFromFormatted) {
      console.log(`${PAGE_LOG} Nur Datum/Zeit im Filter geändert. Lade Profile neu.`); fetchCompanyProfiles();
    }
    setSelectedCompanyForPopup(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-r from-[#d2f1fd] to-[#a0f4e4] px-4 py-20 flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <button onClick={() => router.back()} className="text-[#14ad9f] hover:underline flex items-center gap-2 mb-4">
            <FiArrowLeft /> Zurück
          </button>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-10">Wähle einen Taskter </h1>
        {error && (
          <div className="w-full max-w-3xl mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <FiAlertCircle className="mr-2 h-5 w-5" /> {error}
          </div>
        )}
        <div className="flex flex-col lg:flex-row w-full max-w-7xl gap-6 lg:gap-10 px-4">
          <SidebarFilters
            city={city}
            setCity={setCityState}
            postalCode={postalCode}
            setPostalCode={setPostalCodeState}
            isLoaded={isLoaded}
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
            finalSelectedDateRange={finalSelectedDateRange}
            finalSelectedTime={finalSelectedTime}
            onDateTimeConfirm={handleDateTimeConfirm}
            onOpenDatePicker={() => handleOpenDatePicker()}
            currentMaxPrice={currentMaxPrice}
            dynamicSliderMin={dynamicSliderMin}
            dynamicSliderMax={dynamicSliderMax}
            handlePriceSliderChange={handlePriceSliderChange}
            resetPriceFilter={resetPriceFilter}
            loadingSubcategoryData={loadingSubcategoryData}
            averagePriceForSubcategory={averagePriceForSubcategory}
            priceDistribution={priceDistribution}
            selectedSubcategory={selectedSubcategory}
            setFinalSelectedTime={setFinalSelectedTimeState}
          />
          <div className="w-full lg:w-2/3">
            {loadingProfiles && (
              <div className="flex justify-center items-center min-h-[300px] h-full">
                <FiLoader className="animate-spin text-3xl text-[#14ad9f]" />
                <span className="ml-3 text-gray-700">Anbieter werden geladen...</span>
              </div>
            )}
            {!loadingProfiles && companyProfiles.length === 0 && postalCode && selectedSubcategory && (
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <FiAlertCircle className="text-3xl text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Für Ihre Auswahl wurden leider keine passenden Anbieter gefunden.</p>
                <p className="text-sm text-gray-500">Versuchen Sie, Ihre Filter anzupassen.</p>
              </div>
            )}
            {!loadingProfiles && companyProfiles.length > 0 && (
              <CompanyResultsList
                loadingProfiles={false}
                companyProfiles={companyProfiles}
                ratingMap={ratingMap}
                expandedDescriptions={expandedDescriptions}
                onToggleDescriptionExpand={toggleDescriptionExpand}
                onOpenDatePickerForCompany={(company) => handleOpenDatePicker(company)}
                onSetPreviewCompany={setPreviewCompany}
                selectedCompanyForPopup={selectedCompanyForPopup}
                isDatePickerOpen={isDatePickerOpen}
              />
            )}
          </div>
        </div>
        {previewCompany && (
          <CompanyProfileDetail
            company={previewCompany}
            ratingMap={ratingMap}
            onClose={() => setPreviewCompany(null)}
          />
        )}
      </div>
      {isDatePickerOpen && (
        <DateTimeSelectionPopup
          isOpen={isDatePickerOpen}
          onClose={handleCloseDatePicker}
          onConfirm={handleDateTimeConfirm}
          initialDateRange={
            editSelection instanceof Date
              ? { from: editSelection, to: editSelection }
              : (editSelection && editSelection.from ?
                { from: editSelection.from, to: editSelection.to || editSelection.from }
                : undefined)
          }
          initialTime={editTime || undefined}
          initialDuration={editDuration}
          contextCompany={selectedCompanyForPopup}
          bookingSubcategory={selectedSubcategory || selectedCompanyForPopup?.selectedSubcategory}
        />
      )}
    </>
  );
}