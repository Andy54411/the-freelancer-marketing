// /Users/andystaudinger/taskilo/src/app/auftrag/get-started/[unterkategorie]/adresse/components/CompanyProfileDetail.tsx
'use client';

import Image from 'next/image';
import React from 'react';
// Importiere deine globalen Typen - passe den Pfad an deine globale Typendatei an!
// Z.B. ../../../../../../../lib/types oder besser mit Alias '@/lib/types'
import type { Company, RatingInfo } from '@/types/types';

// Importiere andere benötigte Komponenten mit korrekten Pfaden
import ProjectGallery from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/ProjectGallery'; // Beispiel für globalen Pfad
import ReviewList from '@/components/ReviewList'; // Beispiel für globalen Pfad
import LanguageTags from '@/components/LanguageTags'; // Beispiel für globalen Pfad

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
const CompanyProfileDetail: React.FC<CompanyProfileDetailProps> = ({
  company,
  ratingMap,
  onClose,
}) => {
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
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          &times;
        </button>

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
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
              {company.companyName}
            </h2>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="text-yellow-500">
                {companyRating ? renderStars(companyRating.avg) : '–'}
              </span>{' '}
              {companyRating?.avg?.toFixed(1) ?? '–'} ({companyRating?.count ?? 0} Bewertungen)
              {companyRating?.subCounts && Object.keys(companyRating.subCounts).length > 0 && (
                <div className="text-xs mt-1">
                  {Object.entries(companyRating.subCounts).map(([key, value]) => (
                    <span key={key} className="mr-2">
                      {value}x {key}
                    </span>
                  ))}
                </div>
              )}
              {companyRating?.category && (
                <div className="text-xs mt-1">
                  Kategorie (Bewertungen): {companyRating.category}
                </div>
              )}
            </div>

            {displayHourlyRate && (
              <p className="text-base font-semibold text-gray-800 dark:text-white">
                {displayHourlyRate}
              </p>
            )}
            {company.minimumHours !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Minimum {company.minimumHours} Stunden
              </p>
            )}
            {company.postalCode && company.city && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {company.postalCode} {company.city}
              </p>
            )}
            {company.languages &&
              typeof company.languages === 'string' &&
              company.languages.length > 0 && (
                <div className="mt-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sprachen:
                  </h3>
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
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              Projektgalerie
            </h3>
            {/* WICHTIG: Stelle sicher, dass ProjectGallery.tsx eine 'images'-Prop (string[]) akzeptiert! */}
            <ProjectGallery userId={company.id} images={company.projectImages} />
          </div>
        )}

        {company.id && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              Bewertungen
            </h3>
            <div className="reviews-wrap">
              <ul className="review-list space-y-6">
                {/* Beispiel-Bewertung 1 */}
                <li className="review-item-component border-b border-gray-200 pb-6">
                  <div className="flex flex-col space-y-4">
                    {/* Benutzer-Header */}
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                          H
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            heathernixonogt
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <img
                            className="w-4 h-4"
                            src="https://fiverr-dev-res.cloudinary.com/general_assets/flags/1f1fa-1f1f8.png"
                            alt="US"
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">Deutschland</p>
                        </div>
                      </div>
                    </div>

                    {/* Bewertung und Datum */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          {/* 5 Sterne */}
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              width="15"
                              height="15"
                              viewBox="0 0 16 15"
                              className="text-yellow-400 fill-current"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M16 5.81285C16 5.98299 15.875 6.14367 15.75 6.26654L12.2596 9.61248L13.0865 14.3384C13.0962 14.4045 13.0962 14.4612 13.0962 14.5274C13.0962 14.7732 12.9808 15 12.7019 15C12.5673 15 12.4327 14.9527 12.3173 14.8866L8 12.656L3.68269 14.8866C3.55769 14.9527 3.43269 15 3.29808 15C3.01923 15 2.89423 14.7732 2.89423 14.5274C2.89423 14.4612 2.90385 14.4045 2.91346 14.3384L3.74038 9.61248L0.240385 6.26654C0.125 6.14367 0 5.98299 0 5.81285C0 5.5293 0.298077 5.41588 0.538462 5.37807L5.36539 4.68809L7.52885 0.387524C7.61539 0.207939 7.77885 0 8 0C8.22115 0 8.38462 0.207939 8.47115 0.387524L10.6346 4.68809L15.4615 5.37807C15.6923 5.41588 16 5.5293 16 5.81285Z"
                              ></path>
                            </svg>
                          ))}
                          <strong className="text-lg font-semibold ml-2">5</strong>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">vor 4 Tagen</p>
                      </div>
                    </div>

                    {/* Bewertungstext */}
                    <div className="prose max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Die Zusammenarbeit mit diesem Anbieter war außergewöhnlich. Professionalität
                        und Verständnis für unser Geschäft waren hervorragend. Ich werde definitiv
                        wieder mit ihm arbeiten!
                      </p>
                    </div>

                    {/* Projektdetails */}
                    <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">250€-500€</p>
                          <p className="text-gray-500 dark:text-gray-400">Preis</p>
                        </div>
                        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">2 Wochen</p>
                          <p className="text-gray-500 dark:text-gray-400">Dauer</p>
                        </div>
                      </div>
                    </div>

                    {/* Projektbild */}
                    <div className="w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                    </div>

                    {/* Anbieter-Antwort */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ml-8">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          A
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white mb-1">
                            Antwort des Anbieters
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            Vielen Dank für Ihre freundlichen Worte! Ich wünsche Ihnen alles Gute!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hilfreich-Buttons */}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Hilfreich?</span>
                      <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 16 16" className="fill-current">
                          <path d="M11.89 14.75H1C0.59 14.75 0.25 14.41 0.25 14V8C0.25 7.59 0.59 7.25 1 7.25H3.46L6.05 0.72C6.16 0.43 6.44 0.25 6.75 0.25H7.67C8.59 0.25 9.34 0.98 9.34 1.87V5.45H13.17C14 5.45 14.78 5.84 15.27 6.48C15.73 7.1 15.87 7.87 15.66 8.6L14.39 12.93C14.08 13.99 13.06 14.74 11.9 14.74L11.89 14.75ZM4.75 13.25H11.89C12.38 13.25 12.81 12.95 12.94 12.52L14.21 8.19C14.32 7.81 14.16 7.52 14.06 7.39C13.85 7.12 13.53 6.96 13.16 6.96H8.58C8.17 6.96 7.83 6.62 7.83 6.21V1.87C7.83 1.81 7.76 1.75 7.66 1.75H7.25L4.74 8.08V13.25H4.75ZM1.75 13.25H3.25V8.75H1.75V13.25V13.25Z"></path>
                        </svg>
                        <span>Ja</span>
                      </button>
                      <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 16 16" className="fill-current">
                          <path d="M9.25533 14.75H8.33533C7.41533 14.75 6.66533 14.03 6.66533 13.13L6.66533 9.55H2.83533C2.00533 9.55 1.22533 9.16 0.735326 8.52C0.275326 7.9 0.135326 7.13 0.345326 6.4L1.62533 2.06C1.93533 1 2.95533 0.25 4.11533 0.25L15.0053 0.25C15.4153 0.25 15.7553 0.59 15.7553 1V7C15.7553 7.41 15.4153 7.75 15.0053 7.75H12.5453L9.95533 14.28C9.84533 14.57 9.56533 14.75 9.25533 14.75ZM4.11533 1.75C3.62533 1.75 3.19533 2.05 3.06533 2.48L1.79533 6.81C1.68533 7.19 1.84533 7.48 1.94533 7.61C2.15533 7.88 2.47533 8.04 2.84533 8.04H7.42533C7.83533 8.04 8.17533 8.38 8.17533 8.79L8.17533 13.12C8.17533 13.17 8.24533 13.24 8.34533 13.24H8.75533L11.2653 6.91V1.75L4.11533 1.75ZM12.7553 6.25H14.2553V1.75L12.7553 1.75V6.25Z"></path>
                        </svg>
                        <span>Nein</span>
                      </button>
                    </div>
                  </div>
                </li>

                {/* Beispiel-Bewertung 2 */}
                <li className="review-item-component border-b border-gray-200 pb-6">
                  <div className="flex flex-col space-y-4">
                    {/* Benutzer-Header */}
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          M
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            max_mueller
                          </p>
                          <div className="flex items-center space-x-1 text-sm">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              className="text-green-500 fill-current"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="m5.17 1.47 2.64 2.64a.75.75 0 0 1 0 1.06L5.17 7.81a.75.75 0 0 1-1.06-1.06l1.36-1.36H4.332c-1.392 0-2.583 1.196-2.583 2.75 0 1.553 1.19 2.75 2.583 2.75a.75.75 0 0 1 0 1.5C2.044 12.39.25 10.452.25 8.14c0-2.313 1.794-4.25 4.083-4.25H5.47L4.11 2.53A.75.75 0 0 1 5.17 1.47Zm6.497 2.42a.75.75 0 0 0 0 1.5c1.392 0 2.583 1.196 2.583 2.75 0 1.553-1.19 2.75-2.583 2.75h-.874l1.36-1.36a.75.75 0 1 0-1.061-1.06l-2.64 2.64a.75.75 0 0 0 0 1.06l2.64 2.64a.75.75 0 0 0 1.06-1.06l-1.36-1.36h.875c2.289 0 4.083-1.938 4.083-4.25 0-2.313-1.794-4.25-4.083-4.25Z"
                              ></path>
                            </svg>
                            <p className="text-gray-600 dark:text-gray-400 font-medium">
                              Wiederkehrender Kunde
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <img
                            className="w-4 h-4"
                            src="https://fiverr-dev-res.cloudinary.com/general_assets/flags/1f1fa-1f1f8.png"
                            alt="DE"
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">Deutschland</p>
                        </div>
                      </div>
                    </div>

                    {/* Bewertung und Datum */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          {/* 5 Sterne */}
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              width="15"
                              height="15"
                              viewBox="0 0 16 15"
                              className="text-yellow-400 fill-current"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M16 5.81285C16 5.98299 15.875 6.14367 15.75 6.26654L12.2596 9.61248L13.0865 14.3384C13.0962 14.4045 13.0962 14.4612 13.0962 14.5274C13.0962 14.7732 12.9808 15 12.7019 15C12.5673 15 12.4327 14.9527 12.3173 14.8866L8 12.656L3.68269 14.8866C3.55769 14.9527 3.43269 15 3.29808 15C3.01923 15 2.89423 14.7732 2.89423 14.5274C2.89423 14.4612 2.90385 14.4045 2.91346 14.3384L3.74038 9.61248L0.240385 6.26654C0.125 6.14367 0 5.98299 0 5.81285C0 5.5293 0.298077 5.41588 0.538462 5.37807L5.36539 4.68809L7.52885 0.387524C7.61539 0.207939 7.77885 0 8 0C8.22115 0 8.38462 0.207939 8.47115 0.387524L10.6346 4.68809L15.4615 5.37807C15.6923 5.41588 16 5.5293 16 5.81285Z"
                              ></path>
                            </svg>
                          ))}
                          <strong className="text-lg font-semibold ml-2">5</strong>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">vor einem Monat</p>
                      </div>
                    </div>

                    {/* Bewertungstext */}
                    <div className="prose max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Bereits das zweite Projekt mit diesem Anbieter und wieder ein hervorragendes
                        Ergebnis. Expertise und Aufmerksamkeit für Details sind unglaublich. Alles
                        wurde präzise auf unsere Bedürfnisse zugeschnitten...
                        <button className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                          Mehr anzeigen
                        </button>
                      </p>
                    </div>

                    {/* Projektdetails */}
                    <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">500€-1.000€</p>
                          <p className="text-gray-500 dark:text-gray-400">Preis</p>
                        </div>
                        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">3 Wochen</p>
                          <p className="text-gray-500 dark:text-gray-400">Dauer</p>
                        </div>
                      </div>
                    </div>

                    {/* Hilfreich-Buttons */}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Hilfreich?</span>
                      <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 16 16" className="fill-current">
                          <path d="M11.89 14.75H1C0.59 14.75 0.25 14.41 0.25 14V8C0.25 7.59 0.59 7.25 1 7.25H3.46L6.05 0.72C6.16 0.43 6.44 0.25 6.75 0.25H7.67C8.59 0.25 9.34 0.98 9.34 1.87V5.45H13.17C14 5.45 14.78 5.84 15.27 6.48C15.73 7.1 15.87 7.87 15.66 8.6L14.39 12.93C14.08 13.99 13.06 14.74 11.9 14.74L11.89 14.75ZM4.75 13.25H11.89C12.38 13.25 12.81 12.95 12.94 12.52L14.21 8.19C14.32 7.81 14.16 7.52 14.06 7.39C13.85 7.12 13.53 6.96 13.16 6.96H8.58C8.17 6.96 7.83 6.62 7.83 6.21V1.87C7.83 1.81 7.76 1.75 7.66 1.75H7.25L4.74 8.08V13.25H4.75ZM1.75 13.25H3.25V8.75H1.75V13.25V13.25Z"></path>
                        </svg>
                        <span>Ja</span>
                      </button>
                      <button className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        <svg width="14" height="14" viewBox="0 0 16 16" className="fill-current">
                          <path d="M9.25533 14.75H8.33533C7.41533 14.75 6.66533 14.03 6.66533 13.13L6.66533 9.55H2.83533C2.00533 9.55 1.22533 9.16 0.735326 8.52C0.275326 7.9 0.135326 7.13 0.345326 6.4L1.62533 2.06C1.93533 1 2.95533 0.25 4.11533 0.25L15.0053 0.25C15.4153 0.25 15.7553 0.59 15.7553 1V7C15.7553 7.41 15.4153 7.75 15.0053 7.75H12.5453L9.95533 14.28C9.84533 14.57 9.56533 14.75 9.25533 14.75ZM4.11533 1.75C3.62533 1.75 3.19533 2.05 3.06533 2.48L1.79533 6.81C1.68533 7.19 1.84533 7.48 1.94533 7.61C2.15533 7.88 2.47533 8.04 2.84533 8.04H7.42533C7.83533 8.04 8.17533 8.38 8.17533 8.79L8.17533 13.12C8.17533 13.17 8.24533 13.24 8.34533 13.24H8.75533L11.2653 6.91V1.75L4.11533 1.75ZM12.7553 6.25H14.2553V1.75L12.7553 1.75V6.25Z"></path>
                        </svg>
                        <span>Nein</span>
                      </button>
                    </div>
                  </div>
                </li>
              </ul>

              {/* Button für weitere Bewertungen */}
              <div className="mt-6 text-center">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                  Weitere Bewertungen anzeigen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- DIESER STANDARDEXPORT IST ENTSCHEIDEND ---
export default CompanyProfileDetail;
