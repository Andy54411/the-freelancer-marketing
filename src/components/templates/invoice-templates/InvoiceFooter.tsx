import React from 'react';

export interface FooterData {
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
  };

  // Direkte Felder
  firstName?: string;
  lastName?: string;
}

interface InvoiceFooterProps {
  data: FooterData;
}

/**
 * Invoice Footer Component - Immer am Ende der A4-Seite positioniert
 * Zeigt alle Firmendaten, Kontaktdaten und rechtlichen Informationen
 */
export const InvoiceFooter: React.FC<InvoiceFooterProps> = ({ data }) => {
  // Sammle alle Footer-Informationen
  const footerParts: string[] = [];

  // Firmenname
  if (data.company?.name) {
    footerParts.push(data.company.name);
  }

  // Adresse
  if (
    data.company?.address?.street &&
    data.company?.address?.zipCode &&
    data.company?.address?.city
  ) {
    footerParts.push(data.company.address.street);
    footerParts.push(`${data.company.address.zipCode} ${data.company.address.city}`);
    footerParts.push('DE');
  }

  // Telefon
  if (data.company?.phone) {
    footerParts.push(`Tel.: ${data.company.phone}`);
  }

  // E-Mail
  if (data.company?.email) {
    footerParts.push(`E-Mail: ${data.company.email}`);
  }

  // Website
  if (data.company?.website) {
    footerParts.push(`Web: ${data.company.website}`);
  }

  // IBAN
  if (data.company?.bankDetails?.iban) {
    footerParts.push(`IBAN: ${data.company.bankDetails.iban}`);
  }

  // BIC
  if (data.company?.bankDetails?.bic) {
    footerParts.push(`BIC: ${data.company.bankDetails.bic}`);
  }

  // USt-IdNr
  if (data.company?.vatId) {
    footerParts.push(`USt-IdNr.: ${data.company.vatId}`);
  }

  // Steuernr
  if (data.company?.taxNumber) {
    footerParts.push(`Steuernr.: ${data.company.taxNumber}`);
  }

  // Amtsgericht
  if (data.districtCourt) {
    footerParts.push(`Amtsgericht: ${data.districtCourt}`);
  }

  // Handelsregister
  if (data.companyRegister) {
    footerParts.push(`Handelsregister: ${data.companyRegister}`);
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
      <div className="text-xs text-gray-600 text-center leading-tight print:text-[10px]">
        {footerParts.join(' | ')}
      </div>
    </div>
  );
};

export default InvoiceFooter;
