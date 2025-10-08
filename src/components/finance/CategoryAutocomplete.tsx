'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, MessageSquare, Megaphone, Briefcase, Package, Building2 } from 'lucide-react';
import { DatevCardService } from '@/services/datevCardService';

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: React.ReactNode;
}

interface CategoryAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCategorySelect: (category: Category) => void;
  onOpenAdvancedSearch: () => void;
  placeholder?: string;
  required?: boolean;
}

export default function CategoryAutocomplete({
  value,
  onChange,
  onCategorySelect,
  onOpenAdvancedSearch,
  placeholder = 'Suche nach Stichwort, Kategorie oder Buchhaltungskonto',
  required = false,
}: CategoryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Alle DATEV-Kategorien laden - nach Kategorien gruppiert
  const datevCategories = React.useMemo(() => {
    const allCards = DatevCardService.getAllCards()
      .filter(card => card.type === 'EXPENSE')
      .map(card => ({
        id: card.id,
        name: DatevCardService.getDisplayName(card),
        code: card.code,
        description: card.description || '',
        category: card.category,
        icon: <Building2 className="h-5 w-5" />,
      }));

    // Debug: Suche nach "Sonstiges" Einträgen
    const sonstigeCards = allCards.filter(
      card =>
        card.name.toLowerCase().includes('sonstig') ||
        card.description.toLowerCase().includes('sonstig') ||
        card.code.includes('6850')
    );
    console.log('🔍 Found "Sonstige" cards:', sonstigeCards);

    // Gruppiere nach Kategorien für bessere Organisation
    const grouped = new Map<string, typeof allCards>();
    allCards.forEach(card => {
      if (!grouped.has(card.category)) {
        grouped.set(card.category, []);
      }
      grouped.get(card.category)!.push(card);
    });

    return { all: allCards, grouped };
  }, []);

  // Filter categories based on search term - ZEIGE ALLE KATEGORIEN wenn leer!
  const filteredCategories = React.useMemo(() => {
    const searchTerm = value.toLowerCase().trim();
    console.log('🔍 Searching for:', searchTerm);

    if (searchTerm.length === 0) {
      // Zeige Top-Kategorien aus jeder Gruppe (ca. 50-80 wichtigste)
      const topCategories: Category[] = [];

      // Wichtigste Kategorien zuerst
      const priorityOrder = [
        'Büro & Verwaltung',
        'Betriebsausgaben',
        'Fahrzeugkosten',
        'Raumkosten',
        'Personalkosten',
        'Material & Waren',
        'Dienstleistung & Beratung',
        'Werbung & Marketing',
        'Versicherungen & Beiträge',
        'Zinsen',
        'Steuern & Abgaben',
      ];

      // Füge Top-Einträge aus jeder wichtigen Kategorie hinzu
      priorityOrder.forEach(category => {
        const categoryCards = datevCategories.grouped.get(category) || [];
        topCategories.push(...categoryCards.slice(0, 8)); // Top 8 je Kategorie
      });

      // Füge auch andere wichtige Einzelkonten hinzu
      const otherImportant = datevCategories.all.filter(
        card =>
          card.name.includes('Sonstige') ||
          card.name.includes('sonstige') ||
          card.code.includes('6850') ||
          card.code.includes('6090') ||
          card.code.includes('6640')
      );

      topCategories.push(...otherImportant);

      // Entferne Duplikate und limitiere
      const uniqueCategories = Array.from(
        new Map(topCategories.map(cat => [cat.id, cat])).values()
      ).slice(0, 100); // Top 100 wichtigste

      console.log('🎯 Showing', uniqueCategories.length, 'categories when empty');
      return uniqueCategories;
    }

    // Such-Filterung für alle Kategorien - ERWEITERTE DEBUG-VERSION
    console.log('🔍 Total available categories:', datevCategories.all.length);
    console.log(
      '🔍 Sample categories:',
      datevCategories.all
        .slice(0, 5)
        .map(c => ({ name: c.name, category: c.category, code: c.code }))
    );

    const filtered = datevCategories.all.filter(category => {
      // Erweiterte Suchlogik für bessere Treffer
      const nameMatch = category.name && category.name.toLowerCase().includes(searchTerm);
      const descMatch =
        category.description && category.description.toLowerCase().includes(searchTerm);
      const codeMatch = category.code && category.code.toLowerCase().includes(searchTerm);
      const categoryMatch =
        category.category && category.category.toLowerCase().includes(searchTerm);

      // Spezielle Behandlung für "Sonstiges" - auch nach einzelnen Worten suchen
      let sonstigesMatch = false;
      if (searchTerm.includes('sonstig')) {
        sonstigesMatch =
          !!(category.name && category.name.toLowerCase().includes('sonstig')) ||
          !!(category.description && category.description.toLowerCase().includes('sonstig')) ||
          !!(category.category && category.category.toLowerCase().includes('sonstig'));
      }

      // Debug-Output für "Sonstiges" Suche
      if (searchTerm.includes('sonstig')) {
        console.log('🔍 Testing category:', {
          name: category.name,
          category: category.category,
          code: category.code,
          matches: { nameMatch, descMatch, codeMatch, categoryMatch, sonstigesMatch },
        });
      }

      return nameMatch || descMatch || codeMatch || categoryMatch || sonstigesMatch;
    });

    // Sortiere Ergebnisse: Exakte Matches zuerst, dann Code-Matches, dann Rest
    const sortedFiltered = filtered
      .sort((a, b) => {
        const aExactName = a.name && a.name.toLowerCase() === searchTerm;
        const bExactName = b.name && b.name.toLowerCase() === searchTerm;
        if (aExactName !== bExactName) return aExactName ? -1 : 1;

        const aCodeMatch = a.code && a.code.toLowerCase().includes(searchTerm);
        const bCodeMatch = b.code && b.code.toLowerCase().includes(searchTerm);
        if (aCodeMatch !== bCodeMatch) return aCodeMatch ? -1 : 1;

        return 0;
      })
      .slice(0, 50); // Max 50 Ergebnisse bei Suche

    console.log('🔍 Filtered results:', sortedFiltered.length);
    console.log(
      '🔍 First 3 results:',
      sortedFiltered.slice(0, 3).map(c => c.name)
    );
    return sortedFiltered;
  }, [value, datevCategories]);

  // Handle input focus
  const handleInputFocus = () => {
    console.log('🎯 Input focused, opening dropdown with', filteredCategories.length, 'categories');
    setIsOpen(true);
    setActiveIndex(0);
  };

  // Handle input blur with delay to allow clicks
  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setActiveIndex(0);
  };

  // Handle category selection
  const handleCategoryClick = (category: Category) => {
    console.log('🎯 Category selected:', category);
    // Set the display value in the input field
    const displayValue = `${category.code} - ${category.name}`;
    onChange(displayValue);
    onCategorySelect(category);
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    const totalItems = filteredCategories.length + 1; // +1 for "Erweiterte Suche"

    switch (e.key) {
      case 'ArrowDown':
        setActiveIndex(prev => (prev + 1) % totalItems);
        e.preventDefault();
        break;
      case 'ArrowUp':
        setActiveIndex(prev => (prev - 1 + totalItems) % totalItems);
        e.preventDefault();
        break;
      case 'Enter':
        if (activeIndex < filteredCategories.length) {
          handleCategoryClick(filteredCategories[activeIndex]);
        } else {
          // "Erweiterte Suche" selected
          onOpenAdvancedSearch();
          setIsOpen(false);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        e.preventDefault();
        break;
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Input Field */}
      <div className="relative border border-gray-300 rounded-md focus-within:ring-[#14ad9f] focus-within:border-[#14ad9f] shadow-sm">
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-3 pr-11 py-3 border-0 rounded-md focus:ring-0 focus:outline-none bg-transparent"
          required={required}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-activedescendant={isOpen ? `category-${activeIndex}` : undefined}
          autoComplete="off"
        />
      </div>

      {/* Dropdown/Popover */}
      {isOpen && (
        <div
          className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden"
          style={{ minWidth: '400px' }}
          role="listbox"
        >
          {/* Scrollable Content */}
          <div className="max-h-80 overflow-y-auto">
            {/* Favorites Group */}
            {filteredCategories.length > 0 && (
              <div>
                <h6
                  className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100"
                  role="presentation"
                  id="DeineFavoriten"
                >
                  Deine Favoriten
                </h6>
                <ul role="group" aria-labelledby="DeineFavoriten">
                  {filteredCategories.map((category, index) => (
                    <li
                      key={category.id}
                      id={`category-${index}`}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        index === activeIndex
                          ? 'bg-[#14ad9f]/10 text-[#14ad9f]'
                          : 'hover:bg-gray-50 text-gray-900'
                      }`}
                      role="option"
                      aria-selected={index === activeIndex}
                      onClick={() => handleCategoryClick(category)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5 text-gray-400">{category.icon}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                          <span className="font-mono">{category.code}</span>
                          {category.code && ' - '}
                          {category.description}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No Results */}
            {filteredCategories.length === 0 && value.length > 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                Keine Kategorien gefunden für &quot;{value}&quot;
              </div>
            )}
          </div>

          {/* Action Container */}
          <div className="border-t border-gray-200 bg-gray-50">
            <ul role="menu">
              <li>
                <button
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeIndex === filteredCategories.length
                      ? 'bg-[#14ad9f]/10 text-[#14ad9f]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="menuitem"
                  onClick={() => {
                    onOpenAdvancedSearch();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(filteredCategories.length)}
                >
                  Erweiterte Suche
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
