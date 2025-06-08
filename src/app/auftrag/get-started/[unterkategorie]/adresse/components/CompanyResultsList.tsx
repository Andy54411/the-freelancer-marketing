'use client';
import Image from 'next/image';

import { FiLoader } from 'react-icons/fi';
import CompanyCard from './CompanyCard';
import type { Company, RatingMap, ExpandedDescriptionsMap } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/types';

interface CompanyResultsListProps {
  loadingProfiles: boolean;
  companyProfiles: Company[];
  ratingMap: RatingMap;
  expandedDescriptions: ExpandedDescriptionsMap;
  onToggleDescriptionExpand: (companyId: string) => void;
  onOpenDatePickerForCompany: (company: Company) => void;
  onSetPreviewCompany: (company: Company) => void;
  selectedCompanyForPopup: Company | null;
  isDatePickerOpen: boolean;
}

export default function CompanyResultsList({
  loadingProfiles,
  companyProfiles,
  ratingMap,
  expandedDescriptions,
  onToggleDescriptionExpand,
  onOpenDatePickerForCompany,
  onSetPreviewCompany,
  selectedCompanyForPopup,
  isDatePickerOpen,
}: CompanyResultsListProps) {
  if (loadingProfiles) {
    return (
      <div className="text-center py-10">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mx-auto" />
        <p className="mt-2 text-gray-600">Lade Anbieter...</p>
      </div>
    );
  }

  if (!companyProfiles || companyProfiles.length === 0) {
    return (
      <div className="text-center mt-20 text-gray-600 flex flex-col items-center space-y-4">
        {/* Stelle sicher, dass das Icon im public Ordner existiert */}
        <Image
          src="/icon/calendar-icon.svg"
          alt="Keine Ergebnisse"
          width={48} // Entspricht w-12 (12 * 4px = 48px)
          height={48} // Entspricht h-12 (12 * 4px = 48px)
          className="w-12 h-12"
        />
        <p>
          Es sind derzeit leider keine Tilver verfügbar, die dir bei deinem Task helfen können.
          <br />
          Schau nach, wer an anderen Tagen verfügbar ist!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {companyProfiles.map(company => (
        <CompanyCard
          key={company.id}
          company={company}
          ratingInfo={ratingMap[company.id]}
          isExpanded={!!expandedDescriptions[company.id]}
          onToggleDescription={() => onToggleDescriptionExpand(company.id)}
          onShowProfileDetail={() => onSetPreviewCompany(company)}
          onOpenDatePicker={() => onOpenDatePickerForCompany(company)}
          isSelectedForPopup={selectedCompanyForPopup?.id === company.id && isDatePickerOpen}
        />
      ))}
    </div>
  );
}