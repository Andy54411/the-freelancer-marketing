# Taskilo Steuer-Compliance Systemanalyse

> **Analysedatum**: 9. Januar 2026
> **Letzte Aktualisierung**: 9. Januar 2026
> **Status**: ✅ Implementierung abgeschlossen

---

## Executive Summary

### Gesamtbewertung: ✅ STEUERKONFORM

| Bereich | Status | Priorität |
|---------|--------|-----------|
| GoBD-Konformität | ✅ Implementiert | - |
| Rechnungsstellung | ✅ Vollständig | - |
| DATEV-Auswertungen | ✅ BWA/SuSa/EÜR | - |
| Umsatzsteuer-Handling | ✅ Implementiert | - |
| Anlagenbuchhaltung (AfA) | ✅ Implementiert | - |
| TaxService Integration | ✅ Implementiert | - |
| Kleinunternehmer §19 | ✅ Implementiert | - |
| Gewerbesteuer | ⚠️ Manuell | NIEDRIG |
| Körperschaftsteuer | ⚠️ Manuell | NIEDRIG |

---

## IMPLEMENTIERTE FEATURES (9. Januar 2026)

### ✅ TaxService komplett neu implementiert

**Datei:** `src/services/taxService.ts` (~1084 Zeilen)

**Features:**
- UStVA-Berechnung aus echten Firestore-Daten (Rechnungen + Ausgaben)
- EÜR-Berechnung nach BMF-Anlage mit allen Kategorien
- GuV nach Gesamtkostenverfahren
- BWA mit monatlicher Analyse
- Integration mit Anlagenbuchhaltung für AfA-Werte
- GoBD-konforme Datenbasis (nur gesperrte Rechnungen)

**Geändert:**
- ~~USE_MOCK_DATA~~ → Alle Berechnungen aus echten Daten
- Company-Subcollections statt globale Collections
- Integration mit `fixedAssetService` für AfA

### ✅ Anlagenbuchhaltung (FixedAssetService)

**Datei:** `src/services/fixedAssetService.ts` (~645 Zeilen)

**Features:**
- Vollständige AfA-Berechnung nach §7 EStG
- Lineare + degressive Abschreibung
- GWG-Behandlung nach §6 Abs. 2 EStG (bis 800€ netto)
- Sammelposten nach §6 Abs. 2a EStG (250-1000€, 5 Jahre)
- BMF-konforme AfA-Tabelle (Nutzungsdauer nach Anlagekategorie)
- Anlagenveräußerung (Verkauf, Verschrottung, Spende)
- DATEV-Kontenzuordnung (SKR03/SKR04)
- GoBD-konforme Festschreibung

**AfA-Tabelle (Beispiele):**
| Kategorie | Nutzungsdauer | DATEV-Konto |
|-----------|---------------|-------------|
| Computer | 3 Jahre | 0420 |
| Büromöbel | 13 Jahre | 0410 |
| Fahrzeuge | 6 Jahre | 0320 |
| Maschinen | 10 Jahre | 0210 |

### ✅ Firestore-Infrastruktur

**Neue Indexes:** (`firestore.indexes.json`)
- `fixedAssets`: status + purchaseDate
- `fixedAssets`: category + purchaseDate
- `taxReports`: type + createdAt
- `taxReports`: year + createdAt
- `invoices`: invoiceDate + status
- `expenses`: expenseDate + status

**Neue Rules:** (`firestore.rules`)
- `/companies/{companyId}/taxReports/{reportId}`
- `/companies/{companyId}/taxSettings/{settingId}`
- `/companies/{companyId}/fixedAssets/{assetId}`

---

## 1. Vorhandene Module & Deren Status

### 1.1 BUCHHALTUNG (Hauptmodul)

#### ✅ Rechnungen (`src/app/dashboard/company/[uid]/finance/invoices/`)
- **Status**: Vollständig implementiert
- **GoBD**: `isLocked`, `gobdStatus`, `sequentialNumber` vorhanden
- **USt-Sätze**: 0%, 7%, 19% korrekt
- **Kleinunternehmer**: §19 UStG wird berücksichtigt

#### ✅ Ausgaben (`src/app/dashboard/company/[uid]/finance/expenses/`)
- **Status**: Grundfunktionalität vorhanden
- **Felder**: Kategorie, Betrag, Steuerinfo, Belege
- **GoBD**: `gobd.immutable` Feld vorhanden

