// Registration-Context.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  Dispatch,
  SetStateAction,
  ReactNode,
  useEffect,
} from 'react';
import { SubcategoryData } from '@/types/subcategory-forms';

// NEU: jobId hinzugefügt
interface RegistrationData {
  step: number;
  customerType: 'private' | 'business' | null;
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  description: string;
  // NEU: Strukturierte Daten für Unterkategorien
  subcategoryData?: SubcategoryData | null;
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
  // NEU: Setter für strukturierte Unterkategorie-Daten
  setSubcategoryData: Dispatch<SetStateAction<SubcategoryData | null | undefined>>;
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
    let subcategoryDataFromStorage: SubcategoryData | null = null;

    if (typeof window !== 'undefined') {
      // 🔧 LADE subcategoryData aus localStorage
      try {
        const storedSubcategoryData = localStorage.getItem('subcategoryFormData');
        if (storedSubcategoryData) {
          subcategoryDataFromStorage = JSON.parse(storedSubcategoryData);
          console.log(
            '🔍 [Registration-Context] Loaded subcategoryData from localStorage:',
            subcategoryDataFromStorage
          );
        }
      } catch (e) {
        console.error(
          '🔍 [Registration-Context] Error loading subcategoryData from localStorage:',
          e
        );
        localStorage.removeItem('subcategoryFormData');
      }

      // DEAKTIVIERT: Registrierungsdaten nicht mehr aus localStorage laden
      // const storedData = localStorage.getItem('registrationData');
      // if (storedData) {
      //   try {
      //     const parsed = JSON.parse(storedData);
      //     return {
      //       ...defaultState,
      //       ...parsed,
      //     };
      //   } catch (e) {
      //     console.error('Fehler beim Parsen von registrationData aus localStorage:', e);
      //     localStorage.removeItem('registrationData');
      //   }
      // }
    }

