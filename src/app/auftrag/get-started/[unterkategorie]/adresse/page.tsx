'use client';

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, ChevronRight, X, MapPin, Calendar, Users } from 'lucide-react';
import { useGoogleMaps } from '@/contexts/GoogleMapsLoaderContext';
import CompanyProfileDetail from './components/CompanyProfileDetail';
import {
  DateTimeSelectionPopup,
  DateTimeSelectionPopupProps,
} from './components/DateTimeSelectionPopup';
import type { Company, RatingMap, ExpandedDescriptionsMap } from '@/types/types';
import { DateRange } from 'react-day-picker';
import { format, isValid, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  GLOBAL_FALLBACK_MIN_PRICE,
  GLOBAL_FALLBACK_MAX_PRICE,
  TRUST_AND_SUPPORT_FEE_EUR,
  DATA_FOR_SUBCATEGORY_API_URL,
  SEARCH_API_URL,
} from '../../../../../lib/constants';
import SidebarFilters from './components/SidebarFilters';
import CompanyResultsList from './components/CompanyResultsList';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/clients';
import { useRegistration } from '@/contexts/Registration-Context';
import { getBookingCharacteristics } from './components/lib/utils';
import { categories } from '@/lib/categories';

const auth = getAuth(app);

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

export default function AddressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathParams = useParams();
  const registration = useRegistration();

  const [street, setStreetState] = useState(registration.jobStreet || '');
  const [city, setCityState] = useState(registration.jobCity || '');
  const [postalCode, setPostalCodeState] = useState(registration.jobPostalCode || '');
  const [country, setCountryState] = useState(registration.jobCountry || 'Deutschland');
  const { isLoaded } = useGoogleMaps();

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();

      if (!place || !place.address_components) {
        return;
      }

      let foundCity = '';
      let foundPostalCode = '';
      let foundCountry = '';
      let foundStreet = '';
      let foundStreetNumber = '';

      place.address_components.forEach(component => {
        const types = component.types;

        if (types.includes('locality')) {
          foundCity = component.long_name;
        } else if (types.includes('postal_town') && !foundCity) {
          foundCity = component.long_name;
        } else if (types.includes('sublocality') && !foundCity) {
          foundCity = component.long_name;
        } else if (types.includes('administrative_area_level_2') && !foundCity) {
          foundCity = component.long_name;
        }

        if (types.includes('postal_code')) {
          foundPostalCode = component.long_name;
        }

        if (types.includes('country')) {
          foundCountry = component.long_name;
        }

        if (types.includes('route')) {
          foundStreet = component.long_name;
        }

        if (types.includes('street_number')) {
          foundStreetNumber = component.long_name;
        }
      });

      if (foundCity) {
        setCityState(foundCity);
      }

      if (foundPostalCode) {
        setPostalCodeState(foundPostalCode);
      }

      if (foundCountry) {
        setCountryState(foundCountry);
      }

      if (foundStreet) {
        const fullStreet = foundStreetNumber ? `${foundStreet} ${foundStreetNumber}` : foundStreet;
        setStreetState(fullStreet);
      }
    }
  }, [autocomplete]);

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
  const [priceDistribution, setPriceDistribution] = useState<
    { range: string; count: number }[] | null
  >(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingSubcategoryData, setLoadingSubcategoryData] = useState(false);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [finalSelectedDateRange, setFinalSelectedDateRange] = useState<DateRange | undefined>(
    () => {
      if (registration.jobDateFrom && isValid(parseISO(registration.jobDateFrom))) {
        const from = parseISO(registration.jobDateFrom);
        const to =
          registration.jobDateTo && isValid(parseISO(registration.jobDateTo))
            ? parseISO(registration.jobDateTo)
            : from;
        return { from, to };
      }
      return undefined;
    }
  );
  const [finalSelectedTime, setFinalSelectedTimeState] = useState<string>(
    registration.jobTimePreference || ''
  );
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
      initialSubcategory =
        registration.selectedSubcategory || localStorage.getItem('selectedSubcategory');
    }
    if (initialSubcategory) {
      setSelectedSubcategory(initialSubcategory);
      if (registration.selectedSubcategory !== initialSubcategory) {
        registration.setSelectedSubcategory(initialSubcategory);
      }
    }

    const descriptionFromUrl = searchParams?.get('description');
    if (
      descriptionFromUrl &&
      (!registration.description || registration.description.trim() === '')
    ) {
      try {
        const decodedDescription = decodeURIComponent(descriptionFromUrl);
        registration.setDescription(decodedDescription);
      } catch {
        registration.setDescription(descriptionFromUrl);
      }
    }

    if (registration.jobStreet) setStreetState(registration.jobStreet);
    if (registration.jobPostalCode) setPostalCodeState(registration.jobPostalCode);
    if (registration.jobCity) setCityState(registration.jobCity);
    if (registration.jobCountry) setCountryState(registration.jobCountry);
  }, [pathParams, registration, searchParams]);

  const _selectedMainCategory = useMemo(() => {
    if (!selectedSubcategory) return null;
    for (const cat of categories) {
      if (cat.subcategories.includes(selectedSubcategory)) {
        return cat.title;
      }
    }
    return null;
  }, [selectedSubcategory]);

  const currentBookingChars = useMemo(
    () => getBookingCharacteristics(selectedSubcategory),
    [selectedSubcategory]
  );

  const fetchDataForSubcategory = useCallback(
    async (subcategory: string) => {
      if (!subcategory) {
        setAveragePriceForSubcategory(null);
        setDynamicSliderMin(GLOBAL_FALLBACK_MIN_PRICE);
        setDynamicSliderMax(GLOBAL_FALLBACK_MAX_PRICE);
        setCurrentMaxPrice(GLOBAL_FALLBACK_MAX_PRICE);
        setPriceDistribution(null);
        return;
      }
      setLoadingSubcategoryData(true);
      try {
        const res = await fetch(
          `${DATA_FOR_SUBCATEGORY_API_URL}?subcategory=${encodeURIComponent(subcategory)}`
        );
        if (!res.ok) {
          throw new Error(`API Error ${res.status}`);
        }
        const data = await res.json();
        const newMin = data.minPossiblePriceInSubcategory ?? GLOBAL_FALLBACK_MIN_PRICE;
        const newMax = data.maxPossiblePriceInSubcategory ?? GLOBAL_FALLBACK_MAX_PRICE;
        setDynamicSliderMin(newMin);
        setCurrentMaxPrice(Math.max(newMin, newMax));
        setAveragePriceForSubcategory(data.averagePrice || null);
        setDynamicSliderMax(newMax);
        setPriceDistribution(data.distribution || null);
      } catch {
        setAveragePriceForSubcategory(null);
        setDynamicSliderMin(GLOBAL_FALLBACK_MIN_PRICE);
        setDynamicSliderMax(GLOBAL_FALLBACK_MAX_PRICE);
        setCurrentMaxPrice(GLOBAL_FALLBACK_MAX_PRICE);
        setPriceDistribution(null);
      } finally {
        setLoadingSubcategoryData(false);
      }
    },
    []
  );

  const fetchCompanyProfiles = useCallback(async () => {
    if (!postalCode || !selectedSubcategory) {
      setCompanyProfiles([]);
      return;
    }
    setLoadingProfiles(true);
    setError(null);
    try {
      let apiUrl = `${SEARCH_API_URL}?postalCode=${postalCode}&selectedSubcategory=${encodeURIComponent(selectedSubcategory)}&minPrice=${dynamicSliderMin}&maxPrice=${currentMaxPrice}`;
      if (finalSelectedDateRange?.from && isValid(finalSelectedDateRange.from)) {
        apiUrl += `&dateFrom=${format(finalSelectedDateRange.from, 'yyyy-MM-dd')}`;
        if (
          finalSelectedDateRange.to &&
          finalSelectedDateRange.to.getTime() !== finalSelectedDateRange.from.getTime() &&
          isValid(finalSelectedDateRange.to)
        ) {
          apiUrl += `&dateTo=${format(finalSelectedDateRange.to, 'yyyy-MM-dd')}`;
        }
      }
      if (finalSelectedTime) {
        apiUrl += `&time=${encodeURIComponent(finalSelectedTime)}`;
      }
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error(`Anbieter konnten nicht geladen werden (Fehler ${res.status})`);
      }
      const data: Company[] = await res.json();
      setCompanyProfiles(data);
      const newRatingMap: RatingMap = {};
      for (const company of data) {
        newRatingMap[company.id] = {
          avg: 0,
          count: 0,
        };
      }
      setRatingMap(newRatingMap);
    } catch (err: unknown) {
      let message = 'Fehler beim Laden der Anbieter.';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      setCompanyProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, [
    postalCode,
    selectedSubcategory,
    currentMaxPrice,
    dynamicSliderMin,
    finalSelectedDateRange,
    finalSelectedTime,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (postalCode && selectedSubcategory) {
        fetchDataForSubcategory(selectedSubcategory);
        fetchCompanyProfiles();
      } else {
        setCompanyProfiles([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchDataForSubcategory, postalCode, selectedSubcategory, fetchCompanyProfiles]);

  const toggleDescriptionExpand = (companyId: string) => {
    setExpandedDescriptions((prev: ExpandedDescriptionsMap) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  const handlePriceSliderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newMax = Number(event.target.value);
      setCurrentMaxPrice(newMax >= dynamicSliderMin ? newMax : dynamicSliderMin);
    },
    [dynamicSliderMin]
  );

  const resetPriceFilter = useCallback(() => {
    setCurrentMaxPrice(dynamicSliderMax);
  }, [dynamicSliderMax]);

  const handleOpenDatePicker = useCallback(
    (companyContext?: Company) => {
      setSelectedCompanyForPopup(companyContext || null);
      const initialDur =
        registration.jobDurationString ||
        currentBookingChars.defaultDurationHours?.toString() ||
        '';
      const initialT = finalSelectedTime || registration.jobTimePreference || '';
      let initialDR = finalSelectedDateRange;
      if (!initialDR && registration.jobDateFrom && isValid(parseISO(registration.jobDateFrom))) {
        const from = parseISO(registration.jobDateFrom);
        const to =
          registration.jobDateTo && isValid(parseISO(registration.jobDateTo))
            ? parseISO(registration.jobDateTo)
            : from;
        initialDR = { from, to };
      } else if (!initialDR) {
        const today = new Date();
        initialDR = { from: today, to: today };
      }
      setEditSelection(initialDR);
      setEditTime(initialT);
      setEditDuration(initialDur);
      setIsDatePickerOpen(true);
    },
    [registration, currentBookingChars, finalSelectedTime, finalSelectedDateRange]
  );

  const handleCloseDatePicker = useCallback(() => {
    setIsDatePickerOpen(false);
  }, []);

  const handleDateTimeConfirm: DateTimeSelectionPopupProps['onConfirm'] = useCallback(
    async (selection?: Date | DateRange, time?: string, durationStringFromPopup?: string) => {
      setError(null);

      let dateFromFormatted: string | undefined;
      let dateToFormatted: string | undefined;
      let calculatedNumberOfDays = 1;
      if (selection) {
        if (selection instanceof Date && isValid(selection)) {
          dateFromFormatted = format(selection, 'yyyy-MM-dd');
          dateToFormatted = dateFromFormatted;
          calculatedNumberOfDays = 1;
          setFinalSelectedDateRange({ from: selection, to: selection });
        } else if (
          typeof selection === 'object' &&
          (selection as DateRange).from &&
          isValid((selection as DateRange).from!)
        ) {
          const rangeSelection = selection as DateRange;
          const effectiveFrom = rangeSelection.from!;
          const effectiveTo =
            rangeSelection.to && isValid(rangeSelection.to) ? rangeSelection.to : effectiveFrom;
          if (effectiveTo < effectiveFrom) {
            setError('Das Enddatum darf nicht vor dem Startdatum liegen.');
            setSelectedCompanyForPopup(null);
            return;
          }
          dateFromFormatted = format(effectiveFrom, 'yyyy-MM-dd');
          dateToFormatted = format(effectiveTo, 'yyyy-MM-dd');
          calculatedNumberOfDays =
            effectiveTo > effectiveFrom
              ? differenceInCalendarDays(effectiveTo, effectiveFrom) + 1
              : 1;
          setFinalSelectedDateRange({ from: effectiveFrom, to: effectiveTo });
        } else {
          setError('Ungueltige Datumsauswahl.');
          setSelectedCompanyForPopup(null);
          return;
        }
      } else {
        setError('Bitte waehlen Sie ein Datum oder einen Zeitraum aus.');
        setSelectedCompanyForPopup(null);
        return;
      }
      const finalTimeParam = time || '';
      setFinalSelectedTimeState(finalTimeParam);
      const finalDurationStringInput = durationStringFromPopup || '';
      setIsDatePickerOpen(false);
      if (selectedCompanyForPopup && dateFromFormatted) {
        const anbieterStundensatzNum =
          typeof selectedCompanyForPopup.hourlyRate === 'number'
            ? selectedCompanyForPopup.hourlyRate
            : parseFloat(selectedCompanyForPopup.hourlyRate || '0');
        const characteristicsForCalc = getBookingCharacteristics(
          selectedSubcategory ?? selectedCompanyForPopup.selectedSubcategory ?? null
        );
        const hoursPerDayOrTotalInput = parseDurationStringToHours(finalDurationStringInput);
        if (isNaN(anbieterStundensatzNum) || anbieterStundensatzNum <= 0) {
          setError('Stundensatz des Anbieters ist ungueltig.');
          setSelectedCompanyForPopup(null);
          return;
        }
        if (!hoursPerDayOrTotalInput || hoursPerDayOrTotalInput <= 0) {
          setError('Auftragsdauer ist ungueltig.');
          setSelectedCompanyForPopup(null);
          return;
        }
        let totalCalculatedHours: number;
        if (characteristicsForCalc.isDurationPerDay && calculatedNumberOfDays > 0) {
          totalCalculatedHours = calculatedNumberOfDays * hoursPerDayOrTotalInput;
        } else {
          totalCalculatedHours = hoursPerDayOrTotalInput;
        }
        if (totalCalculatedHours <= 0) {
          setError('Die berechnete Gesamtdauer ist ungueltig.');
          setSelectedCompanyForPopup(null);
          return;
        }
        const calculatedServicePrice = anbieterStundensatzNum * totalCalculatedHours;
        const totalPriceWithFee = calculatedServicePrice + TRUST_AND_SUPPORT_FEE_EUR;
        const totalPriceInCents = Math.round(totalPriceWithFee * 100);
        registration.setJobStreet(street);
        registration.setJobPostalCode(postalCode);
        registration.setJobCity(city);
        registration.setJobCountry(country);
        if (registration.setSelectedAnbieterId)
          registration.setSelectedAnbieterId(selectedCompanyForPopup.id);
        registration.setJobDateFrom(dateFromFormatted);
        registration.setJobDateTo(dateToFormatted);
        registration.setJobTimePreference(finalTimeParam || null);
        if (registration.setJobDurationString)
          registration.setJobDurationString(finalDurationStringInput);
        if (registration.setJobTotalCalculatedHours)
          registration.setJobTotalCalculatedHours(totalCalculatedHours);
        if (registration.setJobCalculatedPriceInCents)
          registration.setJobCalculatedPriceInCents(totalPriceInCents);
        const subcategoryForPath =
          selectedSubcategory || selectedCompanyForPopup.selectedSubcategory || 'Allgemein';
        const encodedSubcategoryForPath = encodeURIComponent(subcategoryForPath);
        const bestaetigungsPageParams = new URLSearchParams();
        bestaetigungsPageParams.append('anbieterId', selectedCompanyForPopup.id);
        if (postalCode) bestaetigungsPageParams.append('postalCode', postalCode);
        bestaetigungsPageParams.append('dateFrom', dateFromFormatted);
        if (dateToFormatted && dateToFormatted !== dateFromFormatted)
          bestaetigungsPageParams.append('dateTo', dateToFormatted);
        if (finalTimeParam) bestaetigungsPageParams.append('time', finalTimeParam);
        if (finalDurationStringInput)
          bestaetigungsPageParams.append('auftragsDauer', finalDurationStringInput);
        if (totalPriceInCents)
          bestaetigungsPageParams.append('price', (totalPriceInCents / 100).toFixed(2));
        if (registration.description)
          bestaetigungsPageParams.append('description', registration.description);

        const bestaetigungsPagePath = `/auftrag/get-started/${encodedSubcategoryForPath}/BestaetigungsPage?${bestaetigungsPageParams.toString()}`;

        const user = auth.currentUser;
        if (user) {
          router.push(bestaetigungsPagePath);
        } else {
          const registrationRedirectUrl = `/register/user?redirectTo=${encodeURIComponent(bestaetigungsPagePath)}`;
          router.push(registrationRedirectUrl);
        }
      } else if (dateFromFormatted) {
        fetchCompanyProfiles();
      }
      setSelectedCompanyForPopup(null);
    },
    [
      selectedCompanyForPopup,
      router,
      postalCode,
      selectedSubcategory,
      registration,
      fetchCompanyProfiles,
      street,
      city,
      country,
    ]
  );

  const isLoadingOverall = loadingProfiles || loadingSubcategoryData;

  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-linear-to-b from-gray-50 to-white">
          <Loader2 className="animate-spin w-8 h-8 text-[#14ad9f] mr-3" /> 
          <span className="text-gray-600">Seite wird aufgebaut...</span>
        </div>
      }
    >
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 text-white">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{ backgroundImage: "url('/images/features/accounting-hero.png')" }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Navigation */}
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => router.back()}
                className="flex items-center text-white/80 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 mr-1 rotate-180" />
                <span>Zurueck</span>
              </button>
              <Link 
                href="/"
                className="flex items-center text-white/80 hover:text-white transition-colors"
              >
                <span className="mr-2">Abbrechen</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            {/* Title */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                Waehle einen Taskter
              </h1>
              <p className="text-lg text-white/80 max-w-xl mx-auto">
                {selectedSubcategory ? `Kategorie: ${selectedSubcategory}` : 'Finden Sie den passenden Dienstleister in Ihrer Naehe'}
              </p>
              
              {/* Location Badge */}
              {(city || postalCode) && (
                <div className="mt-4 inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {[postalCode, city].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-linear-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center"
              >
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Sidebar Filters */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full lg:w-1/3"
              >
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-4">
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
                    onOpenDatePicker={handleOpenDatePicker}
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
                </div>
              </motion.div>

              {/* Results */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full lg:w-2/3"
              >
                {isLoadingOverall && (
                  <div className="flex justify-center items-center min-h-[300px] bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <Loader2 className="animate-spin w-8 h-8 text-[#14ad9f]" />
                    <span className="ml-3 text-gray-600">Anbieter werden geladen...</span>
                  </div>
                )}

                {!isLoadingOverall &&
                  companyProfiles.length === 0 &&
                  postalCode &&
                  selectedSubcategory && (
                    <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <div className="p-4 bg-gray-100 rounded-xl w-fit mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Keine Anbieter gefunden</h3>
                      <p className="text-gray-500 mb-4">
                        Fuer Ihre Auswahl wurden leider keine passenden Anbieter gefunden.
                      </p>
                      <p className="text-sm text-gray-400">Versuchen Sie, Ihre Filter anzupassen.</p>
                    </div>
                  )}

                {!isLoadingOverall && companyProfiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-gray-600">
                        <span className="font-semibold text-[#14ad9f]">{companyProfiles.length}</span> Anbieter gefunden
                      </p>
                    </div>
                    <CompanyResultsList
                      loadingProfiles={false}
                      companyProfiles={companyProfiles}
                      ratingMap={ratingMap}
                      expandedDescriptions={expandedDescriptions}
                      onToggleDescriptionExpand={toggleDescriptionExpand}
                      onOpenDatePickerForCompany={company => handleOpenDatePicker(company)}
                      onSetPreviewCompany={setPreviewCompany}
                      selectedCompanyForPopup={selectedCompanyForPopup}
                      isDatePickerOpen={isDatePickerOpen}
                    />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Stats Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow">
                <div className="p-3 bg-[#14ad9f]/10 rounded-xl w-fit mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <p className="font-bold text-gray-800">Lokale Experten</p>
                <p className="text-sm text-gray-500">Dienstleister in Ihrer Naehe</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow">
                <div className="p-3 bg-[#14ad9f]/10 rounded-xl w-fit mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <p className="font-bold text-gray-800">Flexible Termine</p>
                <p className="text-sm text-gray-500">Waehlen Sie Ihren Wunschtermin</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md transition-shadow">
                <div className="p-3 bg-[#14ad9f]/10 rounded-xl w-fit mx-auto mb-3">
                  <Users className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <p className="font-bold text-gray-800">Gepruefte Anbieter</p>
                <p className="text-sm text-gray-500">Qualifizierte Fachkraefte</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Company Detail Modal */}
        {previewCompany && (
          <CompanyProfileDetail
            company={previewCompany}
            ratingMap={ratingMap}
            onClose={() => setPreviewCompany(null)}
          />
        )}
      </div>

      {/* Date Time Picker Modal */}
      {isDatePickerOpen && (
        <DateTimeSelectionPopup
          isOpen={isDatePickerOpen}
          onClose={handleCloseDatePicker}
          onConfirm={handleDateTimeConfirm}
          initialDateRange={
            editSelection instanceof Date
              ? { from: editSelection, to: editSelection }
              : editSelection && editSelection.from
                ? { from: editSelection.from, to: editSelection.to || editSelection.from }
                : undefined
          }
          initialTime={editTime || undefined}
          initialDuration={editDuration}
          contextCompany={selectedCompanyForPopup}
          bookingSubcategory={selectedSubcategory || selectedCompanyForPopup?.selectedSubcategory}
        />
      )}
    </Suspense>
  );
}
