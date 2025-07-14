// components/search/CompanyCard.tsx
'use client';

import Image from 'next/image';
import {
  Star as FiStar,
  Wrench as FiTool,
  Truck as FiTruck,
  MessageSquare as FiMessageCircle,
  ChevronDown as FiChevronDown,
  ChevronUp as FiChevronUp,
} from 'lucide-react';
import LanguageTags from '@/components/LanguageTags';
import { renderStars } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/utils';

import type { Company, RatingInfo, CompanyTaskCategory } from '@/types/types';

interface CompanyCardProps {
  company: Company;
  ratingInfo: RatingInfo | undefined;
  isExpanded: boolean;
  onToggleDescription: () => void;
  onShowProfileDetail: () => void;
  onOpenDatePicker: () => void;
  isSelectedForPopup: boolean;
}

export default function CompanyCard({
  company,
  ratingInfo,
  isExpanded,
  onToggleDescription,
  onShowProfileDetail,
  onOpenDatePicker,
  isSelectedForPopup,
}: CompanyCardProps) {
  return (
    <div
      key={company.id}
      className={`flex flex-col md:flex-row rounded-xl border p-4 shadow-lg transition-all bg-white dark:bg-gray-800 gap-4 ${
        isSelectedForPopup ? 'ring-2 ring-[#14ad9f]' : ''
      }`}
    >
      <div className="flex flex-col items-center md:w-1/3 text-center space-y-3 p-2">
        <Image
          src={company.profilePictureURL || '/default-avatar.jpg'}
          alt={`Profil von ${company.companyName}`}
          width={128}
          height={128}
          className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-md mb-3"
        />
        <button
          onClick={e => {
            e.stopPropagation();
            onShowProfileDetail();
          }}
          className="w-full text-sm text-center text-[#14ad9f] font-semibold py-2 px-3 border border-[#14ad9f] rounded-lg hover:bg-[#14ad9f] hover:text-white transition-colors"
        >
          Profil und weitere Fähigkeiten anzeigen
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onOpenDatePicker();
          }}
          className="w-full text-sm text-center bg-[#14ad9f] text-white font-semibold py-2 px-3 rounded-lg hover:bg-[#129a8f] transition-colors"
        >
          Datum & Zeit wählen
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
          Nachdem du den Auftrag gebucht hast, kannst du mit deinem Tilver chatten und Details zum
          Auftrag anpassen oder die geplante Uhrzeit ändern.
        </p>
      </div>
      <div className="flex-1 min-w-0 md:w-2/3 p-2 space-y-2">
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{company.companyName}</h3>
          <p className="text-lg font-bold text-[#14ad9f] whitespace-nowrap">
            {company.hourlyRate ? `${Number(company.hourlyRate).toFixed(2)} €/Std.` : 'Preis k.A.'}
          </p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
          <span className="text-yellow-500 mr-1">
            {ratingInfo ? renderStars(ratingInfo.avg) : <FiStar />}
          </span>
          {ratingInfo?.avg?.toFixed(1) ?? 'N/A'} ({ratingInfo?.count ?? 0} Bewertungen)
        </div>
        {company.taskCategories && company.taskCategories.length > 0 && (
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {company.taskCategories.map((taskCat: CompanyTaskCategory, index: number) => (
              <div key={index} className="flex items-center">
                {taskCat.icon || <FiTool className="inline mr-2 text-gray-500" />}
                {taskCat.count} Tasks der Kategorie {taskCat.name}
              </div>
            ))}
          </div>
        )}
        {!company.taskCategories && company.selectedSubcategory && (
          <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
            <FiTool className="inline mr-2 text-gray-500" />
            Hauptkategorie: {company.selectedSubcategory}
          </div>
        )}
        {company.vehicleInfo && (
          <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
            <FiTruck className="inline mr-2 text-gray-500" />
            Fahrzeug(e): {company.vehicleInfo}
          </div>
        )}
        {company.languages &&
          typeof company.languages === 'string' &&
          company.languages.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Sprachen:</p>
              <LanguageTags languages={company.languages} maxTags={5} />
            </div>
          )}
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-800 dark:text-white mb-1">
            Bei diesen Aufträgen kann ich helfen:
          </h4>
          <p
            className={`text-sm text-gray-700 dark:text-gray-300 ${!isExpanded ? 'line-clamp-3' : ''}`}
          >
            {company.description || 'Keine Beschreibung vorhanden.'}
          </p>
          <button
            onClick={onToggleDescription}
            className="text-sm text-[#14ad9f] hover:underline mt-1 flex items-center"
          >
            {isExpanded ? 'Weniger anzeigen' : 'Mehr erfahren'}
            {isExpanded ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />}
          </button>
        </div>
        {company.highlightReview && (
          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start text-sm">
              <FiMessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500 mr-2 mt-1 flex-shrink-0" />
              <div>
                <p className="text-gray-700 dark:text-gray-300">{`"${company.highlightReview.text}"`}</p>
                {/* ODER <p className="text-gray-700 dark:text-gray-300">&quot;{company.highlightReview.text}&quot;</p> */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {company.highlightReview.reviewerName} am {company.highlightReview.reviewDate}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
