// src/app/dashboard/user/[uid]/components/CompanyProfileDetail.tsx
'use client';

import Image from 'next/image';
import React from 'react';
import { FiX } from 'react-icons/fi';
import { AnbieterDetails, RatingInfo } from '@/types/types';
import ReviewList from '@/components/ReviewList'; // NEU: ReviewList importieren

function renderStars(rating: number) {
    if (!rating || rating < 0) return '–';
    const fullStars = Math.floor(rating > 5 ? 5 : rating);
    const emptyStars = 5 - fullStars;
    return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
}

export interface CompanyProfileDetailProps {
    company: AnbieterDetails;
    ratingInfo: RatingInfo | undefined;
    onClose: () => void;
}

const CompanyProfileDetail: React.FC<CompanyProfileDetailProps> = ({ company, ratingInfo, onClose }) => {
    let displayHourlyRate: string | null = null;
    if (typeof company.hourlyRate === 'number') {
        displayHourlyRate = `${company.hourlyRate.toFixed(2)} €/Std.`;
    } else if (typeof company.hourlyRate === 'string' && company.hourlyRate.trim() !== '') {
        displayHourlyRate = company.hourlyRate;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-auto" onClick={(e) => e.stopPropagation()}>

                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">{company.companyName}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors" aria-label="Schließen">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                        <Image
                            src={company.profilePictureURL || '/default-avatar.png'}
                            alt={`Profilbild von ${company.companyName}`}
                            className="w-28 h-28 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-md"
                            width={112}
                            height={112}
                        />
                        <div className="flex-1 text-center sm:text-left">
                            <div className="text-sm text-gray-600 mb-2">
                                <span className="text-yellow-500">{ratingInfo ? renderStars(ratingInfo.avg) : '–'}</span>
                                {' '}{ratingInfo?.avg?.toFixed(1) ?? 'N/A'} ({ratingInfo?.count ?? 0} Bewertungen)
                            </div>
                            {displayHourlyRate && (
                                <p className="text-lg font-semibold text-gray-900">{displayHourlyRate}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">Beschreibung</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {company.description || 'Keine detaillierte Beschreibung verfügbar.'}
                        </p>
                    </div>

                    {/* NEU: ReviewList wird hier eingebunden und angezeigt */}
                    <div className="mt-8 pt-6 border-t">
                        <ReviewList anbieterId={company.id} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyProfileDetail;