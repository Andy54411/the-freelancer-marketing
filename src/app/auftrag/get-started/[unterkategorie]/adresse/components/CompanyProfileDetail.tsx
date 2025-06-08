// /Users/andystaudinger/tasko/src/app/auftrag/get-started/[unterkategorie]/adresse/components/CompanyProfileDetail.tsx
'use client';

import Image from 'next/image';
import React from 'react';
// Importiere deine globalen Typen - passe den Pfad an deine globale Typendatei an!
// Z.B. ../../../../../../../lib/types oder besser mit Alias '@/lib/types'
import type { Company, RatingInfo } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/types';

// Importiere andere benötigte Komponenten mit korrekten Pfaden
import ProjectGallery from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/ProjectGallery'; // Beispiel für globalen Pfad
import ReviewList from '@/components/ReviewList';       // Beispiel für globalen Pfad
import LanguageTags from '@/components/LanguageTags';   // Beispiel für globalen Pfad


// Hilfsfunktion zum Rendern von Sternen
function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  return '★'.repeat(fullStars) + (hasHalfStar ? '⭑' : '') + '☆'.repeat(emptyStars);
}

export interface CompanyProfileDetailProps {
  company: Company;
  ratingMap: Record<string, RatingInfo>;
  onClose: () => void;
}

// Die Komponente selbst - kann als const oder function definiert werden
const CompanyProfileDetail: React.FC<CompanyProfileDetailProps> = ({ company, ratingMap, onClose }) => {
  const companyRating = ratingMap[company.id];

  let displayHourlyRate: string | null = null;
  if (typeof company.hourlyRate === 'number') {
    displayHourlyRate = `${company.hourlyRate.toFixed(2)} €/Std.`;
  } else if (typeof company.hourlyRate === 'string' && company.hourlyRate.trim() !== '') {
    displayHourlyRate = company.hourlyRate;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center px-4 overflow-y-auto py-10">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>

        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
          <Image
            src={company.profilePictureURL || '/default-avatar.jpg'}
            alt={`Profilbild von ${company.companyName}`}
            className="w-24 h-24 rounded-full object-cover flex-shrink-0 border"
            width={96} // Entspricht w-24 (24 * 4px = 96px)
            height={96} // Entspricht h-24 (24 * 4px = 96px)
            priority // Dieses Bild ist wahrscheinlich wichtig für LCP
          />

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{company.companyName}</h2>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="text-yellow-500">
                {companyRating ? renderStars(companyRating.avg) : '–'}
              </span>{' '}
              {companyRating?.avg?.toFixed(1) ?? '–'} ({companyRating?.count ?? 0} Bewertungen)

              {companyRating?.subCounts && Object.keys(companyRating.subCounts).length > 0 && (
                <div className="text-xs mt-1">
                  {Object.entries(companyRating.subCounts).map(([key, value]) => (
                    <span key={key} className="mr-2">{value}x {key}</span>
                  ))}
                </div>
              )}
              {companyRating?.category && (
                <div className="text-xs mt-1">Kategorie (Bewertungen): {companyRating.category}</div>
              )}
            </div>

            {displayHourlyRate && (
              <p className="text-base font-semibold text-gray-800 dark:text-white">
                {displayHourlyRate}
              </p>
            )}
            {company.minimumHours !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Minimum {company.minimumHours} Stunden</p>
            )}
            {company.postalCode && company.city && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{company.postalCode} {company.city}</p>
            )}
            {company.languages && typeof company.languages === 'string' && company.languages.length > 0 && (
              <div className="mt-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sprachen:</h3>
                <LanguageTags languages={company.languages} maxTags={5} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Beschreibung</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {company.description || 'Keine detaillierte Beschreibung verfügbar.'}
          </p>
        </div>

        {company.id && company.projectImages && company.projectImages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Projektgalerie</h3>
            {/* WICHTIG: Stelle sicher, dass ProjectGallery.tsx eine 'images'-Prop (string[]) akzeptiert! */}
            <ProjectGallery userId={company.id} images={company.projectImages} />
          </div>
        )}

        {company.id && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Bewertungen</h3>
            <ReviewList anbieterId={company.id} />
          </div>
        )}
      </div>
    </div>
  );
};

// --- DIESER STANDARDEXPORT IST ENTSCHEIDEND ---
export default CompanyProfileDetail;
