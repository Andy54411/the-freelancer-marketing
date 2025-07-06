// Registration-Context.tsx
'use client';

import React, { createContext, useContext, useState, Dispatch, SetStateAction, ReactNode, useEffect } from 'react';

// NEU: jobId hinzugefügt
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
  tempJobDraftId?: string | null; // Dieser ist bereits vorhanden
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
  selectedSkills: { [hauptkategorie: string]: string[] | null }; // Geändert: Nicht mehr optional
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

// NEU: setJobId zur RegistrationContextType hinzugefügt
export interface RegistrationContextType extends RegistrationData {
  setStep: Dispatch<SetStateAction<number>>;
  setCustomerType: Dispatch<SetStateAction<'private' | 'business' | null>>;
  setSelectedCategory: Dispatch<SetStateAction<string | null>>;
  setSelectedSubcategory: Dispatch<SetStateAction<string | null>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setJobStreet: Dispatch<SetStateAction<string | undefined>>;
  setJobPostalCode: Dispatch<SetStateAction<string | undefined>>;
  setJobCity: Dispatch<SetStateAction<string | undefined>>;
  setJobCountry: Dispatch<SetStateAction<string | null | undefined>>;
  setJobDateFrom: Dispatch<SetStateAction<string | null | undefined>>;
  setJobDateTo: Dispatch<SetStateAction<string | null | undefined>>;
  setJobTimePreference: Dispatch<SetStateAction<string | null | undefined>>;
  setTempJobDraftId: Dispatch<SetStateAction<string | null | undefined>>;
  setSelectedAnbieterId: Dispatch<SetStateAction<string | null | undefined>>;
  setJobDurationString: Dispatch<SetStateAction<string | undefined>>;
  setJobTotalCalculatedHours: Dispatch<SetStateAction<number | null | undefined>>;
  setJobCalculatedPriceInCents: Dispatch<SetStateAction<number | null | undefined>>;
  setEmail: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string | undefined>>;
  setFirstName: Dispatch<SetStateAction<string>>;
  setLastName: Dispatch<SetStateAction<string>>;
  setPhoneNumber: Dispatch<SetStateAction<string | undefined>>;
  setCompanyPhoneNumber: Dispatch<SetStateAction<string | undefined>>;

  // Setter für persönliche Details
  setDateOfBirth: Dispatch<SetStateAction<string | undefined>>;
  setPersonalStreet: Dispatch<SetStateAction<string | undefined>>;
  setPersonalHouseNumber: Dispatch<SetStateAction<string | undefined>>;
  setPersonalPostalCode: Dispatch<SetStateAction<string | undefined>>;
  setPersonalCity: Dispatch<SetStateAction<string | undefined>>;
  setPersonalCountry: Dispatch<SetStateAction<string | null | undefined>>;
  setIsManagingDirectorOwner: Dispatch<SetStateAction<boolean>>;
  // Setter für granulare Eigentümer- und Vertreterdetails
  setOwnershipPercentage: Dispatch<SetStateAction<number | undefined>>;
  setIsActualDirector: Dispatch<SetStateAction<boolean | undefined>>;
  setIsActualOwner: Dispatch<SetStateAction<boolean | undefined>>;
  setActualOwnershipPercentage: Dispatch<SetStateAction<number | undefined>>;
  setIsActualExecutive: Dispatch<SetStateAction<boolean | undefined>>;
  setActualRepresentativeTitle: Dispatch<SetStateAction<string | undefined>>;

