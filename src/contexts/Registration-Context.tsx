'use client';

import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode } from 'react';

interface RegistrationData {
  step: number;
  customerType: 'private' | 'business' | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  description: string;
  jobStreet?: string;
  jobPostalCode?: string;
  jobCity?: string;
  jobCountry?: string | null;
  jobDateFrom?: string | null;
  jobDateTo?: string | null;
  jobTimePreference?: string | null;
  tempJobDraftId?: string | null;
  selectedAnbieterId?: string | null;
  jobDurationString?: string;
  jobTotalCalculatedHours?: number | null;
  jobCalculatedPriceInCents?: number | null;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string; // Für Step 1 (Person) und wird für Firma als Business Phone genutzt

  // NEU: Persönliche Details für den Geschäftsführer/Ansprechpartner (für KYC)
  dateOfBirth?: string; // Format YYYY-MM-DD
  personalStreet?: string;
  companyPhoneNumber?: string; // NEU für Firmen-Telefonnummer
  personalHouseNumber?: string;
  personalPostalCode?: string;
  personalCity?: string;
  personalCountry?: string | null; // ISO-Code (z.B. "DE")
  isManagingDirectorOwner: boolean; // Geändert: Sollte immer true/false sein

  companyName?: string;
  legalForm?: string | null;
  companyStreet?: string;
  companyHouseNumber?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyCountry?: string | null; // Sollte ISO-Code sein (z.B. "DE")
  // NEU: Granulare Eigentümer- und Vertreterdetails
  ownershipPercentage?: number; // Für alleinigen Inhaber, wenn isManagingDirectorOwner true ist
  isActualDirector?: boolean;
  isActualOwner?: boolean;
  actualOwnershipPercentage?: number; // Wenn isActualOwner true ist
  isActualExecutive?: boolean;
  actualRepresentativeTitle?: string;
  companyWebsite?: string; // Webseite des Unternehmens
  iban?: string;
  accountHolder?: string;
  selectedSkills?: { [hauptkategorie: string]: string[] | null };
  selectedHandwerkSkills?: string[] | null;
  selectedHaushaltServices?: string[] | null;
  profilePictureFile?: File | null;
  businessLicenseFile?: File | null;
  masterCraftsmanCertificateFile?: File | null;
  identityFrontFile?: File | null;
  identityBackFile?: File | null;
  companyRegister?: string; // Handelsregisternummer
  hourlyRate?: string;
  taxNumber?: string; // Nationale Steuernummer
  vatId?: string; // USt-IdNr.
  lat: number | null;
  lng: number | null;
  latLngPolygon?: google.maps.LatLngLiteral[] | null;
  radiusKm: number | null;
}

interface RegistrationContextType extends RegistrationData {
  setStep: Dispatch<SetStateAction<number>>;
  setCustomerType: Dispatch<SetStateAction<'private' | 'business' | null>>;
  setSelectedCategory: Dispatch<SetStateAction<string | null>>;
  setSelectedSubcategory: Dispatch<SetStateAction<string | null>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setJobStreet: Dispatch<SetStateAction<string>>;
  setJobPostalCode: Dispatch<SetStateAction<string>>;
  setJobCity: Dispatch<SetStateAction<string>>;
  setJobCountry: Dispatch<SetStateAction<string | null>>;
  setJobDateFrom: Dispatch<SetStateAction<string | null>>;
  setJobDateTo: Dispatch<SetStateAction<string | null>>;
  setJobTimePreference: Dispatch<SetStateAction<string | null>>;
  setTempJobDraftId: Dispatch<SetStateAction<string | null>>;
  setSelectedAnbieterId: Dispatch<SetStateAction<string | null>>;
  setJobDurationString: Dispatch<SetStateAction<string>>;
  setJobTotalCalculatedHours: Dispatch<SetStateAction<number | null>>;
  setJobCalculatedPriceInCents: Dispatch<SetStateAction<number | null>>;
  setEmail: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setFirstName: Dispatch<SetStateAction<string>>;
  setLastName: Dispatch<SetStateAction<string>>;
  setPhoneNumber: Dispatch<SetStateAction<string>>;
  setCompanyPhoneNumber: Dispatch<SetStateAction<string>>; // NEU

