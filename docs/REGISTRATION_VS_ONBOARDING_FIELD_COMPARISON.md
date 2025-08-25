# REGISTRATION VS ONBOARDING FIELD COMPARISON

## KRITISCHE PROBLEME IDENTIFIZIERT:
- **MASSIVE FELDDUPLIKATION** zwischen Registration und Onboarding
- **INKONSISTENTE FELDNAMEN** und Datenstrukturen
- **REDUNDANTE DATENSPEICHERUNG** verursacht Firebase 1MB Limit-Überschreitung

---

## REGISTRATION SYSTEM FELDER (Company Registration - 5 Steps)

### 📋 STEP 1 - Über Sie (page.tsx)
1. **firstName** - string (Vorname)
2. **lastName** - string (Nachname) 
3. **email** - string (E-Mail)
4. **password** - string (Passwort)
5. **confirmPassword** - string (Passwort bestätigen) - NICHT GESPEICHERT
6. **dateOfBirth** - string (Geburtsdatum)
7. **phoneCountryCode** - string (Ländervorwahl, default: +49)
8. **phoneNumber** - string (Telefonnummer)
9. **isManagingDirectorOwner** - boolean (Ist Geschäftsführer/Inhaber)
10. **agreeTerms** - boolean (AGB akzeptiert) - NICHT GESPEICHERT

### 📍 STEP 2 - Firmensitz & Einsatzgebiet (step2/page.tsx)
11. **companyName** - string (Firmenname)
12. **companyStreet** - string (Straße)
13. **companyHouseNumber** - string (Hausnummer)
14. **companyPostalCode** - string (PLZ)
15. **companyCity** - string (Stadt)
16. **companyCountry** - string (Land, default: DE)
17. **radiusKm** - number (Einsatzradius in km, default: 30)
18. **lat** - number (Breitengrad)
19. **lng** - number (Längengrad)

### 📄 STEP 3 - Profil & Nachweise (step3/page.tsx)
20. **profilePictureFile** - File (Profilbild)
21. **businessLicenseFile** - File (Gewerbeschein)
22. **masterCraftsmanCertificateFile** - File (Meisterbrief)
23. **hourlyRate** - number (Stundensatz)
24. **legalForm** - string (Rechtsform aus vordefinierter Liste)
25. **companyRegister** - string (Handelsregisternummer)
26. **taxNumber** - string (Steuernummer)
27. **vatId** - string (USt-IdNr.)

### 🛠️ STEP 4 - Fähigkeiten (step4/page.tsx)
28. **selectedSkills** - string[] (Ausgewählte Fähigkeiten/Kategorien)
29. **selectedSubcategories** - string[] (Ausgewählte Unterkategorien)

### 💳 STEP 5 - Abschluss & Verifizierung (step5/page.tsx)
30. **identityFrontFile** - File (Ausweisvorderseite)
31. **identityBackFile** - File (Ausweisrückseite)
32. **iban** - string (IBAN)
33. **accountHolder** - string (Kontoinhaber)
34. **stripeAccountId** - string (Stripe Connect Account ID)
35. **stripeOnboardingComplete** - boolean (Stripe Onboarding abgeschlossen)

**REGISTRATION GESAMT: 35 Felder**

---

## ONBOARDING SYSTEM FELDER (Company Onboarding - 5 Steps)

### Schritt 1 - Unternehmensdaten (18 Felder)
1. companyName - string
2. legalForm - string
3. foundingYear - number
4. employeeCount - number
5. address - string **DUPLIKATION!**
6. street - string **DUPLIKATION!**
7. houseNumber - string
8. postalCode - string
9. city - string
10. country - string
11. website - string
12. phoneNumber - string
13. email - string **DUPLIKATION!**
14. description - string
15. taxNumber - string **DUPLIKATION!**
16. vatNumber - string
17. commercialRegister - string
18. industry - string

### Schritt 2 - Geschäftsführer/Manager Daten (10 Felder)
19. managerData.firstName - string **DUPLIKATION!**
20. managerData.lastName - string **DUPLIKATION!**
21. managerData.email - string **DUPLIKATION!**
22. managerData.phoneNumber - string **DUPLIKATION!**
23. managerData.address - string **DUPLIKATION!**
24. managerData.street - string **DUPLIKATION!**
25. managerData.dateOfBirth - string **DUPLIKATION!**
26. managerData.position - string
27. managerData.nationality - string
28. managerData.socialSecurityNumber - string

### Schritt 3 - Bankdaten & Finanzen (12 Felder)
29. bankDetails.iban - string **DUPLIKATION!**
30. bankDetails.bic - string
31. bankDetails.bankName - string
32. bankDetails.accountHolder - string **DUPLIKATION!**
33. paymentMethods - string[]
34. creditLimit - number
35. currency - string
36. hourlyRate - number **DUPLIKATION!**
37. basePrice - number **DUPLIKATION mit hourlyRate!**
38. taxRate - number
39. invoiceTemplate - string
40. paymentTerms - string

### Schritt 4 - Services & Kategorien (15 Felder)
41. selectedCategories - string[] **DUPLIKATION mit selectedSkills!**
42. selectedSubcategories - string[] **DUPLIKATION!**
43. serviceDescription - string
44. serviceAreas - string[]
45. workingHours.monday - object
46. workingHours.tuesday - object
47. workingHours.wednesday - object
48. workingHours.thursday - object
49. workingHours.friday - object
50. workingHours.saturday - object
51. workingHours.sunday - object
52. emergencyService - boolean
53. minimumOrderValue - number
54. certificates - string[]
55. qualifications - string[]

### Schritt 5 - Dokumente & Zertifikate (1 Feld)
56. documentsCompleted - boolean

**ONBOARDING GESAMT: 56 Felder**

---

## 🚨 KRITISCHE FELDKONFLIKTE & DUPLIKATIONEN

### IDENTISCHE FELDER (Direkte Duplikation):
1. **email** - Registration.email vs Onboarding.email vs managerData.email
2. **phoneNumber** - Registration.phoneNumber vs Onboarding.phoneNumber vs managerData.phoneNumber
3. **firstName** - Registration.firstName vs managerData.firstName
4. **lastName** - Registration.lastName vs managerData.lastName
5. **dateOfBirth** - Registration.dateOfBirth vs managerData.dateOfBirth
6. **companyName** - Registration.companyName vs Onboarding.companyName
7. **taxNumber** - Registration.taxNumber vs Onboarding.taxNumber
8. **iban** - Registration.iban vs bankDetails.iban
9. **accountHolder** - Registration.accountHolder vs bankDetails.accountHolder
10. **selectedSkills/selectedCategories** - Registration.selectedSkills vs Onboarding.selectedCategories
11. **selectedSubcategories** - Beide Systeme haben identische Felder
12. **legalForm** - Registration.legalForm vs Onboarding.legalForm
13. **hourlyRate** - Registration.hourlyRate vs Onboarding.hourlyRate vs basePrice

### ADRESS-DUPLIKATIONEN:
- **Registration**: companyStreet, companyHouseNumber, companyPostalCode, companyCity, companyCountry
- **Onboarding**: address, street, houseNumber, postalCode, city, country
- **Onboarding Manager**: managerData.address, managerData.street

### REDUNDANTE KONZEPTE:
- **hourlyRate** vs **basePrice** (Onboarding) - GLEICHE FUNKTION!
- **companyRegister** vs **commercialRegister** - GLEICHE FUNKTION!
- **vatId** vs **vatNumber** - GLEICHE FUNKTION!

---

## 💡 HARMONISIERUNGS-STRATEGIE

### 1. MASTER FELDER DEFINIEREN (Registration als Basis):
- **Registration System** → Primäre Datenquelle
- **Onboarding System** → Erweiterte Geschäftsdaten
- **KEINE DUPLIKATION** zwischen beiden Systemen

### 2. FELD-MAPPING PLAN:

#### ELIMINIEREN (Aus Onboarding entfernen):
- ❌ `email` (verwende Registration.email)
- ❌ `phoneNumber` (verwende Registration.phoneNumber)
- ❌ `managerData.firstName` (verwende Registration.firstName)
- ❌ `managerData.lastName` (verwende Registration.lastName)
- ❌ `managerData.email` (verwende Registration.email)
- ❌ `managerData.phoneNumber` (verwende Registration.phoneNumber)
- ❌ `managerData.dateOfBirth` (verwende Registration.dateOfBirth)
- ❌ `companyName` (verwende Registration.companyName)
- ❌ `legalForm` (verwende Registration.legalForm)
- ❌ `taxNumber` (verwende Registration.taxNumber)
- ❌ `bankDetails.iban` (verwende Registration.iban)
- ❌ `bankDetails.accountHolder` (verwende Registration.accountHolder)
- ❌ `selectedCategories` (verwende Registration.selectedSkills)
- ❌ `selectedSubcategories` (verwende Registration.selectedSubcategories)
- ❌ `basePrice` (verwende Registration.hourlyRate)

#### UMBENENNEN (Konsistente Namensgebung):
- `vatNumber` → `vatId` (wie in Registration)
- `commercialRegister` → `companyRegister` (wie in Registration)

#### ADRESS-STRUKTUR VEREINHEITLICHEN:
```typescript
// MASTER ADRESSE (Registration)
interface CompanyAddress {
  street: string;           // Registration.companyStreet
  houseNumber: string;      // Registration.companyHouseNumber
  postalCode: string;       // Registration.companyPostalCode
  city: string;             // Registration.companyCity
  country: string;          // Registration.companyCountry
  lat?: number;             // Registration.lat
  lng?: number;             // Registration.lng
}

// ENTFERNEN aus Onboarding:
// ❌ address, street, houseNumber, postalCode, city, country
// ❌ managerData.address, managerData.street
```

### 3. REDUZIERTE ONBOARDING FELDER (Nach Bereinigung):

#### Schritt 1 - Erweiterte Unternehmensdaten (5 Felder):
1. foundingYear - number
2. employeeCount - number  
3. website - string
4. description - string
5. industry - string

#### Schritt 2 - Manager Zusatzdaten (3 Felder):
1. managerData.position - string
2. managerData.nationality - string
3. managerData.socialSecurityNumber - string

#### Schritt 3 - Erweiterte Finanzdaten (7 Felder):
1. bankDetails.bic - string
2. bankDetails.bankName - string
3. paymentMethods - string[]
4. creditLimit - number
5. currency - string
6. taxRate - number
7. invoiceTemplate - string
8. paymentTerms - string

#### Schritt 4 - Service Details (10 Felder):
1. serviceDescription - string
2. serviceAreas - string[]
3. workingHours - object (7 Tage kombiniert als 1 Feld)
4. emergencyService - boolean
5. minimumOrderValue - number
6. certificates - string[]
7. qualifications - string[]

#### Schritt 5 - Finalisierung (1 Feld):
1. documentsCompleted - boolean

**REDUZIERTE ONBOARDING FELDER: 26 Felder (statt 56)**
**REDUZIERUNG: 30 Felder eliminiert (-53%)**

---

## 🎯 SOFORTIGE MASSNAHMEN

### 1. KRITISCHE REPARATUR:
- **Entferne doppelte Felder** aus Onboarding-Komponenten
- **Verwende Registration-Daten** in Onboarding-Anzeige
- **Reduziere Firestore Document Size** um >50%

### 2. DATENSTRUKTUR OPTIMIERUNG:
```typescript
// STATT:
userData = {
  ...registrationData,        // 35 Felder
  ...onboardingData          // 56 Felder (30 Duplikate!)
}

// VERWENDE:
userData = {
  ...registrationData,        // 35 Felder
  ...cleanOnboardingData     // 26 Felder (keine Duplikate)
}
```

### 3. IMPLEMENT FIELD MAPPING:
```typescript
// Onboarding-Komponenten verwenden Registration-Daten
const OnboardingStep1 = () => {
  const { registration } = useRegistration();
  
  // VERWENDE vorhandene Daten:
  const companyName = registration.companyName;  // NICHT: localCompanyName
  const email = registration.email;              // NICHT: localEmail
  const legalForm = registration.legalForm;      // NICHT: localLegalForm
  
  return (
    <input 
      value={companyName} 
      onChange={handleCompanyNameChange}
      readOnly // Bereits in Registration erfasst
    />
  );
};
```

---

## 📊 EINSPARUNGEN DURCH HARMONISIERUNG

- **Feld-Reduktion**: 56 → 26 Felder (-53%)
- **Document Size Reduktion**: ~50-60% kleiner
- **Entwicklungseffizienz**: Keine doppelte Wartung
- **Datenintegrität**: Keine Konflikte zwischen Systemen
- **User Experience**: Keine doppelte Dateneingabe

---

## ⚠️ KRITISCHE IMPLEMENTIERUNG ERFORDERLICH

**PROBLEM**: Firebase Document Size Limit 1MB wird durch Feldduplikation überschritten
**LÖSUNG**: Sofortige Harmonisierung und Feld-Eliminierung erforderlich
**TIMELINE**: CRITICAL - Blockiert Live Company Onboarding

Diese Analyse zeigt die MASSIVE Duplikation zwischen Registration und Onboarding-Systemen. Die Harmonisierung ist KRITISCH für die Lösung des Firebase Document Size Problems.