#### ✅ Anlagen (`/finance/expenses/assets`)
- **Status**: Backend implementiert via `FixedAssetService`
- **AfA**: Linear + degressiv nach §7 EStG
- **GWG**: Automatische Erkennung bis 800€ netto
- **Sammelposten**: 250-1000€ netto, 5 Jahre
- **DATEV**: Kontenzuordnung implementiert

#### ✅ Steuern (`src/app/dashboard/company/[uid]/finance/taxes/`)
- **Status**: Backend implementiert via `TaxService`
- **UStVA**: Automatische Berechnung aus Buchungen
- **EÜR**: Vollständige Anlage nach BMF
- **GuV**: Gesamtkostenverfahren

#### ✅ Auswertungen
- **BWA**: Vollständig nach DATEV-Standard (50 Zeilen)
- **SuSa**: Implementiert mit Kontenrahmen
- **EÜR**: Anlage-Struktur nach BMF
- **GuV**: Gesamtkostenverfahren

#### ✅ DATEV-Export
- **Status**: SKR03/SKR04 Mapping vorhanden
- **Konten**: 1491+ Konten in `complete-datev-accounts.ts`

---

### 1.2 SERVICES-ANALYSE

#### `datevAuswertungsService.ts` (1052 Zeilen) ✅
```typescript
// FUNKTIONIERT - Lädt echte Buchungsdaten aus Firestore
static async generateBWA(companyId, monat, jahr): Promise<BWAData>
static async generateSuSa(companyId, monat, jahr): Promise<SuSaData>
static async generateEUR(companyId, jahr): Promise<EURData>
```

**Konten-Mapping (BWA-Zeilen):**
| BWA-Position | Konten | Status |
|--------------|--------|--------|
| Umsatzerlöse | 4000-4499 | ✅ |
| Bestandsveränderungen | 4800-4899 | ✅ |
| Wareneinkauf | 5000-5199 | ✅ |
| Personalkosten | 6000-6199 | ✅ |
| Raumkosten | 6200-6299 | ✅ |
| KFZ-Kosten | 6300-6399 | ✅ |
| **Abschreibungen** | **6900-6999** | ✅ Integration mit FixedAssetService |
| Zinsen | 7000-7399 | ✅ |
| Steuern | 7600-7699 | ✅ |

#### `taxService.ts` (1084 Zeilen) ✅ IMPLEMENTIERT
```typescript
// FUNKTIONIERT - Berechnet aus echten Firestore-Daten
static async calculateUStVA(companyId, year, quarter): Promise<UStVA>
static async calculateEUeR(companyId, year): Promise<EUeR>
static async calculateGuV(companyId, year): Promise<GuV>
static async calculateBWA(companyId, year, month): Promise<BWA>
```

#### `fixedAssetService.ts` (645 Zeilen) ✅ NEU
```typescript
// FUNKTIONIERT - Vollständige Anlagenbuchhaltung
static async createAsset(companyId, asset): Promise<FixedAsset>
static async calculateYearlyDepreciation(asset, year): Promise<number>
static async generateDepreciationSchedule(asset): Promise<Schedule[]>
static async disposeAsset(companyId, assetId, disposal): Promise<void>
static determineGwgTreatment(netPrice): 'sofortabzug' | 'sammelposten' | 'normal'
```

#### `businessReportService.ts` (1188 Zeilen) ✅
```typescript
// FUNKTIONIERT - Aggregiert echte Daten
static async generateComprehensiveReport(companyId, options): Promise<ComprehensiveReportData>
```

---

## 2. Verbleibende Aufgaben (Optional)

### 2.2 Gewerbe- und Körperschaftsteuer (Optional)

**Noch nicht automatisiert:**
- Gewerbesteuer manuell berechnen (Hebesatz × Messbetrag)
- Körperschaftsteuer manuell erfassen

---

## 3. Referenzen

- [§7 EStG - Absetzung für Abnutzung](https://www.gesetze-im-internet.de/estg/__7.html)
- [§6 EStG - Bewertung](https://www.gesetze-im-internet.de/estg/__6.html)
- [AfA-Tabellen BMF](https://www.bundesfinanzministerium.de/Content/DE/Standardartikel/Themen/Steuern/Weitere_Steuerthemen/Betriebspruefung/AfA-Tabellen/afa-tabellen.html)
- [GoBD BMF-Schreiben](https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Weitere_Steuerthemen/Abgabenordnung/2019-11-28-GoBD.html)

---

*Diese Dokumentation wurde am 9. Januar 2026 aktualisiert nachdem TaxService und FixedAssetService vollständig implementiert wurden.*
