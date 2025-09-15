# TASKILO FIREBASE COLLECTIONS - VOLLSTÄNDIGE DATENANALYSE

## 🔥 **COMPANIES COLLECTION** (Verfügbare Felder)

### **Basis-Unternehmensdaten**
- ✅ `companyName`: "Mietkoch Andy"
- ✅ `contactEmail`: "a.staudinger32@icloud.com" 
- ✅ `companyPhoneNumber`: "" (kann leer sein!)
- ✅ `companyWebsite`: null (kann null sein!)
- ✅ `description`: "Leidenschaft, die man schmeckt! Als Ihr privater Koch..."

### **Adressdaten**
- ✅ `companyStreet`: "Siedlung am Wald"
- ✅ `companyHouseNumber`: "6"
- ✅ `companyCity`: "Sellin"
- ✅ `companyPostalCode`: "18586"
- ✅ `companyCountry`: "DE"

### **Bankdaten** (`bankDetails` Objekt)
- ✅ `bankDetails.iban`: "DE89370400440532013000"
- ✅ `bankDetails.bic`: "DETESTEE"
- ✅ `bankDetails.bankName`: "" (kann leer sein!)
- ✅ `accountHolder`: "Andy Staudinger"

### **Steuer & Registrierung**
- ✅ `vatId`: (vorhanden in anderen Bereichen)
- ✅ `taxNumber`: (vorhanden in anderen Bereichen)
- ✅ `defaultTaxRate`: "19"
- ✅ `companyRegister`: "" (handelsregister - kann leer sein!)
- ✅ `districtCourt`: ""

### **E-Rechnung & Zahlungsbedingungen**
- ✅ `eInvoiceSettings.defaultFormat`: "zugferd"
- ✅ `defaultPaymentTerms.text`: "Zahlbar binnen 7 Tagen ohne Abzug"
- ✅ `defaultPaymentTerms.days`: 7
- ✅ `defaultPaymentTerms.skontoEnabled`: true

---

## 👥 **USERS COLLECTION** (Verfügbare Felder)

### **Basis-Benutzerdaten**
- ✅ `displayName`: "Andy Staudinger_demo"
- ✅ `email`: "test42@test.de"
- ✅ `phone`: null (kann null sein!)

### **Profil-Daten** (`profile` Objekt)
- ✅ `profile.firstName`: "Andy"
- ✅ `profile.lastName`: "Staudinger_demo"
- ✅ `profile.phoneNumber`: "+4912345678990"
- ✅ `profile.street`: "Testorf, Wangels, Deutschland"
- ✅ `profile.city`: "Wangels"
- ✅ `profile.postalCode`: "23758"
- ✅ `profile.country`: "DE"
- ✅ `profile.dateOfBirth`: 1. Februar 1984
- ✅ `profile.bio`: "test"
- ✅ `profile.user_type`: "kunde"

---

## 🛒 **CUSTOMERS COLLECTION** (Aus Code-Analyse)

### **Kunden-Grunddaten**
- ✅ `customerNumber`: "KD-001"
- ✅ `name`: Kundenname
- ✅ `email`: Kunden-E-Mail
- ✅ `phone`: Kunden-Telefon ⚠️ **VERFÜGBAR aber hardcoded leer!**

### **Adressdaten**
- ✅ `address`: Legacy-Adresse
- ✅ `street`: Strukturierte Straße
- ✅ `city`: Stadt
- ✅ `postalCode`: PLZ
- ✅ `country`: Land

### **Steuer & Business**
- ✅ `taxNumber`: Steuernummer
- ✅ `vatId`: Umsatzsteuer-ID
- ✅ `vatValidated`: VAT-Validierung (boolean)
- ✅ `isSupplier`: Lieferant-Flag (boolean)

### **Kontaktpersonen** (`contactPersons` Array)
- ✅ `contactPersons[].firstName`: Vorname
- ✅ `contactPersons[].lastName`: Nachname
- ✅ `contactPersons[].email`: E-Mail
- ✅ `contactPersons[].phone`: Telefon ⚠️ **VERFÜGBAR!**
- ✅ `contactPersons[].position`: Position
- ✅ `contactPersons[].department`: Abteilung
- ✅ `contactPersons[].isPrimary`: Hauptkontakt (boolean)

### **Statistiken**
- ✅ `totalInvoices`: Anzahl Rechnungen
- ✅ `totalAmount`: Gesamtumsatz
- ✅ `createdAt`: Erstellungsdatum
- ✅ `companyId`: Zugeordnetes Unternehmen

---

## ✅ **PLATZHALTER-BUGS BEHOBEN!**

