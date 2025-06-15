// src/app/dashboard/user/[uid]/components/OrderPriceSummary.tsx
'use client';

import React from 'react';
import { FiDollarSign } from 'react-icons/fi'; // Icon für Preis

interface OrderPriceSummaryProps {
    currentCalculatedPriceInCents: number | null;
    currentCalculatedHours: number | null;
    selectedSubcategory: string | null; // Um die Bedingung zur Anzeige zu erfüllen
}

const OrderPriceSummary: React.FC<OrderPriceSummaryProps> = ({
    currentCalculatedPriceInCents,
    currentCalculatedHours,
    selectedSubcategory,
}) => {
    // Die Anzeige erfolgt nur, wenn ein Preis berechnet wurde und eine Unterkategorie ausgewählt ist.
    if (currentCalculatedPriceInCents === null || currentCalculatedPriceInCents <= 0 || !selectedSubcategory) {
        return null; // Nichts rendern, wenn keine gültigen Preisdaten vorliegen
    }

    return (
        <div className="p-4 border rounded-md bg-white text-gray-800">
            <h4 className="text-lg font-semibold mb-2 flex items-center"><FiDollarSign className="mr-2" /> Geschätzter Preis</h4>
            <p className="text-2xl font-bold">{currentCalculatedPriceInCents / 100} EUR</p>
            <p className="text-sm text-gray-600">
                Basierend auf {currentCalculatedHours || 0} Stunden (Standardrate).
            </p>
        </div>
    );
};

export default OrderPriceSummary;