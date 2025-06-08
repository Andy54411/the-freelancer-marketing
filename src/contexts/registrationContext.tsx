'use client'

import React, { useState, createContext, useContext, Dispatch, SetStateAction } from 'react';

interface RegistrationContextType {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  companyName: string;
  setCompanyName: Dispatch<SetStateAction<string>>;
  legalForm: string | null;
  setLegalForm: Dispatch<SetStateAction<string | null>>;
  firstName: string;
  setFirstName: Dispatch<SetStateAction<string>>;
  lastName: string;
  setLastName: Dispatch<SetStateAction<string>>;
  street: string;
  setStreet: Dispatch<SetStateAction<string>>;
  houseNumber: string;
  setHouseNumber: Dispatch<SetStateAction<string>>;
  postalCode: string;
  setPostalCode: Dispatch<SetStateAction<string>>;
  city: string;
  setCity: Dispatch<SetStateAction<string>>;
  country: string | null;
  setCountry: Dispatch<SetStateAction<string | null>>;
  phoneNumber: string;
  setPhoneNumber: Dispatch<SetStateAction<string>>;
  iban: string;
  setIban: Dispatch<SetStateAction<string>>;
  accountHolder: string;
  setAccountHolder: Dispatch<SetStateAction<string>>;
  selectedSkills: { [hauptkategorie: string]: string[] | null };
  setSelectedSkills: Dispatch<SetStateAction<{ [hauptkategorie: string]: string[] | null }>>;
  selectedHandwerkSkills: string[] | null;
  setSelectedHandwerkSkills: Dispatch<SetStateAction<string[] | null>>;
  selectedHaushaltServices: string[] | null;
  setSelectedHaushaltServices: Dispatch<SetStateAction<string[] | null>>;
  profilePictureFile: File | null;
  setProfilePictureFile: Dispatch<SetStateAction<File | null>>;
  businessLicenseFile: File | null;
  setBusinessLicenseFile: Dispatch<SetStateAction<File | null>>;
  masterCraftsmanCertificateFile: File | null;
  setMasterCraftsmanCertificateFile: Dispatch<SetStateAction<File | null>>;
  hourlyRate: string;
  setHourlyRate: Dispatch<SetStateAction<string>>;
  taxNumber: string;
  setTaxNumber: Dispatch<SetStateAction<string>>;
  vatId: string;
  setVatId: Dispatch<SetStateAction<string>>;
  selectedSubcategory: string | null;
  setSelectedSubcategory: Dispatch<SetStateAction<string | null>>;

  lat: number | null;
  setLat: Dispatch<SetStateAction<number | null>>;
  lng: number | null;
  setLng: Dispatch<SetStateAction<number | null>>;

  latLngPolygon: google.maps.LatLngLiteral[] | null;
  setLatLngPolygon: Dispatch<SetStateAction<google.maps.LatLngLiteral[] | null>>;

  radiusKm: number;
  setRadiusKm: Dispatch<SetStateAction<number>>;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [legalForm, setLegalForm] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [iban, setIban] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<{ [key: string]: string[] | null }>({});
  const [selectedHandwerkSkills, setSelectedHandwerkSkills] = useState<string[] | null>(null);
  const [selectedHaushaltServices, setSelectedHaushaltServices] = useState<string[] | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [masterCraftsmanCertificateFile, setMasterCraftsmanCertificateFile] = useState<File | null>(null);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [taxNumber, setTaxNumber] = useState<string>('');
  const [vatId, setVatId] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [latLngPolygon, setLatLngPolygon] = useState<google.maps.LatLngLiteral[] | null>(null);

  const [radiusKm, setRadiusKm] = useState<number>(30);

  return (
    <RegistrationContext.Provider
      value={{
        step,
        setStep,
        email,
        setEmail,
        password,
        setPassword,
        companyName,
        setCompanyName,
        legalForm,
        setLegalForm,
        firstName,
        setFirstName,
        lastName,
        setLastName,
        street,
        setStreet,
        houseNumber,
        setHouseNumber,
        postalCode,
        setPostalCode,
        city,
        setCity,
        country,
        setCountry,
        phoneNumber,
        setPhoneNumber,
        iban,
        setIban,
        accountHolder,
        setAccountHolder,
        selectedSkills,
        setSelectedSkills,
        selectedHandwerkSkills,
        setSelectedHandwerkSkills,
        selectedHaushaltServices,
        setSelectedHaushaltServices,
        profilePictureFile,
        setProfilePictureFile,
        businessLicenseFile,
        setBusinessLicenseFile,
        masterCraftsmanCertificateFile,
        setMasterCraftsmanCertificateFile,
        hourlyRate,
        setHourlyRate,
        taxNumber,
        setTaxNumber,
        vatId,
        setVatId,
        selectedSubcategory,
        setSelectedSubcategory,

        lat,
        setLat,
        lng,
        setLng,

        latLngPolygon,
        setLatLngPolygon,

        radiusKm,
        setRadiusKm,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used within a RegistrationProvider");
  }
  return context;
};
