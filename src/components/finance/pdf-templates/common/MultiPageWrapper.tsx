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
    companyName: (data as any).companyName || 'Mietkoch Andy',
    phoneNumber: (data as any).phoneNumber || '+4901605979000',
    email: (data as any).contactEmail || 'a.staudinger32@icloud.com',
    website: (data as any).companyWebsiteForBackend || (data as any).website || 'https://taskilo.de',
    vatId: (data as any).vatId || 'DE123456789',
    taxNumber: (data as any).taxNumber || 'test12345678',
    companyRegister: (data as any).registrationNumber || 'HRB12345',
    iban: (data as any).step4?.iban || 'DE89370400440532013000',
    bic: (data as any).step4?.bic || 'CDBXXSDE',
    companySuffix: (data as any).step2?.companySuffix || 'e.K',
    legalForm: (data as any).legalForm || (data as any).step2?.legalForm || 'GmbH',
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