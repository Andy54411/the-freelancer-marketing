# 🔥 Firebase Users Collection - Harmonisierte Datenstruktur

> **Version:** 2.0  
> **Datum:** 25. August 2025  
> **Status:** Live Production - Harmonisiert  

## 📊 **Users Collection Schema**

### 🏢 **Collection:** `/users/{uid}`

Jedes User-Dokument enthält sowohl **Registration Data** (Master) als auch **Onboarding Data** (Erweiterungen) in einem einzigen Dokument.

---

## 📋 **REGISTRATION DATA (Master - 35 Felder)**

### 👤 **Basis User-Daten**
```typescript
interface RegistrationData {
  // Authentifizierung
  uid: string;
  email: string;
  emailVerified: boolean;
  createdAt: Timestamp;
  
  // Firmen-Grunddaten
  companyName: string;
  legalForm: string;
  taxNumber?: string;
  vatId?: string;
  
  // Adresse
  companyStreet: string;
  companyCity: string;
  companyPostalCode: string;
  companyCountry: string;
  
  // Kontakt
  companyPhone: string;
  companyWebsite?: string;
  
  // Manager-Daten
  firstName: string;
  lastName: string;
  managerPhone: string;
  dateOfBirth: string;
  managerStreet: string;
  managerCity: string;
  managerPostalCode: string;
  managerCountry: string;
  
  // Banking
  iban: string;
  accountHolder: string;
  
  // Business
  selectedCategory: string;
  selectedSubcategory: string;
  hourlyRate: number;
  
  // Location
  lat: number;
  lng: number;
  radiusKm: number;
}
```

---

## ✨ **ONBOARDING DATA (Erweiterungen - 13 Felder)**

### 🏢 **Step 1: Erweiterte Unternehmensdaten (4 Felder)**
```typescript
interface OnboardingStep1 {
  // Geschäftsmodell
  businessType: 'b2b' | 'b2c' | 'hybrid';
  employees: string; // "1-10", "11-50", etc.
  website?: string; // Zusätzliche Website
  description?: string; // Interne Firmenbeschreibung
  
  // Manager Zusatzdaten
  managerPosition?: string; // "Geschäftsführer", "CEO", etc.
  managerNationality?: string; // "deutsch", "österreichisch", etc.
}
```

### 💰 **Step 2: Steuerliche Zusatzeinstellungen (4 Felder)**
```typescript
interface OnboardingStep2 {
  kleinunternehmer: 'ja' | 'nein';
  profitMethod: 'euer' | 'bilanz';
  priceInput: 'brutto' | 'netto';
  taxRate: string; // "19", "7", etc.
}
```

### 🎨 **Step 3: Profil & Service-Details (8 Felder)**
```typescript
interface OnboardingStep3 {
  // Branding
  companyLogo?: string;
  profileBannerImage?: string;
  
  // Service-Info
  publicDescription?: string;
  instantBooking?: boolean;
  responseTimeGuarantee?: number; // Stunden
  
  // Skills & Portfolio
  skills?: string[];
  specialties?: string[];
  languages?: Array<{language: string, proficiency: string}>;
  servicePackages?: Array<{title: string, description: string, price: number, duration: string}>;
  portfolio?: Array<{title: string, description: string, imageUrl: string}>;
  faqs?: Array<{question: string, answer: string}>;
}
```

### 📍 **Step 4: Service-Bereich & Verfügbarkeit (5 Felder)**
```typescript
interface OnboardingStep4 {
  // Service-Bereich
  serviceAreas?: string[]; // ["München", "Augsburg"]
  
  // Verfügbarkeit
  availabilityType: 'flexible' | 'fixed' | 'on-demand';
  advanceBookingHours: number;
  
  // Reise & Logistik
  travelCosts: boolean;
  travelCostPerKm?: number;
  maxTravelDistance: number;
}
```

### ✅ **Step 5: Finale Bestätigung (1 Feld)**
```typescript
interface OnboardingStep5 {
  documentsCompleted: boolean;
}
```

---

## 🔄 **ONBOARDING METADATA**

```typescript
interface OnboardingMetadata {
  // Progress Tracking
  onboardingCurrentStep: string;
  onboardingStepData: Record<number, any>; // Steps 1-5
  onboardingCompletionPercentage: number;
  
  // Status
  onboardingCompleted: boolean;
  onboardingStartedAt: Timestamp;
  onboardingCompletedAt?: Timestamp;
  onboardingLastUpdated: Timestamp;
  
  // Profile Status
  profileComplete: boolean;
  profileStatus: 'pending_review' | 'approved' | 'rejected';
}
```

---

## 📊 **COMPLETE USER DOCUMENT STRUCTURE**