  setCompanyName: Dispatch<SetStateAction<string | undefined>>;
  setLegalForm: Dispatch<SetStateAction<string | null | undefined>>;
  setCompanyStreet: Dispatch<SetStateAction<string | undefined>>;
  setCompanyHouseNumber: Dispatch<SetStateAction<string | undefined>>;
  setCompanyPostalCode: Dispatch<SetStateAction<string | undefined>>;
  setCompanyCity: Dispatch<SetStateAction<string | undefined>>;
  setCompanyCountry: Dispatch<SetStateAction<string | null | undefined>>;
  setCompanyWebsite: Dispatch<SetStateAction<string | undefined>>;
  setIban: Dispatch<SetStateAction<string | undefined>>;
  setAccountHolder: Dispatch<SetStateAction<string | undefined>>;
  setSelectedSkills: Dispatch<SetStateAction<{ [hauptkategorie: string]: string[] | null }>>; // Geändert: | undefined entfernt
  setSelectedHandwerkSkills: Dispatch<SetStateAction<string[] | null | undefined>>;
  setSelectedHaushaltServices: Dispatch<SetStateAction<string[] | null | undefined>>;
  setProfilePictureFile: Dispatch<SetStateAction<File | null | undefined>>;
  setBusinessLicenseFile: Dispatch<SetStateAction<File | null | undefined>>;
  setMasterCraftsmanCertificateFile: Dispatch<SetStateAction<File | null | undefined>>;
  setIdentityFrontFile: Dispatch<SetStateAction<File | null | undefined>>;
  setIdentityBackFile: Dispatch<SetStateAction<File | null | undefined>>;
  setCompanyRegister: Dispatch<SetStateAction<string | undefined>>;
  setHourlyRate: Dispatch<SetStateAction<string | undefined>>;
  setTaxNumber: Dispatch<SetStateAction<string | undefined>>;
  setVatId: Dispatch<SetStateAction<string | undefined>>;
  setLat: Dispatch<SetStateAction<number | null>>;
  setLng: Dispatch<SetStateAction<number | null>>;
  setLatLngPolygon: Dispatch<SetStateAction<google.maps.LatLngLiteral[] | null | undefined>>;
  setRadiusKm: Dispatch<SetStateAction<number | null>>;
  resetRegistrationData: () => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  // Hilfsfunktion für den initialen State aus localStorage oder Standardwerten
  const getInitialState = (): RegistrationData => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('registrationData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData) as Partial<RegistrationData>;
          // Fallback-Werte für alle Felder sicherstellen
          return {
            step: parsedData.step || 1,
            customerType: parsedData.customerType || null,
            selectedCategory: parsedData.selectedCategory || null,
            selectedSubcategory: parsedData.selectedSubcategory || null,
            description: parsedData.description || '',
            jobStreet: parsedData.jobStreet || '',
            jobPostalCode: parsedData.jobPostalCode || '',
            jobCity: parsedData.jobCity || '',
            jobCountry: parsedData.jobCountry ?? 'Deutschland',
            jobDateFrom: parsedData.jobDateFrom ?? null,
            jobDateTo: parsedData.jobDateTo ?? null,
            jobTimePreference: parsedData.jobTimePreference ?? null,
            tempJobDraftId: parsedData.tempJobDraftId ?? null,
            selectedAnbieterId: parsedData.selectedAnbieterId ?? null,
            jobDurationString: parsedData.jobDurationString || '',
            jobTotalCalculatedHours: parsedData.jobTotalCalculatedHours ?? null,
            jobCalculatedPriceInCents: parsedData.jobCalculatedPriceInCents ?? null,
            email: parsedData.email || '',
            password: parsedData.password ?? '',
            firstName: parsedData.firstName || '',
            lastName: parsedData.lastName || '',
            phoneNumber: parsedData.phoneNumber ?? '',
            companyPhoneNumber: parsedData.companyPhoneNumber ?? '',
            dateOfBirth: parsedData.dateOfBirth ?? undefined,
            personalStreet: parsedData.personalStreet ?? undefined,
            personalHouseNumber: parsedData.personalHouseNumber ?? undefined,
            personalPostalCode: parsedData.personalPostalCode ?? undefined,
            personalCity: parsedData.personalCity ?? undefined,
            personalCountry: parsedData.personalCountry ?? 'DE', // Standard auf 'DE'
            isManagingDirectorOwner: typeof parsedData.isManagingDirectorOwner === 'boolean' ? parsedData.isManagingDirectorOwner : true,
            ownershipPercentage: parsedData.ownershipPercentage ?? undefined,
            isActualDirector: parsedData.isActualDirector ?? undefined,
            isActualOwner: parsedData.isActualOwner ?? undefined,
            actualOwnershipPercentage: parsedData.actualOwnershipPercentage ?? undefined,
            isActualExecutive: parsedData.isActualExecutive ?? undefined,
            actualRepresentativeTitle: parsedData.actualRepresentativeTitle ?? undefined,
            companyName: parsedData.companyName ?? '',
            legalForm: parsedData.legalForm ?? null,
            companyStreet: parsedData.companyStreet ?? '',
            companyHouseNumber: parsedData.companyHouseNumber ?? '',
            companyPostalCode: parsedData.companyPostalCode ?? '',
            companyCity: parsedData.companyCity ?? '',
            companyCountry: parsedData.companyCountry ?? 'DE', // Standard auf 'DE'
            companyWebsite: parsedData.companyWebsite ?? '',
            iban: parsedData.iban ?? '',
            accountHolder: parsedData.accountHolder ?? '',
            selectedSkills: parsedData.selectedSkills ?? {}, // Diese Zeile ist jetzt korrekt
            selectedHandwerkSkills: parsedData.selectedHandwerkSkills ?? null,
            selectedHaushaltServices: parsedData.selectedHaushaltServices ?? null,
            profilePictureFile: null,
            businessLicenseFile: null,
            masterCraftsmanCertificateFile: null,
            identityFrontFile: null,
            identityBackFile: null,
            companyRegister: parsedData.companyRegister ?? undefined,
            hourlyRate: parsedData.hourlyRate ?? '',
            taxNumber: parsedData.taxNumber ?? '',
            vatId: parsedData.vatId ?? '',
            lat: parsedData.lat ?? null,
            lng: parsedData.lng ?? null,
            latLngPolygon: parsedData.latLngPolygon ?? null,
            radiusKm: parsedData.radiusKm ?? 30,
          };
        } catch (e) {
          console.error("Fehler beim Parsen von registrationData aus localStorage:", e);
          localStorage.removeItem('registrationData');
        }
      }
    }
    // Standard-Initialwerte
    return {
      step: 1, customerType: null, selectedCategory: null, selectedSubcategory: null, description: '',
      jobStreet: '', jobPostalCode: '', jobCity: '', jobCountry: 'Deutschland',
      jobDateFrom: null, jobDateTo: null, jobTimePreference: null, tempJobDraftId: null, selectedAnbieterId: null,
      jobDurationString: '', jobTotalCalculatedHours: null, jobCalculatedPriceInCents: null,
      email: '', password: '', firstName: '', lastName: '', phoneNumber: '', companyPhoneNumber: '',
      dateOfBirth: undefined, personalStreet: undefined, personalHouseNumber: undefined, personalPostalCode: undefined,
      personalCity: undefined, personalCountry: 'DE', isManagingDirectorOwner: true, // Standard auf 'DE'
      ownershipPercentage: undefined, isActualDirector: undefined, isActualOwner: undefined,
      actualOwnershipPercentage: undefined, isActualExecutive: undefined, actualRepresentativeTitle: undefined,
      companyName: '', legalForm: null, companyStreet: '', companyHouseNumber: '', companyPostalCode: '', companyCity: '',
      companyCountry: 'DE', companyWebsite: '', iban: '', accountHolder: '', selectedSkills: {}, selectedHandwerkSkills: null, // Standard auf 'DE'
      selectedHaushaltServices: null, profilePictureFile: null, businessLicenseFile: null,
      masterCraftsmanCertificateFile: null, identityFrontFile: null, identityBackFile: null,
      companyRegister: undefined, hourlyRate: '', taxNumber: '', vatId: '',
      lat: null, lng: null, latLngPolygon: null, radiusKm: 30,
    };
  };

  const [registrationState, setRegistrationState] = useState<RegistrationData>(getInitialState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { profilePictureFile, businessLicenseFile, masterCraftsmanCertificateFile, identityFrontFile, identityBackFile, ...stateToStore } = registrationState;
      localStorage.setItem('registrationData', JSON.stringify(stateToStore));
    }
  }, [registrationState]);

  const setStepState = (value: SetStateAction<number>) => setRegistrationState(prev => ({ ...prev, step: typeof value === 'function' ? value(prev.step) : value }));
  const setCustomerTypeState = (value: SetStateAction<'private' | 'business' | null>) => setRegistrationState(prev => ({ ...prev, customerType: typeof value === 'function' ? value(prev.customerType) : value }));
  const setSelectedCategoryState = (value: SetStateAction<string | null>) => setRegistrationState(prev => ({ ...prev, selectedCategory: typeof value === 'function' ? value(prev.selectedCategory) : value }));
  const setSelectedSubcategoryState = (value: SetStateAction<string | null>) => setRegistrationState(prev => ({ ...prev, selectedSubcategory: typeof value === 'function' ? value(prev.selectedSubcategory) : value }));
  const setDescriptionState = (value: SetStateAction<string>) => setRegistrationState(prev => ({ ...prev, description: typeof value === 'function' ? value(prev.description) : value }));
  const setJobStreetState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, jobStreet: typeof value === 'function' ? value(prev.jobStreet) : value }));
  const setJobPostalCodeState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, jobPostalCode: typeof value === 'function' ? value(prev.jobPostalCode) : value }));
  const setJobCityState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, jobCity: typeof value === 'function' ? value(prev.jobCity) : value }));
  const setJobCountryState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, jobCountry: typeof value === 'function' ? value(prev.jobCountry) : value }));
  const setJobDateFromState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, jobDateFrom: typeof value === 'function' ? value(prev.jobDateFrom) : value }));
  const setJobDateToState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, jobDateTo: typeof value === 'function' ? value(prev.jobDateTo) : value }));
  const setJobTimePreferenceState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, jobTimePreference: typeof value === 'function' ? value(prev.jobTimePreference) : value }));
  const setTempJobDraftIdState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, tempJobDraftId: typeof value === 'function' ? value(prev.tempJobDraftId) : value }));
  const setSelectedAnbieterIdState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, selectedAnbieterId: typeof value === 'function' ? value(prev.selectedAnbieterId) : value }));
  const setJobDurationStringState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, jobDurationString: typeof value === 'function' ? value(prev.jobDurationString) : value }));
  const setJobTotalCalculatedHoursState = (value: SetStateAction<number | null | undefined>) => setRegistrationState(prev => ({ ...prev, jobTotalCalculatedHours: typeof value === 'function' ? value(prev.jobTotalCalculatedHours) : value }));
  const setJobCalculatedPriceInCentsState = (value: SetStateAction<number | null | undefined>) => setRegistrationState(prev => ({ ...prev, jobCalculatedPriceInCents: typeof value === 'function' ? value(prev.jobCalculatedPriceInCents) : value }));
  const setEmailState = (value: SetStateAction<string>) => setRegistrationState(prev => ({ ...prev, email: typeof value === 'function' ? value(prev.email) : value }));
  const setPasswordState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, password: typeof value === 'function' ? value(prev.password) : value }));
  const setFirstNameState = (value: SetStateAction<string>) => setRegistrationState(prev => ({ ...prev, firstName: typeof value === 'function' ? value(prev.firstName) : value }));
  const setLastNameState = (value: SetStateAction<string>) => setRegistrationState(prev => ({ ...prev, lastName: typeof value === 'function' ? value(prev.lastName) : value }));
  const setPhoneNumberState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, phoneNumber: typeof value === 'function' ? value(prev.phoneNumber) : value }));
  const setCompanyPhoneNumberState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyPhoneNumber: typeof value === 'function' ? value(prev.companyPhoneNumber) : value }));
  const setDateOfBirthState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, dateOfBirth: typeof value === 'function' ? value(prev.dateOfBirth) : value }));
  const setPersonalStreetState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, personalStreet: typeof value === 'function' ? value(prev.personalStreet) : value }));
  const setPersonalHouseNumberState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, personalHouseNumber: typeof value === 'function' ? value(prev.personalHouseNumber) : value }));
  const setPersonalPostalCodeState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, personalPostalCode: typeof value === 'function' ? value(prev.personalPostalCode) : value }));
  const setPersonalCityState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, personalCity: typeof value === 'function' ? value(prev.personalCity) : value }));
  const setPersonalCountryState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, personalCountry: typeof value === 'function' ? value(prev.personalCountry) : value }));
  const setIsManagingDirectorOwnerState = (value: SetStateAction<boolean>) => setRegistrationState(prev => ({ ...prev, isManagingDirectorOwner: typeof value === 'function' ? value(prev.isManagingDirectorOwner) : value }));
  const setOwnershipPercentageState = (value: SetStateAction<number | undefined>) => setRegistrationState(prev => ({ ...prev, ownershipPercentage: typeof value === 'function' ? value(prev.ownershipPercentage) : value }));
  const setIsActualDirectorState = (value: SetStateAction<boolean | undefined>) => setRegistrationState(prev => ({ ...prev, isActualDirector: typeof value === 'function' ? value(prev.isActualDirector) : value }));
  const setIsActualOwnerState = (value: SetStateAction<boolean | undefined>) => setRegistrationState(prev => ({ ...prev, isActualOwner: typeof value === 'function' ? value(prev.isActualOwner) : value }));
  const setActualOwnershipPercentageState = (value: SetStateAction<number | undefined>) => setRegistrationState(prev => ({ ...prev, actualOwnershipPercentage: typeof value === 'function' ? value(prev.actualOwnershipPercentage) : value }));
  const setIsActualExecutiveState = (value: SetStateAction<boolean | undefined>) => setRegistrationState(prev => ({ ...prev, isActualExecutive: typeof value === 'function' ? value(prev.isActualExecutive) : value }));
  const setActualRepresentativeTitleState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, actualRepresentativeTitle: typeof value === 'function' ? value(prev.actualRepresentativeTitle) : value }));
  const setCompanyNameState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyName: typeof value === 'function' ? value(prev.companyName) : value }));
  const setLegalFormState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, legalForm: typeof value === 'function' ? value(prev.legalForm) : value }));
  const setCompanyStreetState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyStreet: typeof value === 'function' ? value(prev.companyStreet) : value }));
  const setCompanyHouseNumberState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyHouseNumber: typeof value === 'function' ? value(prev.companyHouseNumber) : value }));
  const setCompanyPostalCodeState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyPostalCode: typeof value === 'function' ? value(prev.companyPostalCode) : value }));
  const setCompanyCityState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyCity: typeof value === 'function' ? value(prev.companyCity) : value }));
  const setCompanyCountryState = (value: SetStateAction<string | null | undefined>) => setRegistrationState(prev => ({ ...prev, companyCountry: typeof value === 'function' ? value(prev.companyCountry) : value }));
  const setCompanyWebsiteState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyWebsite: typeof value === 'function' ? value(prev.companyWebsite) : value }));
  const setIbanState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, iban: typeof value === 'function' ? value(prev.iban) : value }));
  const setAccountHolderState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, accountHolder: typeof value === 'function' ? value(prev.accountHolder) : value }));
  const setSelectedSkillsState = (value: SetStateAction<{ [key: string]: string[] | null }>) => setRegistrationState(prev => ({ ...prev, selectedSkills: typeof value === 'function' ? value(prev.selectedSkills!) : value })); // prev.selectedSkills! da es jetzt nicht mehr undefined ist
  const setSelectedHandwerkSkillsState = (value: SetStateAction<string[] | null | undefined>) => setRegistrationState(prev => ({ ...prev, selectedHandwerkSkills: typeof value === 'function' ? value(prev.selectedHandwerkSkills) : value }));
  const setSelectedHaushaltServicesState = (value: SetStateAction<string[] | null | undefined>) => setRegistrationState(prev => ({ ...prev, selectedHaushaltServices: typeof value === 'function' ? value(prev.selectedHaushaltServices) : value }));
  const setProfilePictureFileState = (value: SetStateAction<File | null | undefined>) => setRegistrationState(prev => ({ ...prev, profilePictureFile: typeof value === 'function' ? value(prev.profilePictureFile) : value }));
  const setBusinessLicenseFileState = (value: SetStateAction<File | null | undefined>) => setRegistrationState(prev => ({ ...prev, businessLicenseFile: typeof value === 'function' ? value(prev.businessLicenseFile) : value }));
  const setMasterCraftsmanCertificateFileState = (value: SetStateAction<File | null | undefined>) => setRegistrationState(prev => ({ ...prev, masterCraftsmanCertificateFile: typeof value === 'function' ? value(prev.masterCraftsmanCertificateFile) : value }));
  const setIdentityFrontFileState = (value: SetStateAction<File | null | undefined>) => setRegistrationState(prev => ({ ...prev, identityFrontFile: typeof value === 'function' ? value(prev.identityFrontFile) : value }));
  const setIdentityBackFileState = (value: SetStateAction<File | null | undefined>) => setRegistrationState(prev => ({ ...prev, identityBackFile: typeof value === 'function' ? value(prev.identityBackFile) : value }));
  const setCompanyRegisterState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, companyRegister: typeof value === 'function' ? value(prev.companyRegister) : value }));
  const setHourlyRateState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, hourlyRate: typeof value === 'function' ? value(prev.hourlyRate) : value }));
  const setTaxNumberState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, taxNumber: typeof value === 'function' ? value(prev.taxNumber) : value }));
  const setVatIdState = (value: SetStateAction<string | undefined>) => setRegistrationState(prev => ({ ...prev, vatId: typeof value === 'function' ? value(prev.vatId) : value }));
  const setLatState = (value: SetStateAction<number | null>) => setRegistrationState(prev => ({ ...prev, lat: typeof value === 'function' ? value(prev.lat) : value }));
  const setLngState = (value: SetStateAction<number | null>) => setRegistrationState(prev => ({ ...prev, lng: typeof value === 'function' ? value(prev.lng) : value }));
  const setLatLngPolygonState = (value: SetStateAction<google.maps.LatLngLiteral[] | null | undefined>) => setRegistrationState(prev => ({ ...prev, latLngPolygon: typeof value === 'function' ? value(prev.latLngPolygon) : value }));
  const setRadiusKmState = (value: SetStateAction<number | null>) => setRegistrationState(prev => ({ ...prev, radiusKm: typeof value === 'function' ? value(prev.radiusKm) : value }));

  const resetRegistrationData = () => {
    setRegistrationState(getInitialState());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('registrationData');
    }
  };

  const contextValue: RegistrationContextType = {
    ...registrationState,
    setStep: setStepState,
    setCustomerType: setCustomerTypeState,
    setSelectedCategory: setSelectedCategoryState,
    setSelectedSubcategory: setSelectedSubcategoryState,
    setDescription: setDescriptionState,
    setJobStreet: setJobStreetState,
    setJobPostalCode: setJobPostalCodeState,
    setJobCity: setJobCityState,
    setJobCountry: setJobCountryState,
    setJobDateFrom: setJobDateFromState,
    setJobDateTo: setJobDateToState,
    setJobTimePreference: setJobTimePreferenceState,
    setTempJobDraftId: setTempJobDraftIdState,
    setSelectedAnbieterId: setSelectedAnbieterIdState,
    setJobDurationString: setJobDurationStringState,
    setJobTotalCalculatedHours: setJobTotalCalculatedHoursState,
    setJobCalculatedPriceInCents: setJobCalculatedPriceInCentsState,
    setEmail: setEmailState,
    setPassword: setPasswordState,
    setFirstName: setFirstNameState,
    setLastName: setLastNameState,
    setPhoneNumber: setPhoneNumberState,
    setCompanyPhoneNumber: setCompanyPhoneNumberState,
    setDateOfBirth: setDateOfBirthState,
    setPersonalStreet: setPersonalStreetState,
    setPersonalHouseNumber: setPersonalHouseNumberState,
    setPersonalPostalCode: setPersonalPostalCodeState,
    setPersonalCity: setPersonalCityState,
    setPersonalCountry: setPersonalCountryState,
    setIsManagingDirectorOwner: setIsManagingDirectorOwnerState,
    setOwnershipPercentage: setOwnershipPercentageState,
    setIsActualDirector: setIsActualDirectorState,
    setIsActualOwner: setIsActualOwnerState,
    setActualOwnershipPercentage: setActualOwnershipPercentageState,
    setIsActualExecutive: setIsActualExecutiveState,
    setActualRepresentativeTitle: setActualRepresentativeTitleState,
    setCompanyName: setCompanyNameState,
    setLegalForm: setLegalFormState,
    setCompanyStreet: setCompanyStreetState,
    setCompanyHouseNumber: setCompanyHouseNumberState,
    setCompanyPostalCode: setCompanyPostalCodeState,
    setCompanyCity: setCompanyCityState,
    setCompanyCountry: setCompanyCountryState,
    setCompanyWebsite: setCompanyWebsiteState,
    setIban: setIbanState,
    setAccountHolder: setAccountHolderState,
    setSelectedSkills: setSelectedSkillsState,
    setSelectedHandwerkSkills: setSelectedHandwerkSkillsState,
    setSelectedHaushaltServices: setSelectedHaushaltServicesState,
    setProfilePictureFile: setProfilePictureFileState,
    setBusinessLicenseFile: setBusinessLicenseFileState,
    setMasterCraftsmanCertificateFile: setMasterCraftsmanCertificateFileState,
    setIdentityFrontFile: setIdentityFrontFileState,
    setIdentityBackFile: setIdentityBackFileState,
    setCompanyRegister: setCompanyRegisterState,
    setHourlyRate: setHourlyRateState,
    setTaxNumber: setTaxNumberState,
    setVatId: setVatIdState,
    setLat: setLatState,
    setLng: setLngState,
    setLatLngPolygon: setLatLngPolygonState,
    setRadiusKm: setRadiusKmState,
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
