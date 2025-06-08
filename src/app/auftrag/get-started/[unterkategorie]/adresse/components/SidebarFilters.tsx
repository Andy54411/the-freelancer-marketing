'use client';

import { Label } from '@/components/ui/label';
import { Autocomplete } from '@react-google-maps/api';
import { FiRefreshCcw, FiLoader } from 'react-icons/fi';
import { DateRange } from 'react-day-picker';
import { format, addDays, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { generalTimeOptionsForSidebar, PRICE_STEP } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceDistributionData {
  range: string;
  count: number;
}

const renderPriceHistogram = (data: PriceDistributionData[], loading: boolean) => {
  if (loading) {
    return (
      <div className="h-24 bg-gray-100 my-2 rounded flex items-center justify-center text-xs text-gray-400">
        <FiLoader className="animate-spin mr-2" /> Preisverteilung wird geladen...
      </div>
    );
  }
  if (!data || data.length === 0) {
    return <div className="h-24 bg-gray-100 my-2 rounded flex items-center justify-center text-xs text-gray-400">Keine Preisdaten verfügbar.</div>;
  }
  return (
    <div className="h-24 my-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
          <XAxis dataKey="range" axisLine={false} tickLine={false} tickFormatter={(value) => `${value}€`} style={{ fontSize: '10px' }} />
          <YAxis axisLine={false} tickLine={false} hide />
          <Tooltip
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
            formatter={(value: number, name: string, props: { payload?: { range?: string; }; }) => [`${value} Anbieter`, props.payload?.range || '']}
          />
          <Bar dataKey="count" fill="#14ad9f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SidebarFiltersProps {
  city: string;
  setCity: (city: string) => void;
  postalCode: string;
  setPostalCode: (postalCode: string) => void;
  isLoaded: boolean;
  onLoad: (autocomplete: google.maps.places.Autocomplete) => void;
  onPlaceChanged: () => void;
  finalSelectedDateRange: DateRange | undefined;
  finalSelectedTime: string;
  onDateTimeConfirm: (selection?: Date | DateRange, time?: string, duration?: string) => void;
  onOpenDatePicker: () => void;
  currentMaxPrice: number;
  dynamicSliderMin: number;
  dynamicSliderMax: number;
  handlePriceSliderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetPriceFilter: () => void;
  loadingSubcategoryData: boolean;
  averagePriceForSubcategory: number | null;
  priceDistribution: PriceDistributionData[] | null;
  selectedSubcategory: string | null;
  setFinalSelectedTime: (time: string) => void;
}

export default function SidebarFilters({
  city,
  setCity,
  postalCode,
  setPostalCode,
  isLoaded,
  onLoad,
  onPlaceChanged,
  finalSelectedDateRange,
  finalSelectedTime,
  onDateTimeConfirm,
  onOpenDatePicker,
  currentMaxPrice,
  dynamicSliderMin,
  dynamicSliderMax,
  handlePriceSliderChange,
  resetPriceFilter,
  loadingSubcategoryData,
  averagePriceForSubcategory,
  priceDistribution,
  selectedSubcategory,
  setFinalSelectedTime,
}: SidebarFiltersProps) {

  const handleQuickDateSelect = (type: 'today' | '3days' | '7days') => {
    const today = new Date();
    const isRangeMode = selectedSubcategory?.toLowerCase() === 'mietkoch';
    let dateSelection: Date | DateRange;
    if (type === 'today') {
      dateSelection = isRangeMode ? { from: today, to: today } : today;
    } else if (type === '3days') {
      const futureDate = addDays(today, 3);
      dateSelection = isRangeMode ? { from: today, to: futureDate } : futureDate;
    } else { // 7days
      const futureDate = addDays(today, 7);
      dateSelection = isRangeMode ? { from: today, to: futureDate } : futureDate;
    }
    onDateTimeConfirm(dateSelection, finalSelectedTime || undefined);
  };

  return (
    <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-md p-4 space-y-6 flex-shrink-0 self-start">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Filter & Standort</h2>
      <div>
        <Label className="text-base font-medium text-gray-800 dark:text-white">Ort oder Adresse</Label>
        {isLoaded ? (
          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
          // ✅ KORREKTUR: options-Prop entfernt für eine globale, uneingeschränkte Suche
          >
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Adresse, Stadt oder Land"
              className="w-full rounded-md border p-2 mt-2"
            />
          </Autocomplete>
        ) : (
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Kartenkomponente wird geladen..."
            className="w-full rounded-md border p-2 mt-2 bg-gray-100"
            disabled
          />
        )}
      </div>
      <div>
        <Label className="text-base font-medium text-gray-800 dark:text-white">Postleitzahl</Label>
        <input
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="Postleitzahl"
          className="w-full rounded-md border p-2 mt-2"
        />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Label className="text-sm font-medium text-gray-700">Datum</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={() => handleQuickDateSelect('today')} className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors">Heute</button>
          <button onClick={() => handleQuickDateSelect('3days')} className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors">Innerh. 3 Tagen</button>
          <button onClick={() => handleQuickDateSelect('7days')} className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors">Innerh. 1 Woche</button>
          <button onClick={onOpenDatePicker} className="rounded-full border border-gray-300 px-3 py-1 text-sm bg-white text-gray-700 hover:bg-[#14ad9f] hover:text-white transition-colors">Datum auswählen</button>
        </div>
        {finalSelectedDateRange?.from && isValid(finalSelectedDateRange.from) && (
          <p className="text-xs text-gray-600 mt-2">
            Gewählt: {format(finalSelectedDateRange.from, 'dd.MM.yyyy', { locale: de })}
            {finalSelectedDateRange.to && finalSelectedDateRange.to.getTime() !== finalSelectedDateRange.from.getTime() && isValid(finalSelectedDateRange.to) && ` - ${format(finalSelectedDateRange.to, 'dd.MM.yyyy', { locale: de })}`}
            {finalSelectedTime && `, ${finalSelectedTime} Uhr`}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Label className="text-sm font-medium text-gray-700">Tageszeit</Label>
        <div className="space-y-1 mt-2 text-sm text-gray-600">
          <div><input type="checkbox" className="mr-2 accent-[#14ad9f]" />Morgens/Vormittags (08:00 – 12:00 Uhr)</div>
          <div><input type="checkbox" className="mr-2 accent-[#14ad9f]" />Nachmittags (12:00 – 17:00 Uhr)</div>
          <div><input type="checkbox" className="mr-2 accent-[#14ad9f]" />Abends (17:00 – 21:30 Uhr)</div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Label className="text-sm font-medium text-gray-700">Bevorzugte Uhrzeit</Label>
        <select
          value={finalSelectedTime}
          onChange={(e) => setFinalSelectedTime(e.target.value)}
          className="w-full border rounded-md p-2 mt-1 text-sm text-gray-700 bg-white"
        >
          <option value="">Ich bin flexibel</option>
          {generalTimeOptionsForSidebar.map((time: string) => <option key={time} value={time}>{time}</option>)}
        </select>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium text-gray-700">Preis</Label>
          <button onClick={resetPriceFilter} className="text-xs text-[#14ad9f] hover:underline flex items-center" disabled={loadingSubcategoryData}>
            <FiRefreshCcw size={12} className="mr-1" /> Zurücksetzen
          </button>
        </div>
        {renderPriceHistogram(priceDistribution || [], loadingSubcategoryData)}
        <input
          type="range"
          min={dynamicSliderMin}
          max={dynamicSliderMax}
          step={PRICE_STEP}
          value={currentMaxPrice}
          onChange={handlePriceSliderChange}
          disabled={loadingSubcategoryData || dynamicSliderMin >= dynamicSliderMax}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#14ad9f] range-lg disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-600 px-1">
          <span>{dynamicSliderMin} €</span>
          <span>{currentMaxPrice} €</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Durchschnitt in Kategorie:
          <strong className="ml-1">
            {loadingSubcategoryData ? (
              <FiLoader className="animate-spin inline-block" />
            ) : averagePriceForSubcategory !== null ? (
              `${averagePriceForSubcategory.toFixed(2)} €/Std.`
            ) : (
              'N/A'
            )}
          </strong>
        </p>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Label className="text-sm font-medium text-gray-700">Tilver-Kategorie</Label>
        <div className="mt-2 text-sm text-gray-600">
          <div><input type="checkbox" className="mr-2 accent-[#14ad9f]" />Pro-Tilver</div>
        </div>
      </div>
    </div>
  );
}