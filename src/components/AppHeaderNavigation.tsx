// /Users/andystaudinger/Taskilo/src/components/AppHeaderNavigation.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { categories, Category } from '@/lib/categoriesData';
import { useAuth } from '@/contexts/AuthContext';

const AppHeaderNavigation: React.FC = () => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const { user } = useAuth();

    const handleMouseEnter = (categoryTitle: string) => {
        setOpenDropdown(categoryTitle);
    };

    const handleMouseLeave = () => {
        setOpenDropdown(null);
    };

    // Helper function to get the correct dashboard URL based on user type
    const getServiceUrl = (category: string, subcategory?: string) => {
        if (!user?.uid) return '/login';

        const baseUrl = user.role === 'firma'
            ? `/dashboard/company/${user.uid}/services`
            : `/dashboard/user/${user.uid}/services`;

        if (subcategory) {
            return `${baseUrl}/${category}/${subcategory}`;
        }
        return baseUrl;
    };

    return (
        <nav className="bg-white border-t border-gray-200 py-3 px-4">
            <ul className="flex space-x-4 justify-center">
                {categories.map((category: Category) => (
                    <li
                        key={category.title}
                        className="relative group"
                        onMouseEnter={() => handleMouseEnter(category.title)}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Hauptkategorie-Link (könnte zu einer Übersichtsseite führen) */}
                        <Link
                            href={user?.uid ? (user.role === 'firma' ? `/dashboard/company/${user.uid}` : `/dashboard/user/${user.uid}`) : '/login'}
                            className="text-gray-700 hover:text-[#14ad9f] px-3 py-2 rounded-md text-sm font-medium"
                        >
                            {category.title}
                        </Link>

                        {/* Dropdown für Unterkategorien */}
                        {openDropdown === category.title && category.subcategories.length > 0 && (
                            <div
                                className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20"
                            >
                                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                    {category.subcategories.map((subcategory) => (
                                        <Link
                                            key={subcategory}
                                            href={getServiceUrl(
                                                encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, '-')),
                                                encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))
                                            )}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                            role="menuitem"
                                        >
                                            {subcategory}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </li>
                ))}
                {/* Weitere Menüpunkte wie "Über uns", "Kontakt" etc. könnten hier folgen */}
            </ul>
        </nav>
    );
};

export default AppHeaderNavigation;