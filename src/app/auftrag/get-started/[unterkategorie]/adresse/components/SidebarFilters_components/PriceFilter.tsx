// /Users/andystaudinger/Taskilo/src/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/PriceFilter.tsx
'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { RefreshCcw as FiRefreshCcw, Loader2 as FiLoader } from 'lucide-react';
import { PRICE_STEP } from '@/lib/constants'; // Stelle sicher, dass PRICE_STEP importiert wird
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Interface für die Preisverteilungsdaten
export interface PriceDistributionData {
  // Hinzugefügt: 'export'
  range: string;
  count: number;
}

// Hilfsfunktion zum Rendern des Preis-Histograms
const renderPriceHistogram = (data: PriceDistributionData[], loading: boolean) => {
  if (loading) {
    return (
      <div className="h-28 bg-gray-50 my-3 rounded-xl flex items-center justify-center text-sm text-gray-500">
        <FiLoader className="animate-spin mr-2 w-4 h-4" /> Preisverteilung wird geladen...
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="h-28 bg-gray-50 my-3 rounded-xl flex items-center justify-center text-sm text-gray-500">
        Keine Preisdaten verfuegbar.
      </div>
    );
  }
  return (
    <div className="h-28 my-3 bg-gray-50 rounded-xl p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="range"
            axisLine={false}
            tickLine={false}
            tickFormatter={value => `${value}`}
            style={{ fontSize: '10px', fill: '#6b7280' }}
          />
          <YAxis axisLine={false} tickLine={false} hide />
          <Tooltip
            cursor={{ fill: 'rgba(20, 173, 159, 0.1)' }}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, _name: string, props: { payload?: { range?: string } }) => [
              `${value} Anbieter`,
              props.payload?.range || '',
            ]}
          />
          <Bar dataKey="count" fill="#14ad9f" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Props für die PriceFilter Komponente
interface PriceFilterProps {
  currentMaxPrice: number;
  dynamicSliderMin: number;
  dynamicSliderMax: number;
  handlePriceSliderChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetPriceFilter: () => void;
  loadingSubcategoryData: boolean;
  averagePriceForSubcategory: number | null;
  priceDistribution: PriceDistributionData[] | null;
}

export default function PriceFilter({
  currentMaxPrice,
  dynamicSliderMin,
  dynamicSliderMax,
  handlePriceSliderChange,
  resetPriceFilter,
  loadingSubcategoryData,
  averagePriceForSubcategory,
  priceDistribution,
}: PriceFilterProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-semibold text-gray-700">Preis</Label>
        <button
          onClick={resetPriceFilter}
          className="text-xs text-[#14ad9f] hover:text-teal-700 flex items-center font-medium transition-colors"
          disabled={loadingSubcategoryData}
        >
          <FiRefreshCcw size={12} className="mr-1" /> Zurücksetzen
        </button>
      </div>
      
      {/* Rendering des Histograms mit den übergebenen Daten */}
      {renderPriceHistogram(priceDistribution || [], loadingSubcategoryData)}
      
      {/* Slider */}
      <div className="px-1">
        <input
          type="range"
          min={dynamicSliderMin}
          max={dynamicSliderMax}
          step={PRICE_STEP}
          value={currentMaxPrice}
          onChange={handlePriceSliderChange}
          disabled={loadingSubcategoryData || dynamicSliderMin >= dynamicSliderMax}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#14ad9f] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #14ad9f 0%, #14ad9f ${((currentMaxPrice - dynamicSliderMin) / (dynamicSliderMax - dynamicSliderMin)) * 100}%, #e5e7eb ${((currentMaxPrice - dynamicSliderMin) / (dynamicSliderMax - dynamicSliderMin)) * 100}%, #e5e7eb 100%)`
          }}
        />
      </div>
      
      {/* Preis-Labels */}
      <div className="flex justify-between text-sm text-gray-600 px-1">
        <span className="font-medium">{dynamicSliderMin} EUR</span>
        <span className="font-semibold text-[#14ad9f]">{currentMaxPrice} EUR</span>
      </div>
      
      {/* Durchschnittspreis */}
      <div className="bg-gray-50 rounded-xl p-3 mt-2">
        <p className="text-sm text-gray-600">
          Durchschnitt in Kategorie:
          <span className="font-semibold text-gray-800 ml-1">
            {loadingSubcategoryData ? (
              <FiLoader className="animate-spin inline-block w-4 h-4" />
            ) : averagePriceForSubcategory !== null ? (
              `${averagePriceForSubcategory.toFixed(2)} EUR/Std.`
            ) : (
              'N/A'
            )}
          </span>
        </p>
      </div>
    </div>
  );
}
