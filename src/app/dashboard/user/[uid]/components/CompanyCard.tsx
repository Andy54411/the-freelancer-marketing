// src/app/dashboard/user/[uid]/components/CompanyCard.tsx
'use client';

import Image from 'next/image';
import { FiStar, FiChevronDown, FiChevronUp, FiUser, FiCalendar } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { AnbieterDetails, RatingInfo } from '@/types/types';

const renderStars = (avg: number) => {
  if (!avg || avg < 0) return '–';
  return '⭐️'.repeat(Math.round(avg > 5 ? 5 : avg));
};

interface CompanyCardProps {
  company: AnbieterDetails;
  ratingInfo: RatingInfo | undefined;
  isExpanded: boolean;
  onToggleDescription: () => void;
  onSelectProvider: () => void;
  onShowProfile: () => void;
  onOpenDatePicker: () => void;
  isSelected: boolean;
}

export default function CompanyCard({
  company,
  ratingInfo,
  isExpanded,
  onToggleDescription,
  onSelectProvider,
  onShowProfile,
  onOpenDatePicker,
  isSelected,
}: CompanyCardProps) {
  return (
    <div
      onClick={onSelectProvider}
      className={`rounded-xl border p-4 shadow-md transition-all duration-300 bg-white cursor-pointer hover:border-[#14ad9f] ${
        isSelected ? 'ring-2 ring-offset-2 ring-[#14ad9f] border-[#14ad9f]' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 flex flex-col items-center sm:w-1/4 space-y-2">
          <Image
            src={company.profilePictureURL || '/default-avatar.png'}
            alt={`Profil von ${company.companyName}`}
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover shadow-md"
          />
          <p className="text-lg text-center font-bold text-[#14ad9f] pt-2">
            {company.hourlyRate ? `${Number(company.hourlyRate).toFixed(2)} €/Std.` : 'k.A.'}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-800">{company.companyName}</h3>
          <div className="text-sm text-gray-600 flex items-center mt-1">
            <span className="text-yellow-500 mr-1">
              {ratingInfo ? renderStars(ratingInfo.avg) : <FiStar />}
            </span>
            {ratingInfo?.avg?.toFixed(1) ?? 'N/A'} ({ratingInfo?.count ?? 0} Bewertungen)
          </div>
          <div className="pt-3 mt-3 border-t border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-1">Über mich:</h4>
            <p className={`text-sm text-gray-700 ${!isExpanded ? 'line-clamp-3' : ''}`}>
              {company.description || 'Keine Beschreibung vorhanden.'}
            </p>
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleDescription();
              }}
              className="text-sm text-[#14ad9f] hover:underline mt-1 flex items-center font-semibold"
            >
              {isExpanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
              {isExpanded ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              // KORREKTUR: sm:w-auto zu sm:flex-1 geändert
              className="w-full sm:flex-1 bg-[#14ad9f] text-white hover:bg-[#129a8f]"
              onClick={e => {
                e.stopPropagation();
                onOpenDatePicker();
              }}
            >
              <FiCalendar className="mr-2 h-4 w-4" />
              Termin wählen
            </Button>
            <Button
              size="sm"
              variant="outline"
              // KORREKTUR: sm:w-auto zu sm:flex-1 geändert
              className="w-full sm:flex-1"
              onClick={e => {
                e.stopPropagation();
                onShowProfile();
              }}
            >
              <FiUser className="mr-2 h-4 w-4" />
              Profil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
