'use client';

import React from 'react';

// KORRIGIERT: maxTags in der Props-Schnittstelle hinzugefügt
interface LanguageTagsProps {
  languages: string; // Erwartet einen String, z.B. "Deutsch, Englisch, Französisch"
  maxTags?: number; // Optional: Maximale Anzahl anzuzeigender Tags
}

export const LanguageTags: React.FC<LanguageTagsProps> = ({ languages, maxTags }) => {
  // Teilen des Strings in ein Array, Trimmen von Leerzeichen und Filtern leerer Einträge
  const languageArray = languages
    .split(',')
    .map(lang => lang.trim())
    .filter(lang => lang.length > 0);

  // Optional: Tags begrenzen
  const displayLanguages =
    maxTags && Array.isArray(languageArray) ? languageArray.slice(0, maxTags) : languageArray;
  const hasMore = maxTags && languageArray.length > maxTags;

  if (languageArray.length === 0) {
    return null; // Nichts rendern, wenn keine Sprachen vorhanden sind
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayLanguages.map((lang, index) => (
        <span
          key={index} // Index als Key ist hier okay, da die Liste statisch ist
          className="px-3 py-1 rounded-full border text-sm font-medium whitespace-nowrap
                     border-[#14ad9f] text-[#14ad9f] bg-[#ecfdfa] dark:bg-gray-700 dark:text-[#7bdad2]"
        >
          {lang}
        </span>
      ))}
      {hasMore && (
        <span
          className="px-3 py-1 rounded-full border text-sm font-medium whitespace-nowrap
                         border-gray-300 text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
        >
          +{languageArray.length - displayLanguages.length}
        </span>
      )}
    </div>
  );
};

export default LanguageTags;
