// src/app/dashboard/user/[uid]/components/OrderCategorySelection.tsx
'use client';

import React, { useMemo } from 'react';
import { Combobox } from '@/components/combobox'; // Ihre Combobox-Komponente
import { Label } from '@/components/ui/label'; // Ihre Label-Komponente
import { categories } from '@/lib/categories'; // Annahme: categories ist hier verfügbar

// Typ-Definition für eine Kategorie (aus get-started/page.tsx)
type Category = {
    title: string;
    subcategories: string[];
};

interface OrderCategorySelectionProps {
    selectedCategory: string | null;
    setSelectedCategory: (category: string | null) => void;
    selectedSubcategory: string | null;
    setSelectedSubcategory: (subcategory: string | null) => void;
}

const OrderCategorySelection: React.FC<OrderCategorySelectionProps> = ({
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
}) => {
    const availableSubcategories = useMemo(() => {
        const foundCategory = categories.find((cat) => cat.title === selectedCategory);
        return foundCategory ? foundCategory.subcategories : [];
    }, [selectedCategory]);

    return (
        <div className="space-y-4">
            {/* 1. Hauptkategorie */}
            <div onClick={e => e.stopPropagation()}> {/* Event-Propagation gestoppt */}
                <Label htmlFor="category" className="block text-md font-medium text-gray-700 mb-2">Hauptkategorie *</Label>
                <Combobox
                    options={categories.map((cat: Category) => cat.title)} // Explizites Typing für cat
                    placeholder="Wählen Sie eine Hauptkategorie..."
                    selected={selectedCategory}
                    onChange={(value) => { setSelectedCategory(value); setSelectedSubcategory(null); }}
                />
            </div>

            {/* 2. Unterkategorie */}
            {selectedCategory && (
                <div onClick={e => e.stopPropagation()}> {/* Event-Propagation gestoppt */}
                    <Label htmlFor="subcategory" className="block text-md font-medium text-gray-700 mb-2">Unterkategorie *</Label>
                    <Combobox
                        options={availableSubcategories}
                        placeholder="Wählen Sie eine Unterkategorie..."
                        selected={selectedSubcategory}
                        onChange={(value) => setSelectedSubcategory(value)}
                    />
                </div>
            )}
        </div>
    );
};

export default OrderCategorySelection;