### **1. KUNDENTELEFON Bug - BEHOBEN!** ✅
```typescript
// VORHER (falsch):
customerPhone: '', // 🚨 HARDCODED LEER!

// NACHHER (korrekt):
customerPhone: selectedCustomer?.phone || '', // ✅ BEHOBEN!
```

### **2. FIRMEN-DATEN Bug - BEHOBEN!** ✅
```typescript
// VORHER (falsch):
data.companyPhone || '' // 🚨 company ist undefined!

// NACHHER (korrekt):
- companies.companyPhoneNumber ✅ GELADEN
- companies.contactEmail ✅ GELADEN
- companies.companyName ✅ GELADEN
- companies.bankDetails.* ✅ GELADEN
```

### **3. ZENTRALE PLATZHALTER-ENGINE ERSTELLT!** ✅
```typescript
// NEUE ARCHITEKTUR:
- /src/utils/placeholders/types.ts ✅
- /src/utils/placeholders/categories/ ✅
- /src/utils/placeholders/placeholderEngine.ts ✅
- Alias-System für Namen-Standardisierung ✅
- 26+ erweiterte Datum-Platzhalter ✅
```

---

## 💡 **KORREKTUR-MAPPING - ALLE BEHOBEN!**

### **Platzhalter Status-Update:**

| Platzhalter | Alte Implementation | Neue Implementation | Status |
|-------------|--------------------|--------------------|--------|
| `[%KUNDENTELEFON%]` | ❌ `''` hardcoded | ✅ `selectedCustomer.phone` | ✅ **BEHOBEN** |
| `[%FIRMENNAME%]` | ❌ `company.companyName` (undefined) | ✅ `companies.companyName` | ✅ **BEHOBEN** |
| `[%FIRMENTELEFON%]` | ❌ `company.phoneNumber` (undefined) | ✅ `companies.companyPhoneNumber` | ✅ **BEHOBEN** |
| `[%FIRMENEMAIL%]` | ❌ `company.email` (undefined) | ✅ `companies.contactEmail` | ✅ **BEHOBEN** |
| `[%FIRMENWEBSITE%]` | ❌ `company.website` (undefined) | ✅ `companies.companyWebsite` | ✅ **BEHOBEN** |
| `[%FIRMENADRESSE%]` | ❌ Nicht implementiert | ✅ Strukturierte Adresse | ✅ **BEHOBEN** |
| `[%BEARBEITER%]` | ❌ Nicht implementiert | ✅ `users.profile.firstName + lastName` | ✅ **BEHOBEN** |
| `[%SACHBEARBEITER%]` | ❌ Nicht implementiert | ✅ `users.displayName` | ✅ **BEHOBEN** |
| `[%HANDELSREGISTER%]` | ❌ Feld fehlt | ✅ `companies.companyRegister` | ✅ **BEHOBEN** |

### **Neue Erweiterte Datum-Platzhalter:**
- ✅ `[%HEUTE_ISO%]`, `[%MORGEN%]`, `[%GESTERN%]`
- ✅ `[%WOCHENTAG%]`, `[%MONAT_NAME%]`, `[%KALENDERWOCHE%]`
- ✅ `[%QUARTAL%]`, `[%QUARTAL_START%]`, `[%QUARTAL_ENDE%]`
- ✅ `[%JAHR_LETZTE_2_STELLEN%]`, `[%MONAT_KURZ%]`
- ✅ **22+ weitere** erweiterte Datum-Platzhalter

---

## 🎯 **IMPLEMENTIERUNGS-ERFOLG**

### **ALLE KRITISCHEN BUGS BEHOBEN:** ✅
1. **customerPhone**: ✅ `selectedCustomer?.phone` implementiert
2. **Company Loading**: ✅ Companies-Collection korrekt geladen
3. **Firmen-Platzhalter**: ✅ Alle Firmen-Daten verfügbar
4. **Bank-Details**: ✅ `companies.bankDetails.*` funktional

### **ZENTRALE ARCHITEKTUR ERSTELLT:** ✅
1. **Modulare Struktur**: ✅ Kategorisierte Platzhalter-Module
2. **TypeScript-Sicherheit**: ✅ Vollständige Type-Definitionen
3. **Alias-System**: ✅ Namen-Standardisierung implementiert
4. **Erweiterte Logik**: ✅ 26+ neue Datum-Platzhalter

### **QUALITÄTSSICHERUNG:** ✅
1. **TypeScript-Errors**: ✅ Alle behoben
2. **User-Testing**: ✅ Funktionalität bestätigt
3. **Zentrale Engine**: ✅ Für alle Dokumenttypen vorbereitet

**FAZIT: 100% der kritischen Platzhalter-Bugs wurden systematisch behoben! Zentrale Engine für zukünftige Erweiterungen implementiert.** 🎯