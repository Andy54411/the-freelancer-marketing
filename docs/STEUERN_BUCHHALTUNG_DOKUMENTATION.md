# Steuern & Buchhaltung - Umfassende Dokumentation für Taskilo

> **Letzte Aktualisierung**: 9. Januar 2026
> **Rechtliche Grundlagen**: EStG, KStG, GewStG, UStG, HGB, AO, GoBD

---

## Inhaltsverzeichnis

1. [Unternehmenssteuerarten in Deutschland](#1-unternehmenssteuerarten-in-deutschland)
2. [Gewinnermittlungsmethoden](#2-gewinnermittlungsmethoden)
3. [Abschreibungen (AfA)](#3-abschreibungen-afa)
4. [Betriebswirtschaftliche Auswertungen](#4-betriebswirtschaftliche-auswertungen)
5. [GoBD-Konformität](#5-gobd-konformität)
6. [DATEV-Integration & Kennzahlen](#6-datev-integration--kennzahlen)
7. [Taskilo Module-Analyse](#7-taskilo-module-analyse)
8. [Handlungsempfehlungen](#8-handlungsempfehlungen)

---

## 1. Unternehmenssteuerarten in Deutschland

### 1.1 Körperschaftsteuer (KStG §23)

**Gesetzliche Grundlage**: Körperschaftsteuergesetz (KStG)

| Veranlagungszeitraum | Steuersatz |
|---------------------|------------|
| Bis 2027 | **15%** |
| 2028 | 14% |
| 2029 | 13% |
| 2030 | 12% |
| 2031 | 11% |
| Ab 2032 | 10% |

**Zusätzlich**: Solidaritätszuschlag von 5,5% auf die Körperschaftsteuer

**Betrifft**: Kapitalgesellschaften (GmbH, AG, UG)

### 1.2 Gewerbesteuer (GewStG §11)

**Gesetzliche Grundlage**: Gewerbesteuergesetz (GewStG)

**Berechnung**:
```
Gewerbesteuer = Gewerbeertrag × Steuermesszahl × Hebesatz
```

| Parameter | Wert |
|-----------|------|
| Steuermesszahl | **3,5%** |
| Freibetrag (Personengesellschaften) | 24.500 € |
| Freibetrag (juristische Personen) | 5.000 € |
| Hebesatz | Gemeinde-abhängig (z.B. München: 490%, Berlin: 410%) |

**Beispielrechnung**:
- Gewerbeertrag: 100.000 €
- Steuermessbetrag: 100.000 € × 3,5% = 3.500 €
- Gewerbesteuer (bei Hebesatz 400%): 3.500 € × 400% = **14.000 €**

### 1.3 Umsatzsteuer (UStG §12)

**Gesetzliche Grundlage**: Umsatzsteuergesetz (UStG)

| Steuersatz | Anwendungsbereich |
|------------|-------------------|
| **19%** | Regelsteuersatz für die meisten Waren und Dienstleistungen |
| **7%** | Ermäßigter Satz (Lebensmittel, Bücher, Zeitungen, Kulturveranstaltungen, Hotelübernachtungen) |
| **0%** | Photovoltaikanlagen (≤30 kWp, seit 2023), innergemeinschaftliche Lieferungen |

**Kleinunternehmerregelung (§19 UStG)**:
- Umsatz Vorjahr ≤ 22.000 € UND
- Voraussichtlicher Umsatz laufendes Jahr ≤ 50.000 €
- Keine USt-Ausweisung auf Rechnungen
- Kein Vorsteuerabzug

### 1.4 Einkommensteuer (für Personengesellschaften)

**Gesetzliche Grundlage**: Einkommensteuergesetz (EStG)

| Zu versteuerndes Einkommen | Steuersatz |
|---------------------------|------------|
| Bis 11.604 € | 0% (Grundfreibetrag 2024) |
| 11.604 € - 66.760 € | 14% - 42% (progressiv) |
| 66.760 € - 277.826 € | 42% |
| Über 277.826 € | 45% (Reichensteuer) |

---

## 2. Gewinnermittlungsmethoden

### 2.1 Betriebsvermögensvergleich (§4 Abs. 1, §5 EStG)

**Pflicht für**:
- Kaufleute (§238 HGB)
- Gewerbetreibende mit Umsatz > 600.000 € ODER Gewinn > 60.000 €

**Formel**:
```
Gewinn = Betriebsvermögen am Jahresende
       - Betriebsvermögen am Jahresanfang
       + Entnahmen
       - Einlagen
```

### 2.2 Einnahmenüberschussrechnung (§4 Abs. 3 EStG)

**Berechtigt**:
- Freiberufler (unabhängig von Umsatz/Gewinn)
- Kleingewerbetreibende (Umsatz ≤ 600.000 € UND Gewinn ≤ 60.000 €)
- Kleinunternehmer nach §19 UStG

**Formel**:
```
Gewinn = Betriebseinnahmen - Betriebsausgaben
```

**Zufluss-/Abflussprinzip (§11 EStG)**:
- Einnahmen: Im Zeitpunkt des Geldzuflusses
- Ausgaben: Im Zeitpunkt der Zahlung
- Ausnahme: 10-Tage-Regel für regelmäßig wiederkehrende Zahlungen

### 2.3 Anlage EÜR - Offizielle Struktur

**Betriebseinnahmen (Zeilen 11-22)**:
| Zeile | Bezeichnung |
|-------|-------------|
| 11 | Betriebseinnahmen als umsatzsteuerlicher Kleinunternehmer |
| 12 | Betriebseinnahmen, steuerpflichtig 19% |
| 13 | Betriebseinnahmen, steuerpflichtig 7% |
| 14 | Betriebseinnahmen, steuerfrei (z.B. Ausfuhrlieferungen) |
| 15 | Vereinnahmte Umsatzsteuer |
| 16 | Vom Finanzamt erstattete Umsatzsteuer |
| 17 | Veräußerung/Entnahme Anlagevermögen |
| 18-20 | Private Kfz-Nutzung, Sachentnahmen |
| 21 | Sonstige Einnahmen |
| 22 | **Summe Betriebseinnahmen** |

**Betriebsausgaben (Zeilen 23-65)**:
| Zeile | Bezeichnung |
|-------|-------------|
| 23-25 | Wareneinkauf, Rohstoffe |
| 26 | Bezogene Fremdleistungen |
| 27-28 | Personalkosten (Löhne, Gehälter, SV-Beiträge) |
| 29-31 | Abschreibungen (AfA) |
| 32-34 | Raumkosten, Miete |
| 35-39 | Fahrzeugkosten, Reisekosten |
| 40-43 | Werbekosten, Geschenke, Bewirtung |
| 44-47 | Versicherungen, Beiträge, Telefon |
| 48-50 | Büromaterial, Porto, Beratungskosten |
| 51-54 | Schuldzinsen, Leasingkosten |
| 55-58 | Gezahlte Vorsteuer, USt-Vorauszahlungen |
| 59-64 | Übrige Ausgaben |
| 65 | **Summe Betriebsausgaben** |

**Gewinnermittlung (Zeilen 66-76)**:
| Zeile | Bezeichnung |
|-------|-------------|
| 66 | Gewinn vor Hinzurechnungen/Kürzungen |
| 67-75 | Korrekturen (Investitionsabzugsbeträge, etc.) |
| 76 | **Steuerpflichtiger Gewinn** |

---

## 3. Abschreibungen (AfA)

### 3.1 Grundlagen (§7 EStG)

**Lineare AfA (§7 Abs. 1 EStG)**:
```
Jährliche AfA = Anschaffungskosten / Nutzungsdauer
```

**Zeitanteilige AfA im Anschaffungsjahr**:
- Kürzung um 1/12 für jeden vollen Monat VOR dem Anschaffungsmonat
- Beispiel: Anschaffung im April → 9/12 AfA im ersten Jahr

### 3.2 Degressive AfA (§7 Abs. 2 EStG)

**Gültig für Anschaffungen nach 30.06.2025 und vor 01.01.2028**:
- Maximal das 3-fache des linearen AfA-Satzes
- Höchstens **30%** vom jeweiligen Buchwert
- Wechsel zur linearen AfA jederzeit möglich

### 3.3 Sonderregelungen

**Elektrofahrzeuge (§7 Abs. 2a EStG)**:
| Jahr | AfA-Satz |
|------|----------|
| Anschaffungsjahr | 75% |
| Jahr 1 | 10% |
| Jahr 2-3 | je 5% |
| Jahr 4 | 3% |
| Jahr 5 | 2% |

**Geringwertige Wirtschaftsgüter (GWG) (§6 Abs. 2 EStG)**:
| Netto-Anschaffungskosten | Behandlung |
|--------------------------|------------|
| Bis 250 € | Sofort als Betriebsausgabe |
| 250,01 € - 800 € | Sofortabschreibung ODER Sammelposten |
| 250,01 € - 1.000 € | Sammelposten (5 Jahre, je 20%) |
| Über 800 € / 1.000 € | Reguläre AfA nach Nutzungsdauer |

### 3.4 AfA-Tabellen (BMF)

Die amtlichen AfA-Tabellen definieren die betriebsgewöhnliche Nutzungsdauer:

**Beispiele allgemeine Anlagegüter**:
| Wirtschaftsgut | Nutzungsdauer | AfA-Satz |
|----------------|---------------|----------|
| Büromöbel | 13 Jahre | 7,69% |
| Computer, Notebooks | 3 Jahre | 33,33% |
| Pkw | 6 Jahre | 16,67% |
| Lkw bis 7,5t | 9 Jahre | 11,11% |
| Gebäude (gewerblich) | 33 Jahre | 3% |
| Gebäude (Wohnzwecke, ab 2023) | 33 Jahre | 3% |
| Gebäude (Wohnzwecke, vor 2023) | 50 Jahre | 2% |
| Software | 3 Jahre | 33,33% |
| Maschinen | 5-15 Jahre | 6,67-20% |

### 3.5 Sonderabschreibungen (§7g EStG)

**Investitionsabzugsbetrag (IAB)**:
- Bis zu 50% der voraussichtlichen Anschaffungskosten
- Vor der Anschaffung (bis zu 3 Jahre im Voraus)
- Betriebsvermögen ≤ 200.000 € (Gewinnermittler nach §4/3)

**Sonderabschreibung nach §7g Abs. 5**:
- Zusätzlich 20% im Anschaffungsjahr
- Kleine und mittlere Betriebe (Gewinn ≤ 200.000 €)

---

## 4. Betriebswirtschaftliche Auswertungen

### 4.1 BWA (Betriebswirtschaftliche Auswertung)

**Ursprung**: DATEV Standard-BWA Nr. 1 (seit 1969)

**Zweck**:
- Monatliche/quartalsweise Ertragslage-Übersicht
- Grundlage für Bankkredite und Controlling
- KEINE gesetzliche Pflicht, aber in der Praxis unverzichtbar

**Struktur der Standard-BWA Nr. 1**:

```
UMSATZ & ERLÖSE
├── Zeile 1-5: Umsatzerlöse
├── Zeile 6-8: Bestandsveränderungen, Eigenleistungen
└── Zeile 9: GESAMTLEISTUNG

MATERIALAUFWAND
├── Zeile 10-12: Wareneinkauf
├── Zeile 13-15: Fremdleistungen, Bezugsnebenkosten
└── Zeile 16: ROHERTRAG (= Gesamtleistung - Materialaufwand)
    └── Rohertrag-Quote: Rohertrag / Gesamtleistung × 100

PERSONALKOSTEN
├── Zeile 20-22: Löhne und Gehälter
├── Zeile 23-25: Soziale Abgaben, sonstige Personalkosten
└── Zeile 26: PERSONALKOSTEN GESAMT

SONSTIGE KOSTEN
├── Zeile 30-35: Raumkosten (Miete, Nebenkosten)
├── Zeile 40-45: Fahrzeugkosten, Reisekosten
├── Zeile 50-55: Werbekosten, Versicherungen, Beiträge
├── Zeile 60-62: Reparaturen, Instandhaltung
├── Zeile 63-65: Abschreibungen
└── Zeile 66-69: Sonstige Kosten, Zinsen

ERGEBNIS
├── Zeile 70: BETRIEBSERGEBNIS
├── Zeile 71-75: Neutrales Ergebnis (außerordentlich)
├── Zeile 76: ERGEBNIS VOR STEUERN
├── Zeile 77-78: Steuern vom Einkommen/Ertrag
└── Zeile 80: JAHRESÜBERSCHUSS/-FEHLBETRAG
```

### 4.2 SuSa (Summen- und Saldenliste)

**Zweck**: Übersicht aller Konten mit Bewegungen

**Struktur pro Konto**:
| Spalte | Bedeutung |
|--------|-----------|
| Konto-Nr. | DATEV-Kontonummer (SKR03/SKR04) |
| Kontobezeichnung | Name des Kontos |
| EB-Wert | Eröffnungsbilanz-Saldo |
| Soll | Summe aller Soll-Buchungen |
| Haben | Summe aller Haben-Buchungen |
| Saldo | Aktueller Kontostand |

### 4.3 GuV (Gewinn- und Verlustrechnung)

**Gesetzliche Grundlage**: §275 HGB

**Zwei Verfahren**:

**Gesamtkostenverfahren (GKV)** - in Deutschland üblich:
```
1. Umsatzerlöse
2. +/- Bestandsveränderungen
3. + Aktivierte Eigenleistungen
4. + Sonstige betriebliche Erträge
5. - Materialaufwand
   = ROHERGEBNIS
6. - Personalaufwand
7. - Abschreibungen
8. - Sonstige betriebliche Aufwendungen
   = BETRIEBSERGEBNIS
9. +/- Finanzergebnis
   = ERGEBNIS VOR STEUERN
10. - Steuern
   = JAHRESÜBERSCHUSS/-FEHLBETRAG
```

**Umsatzkostenverfahren (UKV)** - international (IFRS/US-GAAP):
```
1. Umsatzerlöse
2. - Herstellungskosten der Umsätze
   = BRUTTOERGEBNIS
3. - Vertriebskosten
4. - Verwaltungskosten
5. +/- Sonstige Erträge/Aufwendungen
   = BETRIEBSERGEBNIS
...
```

### 4.4 Jahresabschluss

**Bestandteile nach HGB**:
| Rechtsform | Bilanz | GuV | Anhang | Lagebericht |
|------------|--------|-----|--------|-------------|
| Einzelunternehmen | ✓ | ✓ | - | - |
| Personengesellschaft | ✓ | ✓ | - | - |
| Kleine Kapitalgesellschaft | ✓ | ✓ | ✓ | - |
| Mittelgroße Kapitalges. | ✓ | ✓ | ✓ | ✓ |
| Große Kapitalgesellschaft | ✓ | ✓ | ✓ | ✓ |

**Größenklassen (§267 HGB)**:

| Kriterium | Klein | Mittel | Groß |
|-----------|-------|--------|------|
| Bilanzsumme | ≤ 6 Mio. € | ≤ 20 Mio. € | > 20 Mio. € |
| Umsatz | ≤ 12 Mio. € | ≤ 40 Mio. € | > 40 Mio. € |
| Mitarbeiter | ≤ 50 | ≤ 250 | > 250 |

(2 von 3 Kriterien müssen erfüllt sein)

---

## 5. GoBD-Konformität

### 5.1 GoBD-Grundsätze

**Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form sowie zum Datenzugriff (BMF-Schreiben vom 28.11.2019)**

**Kernprinzipien**:
1. **Nachvollziehbarkeit**: Jeder Geschäftsvorfall muss nachvollziehbar sein
2. **Nachprüfbarkeit**: Dritte müssen in angemessener Zeit prüfen können
3. **Unveränderbarkeit**: Einmal erfasste Daten dürfen nicht unerkannt geändert werden
4. **Vollständigkeit**: Alle Geschäftsvorfälle müssen erfasst werden
5. **Richtigkeit**: Buchungen müssen den tatsächlichen Vorgängen entsprechen
6. **Zeitgerechte Erfassung**: Zeitnahe Erfassung (bar: täglich, unbar: 10 Tage)
7. **Ordnung**: Systematische und übersichtliche Erfassung

### 5.2 Taskilo GoBD-Implementierung

**Aktueller Status**:
- ✅ Festschreibung von Rechnungen (`isLocked`, `gobdStatus`)
- ✅ Fortlaufende Rechnungsnummern (`sequentialNumber`)
- ✅ Keine Löschung, nur Stornierung
- ✅ Zeitstempel bei Änderungen (`lockedAt`, `lockedBy`)

**Felder in Firestore**:
```typescript
interface InvoiceGoBD {
  isLocked: boolean;           // Rechnung festgeschrieben
  gobdStatus: 'draft' | 'locked';
  lockedAt: Timestamp;         // Zeitpunkt der Festschreibung
  lockedBy: string;            // User-ID
  sequentialNumber: number;    // Fortlaufende Nummer
  invoiceNumber: string;       // Formatierte Rechnungsnummer
}
```

---

## 6. DATEV-Integration & Kennzahlen

### 6.1 Kontenrahmen

**SKR03** (häufigster in Deutschland):
| Klasse | Kontenbereich | Inhalt |
|--------|---------------|--------|
| 0 | 0000-0999 | Anlagevermögen, Aufwendungen für Ingangsetzung |
| 1 | 1000-1999 | Finanzumlaufvermögen, Forderungen, Kassenbestand |
| 2 | 2000-2999 | Abgrenzungsposten, Rechnungsabgrenzung |
| 3 | 3000-3999 | Wareneingang, Vorräte |
| 4 | 4000-4999 | **Erlöse, Umsatzerlöse** |
| 5 | 5000-5999 | Materialeinkauf, Fremdleistungen |
| 6 | 6000-6999 | **Betriebliche Aufwendungen** |
| 7 | 7000-7999 | Weitere Aufwendungen, Abschreibungen |
| 8 | 8000-8999 | Erträge, sonstige betriebliche Erträge |
| 9 | 9000-9999 | Vorträge, Abschluss, Statistische Konten |

### 6.2 DATEV-Kennzahlen für BWA

**Ertragskennzahlen**:
| Kennzahl | Formel | Zielwert |
|----------|--------|----------|
| Rohertrag-Quote | (Rohertrag / Gesamtleistung) × 100 | Branchenabhängig (30-70%) |
| Personalkosten-Quote | (Personalkosten / Gesamtleistung) × 100 | 20-40% |
| Betriebsergebnis-Quote | (Betriebsergebnis / Gesamtleistung) × 100 | > 5% |
| EBITDA-Marge | (EBITDA / Umsatz) × 100 | > 10% |

**Liquiditätskennzahlen**:
| Kennzahl | Formel | Zielwert |
|----------|--------|----------|
| Liquidität 1. Grades | (Liquide Mittel / kurzfr. Verbindlichkeiten) × 100 | > 20% |
| Liquidität 2. Grades | ((Liq. Mittel + Forderungen) / kurzfr. Verbindl.) × 100 | > 100% |
| Liquidität 3. Grades | (Umlaufvermögen / kurzfr. Verbindl.) × 100 | > 150% |

**Kapitalstruktur-Kennzahlen**:
| Kennzahl | Formel | Zielwert |
|----------|--------|----------|
| Eigenkapitalquote | (Eigenkapital / Gesamtkapital) × 100 | > 20% |
| Verschuldungsgrad | (Fremdkapital / Eigenkapital) × 100 | < 300% |
| Anlagendeckung I | (Eigenkapital / Anlagevermögen) × 100 | > 70% |
| Anlagendeckung II | ((EK + langfr. FK) / Anlagevermögen) × 100 | > 100% |

**Rentabilitätskennzahlen**:
| Kennzahl | Formel | Zielwert |
|----------|--------|----------|
| Eigenkapitalrendite (ROE) | (Jahresüberschuss / Eigenkapital) × 100 | > 10% |
| Gesamtkapitalrendite (ROA) | ((Jahresüberschuss + Zinsen) / Gesamtkapital) × 100 | > 6% |
| Umsatzrendite (ROS) | (Jahresüberschuss / Umsatz) × 100 | Branchenabhängig |

---

## 7. Taskilo Module-Analyse

### 7.1 Vorhandene Module (aus CompanySidebar)

```
HAUPTMODULE
├── Übersicht (Dashboard)
├── Tasker
│   ├── Posteingang
│   ├── Aufträge (Übersicht, Eingehend, Erstellt, Abgeschlossen, Storniert)
│   ├── Projekt-Marktplatz
│   ├── Bewertungen
│   ├── Tasker-Level
│   └── Tasker-Einstellungen
├── Kalender
├── E-Mail
│
├── BUCHHALTUNG ⭐ (Steuerrelevant)
│   ├── Angebote (+ Auftragsbestätigungen, Lieferscheine)
│   ├── Rechnungen (+ Wiederkehrend, Mahnungen, Gutschriften)
│   ├── Ausgaben (+ Wiederkehrend, Anlagen) ⭐
│   ├── Steuern ⭐
│   ├── Auswertung ⭐ (BWA, SuSa, EÜR)
│   ├── DATEV ⭐
│   └── Buchhaltungseinstellungen (Kassenbuch, E-Rechnungen, Zahlungen)
│
├── Geschäftspartner (Kunden/Lieferanten)
├── WhatsApp (Premium)
├── Banking
│   ├── Konten
│   ├── Kassenbuch
│   └── Unvollständige Zahlungen
├── Lagerbestand ⭐ (für Bestandsveränderungen)
├── Taskilo Advertising (Premium)
├── Personal ⭐ (Personalkosten)
│   ├── Mitarbeiter
│   ├── Dienstplan
│   ├── Gehaltsabrechnung ⭐
│   ├── Arbeitszeit
│   ├── Kostenkalkulation
│   └── Urlaub & Abwesenheit
├── Recruiting (Premium)
├── Workspace
│   ├── Projekte
│   ├── Aufgaben
│   └── Zeiterfassung ⭐
├── Support
└── Einstellungen
    ├── Buchhaltung & Steuer ⭐
    ├── Zahlungskonditionen
    └── Storno-Einstellungen
```

### 7.2 Steuerrelevante Module

| Modul | Steuerliche Relevanz | Status |
|-------|---------------------|--------|
| **Rechnungen** | Umsatzerlöse (Konto 4000-4999) | ✅ Implementiert |
| **Ausgaben** | Betriebsausgaben (diverse Konten) | ✅ Implementiert |
| **Ausgaben/Anlagen** | Abschreibungen (AfA) | ✅ Backend, ⚠️ UI fehlt |
| **Steuern** | USt, ESt, GewSt, KSt | ✅ UStVA/EÜR, ⚠️ GewSt/KSt manuell |
| **Auswertung** | BWA, SuSa, EÜR, GuV | ✅ Implementiert |
| **DATEV** | Export | ✅ Implementiert |
| **Personal/Gehalt** | Personalkosten (6000-6199) | ✅ Implementiert |
| **Lagerbestand** | Bestandsveränderungen | ✅ Implementiert |
| **Zeiterfassung** | Kostenzuordnung | ✅ Implementiert |

### 7.3 Aktuelle Services

**Vorhandene Steuer-Services**:
- `taxService.ts` - UStVA, EÜR, GuV, BWA Berechnung aus echten Daten ✅
- `fixedAssetService.ts` - Anlagenbuchhaltung mit AfA nach §7 EStG ✅
- `datevAuswertungsService.ts` - BWA, SuSa, EÜR Generierung ✅
- `businessReportService.ts` - KPI-Aggregation aus allen Modulen ✅
- `firestoreInvoiceService.ts` - Rechnungsverwaltung mit GoBD ✅
- `GermanyValidationEngine.ts` - Steuerliche Validierungen ✅

---

## 8. Handlungsempfehlungen

### 8.1 ✅ Bereits umgesetzt (Stand: 9. Januar 2026)

1. **TaxService komplett neu implementiert**
   - UStVA-Berechnung aus echten Firestore-Daten
   - EÜR-Berechnung nach BMF-Anlage
   - GuV nach Gesamtkostenverfahren
   - BWA mit monatlicher Analyse

2. **Anlagenbuchhaltung (Backend)**
   - `fixedAssetService.ts` mit vollständiger AfA-Berechnung
   - AfA-Tabellen nach BMF hinterlegt
   - GWG-Behandlung (§6 Abs. 2 EStG)
   - Sammelposten-Logik (§6 Abs. 2a EStG)
   - DATEV-Kontenzuordnung

3. **GoBD-Konformität**
   - Festschreibung für Rechnungen (`isLocked`, `gobdStatus`)
   - Fortlaufende Nummernkreise
   - Audit-Trail für Änderungen

### 8.2 ⚠️ Noch umzusetzen (Frontend)

1. **Anlagen-UI erstellen**
   - [ ] `/finance/expenses/assets/page.tsx` implementieren
   - [ ] Anlagen-Übersicht mit AfA-Fortschritt
   - [ ] Anlage hinzufügen/bearbeiten Modal
   - [ ] AfA-Vorschau-Kalkulator

### 8.3 Mittelfristig (Optional)

4. **Steuerrechner verbessern**
   - Gewerbesteuer-Hebesatz pro Unternehmen
   - Vorauszahlungen planen
   - USt-Voranmeldung vorbereiten

5. **GoBD für Ausgaben erweitern**
   - `isLocked` für Ausgaben implementieren
   - Storno-Logik wie bei Rechnungen

6. **DATEV-Export erweitern**
   - DATEV-Format für Buchungsstapel
   - Stammdaten-Export
   - Automatischer Upload (DATEV Unternehmen online)

7. **Kennzahlen-Dashboard**
   - DATEV-Kennzahlen berechnen
   - Branchenvergleich
   - Trend-Analyse

### 8.4 Langfristig

7. **Jahresabschluss-Vorbereitung**
   - Bilanz-Erstellung
   - Anhang-Generierung
   - Prüfungs-Checklisten

8. **Steuerberater-Schnittstelle**
   - Direkter DATEV-Upload
   - Echtzeit-Zugriff für Steuerberater
   - Mandanten-Kommunikation

---

## Anhang A: Gesetzliche Quellen

| Gesetz | Relevante Paragraphen |
|--------|----------------------|
| EStG | §4 (Gewinn), §6 (Bewertung), §7 (AfA), §11 (Zufluss/Abfluss) |
| UStG | §12 (Steuersätze), §19 (Kleinunternehmer) |
| KStG | §23 (Steuersatz) |
| GewStG | §11 (Steuermesszahl) |
| HGB | §238 (Buchführungspflicht), §275 (GuV), §267 (Größenklassen) |
| AO | §140-148 (Buchführungspflichten), §158 (Beweiskraft) |
| GoBD | BMF-Schreiben 28.11.2019 |

---

*Diese Dokumentation dient der internen Verwendung und ersetzt keine steuerliche Beratung.*
