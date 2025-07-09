// /Users/andystaudinger/Tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/SidebarFilters_components/PriceFilter.tsx
'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { RefreshCcw as FiRefreshCcw, Loader2 as FiLoader } from 'lucide-react';
import { PRICE_STEP } from '@/lib/constants'; // Stelle sicher, dass PRICE_STEP importiert wird
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Interface für die Preisverteilungsdaten
export interface PriceDistributionData { // Hinzugefügt: 'export'
    range: string;
    count: number;
}

// Hilfsfunktion zum Rendern des Preis-Histograms
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
        <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-gray-700">Preis</Label>
                <button onClick={resetPriceFilter} className="text-xs text-[#14ad9f] hover:underline flex items-center" disabled={loadingSubcategoryData}>
                    <FiRefreshCcw size={12} className="mr-1" /> Zurücksetzen
                </button>
            </div>
            {/* Rendering des Histograms mit den übergebenen Daten */}
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
    );
}