    // Standard-Werte zurückgeben
    return {
      step: 1,
      customerType: null,
      selectedCategory: null,
      selectedSubcategory: null,
      description: '',
      subcategoryData: subcategoryDataFromStorage, // 🔧 Verwende gespeicherte subcategoryData
      jobStreet: '',
      jobPostalCode: '',
      jobCity: '',
      jobCountry: 'DE',
      jobDateFrom: null,
      jobDateTo: null,
      jobTimePreference: null,
      tempJobDraftId: null,
      selectedAnbieterId: null,
      jobDurationString: undefined,
      jobTotalCalculatedHours: null,
      jobCalculatedPriceInCents: null,
      email: '',
      password: undefined,
      firstName: '',
      lastName: '',
      phoneNumber: '',
      companyPhoneNumber: '',
      dateOfBirth: '',
      personalStreet: '',
      personalHouseNumber: '',
      personalPostalCode: '',
      personalCity: '',
      personalCountry: 'DE',
      isManagingDirectorOwner: true, // Standard auf 'DE'
      ownershipPercentage: undefined,
      isActualDirector: undefined,
      isActualOwner: undefined,
      actualOwnershipPercentage: undefined,
      isActualExecutive: undefined,
      actualRepresentativeTitle: undefined,
      companyName: '',
      legalForm: null,
      companyStreet: '',
      companyHouseNumber: '',
      companyPostalCode: '',
      companyCity: '',
      companyCountry: 'DE',
      companyWebsite: '',
      iban: '',
      accountHolder: '',
      selectedSkills: {},
      selectedHandwerkSkills: null, // Standard auf 'DE'
      selectedHaushaltServices: null,
      profilePictureFile: null,
      businessLicenseFile: null,
      masterCraftsmanCertificateFile: null,
      identityFrontFile: null,
      identityBackFile: null,
      companyRegister: undefined,
      hourlyRate: '',
      taxNumber: '',
      vatId: '',
      lat: null,
      lng: null,
      latLngPolygon: null,
      radiusKm: 30,
    };
  };
  const [registrationState, setRegistrationState] = useState<RegistrationData>(getInitialState);

  useEffect(() => {
    // DEAKTIVIERT: Registrierungsdaten nicht mehr automatisch speichern
    // if (typeof window !== 'undefined') {
    //   const {
    //     profilePictureFile,
    //     businessLicenseFile,
    //     masterCraftsmanCertificateFile,
    //     identityFrontFile,
    //     identityBackFile,
    //     ...stateToStore
    //   } = registrationState;
    //   localStorage.setItem('registrationData', JSON.stringify(stateToStore));
    // }
  }, [registrationState]);

  const setStepState = (value: SetStateAction<number>) =>
    setRegistrationState(prev => ({
      ...prev,
      step: typeof value === 'function' ? value(prev.step) : value,
    }));
  const setCustomerTypeState = (value: SetStateAction<'private' | 'business' | null>) =>
    setRegistrationState(prev => ({
      ...prev,
      customerType: typeof value === 'function' ? value(prev.customerType) : value,
    }));
  const setSelectedCategoryState = (value: SetStateAction<string | null>) =>
    setRegistrationState(prev => ({
      ...prev,
      selectedCategory: typeof value === 'function' ? value(prev.selectedCategory) : value,
    }));
  const setSelectedSubcategoryState = (value: SetStateAction<string | null>) =>
    setRegistrationState(prev => ({
      ...prev,
      selectedSubcategory: typeof value === 'function' ? value(prev.selectedSubcategory) : value,
    }));
  const setDescriptionState = (value: SetStateAction<string>) =>
    setRegistrationState(prev => ({
      ...prev,
      description: typeof value === 'function' ? value(prev.description) : value,
    }));
  // NEU: Setter für strukturierte Unterkategorie-Daten
  const setSubcategoryDataState = (value: SetStateAction<SubcategoryData | null | undefined>) =>
    setRegistrationState(prev => {
      const newValue = typeof value === 'function' ? value(prev.subcategoryData) : value;
      console.log('🔍 [Registration-Context] setSubcategoryData called:', {
        oldValue: prev.subcategoryData,
        newValue: newValue,
        valueType: typeof newValue,
        isNull: newValue === null,
        isUndefined: newValue === undefined,
        hasKeys: newValue ? Object.keys(newValue) : 'no keys',
      });

      // 🔧 PERSISTIERE subcategoryData in localStorage
      if (typeof window !== 'undefined') {
        if (newValue) {
          localStorage.setItem('subcategoryFormData', JSON.stringify(newValue));
          console.log('🔍 [Registration-Context] Saved subcategoryData to localStorage');
        } else {
          localStorage.removeItem('subcategoryFormData');
          console.log('🔍 [Registration-Context] Removed subcategoryData from localStorage');
        }
      }

      return {
        ...prev,
        subcategoryData: newValue,
      };
    });
  const setJobStreetState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobStreet: typeof value === 'function' ? value(prev.jobStreet) : value,
    }));
  const setJobPostalCodeState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobPostalCode: typeof value === 'function' ? value(prev.jobPostalCode) : value,
    }));
  const setJobCityState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobCity: typeof value === 'function' ? value(prev.jobCity) : value,
    }));
  const setJobCountryState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobCountry: typeof value === 'function' ? value(prev.jobCountry) : value,
    }));
  const setJobDateFromState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobDateFrom: typeof value === 'function' ? value(prev.jobDateFrom) : value,
    }));
  const setJobDateToState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobDateTo: typeof value === 'function' ? value(prev.jobDateTo) : value,
    }));
  const setJobTimePreferenceState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobTimePreference: typeof value === 'function' ? value(prev.jobTimePreference) : value,
    }));
  const setTempJobDraftIdState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      tempJobDraftId: typeof value === 'function' ? value(prev.tempJobDraftId) : value,
    }));
  const setSelectedAnbieterIdState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      selectedAnbieterId: typeof value === 'function' ? value(prev.selectedAnbieterId) : value,
    }));
  const setJobDurationStringState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobDurationString: typeof value === 'function' ? value(prev.jobDurationString) : value,
    }));
  const setJobTotalCalculatedHoursState = (value: SetStateAction<number | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobTotalCalculatedHours:
        typeof value === 'function' ? value(prev.jobTotalCalculatedHours) : value,
    }));
  const setJobCalculatedPriceInCentsState = (value: SetStateAction<number | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      jobCalculatedPriceInCents:
        typeof value === 'function' ? value(prev.jobCalculatedPriceInCents) : value,
    }));
  const setEmailState = (value: SetStateAction<string>) =>
    setRegistrationState(prev => ({
      ...prev,
      email: typeof value === 'function' ? value(prev.email) : value,
    }));
  const setPasswordState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      password: typeof value === 'function' ? value(prev.password) : value,
    }));
  const setFirstNameState = (value: SetStateAction<string>) =>
    setRegistrationState(prev => ({
      ...prev,
      firstName: typeof value === 'function' ? value(prev.firstName) : value,
    }));
  const setLastNameState = (value: SetStateAction<string>) =>
    setRegistrationState(prev => ({
      ...prev,
      lastName: typeof value === 'function' ? value(prev.lastName) : value,
    }));
  const setPhoneNumberState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      phoneNumber: typeof value === 'function' ? value(prev.phoneNumber) : value,
    }));
  const setCompanyPhoneNumberState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyPhoneNumber: typeof value === 'function' ? value(prev.companyPhoneNumber) : value,
    }));
  const setDateOfBirthState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      dateOfBirth: typeof value === 'function' ? value(prev.dateOfBirth) : value,
    }));
  const setPersonalStreetState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      personalStreet: typeof value === 'function' ? value(prev.personalStreet) : value,
    }));
  const setPersonalHouseNumberState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      personalHouseNumber: typeof value === 'function' ? value(prev.personalHouseNumber) : value,
    }));
  const setPersonalPostalCodeState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      personalPostalCode: typeof value === 'function' ? value(prev.personalPostalCode) : value,
    }));
  const setPersonalCityState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      personalCity: typeof value === 'function' ? value(prev.personalCity) : value,
    }));
  const setPersonalCountryState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      personalCountry: typeof value === 'function' ? value(prev.personalCountry) : value,
    }));
  const setIsManagingDirectorOwnerState = (value: SetStateAction<boolean>) =>
    setRegistrationState(prev => ({
      ...prev,
      isManagingDirectorOwner:
        typeof value === 'function' ? value(prev.isManagingDirectorOwner) : value,
    }));
  const setOwnershipPercentageState = (value: SetStateAction<number | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      ownershipPercentage: typeof value === 'function' ? value(prev.ownershipPercentage) : value,
    }));
  const setIsActualDirectorState = (value: SetStateAction<boolean | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      isActualDirector: typeof value === 'function' ? value(prev.isActualDirector) : value,
    }));
  const setIsActualOwnerState = (value: SetStateAction<boolean | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      isActualOwner: typeof value === 'function' ? value(prev.isActualOwner) : value,
    }));
  const setActualOwnershipPercentageState = (value: SetStateAction<number | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      actualOwnershipPercentage:
        typeof value === 'function' ? value(prev.actualOwnershipPercentage) : value,
    }));
  const setIsActualExecutiveState = (value: SetStateAction<boolean | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      isActualExecutive: typeof value === 'function' ? value(prev.isActualExecutive) : value,
    }));
  const setActualRepresentativeTitleState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      actualRepresentativeTitle:
        typeof value === 'function' ? value(prev.actualRepresentativeTitle) : value,
    }));
  const setCompanyNameState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyName: typeof value === 'function' ? value(prev.companyName) : value,
    }));
  const setLegalFormState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      legalForm: typeof value === 'function' ? value(prev.legalForm) : value,
    }));
  const setCompanyStreetState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyStreet: typeof value === 'function' ? value(prev.companyStreet) : value,
    }));
  const setCompanyHouseNumberState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyHouseNumber: typeof value === 'function' ? value(prev.companyHouseNumber) : value,
    }));
  const setCompanyPostalCodeState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyPostalCode: typeof value === 'function' ? value(prev.companyPostalCode) : value,
    }));
  const setCompanyCityState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyCity: typeof value === 'function' ? value(prev.companyCity) : value,
    }));
  const setCompanyCountryState = (value: SetStateAction<string | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyCountry: typeof value === 'function' ? value(prev.companyCountry) : value,
    }));
  const setCompanyWebsiteState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyWebsite: typeof value === 'function' ? value(prev.companyWebsite) : value,
    }));
  const setIbanState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      iban: typeof value === 'function' ? value(prev.iban) : value,
    }));
  const setAccountHolderState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      accountHolder: typeof value === 'function' ? value(prev.accountHolder) : value,
    }));
  const setSelectedSkillsState = (value: SetStateAction<{ [key: string]: string[] | null }>) =>
    setRegistrationState(prev => ({
      ...prev,
      selectedSkills: typeof value === 'function' ? value(prev.selectedSkills!) : value,
    })); // prev.selectedSkills! da es jetzt nicht mehr undefined ist
  const setSelectedHandwerkSkillsState = (value: SetStateAction<string[] | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      selectedHandwerkSkills:
        typeof value === 'function' ? value(prev.selectedHandwerkSkills) : value,
    }));
  const setSelectedHaushaltServicesState = (value: SetStateAction<string[] | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      selectedHaushaltServices:
        typeof value === 'function' ? value(prev.selectedHaushaltServices) : value,
    }));
  const setProfilePictureFileState = (value: SetStateAction<File | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      profilePictureFile: typeof value === 'function' ? value(prev.profilePictureFile) : value,
    }));
  const setBusinessLicenseFileState = (value: SetStateAction<File | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      businessLicenseFile: typeof value === 'function' ? value(prev.businessLicenseFile) : value,
    }));
  const setMasterCraftsmanCertificateFileState = (value: SetStateAction<File | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      masterCraftsmanCertificateFile:
        typeof value === 'function' ? value(prev.masterCraftsmanCertificateFile) : value,
    }));
  const setIdentityFrontFileState = (value: SetStateAction<File | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      identityFrontFile: typeof value === 'function' ? value(prev.identityFrontFile) : value,
    }));
  const setIdentityBackFileState = (value: SetStateAction<File | null | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      identityBackFile: typeof value === 'function' ? value(prev.identityBackFile) : value,
    }));
  const setCompanyRegisterState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      companyRegister: typeof value === 'function' ? value(prev.companyRegister) : value,
    }));
  const setHourlyRateState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      hourlyRate: typeof value === 'function' ? value(prev.hourlyRate) : value,
    }));
  const setTaxNumberState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      taxNumber: typeof value === 'function' ? value(prev.taxNumber) : value,
    }));
  const setVatIdState = (value: SetStateAction<string | undefined>) =>
    setRegistrationState(prev => ({
      ...prev,
      vatId: typeof value === 'function' ? value(prev.vatId) : value,
    }));
  const setLatState = (value: SetStateAction<number | null>) =>
    setRegistrationState(prev => ({
      ...prev,
      lat: typeof value === 'function' ? value(prev.lat) : value,
    }));
  const setLngState = (value: SetStateAction<number | null>) =>
    setRegistrationState(prev => ({
      ...prev,
      lng: typeof value === 'function' ? value(prev.lng) : value,
    }));
  const setLatLngPolygonState = (
    value: SetStateAction<google.maps.LatLngLiteral[] | null | undefined>
  ) =>
    setRegistrationState(prev => ({
      ...prev,
      latLngPolygon: typeof value === 'function' ? value(prev.latLngPolygon) : value,
    }));
  const setRadiusKmState = (value: SetStateAction<number | null>) =>
    setRegistrationState(prev => ({
      ...prev,
      radiusKm: typeof value === 'function' ? value(prev.radiusKm) : value,
    }));

  const resetRegistrationData = () => {
    setRegistrationState(getInitialState());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('registrationData');
      localStorage.removeItem('subcategoryFormData'); // 🔧 Lösche auch subcategoryFormData
    }
  };

  const contextValue: RegistrationContextType = {
    ...registrationState,
    setStep: setStepState,
    setCustomerType: setCustomerTypeState,
    setSelectedCategory: setSelectedCategoryState,
    setSelectedSubcategory: setSelectedSubcategoryState,
    setDescription: setDescriptionState,
    setSubcategoryData: setSubcategoryDataState,
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
    <RegistrationContext.Provider value={contextValue}>{children}</RegistrationContext.Provider>
  );
};

export const useRegistration = (): RegistrationContextType => {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error('useRegistration muss innerhalb eines RegistrationProviders verwendet werden');
  }
  return context;
};