  // NEU: Setter für persönliche Details
  setDateOfBirth: Dispatch<SetStateAction<string | undefined>>;
  setPersonalStreet: Dispatch<SetStateAction<string | undefined>>;
  setPersonalHouseNumber: Dispatch<SetStateAction<string | undefined>>;
  setPersonalPostalCode: Dispatch<SetStateAction<string | undefined>>;
  setPersonalCity: Dispatch<SetStateAction<string | undefined>>;
  setPersonalCountry: Dispatch<SetStateAction<string | null>>;
  setIsManagingDirectorOwner: Dispatch<SetStateAction<boolean>>; // Geändert
  // NEU: Setter für granulare Eigentümer- und Vertreterdetails
  setOwnershipPercentage: Dispatch<SetStateAction<number | undefined>>;
  setIsActualDirector: Dispatch<SetStateAction<boolean | undefined>>;
  setIsActualOwner: Dispatch<SetStateAction<boolean | undefined>>;
  setActualOwnershipPercentage: Dispatch<SetStateAction<number | undefined>>;
  setIsActualExecutive: Dispatch<SetStateAction<boolean | undefined>>;
  setActualRepresentativeTitle: Dispatch<SetStateAction<string | undefined>>;

  setCompanyName: Dispatch<SetStateAction<string>>;
  setLegalForm: Dispatch<SetStateAction<string | null>>;
  setCompanyStreet: Dispatch<SetStateAction<string>>;
  setCompanyHouseNumber: Dispatch<SetStateAction<string>>;
  setCompanyPostalCode: Dispatch<SetStateAction<string>>;
  setCompanyCity: Dispatch<SetStateAction<string>>;
  setCompanyCountry: Dispatch<SetStateAction<string | null>>;
  setCompanyWebsite: Dispatch<SetStateAction<string>>;
  setIban: Dispatch<SetStateAction<string>>;
  setAccountHolder: Dispatch<SetStateAction<string>>;
  setSelectedSkills: Dispatch<SetStateAction<{ [hauptkategorie: string]: string[] | null }>>;
  setSelectedHandwerkSkills: Dispatch<SetStateAction<string[] | null>>;
  setSelectedHaushaltServices: Dispatch<SetStateAction<string[] | null>>;
  setProfilePictureFile: Dispatch<SetStateAction<File | null>>;
  setBusinessLicenseFile: Dispatch<SetStateAction<File | null>>;
  setMasterCraftsmanCertificateFile: Dispatch<SetStateAction<File | null>>;
  setIdentityFrontFile: Dispatch<SetStateAction<File | null>>;
  setIdentityBackFile: Dispatch<SetStateAction<File | null>>;
  setCompanyRegister: Dispatch<SetStateAction<string | undefined>>; // Setter für Handelsregisternummer
  setHourlyRate: Dispatch<SetStateAction<string>>;
  setTaxNumber: Dispatch<SetStateAction<string>>;
  setVatId: Dispatch<SetStateAction<string>>;
  setLat: Dispatch<SetStateAction<number | null>>;
  setLng: Dispatch<SetStateAction<number | null>>;
  setLatLngPolygon: Dispatch<SetStateAction<google.maps.LatLngLiteral[] | null>>;
  setRadiusKm: Dispatch<SetStateAction<number | null>>;
  resetRegistrationData: () => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const [step, setStepState] = useState<number>(1);
  const [customerType, setCustomerTypeState] = useState<'private' | 'business' | null>(null);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategoryState] = useState<string | null>(null);
  const [description, setDescriptionState] = useState('');
  const [jobStreet, setJobStreetState] = useState('');
  const [jobPostalCode, setJobPostalCodeState] = useState('');
  const [jobCity, setJobCityState] = useState('');
  const [jobCountry, setJobCountryState] = useState<string | null>('Deutschland');
  const [jobDateFrom, setJobDateFromState] = useState<string | null>(null);
  const [jobDateTo, setJobDateToState] = useState<string | null>(null);
  const [jobTimePreference, setJobTimePreferenceState] = useState<string | null>(null);
  const [tempJobDraftId, setTempJobDraftIdState] = useState<string | null>(null);
  const [selectedAnbieterId, setSelectedAnbieterIdState] = useState<string | null>(null);
  const [jobDurationString, setJobDurationStringState] = useState('');
  const [jobTotalCalculatedHours, setJobTotalCalculatedHoursState] = useState<number | null>(null);
  const [jobCalculatedPriceInCents, setJobCalculatedPriceInCentsState] = useState<number | null>(null);
  const [email, setEmailState] = useState<string>('');
  const [password, setPasswordState] = useState<string>('');
  const [firstName, setFirstNameState] = useState<string>('');
  const [lastName, setLastNameState] = useState<string>('');
  const [phoneNumber, setPhoneNumberState] = useState<string>('');
  const [companyPhoneNumber, setCompanyPhoneNumberState] = useState<string>(''); // NEU

  // NEU: States für persönliche Details
  const [dateOfBirth, setDateOfBirthState] = useState<string | undefined>(undefined);
  const [personalStreet, setPersonalStreetState] = useState<string | undefined>(undefined);
  const [personalHouseNumber, setPersonalHouseNumberState] = useState<string | undefined>(undefined);
  const [personalPostalCode, setPersonalPostalCodeState] = useState<string | undefined>(undefined);
  const [personalCity, setPersonalCityState] = useState<string | undefined>(undefined);
  const [personalCountry, setPersonalCountryState] = useState<string | null>(null);
  const [isManagingDirectorOwner, setIsManagingDirectorOwnerState] = useState<boolean>(true); // Geändert: Standard auf true setzen
  // NEU: States für granulare Eigentümer- und Vertreterdetails
  const [ownershipPercentage, setOwnershipPercentageState] = useState<number | undefined>(undefined);
  const [isActualDirector, setIsActualDirectorState] = useState<boolean | undefined>(undefined);
  const [isActualOwner, setIsActualOwnerState] = useState<boolean | undefined>(undefined);
  const [actualOwnershipPercentage, setActualOwnershipPercentageState] = useState<number | undefined>(undefined);
  const [isActualExecutive, setIsActualExecutiveState] = useState<boolean | undefined>(undefined);
  const [actualRepresentativeTitle, setActualRepresentativeTitleState] = useState<string | undefined>(undefined);

  const [companyName, setCompanyNameState] = useState<string>('');
  const [legalForm, setLegalFormState] = useState<string | null>(null);
  const [companyStreet, setCompanyStreetState] = useState<string>('');
  const [companyHouseNumber, setCompanyHouseNumberState] = useState<string>('');
  const [companyPostalCode, setCompanyPostalCodeState] = useState<string>('');
  const [companyCity, setCompanyCityState] = useState<string>('');
  const [companyCountry, setCompanyCountryState] = useState<string | null>(null); // Wird als ISO Code gespeichert
  const [companyWebsite, setCompanyWebsiteState] = useState<string>('');
  const [iban, setIbanState] = useState<string>('');
  const [accountHolder, setAccountHolderState] = useState<string>('');
  const [selectedSkills, setSelectedSkillsState] = useState<{ [key: string]: string[] | null }>({});
  const [selectedHandwerkSkills, setSelectedHandwerkSkillsState] = useState<string[] | null>(null);
  const [selectedHaushaltServices, setSelectedHaushaltServicesState] = useState<string[] | null>(null);
  const [profilePictureFile, setProfilePictureFileState] = useState<File | null>(null);
  const [businessLicenseFile, setBusinessLicenseFileState] = useState<File | null>(null);
  const [masterCraftsmanCertificateFile, setMasterCraftsmanCertificateFileState] = useState<File | null>(null);
  const [identityFrontFile, setIdentityFrontFileState] = useState<File | null>(null);
  const [identityBackFile, setIdentityBackFileState] = useState<File | null>(null);
  const [companyRegister, setCompanyRegisterState] = useState<string | undefined>(undefined); // State für Handelsregisternummer
  const [hourlyRate, setHourlyRateState] = useState<string>('');
  const [taxNumber, setTaxNumberState] = useState<string>(''); // Nationale Steuernummer oder HRN
  const [vatId, setVatIdState] = useState<string>(''); // USt-IdNr.
  const [lat, setLatState] = useState<number | null>(null);
  const [lng, setLngState] = useState<number | null>(null);
  const [latLngPolygon, setLatLngPolygonState] = useState<google.maps.LatLngLiteral[] | null>(null);
  const [radiusKm, setRadiusKmState] = useState<number | null>(30);

  const resetRegistrationData = () => {
    setStepState(1);
    setCustomerTypeState(null);
    setSelectedCategoryState(null);
    setSelectedSubcategoryState(null);
    setDescriptionState('');
    setJobStreetState('');
    setJobPostalCodeState('');
    setJobCityState('');
    setJobCountryState('Deutschland');
    setJobDateFromState(null);
    setJobDateToState(null);
    setJobTimePreferenceState(null);
    setTempJobDraftIdState(null);
    setSelectedAnbieterIdState(null);
    setJobDurationStringState('');
    setJobTotalCalculatedHoursState(null);
    setJobCalculatedPriceInCentsState(null);
    setEmailState('');
    setPasswordState('');
    setFirstNameState('');
    setLastNameState('');
    setPhoneNumberState('');
    setCompanyPhoneNumberState(''); // NEU
    // NEU: Resets für persönliche Details
    setDateOfBirthState(undefined);
    setPersonalStreetState(undefined);
    setPersonalHouseNumberState(undefined);
    setPersonalPostalCodeState(undefined);
    setPersonalCityState(undefined);
    setPersonalCountryState(null);
    setIsManagingDirectorOwnerState(true); // Geändert: Reset auf true
    // NEU: Resets für granulare Eigentümer- und Vertreterdetails
    setOwnershipPercentageState(undefined);
    setIsActualDirectorState(undefined);
    setIsActualOwnerState(undefined);
    setActualOwnershipPercentageState(undefined);
    setIsActualExecutiveState(undefined);
    setActualRepresentativeTitleState(undefined);

    setCompanyNameState('');
    setLegalFormState(null);
    setCompanyStreetState('');
    setCompanyHouseNumberState('');
    setCompanyPostalCodeState('');
    setCompanyCityState('');
    setCompanyCountryState(null);
    setCompanyWebsiteState('');
    setIbanState('');
    setAccountHolderState('');
    setSelectedSkillsState({});
    setSelectedHandwerkSkillsState(null);
    setSelectedHaushaltServicesState(null);
    setProfilePictureFileState(null);
    setBusinessLicenseFileState(null);
    setMasterCraftsmanCertificateFileState(null);
    setIdentityFrontFileState(null);
    setIdentityBackFileState(null);
    setCompanyRegisterState(undefined); // Reset für Handelsregisternummer
    setHourlyRateState('');
    setTaxNumberState('');
    setVatIdState('');
    setLatState(null);
    setLngState(null);
    setLatLngPolygonState(null);
    setRadiusKmState(30);
  };

  const contextValue: RegistrationContextType = {
    step, setStep: setStepState,
    customerType, setCustomerType: setCustomerTypeState,
    selectedCategory, setSelectedCategory: setSelectedCategoryState,
    selectedSubcategory, setSelectedSubcategory: setSelectedSubcategoryState,
    description, setDescription: setDescriptionState,
    jobStreet, setJobStreet: setJobStreetState,
    jobPostalCode, setJobPostalCode: setJobPostalCodeState,
    jobCity, setJobCity: setJobCityState,
    jobCountry, setJobCountry: setJobCountryState,
    jobDateFrom, setJobDateFrom: setJobDateFromState,
    jobDateTo, setJobDateTo: setJobDateToState,
    jobTimePreference, setJobTimePreference: setJobTimePreferenceState,
    tempJobDraftId, setTempJobDraftId: setTempJobDraftIdState,
    selectedAnbieterId, setSelectedAnbieterId: setSelectedAnbieterIdState,
    jobDurationString, setJobDurationString: setJobDurationStringState,
    jobTotalCalculatedHours, setJobTotalCalculatedHours: setJobTotalCalculatedHoursState,
    jobCalculatedPriceInCents, setJobCalculatedPriceInCents: setJobCalculatedPriceInCentsState,
    email, setEmail: setEmailState,
    password, setPassword: setPasswordState,
    firstName, setFirstName: setFirstNameState,
    lastName, setLastName: setLastNameState,
    phoneNumber, setPhoneNumber: setPhoneNumberState,
    companyPhoneNumber, setCompanyPhoneNumber: setCompanyPhoneNumberState, // NEU

    // NEU: Context-Werte für persönliche Details
    dateOfBirth, setDateOfBirth: setDateOfBirthState,
    personalStreet, setPersonalStreet: setPersonalStreetState,
    personalHouseNumber, setPersonalHouseNumber: setPersonalHouseNumberState,
    personalPostalCode, setPersonalPostalCode: setPersonalPostalCodeState,
    personalCity, setPersonalCity: setPersonalCityState,
    personalCountry, setPersonalCountry: setPersonalCountryState,
    isManagingDirectorOwner, setIsManagingDirectorOwner: setIsManagingDirectorOwnerState, // NEU: Context-Wert für isManagingDirectorOwner
    // NEU: Context-Werte für granulare Eigentümer- und Vertreterdetails
    ownershipPercentage, setOwnershipPercentage: setOwnershipPercentageState,
    isActualDirector, setIsActualDirector: setIsActualDirectorState,
    isActualOwner, setIsActualOwner: setIsActualOwnerState,
    actualOwnershipPercentage, setActualOwnershipPercentage: setActualOwnershipPercentageState,
    isActualExecutive, setIsActualExecutive: setIsActualExecutiveState,
    actualRepresentativeTitle, setActualRepresentativeTitle: setActualRepresentativeTitleState,

    companyName, setCompanyName: setCompanyNameState,
    legalForm, setLegalForm: setLegalFormState,
    companyStreet, setCompanyStreet: setCompanyStreetState,
    companyHouseNumber, setCompanyHouseNumber: setCompanyHouseNumberState,
    companyPostalCode, setCompanyPostalCode: setCompanyPostalCodeState,
    companyCity, setCompanyCity: setCompanyCityState,
    companyCountry, setCompanyCountry: setCompanyCountryState,
    companyWebsite, setCompanyWebsite: setCompanyWebsiteState,
    iban, setIban: setIbanState,
    accountHolder, setAccountHolder: setAccountHolderState,
    selectedSkills, setSelectedSkills: setSelectedSkillsState,
    selectedHandwerkSkills, setSelectedHandwerkSkills: setSelectedHandwerkSkillsState,
    selectedHaushaltServices, setSelectedHaushaltServices: setSelectedHaushaltServicesState,
    profilePictureFile, setProfilePictureFile: setProfilePictureFileState,
    businessLicenseFile, setBusinessLicenseFile: setBusinessLicenseFileState,
    masterCraftsmanCertificateFile, setMasterCraftsmanCertificateFile: setMasterCraftsmanCertificateFileState,
    identityFrontFile, setIdentityFrontFile: setIdentityFrontFileState,
    identityBackFile, setIdentityBackFile: setIdentityBackFileState,
    companyRegister, setCompanyRegister: setCompanyRegisterState, // Handelsregisternummer zum Context hinzufügen
    hourlyRate, setHourlyRate: setHourlyRateState,
    taxNumber, setTaxNumber: setTaxNumberState,
    vatId, setVatId: setVatIdState,
    lat, setLat: setLatState,
    lng, setLng: setLngState,
    latLngPolygon, setLatLngPolygon: setLatLngPolygonState,
    radiusKm, setRadiusKm: setRadiusKmState,
    resetRegistrationData,
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = (): RegistrationContextType => {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error("useRegistration muss innerhalb eines RegistrationProviders verwendet werden");
  }
  return context;
};