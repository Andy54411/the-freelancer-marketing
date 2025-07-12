'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, Languages, Loader2 } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage, isTranslating, availableLanguages, translatePageContent } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Entscheide basierend auf verfügbarem Platz
      // 320px ist ungefähr die Höhe des Dropdowns
      if (spaceBelow < 320 && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  const handleLanguageChange = async (langCode: string) => {
    setIsOpen(false);
    
    if (langCode !== language) {
      await setLanguage(langCode);
      
      // Für Sprachen ohne manuelle Übersetzung, verwende automatische Übersetzung
      if (!['de', 'en', 'es'].includes(langCode)) {
        await translatePageContent(langCode);
      }
    }
  };

  const currentLanguage = availableLanguages.find(lang => lang.code === language) || availableLanguages[0];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isTranslating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Languages className="w-4 h-4" />
        )}
        <span className="flex items-center gap-1">
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.name}</span>
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown - Intelligente Positionierung */}
          <div 
            className={`absolute right-0 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto transform transition-all duration-200 ${
              dropdownPosition === 'top' 
                ? 'bottom-full mb-2 origin-bottom-right animate-in slide-in-from-bottom-2' 
                : 'top-full mt-2 origin-top-right animate-in slide-in-from-top-2'
            }`}
          >
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1 mb-2">
                VERFÜGBARE SPRACHEN
              </div>
              
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    language === lang.code
                      ? 'bg-[#14ad9f] text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.name}</span>
                  {language === lang.code && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              ))}
              
              {isTranslating && (
                <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Übersetze Seite...
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
