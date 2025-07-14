// /Users/andystaudinger/Tilvo/src/components/SubcategorySelectionModal.tsx
'use client';

import React from 'react';
import { X as FiX, ChevronRight as FiChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubcategorySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainCategoryTitle: string;
  subcategories: string[];
  onSelectSubcategory: (subcategory: string) => void;
  currentlySelectedSubcategory: string | null;
}

const SubcategorySelectionModal: React.FC<SubcategorySelectionModalProps> = ({
  isOpen,
  onClose,
  mainCategoryTitle,
  subcategories,
  onSelectSubcategory,
  currentlySelectedSubcategory,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex justify-center items-center z-[100] p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {t('booking.selectSubcategory')} &quot;{mainCategoryTitle}&quot;
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('modal.close')}
          >
            <FiX size={24} />
          </button>
        </div>

        <ul className="space-y-2">
          {subcategories.map(subcategory => (
            <li key={subcategory}>
              <button
                onClick={() => {
                  onSelectSubcategory(subcategory);
                  onClose(); // Modal nach Auswahl schließen
                }}
                className={`w-full text-left p-3 md:p-4 rounded-md transition-all duration-150 ease-in-out flex justify-between items-center
                            ${currentlySelectedSubcategory === subcategory
                    ? 'bg-[#14ad9f] text-white'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
              >
                <span className="text-sm md:text-base">{subcategory}</span>
                <FiChevronRight size={20} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            {t('modal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubcategorySelectionModal;
