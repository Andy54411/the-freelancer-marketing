import React from 'react';

interface FooterData {
  // Firmendaten
  company?: {
    name?: string;
    address?: {
      street?: string;
      zipCode?: string;
      city?: string;
    };
    phone?: string;
    email?: string;
    website?: string;
    vatId?: string;
    taxNumber?: string;
    bankDetails?: {
      iban?: string;
      bic?: string;
    };
  };

  // Rechtliche Daten
  districtCourt?: string;
  companyRegister?: string;
  legalForm?: string;

  // Geschäftsführer/Inhaber Daten
  managingDirectors?: Array<{
    firstName?: string;
    lastName?: string;
    name?: string;
    isMainDirector?: boolean;
  }>;

  // Zusätzliche Daten aus Steps
  step1?: {
    managingDirectors?: Array<{
      firstName?: string;
      lastName?: string;
      name?: string;
      isMainDirector?: boolean;
    }>;
    personalData?: {
      firstName?: string;
      lastName?: string;
    };
  };
  step2?: {
    legalForm?: string;
    companySuffix?: string;
  };

  // Direkte Felder
  firstName?: string;
  lastName?: string;
}

interface InvoiceFooterProps {
  data: FooterData;
  preview?: boolean;
}

/**
 * Invoice Footer Component - Immer am Ende der A4-Seite positioniert
 * Zeigt alle Firmendaten, Kontaktdaten und rechtlichen Informationen
 */
export const InvoiceFooter: React.FC<InvoiceFooterProps> = ({ data, preview = false }) => {
  // Sammle alle Footer-Informationen
  const footerParts: string[] = [];

  // Firmenname
  if (data.company?.name || (data as any).companyName) {
    const companyName = data.company?.name || (data as any).companyName;
    const companySuffix = (data as any).step2?.companySuffix || (data as any).companySuffix;
    const fullCompanyName = companySuffix ? `${companyName} ${companySuffix}` : companyName;
    footerParts.push(fullCompanyName);
  }

  // Adresse
  if (
    (data.company?.address?.street || (data as any).companyStreet) &&
    (data.company?.address?.zipCode || (data as any).companyPostalCode) &&
    (data.company?.address?.city || (data as any).companyCity)
  ) {
    footerParts.push(data.company?.address?.street || (data as any).companyStreet);
    footerParts.push(
      `${data.company?.address?.zipCode || (data as any).companyPostalCode} ${data.company?.address?.city || (data as any).companyCity}`
    );
    footerParts.push('DE');
  }

  // Telefon
  if (data.company?.phone || (data as any).companyPhone || (data as any).phoneNumber) {
    footerParts.push(
      `Tel.: ${data.company?.phone || (data as any).companyPhone || (data as any).phoneNumber}`
    );
  }

  // E-Mail
  if (data.company?.email || (data as any).companyEmail || (data as any).email) {
    footerParts.push(
      `E-Mail: ${data.company?.email || (data as any).companyEmail || (data as any).email}`
    );
  }

  // Website
  if (data.company?.website || (data as any).companyWebsite || (data as any).website) {
    footerParts.push(
      `Web: ${data.company?.website || (data as any).companyWebsite || (data as any).website}`
    );
  }

  // IBAN
  if (data.company?.bankDetails?.iban || (data as any).iban) {
    footerParts.push(`IBAN: ${data.company?.bankDetails?.iban || (data as any).iban}`);
  }

  // BIC
  if (data.company?.bankDetails?.bic || (data as any).bic) {
    footerParts.push(`BIC: ${data.company?.bankDetails?.bic || (data as any).bic}`);
  }

  // USt-IdNr
  if (data.company?.vatId || (data as any).vatId || (data as any).companyVatId) {
    footerParts.push(
      `USt-IdNr.: ${data.company?.vatId || (data as any).vatId || (data as any).companyVatId}`
    );
  }

  // Steuernr
  if (data.company?.taxNumber || (data as any).taxNumber || (data as any).companyTaxNumber) {
    footerParts.push(
      `Steuernr.: ${data.company?.taxNumber || (data as any).taxNumber || (data as any).companyTaxNumber}`
    );
  }

  // Amtsgericht
  if (data.districtCourt) {
    footerParts.push(`Amtsgericht: ${data.districtCourt}`);
  }

  // Handelsregister
  if (data.companyRegister) {
    footerParts.push(`Handelsregister: ${data.companyRegister}`);
  }

  // Rechtsform
  if (data.legalForm) {
    footerParts.push(`Rechtsform: ${data.legalForm}`);
  }

  // Geschäftsführer/Inhaber
  const legalForm = (data.step2?.legalForm || data.legalForm || '').toLowerCase();

  let directorName = '';

  // 1. Prüfe managingDirectors Array (direkt)
  if (data.managingDirectors && data.managingDirectors.length > 0) {
    const mainDirector =
      data.managingDirectors.find((dir: any) => dir.isMainDirector) || data.managingDirectors[0];
    if (mainDirector && mainDirector.firstName && mainDirector.lastName) {
      directorName = `${mainDirector.firstName} ${mainDirector.lastName}`;
    } else if (mainDirector && mainDirector.name) {
      directorName = mainDirector.name;
    }
  }

  // 2. Prüfe step1.managingDirectors Array
  if (!directorName && data.step1?.managingDirectors && data.step1.managingDirectors.length > 0) {
    const mainDirector =
      data.step1.managingDirectors.find((dir: any) => dir.isMainDirector) ||
      data.step1.managingDirectors[0];
    if (mainDirector && mainDirector.firstName && mainDirector.lastName) {
      directorName = `${mainDirector.firstName} ${mainDirector.lastName}`;
    } else if (mainDirector && mainDirector.name) {
      directorName = mainDirector.name;
    }
  }

  // 3. Prüfe step1.personalData
  if (!directorName && data.step1?.personalData?.firstName && data.step1?.personalData?.lastName) {
    directorName = `${data.step1.personalData.firstName} ${data.step1.personalData.lastName}`;
  }

  // 4. Fallback zu direkten personalData Feldern
  if (!directorName && data.firstName && data.lastName) {
    directorName = `${data.firstName} ${data.lastName}`;
  }

  // Für GmbH, UG, AG, KG ist Geschäftsführer PFLICHT
  const requiresDirector =
    legalForm.includes('gmbh') ||
    legalForm.includes('ug') ||
    legalForm.includes('ag') ||
    legalForm.includes('kg');

  if (directorName.trim()) {
    if (requiresDirector) {
      footerParts.push(`Geschäftsführer: ${directorName.trim()}`);
    } else {
      footerParts.push(`Inhaber: ${directorName.trim()}`);
    }
  }

  return (
    <div className="w-full mt-auto pt-4 border-t border-gray-300 print:mt-8 print:pt-6">
      {preview ? (
        <div className="text-sm text-gray-600 text-center leading-relaxed space-y-1">
          <div>{footerParts.slice(0, 4).join(' | ')}</div>
          {footerParts.length > 4 && <div>{footerParts.slice(4, 8).join(' | ')}</div>}
          {footerParts.length > 8 && <div>{footerParts.slice(8).join(' | ')}</div>}
        </div>
      ) : (
        <div className="text-xs text-gray-600 text-center leading-tight print:text-[10px]">
          {footerParts.join(' | ')}
        </div>
      )}
    </div>
  );
};

export default InvoiceFooter;
