// Gemeinsame Typen für Company Profile Management

export interface EditableCompanyProfile {
  uid: string;
  username: string;
  displayName: string;
  companyName: string;
  photoURL: string;
  companyLogo: string;
  description: string;
  country: string;
  city: string;
  postalCode?: string;
  street?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  hourlyRate: number;
  portfolio: PortfolioItem[];
  languages: { language: string; proficiency: string }[] | string[];
  skills: string[];
  education: { school: string; degree: string; year: string }[];
  certifications: { name: string; from: string; year: string }[];
  // Öffentliches Profil Features
  publicDescription: string;
  specialties: string[];
  servicePackages: ServicePackage[];
  workingHours: WorkingHours[];
  instantBooking: boolean;
  responseTimeGuarantee: number;
  faqs: FAQ[];
  profileBannerImage: string;
  businessLicense: string;

  // Additional fields from database - for backward compatibility and data access
  personalCountry?: string;
  personalCity?: string;
  personalStreet?: string;
  personalPostalCode?: string;
  lat?: number;
  lng?: number;
  step1?: any;
  step2?: any;
  step3?: any;
  step4?: any;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  completedAt: string;
}

export interface ServicePackage {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  features: string[];
}

export interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface ProfileTabProps {
  profile: EditableCompanyProfile;
  setProfile: React.Dispatch<React.SetStateAction<EditableCompanyProfile | null>>;
}
