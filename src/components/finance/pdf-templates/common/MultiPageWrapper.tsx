import React from 'react';
import { ProcessedPDFData } from '@/hooks/pdf/usePDFTemplateData';
import { InvoiceFooter } from './InvoiceFooter';

interface PageWithFooterProps {
  data: ProcessedPDFData;
  children: React.ReactNode;
  pageNumber?: number;
}

export const PageWithFooter: React.FC<PageWithFooterProps> = ({ 
  data, 
  children,
  pageNumber = 1
}) => {
  
  // Footer-Daten
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
    districtCourt: (data as any).districtCourt || (data as any).step3?.districtCourt || '',
    managingDirectors: (data as any).step1?.managingDirectors || [],
    firstName: (data as any).step1?.personalData?.firstName || '',
    lastName: (data as any).step1?.personalData?.lastName || '',
    companyStreet: (data as any).companyStreet || '',
    companyHouseNumber: (data as any).companyHouseNumber || '',
    companyPostalCode: (data as any).companyPostalCode || '',
    companyCity: (data as any).companyCity || '',
    step1: (data as any).step1,
    step2: (data as any).step2,  
    step4: (data as any).step4
  };

  return (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto flex flex-col">
      {/* Seiteninhalt */}
      <div className="flex-1" style={{ minHeight: '250mm' }}>
        {children}
      </div>
      
      {/* Footer am Ende jeder Seite */}
      <div className="mt-auto bg-gray-50 border-t border-gray-200 p-2">
        <InvoiceFooter data={footerData} />
      </div>
    </div>
  );
};