```typescript
interface UserDocument {
  // === REGISTRATION DATA (Master - 35 Felder) ===
  uid: string;
  email: string;
  emailVerified: boolean;
  createdAt: Timestamp;
  companyName: string;
  legalForm: string;
  taxNumber?: string;
  vatId?: string;
  companyStreet: string;
  companyCity: string;
  companyPostalCode: string;
  companyCountry: string;
  companyPhone: string;
  companyWebsite?: string;
  firstName: string;
  lastName: string;
  managerPhone: string;
  dateOfBirth: string;
  managerStreet: string;
  managerCity: string;
  managerPostalCode: string;
  managerCountry: string;
  iban: string;
  accountHolder: string;
  selectedCategory: string;
  selectedSubcategory: string;
  hourlyRate: number;
  lat: number;
  lng: number;
  radiusKm: number;
  
  // === ONBOARDING EXTENSIONS (13 Felder) ===
  // Step 1: Erweiterte Unternehmensdaten
  businessType?: 'b2b' | 'b2c' | 'hybrid';
  employees?: string;
  website?: string;
  description?: string;
  managerPosition?: string;
  managerNationality?: string;
  
  // Step 2: Steuerliche Zusatzeinstellungen
  kleinunternehmer?: 'ja' | 'nein';
  profitMethod?: 'euer' | 'bilanz';
  priceInput?: 'brutto' | 'netto';
  taxRate?: string;
  
  // Step 3: Profil & Service-Details
  companyLogo?: string;
  profileBannerImage?: string;
  publicDescription?: string;
  instantBooking?: boolean;
  responseTimeGuarantee?: number;
  skills?: string[];
  specialties?: string[];
  languages?: Array<{language: string, proficiency: string}>;
  servicePackages?: Array<{title: string, description: string, price: number, duration: string}>;
  portfolio?: Array<{title: string, description: string, imageUrl: string}>;
  faqs?: Array<{question: string, answer: string}>;
  
  // Step 4: Service-Bereich & Verfügbarkeit
  serviceAreas?: string[];
  availabilityType?: 'flexible' | 'fixed' | 'on-demand';
  advanceBookingHours?: number;
  travelCosts?: boolean;
  travelCostPerKm?: number;
  maxTravelDistance?: number;
  
  // Step 5: Finale Bestätigung
  documentsCompleted?: boolean;
  
  // === ONBOARDING METADATA ===
  onboardingCurrentStep?: string;
  onboardingStepData?: Record<number, any>;
  onboardingCompletionPercentage?: number;
  onboardingCompleted?: boolean;
  onboardingStartedAt?: Timestamp;
  onboardingCompletedAt?: Timestamp;
  onboardingLastUpdated?: Timestamp;
  profileComplete?: boolean;
  profileStatus?: 'pending_review' | 'approved' | 'rejected';
}
```

---

## 🎯 **HARMONISIERUNGS-VORTEILE**

### ✅ **DATEN-EFFIZIENZ:**
- **Eine Collection**: Alle Daten in `/users/{uid}`
- **Keine Duplikate**: Registration = Master, Onboarding = Extensions
- **Optimierte Queries**: Kein JOIN zwischen Collections nötig
- **Document Size**: 48 Felder statt 91 (47% Einsparung)

### ✅ **ENTWICKLER-ERFAHRUNG:**
- **Single Source of Truth**: Ein Dokument für alle User-Daten
- **Typisierung**: Klare TypeScript Interfaces
- **API-Vereinfachung**: Ein GET für komplettes Profil
- **Konsistenz**: Keine Collection-übergreifende Synchronisation

### ✅ **PERFORMANCE:**
- **Weniger Firestore Reads**: Ein Document Read statt mehreren
- **Kleinere Documents**: 77% weniger Onboarding-Felder
- **Schnellere Queries**: Direkte Feldabfrage ohne Joins
- **Optimiertes Caching**: Ein Document im Cache

---

## 🔧 **API PATTERNS**

### **User-Daten laden:**
```typescript
// Komplettes User-Profil (Registration + Onboarding)
const userDoc = await getDoc(doc(db, 'users', uid));
const userData = userDoc.data() as UserDocument;
```

### **Onboarding-Update:**
```typescript
// Nur Onboarding-Extensions updaten
await updateDoc(doc(db, 'users', uid), {
  businessType: 'hybrid',
  employees: '1-10',
  onboardingCurrentStep: '2',
  onboardingLastUpdated: serverTimestamp(),
});
```

### **Registration-Daten schützen:**
```typescript
// Registration-Felder bleiben unverändert
// Nur Onboarding-Extensions werden geschrieben
// Keine Überschreibung von companyName, email, etc.
```

---

*📝 Letzte Aktualisierung: 25. August 2025*  
*🔗 Implementierung: `src/contexts/OnboardingContext.tsx`*  
*📊 Dokumentation: `docs/ONBOARDING_FIELDS_DOCUMENTATION.md`*
