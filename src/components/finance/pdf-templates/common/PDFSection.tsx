import React from 'react';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { InvoiceFooter } from './InvoiceFooter';

interface PDFSectionProps {
  data: ProcessedPDFData;
  children: React.ReactNode;
  sectionType: 'header' | 'content' | 'items' | 'totals';
  hasFooter?: boolean;
}

export const PDFSection: React.FC<PDFSectionProps> = ({
  data,
  children,
  sectionType,
  hasFooter = true,
}) => {
  const footerData = {
    companyName: (data as any).companyName || '',
    phoneNumber: (data as any).phoneNumber || '',
    email: (data as any).contactEmail || '',
    website: (data as any).companyWebsiteForBackend || (data as any).website || '',
    vatId: (data as any).vatId || '',
    taxNumber: (data as any).taxNumber || '',
    companyRegister: (data as any).registrationNumber || '',
    iban: (data as any).step4?.iban || '',
    bic: (data as any).step4?.bic || '',
    companySuffix: (data as any).step2?.companySuffix || '',
    legalForm: (data as any).legalForm || (data as any).step2?.legalForm || '',
    districtCourt: (data as any).districtCourt || (data as any).step3?.districtCourt || 'Köln',
    managingDirectors: (data as any).step1?.managingDirectors || [],
    firstName: (data as any).step1?.personalData?.firstName || 'andy',
    lastName: (data as any).step1?.personalData?.lastName || 'staudinger',
    companyStreet: (data as any).companyStreet || 'Siedlung am Wald',
    companyHouseNumber: (data as any).companyHouseNumber || '6',
    companyPostalCode: (data as any).companyPostalCode || '18586',
    companyCity: (data as any).companyCity || 'Sellin',
    step1: (data as any).step1,
    step2: (data as any).step2,
    step4: (data as any).step4,
  };

  return (
    <div className={`section-${sectionType} mb-6`}>
      {/* Nur der Sektion Inhalt - KEIN Footer hier */}
      {children}
    </div>
  );
};
