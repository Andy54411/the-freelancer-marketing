# Steuern & Buchhaltung - Umfassende Dokumentation für Taskilo

> **Letzte Aktualisierung**: 17. Januar 2026
> **Version**: 2.7 (Inventur-Modul + BWA-Integration implementiert)
> **Rechtliche Grundlagen**: EStG, KStG, GewStG, UStG, HGB, AO, GoBD, KraftStG, KassenSichV, GwG, VOB, BGB

---

## Inhaltsverzeichnis

### Teil I: Steuerrecht & Grundlagen
1. [Unternehmenssteuerarten in Deutschland](#1-unternehmenssteuerarten-in-deutschland)
2. [Gewinnermittlungsmethoden](#2-gewinnermittlungsmethoden)
3. [Abschreibungen (AfA)](#3-abschreibungen-afa)
   - 3.6 [Firmenfahrzeuge & Dienstwagen](#36-firmenfahrzeuge--dienstwagen)
   - 3.7 [Bareinnahmen & Kassenführung](#37-bareinnahmen--kassenführung)
   - 3.8 [Handwerker- & Baurechnungen](#38-handwerker---baurechnungen)

### Teil II: Auswertungen & Berichte
4. [Betriebswirtschaftliche Auswertungen](#4-betriebswirtschaftliche-auswertungen)
5. [GoBD-Konformität](#5-gobd-konformität)
6. [DATEV-Integration & Kennzahlen](#6-datev-integration--kennzahlen)

### Teil III: Taskilo-Implementierung
7. [Taskilo Module-Analyse](#7-taskilo-module-analyse)
8. [Buchhaltungsmodul-Routen](#8-buchhaltungsmodul-routen)
9. [Firestore-Datenstrukturen](#9-firestore-datenstrukturen)
10. [Services & Backend](#10-services--backend)
    - 10.5 [HR-System & Personalkosten-Integration](#105-hr-system--personalkosten-integration)
    - 10.6 [Lagerwirtschaftssystem & Bestandsveränderungen](#106-lagerwirtschaftssystem--bestandsveränderungen)
11. [Handlungsempfehlungen](#11-handlungsempfehlungen)

### Anhänge
- [Anhang A: Gesetzliche Quellen](#anhang-a-gesetzliche-quellen)
- [Anhang B: DATEV-API-Integration](#anhang-b-datev-api-integration)

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

**Kleinunternehmerregelung (§19 UStG) - NEUFASSUNG 2025**:
- Umsatz Vorjahr ≤ **25.000 €** (seit 01.01.2025) UND
- Umsatz laufendes Jahr ≤ **100.000 €** (erhöht von 50.000 €!)
- Keine USt-Ausweisung auf Rechnungen
- Kein Vorsteuerabzug
- EU-Kleinunternehmer: Jahresumsatz EU-weit ≤ 100.000 € + Kleinunternehmer-IdNr. erforderlich

### 1.4 Einkommensteuer (für Personengesellschaften)

**Gesetzliche Grundlage**: Einkommensteuergesetz (EStG §32a)

**Tarif ab Veranlagungszeitraum 2026:**
| Zu versteuerndes Einkommen | Steuersatz |
|---------------------------|------------|
| Bis 12.348 € | 0% (Grundfreibetrag 2026) |
| 12.349 € - 17.799 € | 14% Eingangssteuersatz (progressiv) |
| 17.800 € - 69.878 € | 14% - 42% (progressiv) |
| 69.879 € - 277.825 € | 42% (Spitzensteuersatz) |
| Ab 277.826 € | 45% (Reichensteuer) |

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

**Gültig für Anschaffungen nach 30.06.2025 und vor 01.01.2028** (bewegliche Wirtschaftsgüter):
- Maximal das **3-fache** des linearen AfA-Satzes
- Höchstens **30%** vom jeweiligen Buchwert (Restwert)
- Wechsel zur linearen AfA jederzeit möglich
- Übergang von linear zu degressiv ist NICHT zulässig
- Bei degressiver AfA: Keine Absetzungen für außergewöhnliche technische/wirtschaftliche Abnutzung

### 3.3 Sonderregelungen

**Elektrofahrzeuge (§7 Abs. 2a EStG)**:
Gültig für Anschaffungen nach 30.06.2025 und vor 01.01.2028:
| Jahr | AfA-Satz |
|------|----------|
| Anschaffungsjahr | 75% |
| 1. Folgejahr | 10% |
| 2. und 3. Folgejahr | je 5% |
| 4. Folgejahr | 3% |
| 5. Folgejahr | 2% |

**Hinweis**: Kann nicht mit Sonderabschreibungen kombiniert werden. §7 Abs. 1 Satz 4 (zeitanteilige Kürzung) gilt NICHT.

**Geringwertige Wirtschaftsgüter (GWG) (§6 Abs. 2 EStG)**:
| Netto-Anschaffungskosten | Behandlung | Gesetzliche Grundlage |
|--------------------------|------------|----------------------|
| Bis 250 € | Sofort als Betriebsausgabe (kann auch in Sammelposten) | §6 Abs. 2a Satz 4 |
| 250,01 € - 800 € | Sofortabschreibung (Wahlrecht) | §6 Abs. 2 Satz 1 |
| 250,01 € - 1.000 € | Sammelposten (5 Jahre, je 20%) - Alternative zu GWG | §6 Abs. 2a |
| Über 800 € (ohne Sammelposten) | Reguläre AfA nach Nutzungsdauer | §7 |
| Über 1.000 € (mit Sammelposten) | Reguläre AfA nach Nutzungsdauer | §7 |

**Wichtig**: GWG bis 800 € und Sammelposten 250-1.000 € sind ALTERNATIVE Verfahren. Die Wahl muss für alle Wirtschaftsgüter eines Wirtschaftsjahres einheitlich erfolgen.

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

### 3.6 Firmenfahrzeuge & Dienstwagen

#### 3.6.1 Privatnutzung von Firmenwagen

**Gesetzliche Grundlage**: §6 Abs. 1 Nr. 4 EStG, §8 Abs. 2 EStG

Bei Privatnutzung eines Firmenwagens muss der geldwerte Vorteil versteuert werden. Es gibt zwei Methoden:

**Methode 1: 1%-Regelung (Pauschalierung)**

| Fahrzeugtyp | Bemessungsgrundlage | Monatlicher Ansatz |
|-------------|---------------------|-------------------|
| Verbrenner / Plug-in-Hybrid (>60km elektrisch) | Bruttolistenpreis | 1,0% |
| Elektrofahrzeug (Listenpreis ≤ 70.000 €) | ¼ Bruttolistenpreis | 0,25% (effektiv) |
| Elektrofahrzeug (Listenpreis > 70.000 €) | ½ Bruttolistenpreis | 0,5% (effektiv) |
| Plug-in-Hybrid (≥60km elektrisch, ab 2025) | ½ Bruttolistenpreis | 0,5% (effektiv) |

**Zusätzlich für Fahrten Wohnung-Arbeitsstätte:**
- 0,03% des Bruttolistenpreises × Entfernungskilometer (einfache Strecke)
- Bei E-Fahrzeugen entsprechend reduziert (¼ bzw. ½)

**Beispielrechnung Elektrofahrzeug:**
```
Bruttolistenpreis: 50.000 €
Bemessungsgrundlage (¼): 12.500 €
Monatlicher geldwerter Vorteil: 125 € (1% von 12.500 €)
Jahresvorteil: 1.500 €
```

**Methode 2: Fahrtenbuch**

Voraussetzungen für ein ordnungsgemäßes Fahrtenbuch:
- Zeitnah geführt (nicht nachträglich)
- Vollständige Angaben für jede Fahrt
- Manipulationssicher (gebunden, keine losen Blätter)
- Bei elektronischem Fahrtenbuch: Änderungen dokumentiert

**Pflichtangaben pro Fahrt:**
| Angabe | Beschreibung |
|--------|--------------|
| Datum | Tag der Fahrt |
| Kilometerstand | Beginn und Ende |
| Reiseziel | Ort/Adresse |
| Reisezweck | Geschäftlicher Anlass |
| Aufgesuchte Personen | Bei Geschäftsfahrten |

**Kostenermittlung bei Fahrtenbuch:**
```
Gesamtkosten Fahrzeug (Jahr): 12.000 €
- Abschreibung
- Kraftstoff/Strom
- Versicherung
- Kfz-Steuer
- Wartung/Reparaturen
- Finanzierungskosten

Gesamtkilometer: 30.000 km
Privatkilometer: 6.000 km (20%)

Privatanteil: 12.000 € × 20% = 2.400 € (geldwerter Vorteil)
```

#### 3.6.2 Vorsteuerabzug bei Fahrzeugen (§15 UStG)

| Nutzung | Vorsteuerabzug |
|---------|----------------|
| 100% betrieblich | 100% Vorsteuer |
| Gemischt (betrieblich + privat) | 100% Vorsteuer, aber Privatanteil = unentgeltliche Wertabgabe (USt auf Privatnutzung) |
| < 10% betrieblich | Kein Vorsteuerabzug (kein Betriebsvermögen) |

**Unentgeltliche Wertabgabe bei Privatnutzung:**
Bei 1%-Regelung ist die USt auf den Privatanteil pauschal enthalten.
Bei Fahrtenbuch: USt auf tatsächliche Privatkosten.

#### 3.6.3 Kfz-Leasing vs. Kauf

**Leasing (Operating-Leasing):**
| Aspekt | Behandlung |
|--------|------------|
| Leasingrate | Betriebsausgabe (monatlich) |
| Sonderzahlung | Über Laufzeit verteilen (Rechnungsabgrenzung) |
| Vorsteuer | Aus jeder Rate abziehbar |
| Privatanteil | Nicht abziehbarer Teil der Rate |
| Bilanz | Kein Anlagevermögen (Off-Balance) |

**Kauf/Finanzierung:**
| Aspekt | Behandlung |
|--------|------------|
| Anschaffung | Aktivierung im Anlagevermögen |
| AfA | 6 Jahre linear (16,67%) oder degressiv |
| Zinsen | Betriebsausgabe |
| Vorsteuer | Einmalig bei Kauf (19% auf Kaufpreis) |
| Privatanteil | Entnahme (nicht abzugsfähig) |

#### 3.6.4 Elektrofahrzeuge - Steuervorteile

**Übersicht der Vergünstigungen (Stand 2026):**

| Vorteil | Regelung | Bedingung |
|---------|----------|-----------|
| **Reduzierte 1%-Regel** | 0,25% / 0,5% | Rein elektrisch |
| **Kfz-Steuer** | Befreit bis 31.12.2030 | Erstzulassung bis 31.12.2025 |
| **Sonder-AfA** | 75%/10%/5%/5%/3%/2% | Anschaffung 01.07.2025-31.12.2027 |
| **Nullsteuersatz Wallbox** | 0% USt | Wohngebäude, ≤30 kWp kombiniert |
| **Laden beim Arbeitgeber** | Steuerfrei | §3 Nr. 46 EStG |
| **Ladepauschale** | 30€/70€ monatlich steuerfrei | Laden zu Hause, Nachweis |

**Ladepauschale Details:**
- Ohne Lademöglichkeit beim Arbeitgeber: 70 € monatlich
- Mit Lademöglichkeit beim Arbeitgeber: 30 € monatlich
- Für Plug-in-Hybride: 15 € / 35 € monatlich

#### 3.6.5 Fahrzeugkosten als Betriebsausgabe

**Abzugsfähige Kosten (bei betrieblicher Nutzung):**
| Kostenart | AfA-Konto / Aufwandskonto |
|-----------|---------------------------|
| Abschreibung | 4830 / 4831 (E-Fahrzeuge) |
| Kraftstoff/Strom | 4510 |
| Kfz-Versicherung | 4520 |
| Kfz-Steuer | 4530 |
| Laufende Kosten (Reparatur, Wartung) | 4540 |
| Leasingraten | 4570 |
| Maut/Parkgebühren | 4580 |

**Nicht abzugsfähig:**
- Kosten für Privatfahrten (Privatentnahme)
- Bußgelder und Verwarnungsgelder
- Kfz-Kosten bei < 10% betrieblicher Nutzung

#### 3.6.6 Entfernungspauschale (ohne Firmenwagen)

Für Arbeitnehmer und Selbständige ohne Firmenwagen:

| Entfernung | Pauschale pro Arbeitstag |
|------------|-------------------------|
| 1-20 km | 0,30 € pro km |
| Ab 21 km | 0,38 € pro km |

**Höchstbetrag:** 4.500 € jährlich (Ausnahme: eigener Pkw = tatsächliche Kosten)

### 3.7 Bareinnahmen & Kassenführung

#### 3.7.1 Grundsätze der Kassenführung

**Gesetzliche Grundlagen**: 
- AO §146 (Ordnungsvorschriften für Buchführung)
- AO §146a (Ordnungsvorschriften für elektronische Aufzeichnungssysteme)
- KassenSichV (Kassensicherungsverordnung)
- GoBD (BMF-Schreiben 28.11.2019)

**Wer muss ein Kassenbuch führen?**
| Unternehmensart | Kassenbuch-Pflicht |
|-----------------|-------------------|
| Kaufleute (HGB §1) | ✅ Pflicht (doppelte Buchführung) |
| GmbH, UG, AG | ✅ Pflicht |
| Freiberufler | ❌ Keine Pflicht (aber empfohlen bei Bargeld) |
| Kleinunternehmer (EÜR) | ❌ Keine Pflicht (aber empfohlen bei Bargeld) |
| Mit elektronischer Kasse | ✅ Pflicht + TSE |

#### 3.7.2 Einzelaufzeichnungspflicht (§146 AO)

**Grundsatz**: Jeder Geschäftsvorfall muss einzeln aufgezeichnet werden!

**Ausnahmen (Zumutbarkeitsregelung)**:
| Situation | Erlaubt? | Bedingung |
|-----------|----------|-----------|
| Offene Ladenkasse | ✅ | Täglicher Kassenbericht mit Zählprotokoll |
| Viele Barverkäufe an unbekannte Kunden | ✅ | Waren von geringem Wert, Verkauf über Ladentisch |
| Gastronomie | ✅ | Bedienungsgeld getrennt erfassen |
| Märkte/Veranstaltungen | ✅ | Tageslosung zulässig |

**KEINE Ausnahme bei**:
- Elektronische Registrierkasse → Immer Einzelaufzeichnung!
- B2B-Geschäfte → Immer Einzelaufzeichnung!
- Rechnungsstellung → Immer Einzelaufzeichnung!

#### 3.7.3 Kassenbuch-Anforderungen (GoBD)

**Pflichtangaben pro Eintrag:**
| Feld | Beschreibung | Beispiel |
|------|--------------|----------|
| Datum | Buchungsdatum | 16.01.2026 |
| Belegnummer | Fortlaufend | KB-2026-0042 |
| Buchungstext | Beschreibung | Barverkauf Produkt X |
| Einnahme ODER Ausgabe | Nie beides! | 119,00 € |
| Bestand | Aktueller Kassenstand | 1.523,45 € |
| Steuersatz | 19%, 7%, 0% | 19% |

**GoBD-Anforderungen:**
- ✅ **Unveränderbarkeit**: Keine Löschungen, nur Stornos
- ✅ **Zeitnähe**: Tägliche Erfassung (spätestens nächster Werktag)
- ✅ **Vollständigkeit**: Alle Bewegungen erfassen
- ✅ **Nachvollziehbarkeit**: Jeder Eintrag mit Beleg
- ✅ **Keine negativen Kassenstände**: NIEMALS unter 0 €!

**Täglicher Kassenabschluss:**
```
Kassenbestand Vortag:     1.200,00 €
+ Einnahmen:              +  523,45 €
- Ausgaben:               -  200,00 €
= Rechnerischer Bestand:   1.523,45 €
= Gezählter Bestand:       1.523,45 €
  Differenz:                   0,00 €
```

#### 3.7.4 Kassensicherungsverordnung (KassenSichV) & TSE

**Seit 01.01.2020 Pflicht** für elektronische Aufzeichnungssysteme!

**Was ist eine TSE (Technische Sicherheitseinrichtung)?**
- Zertifiziertes Sicherheitsmodul (Hardware oder Cloud)
- Signiert jeden Geschäftsvorfall kryptografisch
- Erstellt Prüfwert (Signatur) pro Transaktion
- Speichert Daten manipulationssicher

**Betroffene Systeme:**
| System | TSE-Pflicht? |
|--------|--------------|
| Elektronische Registrierkasse | ✅ Ja |
| PC-Kassensystem | ✅ Ja |
| iPad/Tablet-Kasse | ✅ Ja |
| Kassensoftware | ✅ Ja |
| Offene Ladenkasse (nur Bargeld) | ❌ Nein |
| Excel-Kassenbuch | ❌ Nein (aber GoBD beachten!) |

**TSE-Daten pro Transaktion:**
```typescript
interface TSETransaction {
  transactionNumber: string;      // Fortlaufende Nummer
  startTime: Date;               // Beginn der Transaktion
  endTime: Date;                 // Ende (Bon-Druck)
  processType: 'Beleg' | 'AVSons662' | 'AVBelegabbruch';
  signature: string;             // Kryptografische Signatur
  signatureCounter: number;      // Signaturzähler
  serialNumber: string;          // TSE-Seriennummer
  publicKey: string;             // Öffentlicher Schlüssel
  timeFormat: string;            // Zeitformat
}
```

**DSFinV-K (Digitale Schnittstelle Finanzverwaltung für Kassensysteme):**
- Standardisiertes Exportformat für Betriebsprüfung
- Muss jederzeit exportierbar sein
- Enthält: Stammdaten, Bewegungsdaten, TSE-Daten

#### 3.7.5 Belegausgabepflicht (§146a Abs. 2 AO)

**Seit 01.01.2020**: Bei jedem Geschäftsvorfall MUSS ein Beleg erstellt werden!

**Pflichtangaben auf dem Bon:**
| Angabe | Beispiel |
|--------|----------|
| Name und Anschrift | Musterfirma GmbH, Musterstr. 1 |
| Datum und Uhrzeit | 16.01.2026, 14:32 Uhr |
| Menge und Art | 2x Produkt A |
| Entgelt und Steuerbetrag | 100,00 € + 19,00 € USt |
| Steuersatz | 19% |
| Transaktionsnummer | 2026-0001-4711 |
| TSE-Signatur | abc123... (verkürzt erlaubt) |
| TSE-Seriennummer | TSE-12345678 |
| Signaturzähler | 4711 |

**Kunde muss Beleg NICHT annehmen** – aber Anbieten ist Pflicht!

#### 3.7.6 Offene Ladenkasse (ohne Registrierkasse)

Für Unternehmen OHNE elektronische Kasse gilt:

**Täglicher Kassenbericht (Zählprotokoll):**
```
KASSENBERICHT vom 16.01.2026

MÜNZEN:
2,00 € × 15 Stück = 30,00 €
1,00 € × 23 Stück = 23,00 €
0,50 € × 40 Stück = 20,00 €
0,20 € × 35 Stück =  7,00 €
0,10 € × 50 Stück =  5,00 €
0,05 € × 30 Stück =  1,50 €
0,02 € × 25 Stück =  0,50 €
0,01 € × 50 Stück =  0,50 €
                   ─────────
Münzen gesamt:      87,50 €

SCHEINE:
500 € × 0 Stück =     0,00 €
200 € × 1 Stück =   200,00 €
100 € × 5 Stück =   500,00 €
 50 € × 8 Stück =   400,00 €
 20 € × 12 Stück =  240,00 €
 10 € × 15 Stück =  150,00 €
  5 € × 10 Stück =   50,00 €
                   ─────────
Scheine gesamt:   1.540,00 €

KASSENBESTAND:    1.627,50 €
- Wechselgeld:    - 200,00 €
= Tageslosung:    1.427,50 €
```

**Retrograde Methode (Rückrechnung):**
```
Endbestand (gezählt):        1.627,50 €
- Anfangsbestand:          -   400,00 €
= Saldo:                     1.227,50 €
+ Barausgaben:             +   200,00 €
= Tageslosung (Einnahmen):   1.427,50 €
```

#### 3.7.7 Bareinnahmen-Grenzen & Meldepflichten

**Geldwäschegesetz (GwG) Schwellenwerte:**
| Grenze | Pflicht |
|--------|---------|
| Ab 10.000 € Bargeld | Identifizierungspflicht + Dokumentation |
| Ab 10.000 € (Verdacht) | Meldepflicht an FIU (Financial Intelligence Unit) |
| Immobilienkauf | Komplett verboten mit Bargeld seit 2023! |

**Aufzeichnungspflichten bei hohen Barzahlungen:**
```typescript
interface HighValueCashRecord {
  date: Timestamp;
  amount: number;
  customerName: string;
  customerAddress: string;
  idType: 'Personalausweis' | 'Reisepass' | 'Führerschein';
  idNumber: string;
  idExpiry: Date;
  purposeOfTransaction: string;
  employeeId: string;             // Wer hat Identifizierung durchgeführt
}
```

#### 3.7.8 Typische Fehler bei der Kassenführung

| Fehler | Konsequenz | Vermeidung |
|--------|------------|------------|
| Negativer Kassenstand | Zuschätzung durch FA | Täglich prüfen |
| Lücken in Belegnummern | Verdacht auf Manipulation | Fortlaufend nummerieren |
| Nachträgliche Änderungen | GoBD-Verstoß | Nur Stornos, nie löschen |
| Keine tägliche Erfassung | Hinzuschätzung | Tagesabschluss |
| Fehlende Zählprotokolle | Verwerfung der Buchhaltung | Täglich zählen |
| Privatentnahmen nicht erfasst | Steuerhinterziehung | Separat buchen |
| Keine TSE bei el. Kasse | Bußgeld bis 25.000 € | TSE nachrüsten |

**Bußgelder bei Verstößen:**
| Verstoß | Bußgeld |
|---------|---------|
| Fehlende TSE | Bis 25.000 € |
| Keine Meldung bei Finanzamt | Bis 25.000 € |
| Keine Belegausgabe | Bis 10.000 € |
| Manipulation der Kasse | Straftat! |

#### 3.7.9 Firestore-Struktur Kassenbuch

```typescript
interface CashbookEntry {
  id: string;
  date: Timestamp;
  entryNumber: string;           // Fortlaufende Belegnummer
  type: 'einnahme' | 'ausgabe';
  amount: number;                // Immer positiv
  description: string;
  category: string;              // Erlöskonto
  taxRate: 0 | 7 | 19;
  taxAmount: number;
  netAmount: number;
  
  // Referenzen
  invoiceId?: string;            // Verknüpfte Rechnung
  expenseId?: string;            // Verknüpfte Ausgabe
  customerId?: string;           // Kunde (wenn bekannt)
  
  // Kassenstand
  balanceBefore: number;         // Bestand vor Buchung
  balanceAfter: number;          // Bestand nach Buchung
  
  // GoBD
  createdAt: Timestamp;
  createdBy: string;
  isLocked: boolean;
  lockedAt?: Timestamp;
  isCancelled: boolean;
  cancelledBy?: string;
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  
  // TSE (wenn elektronische Kasse)
  tseData?: {
    transactionNumber: string;
    signature: string;
    signatureCounter: number;
    tseSerialNumber: string;
    startTime: Timestamp;
    endTime: Timestamp;
  };
}

interface DailyCashReport {
  id: string;
  date: Timestamp;               // Datum des Abschlusses
  companyId: string;
  
  // Zählprotokoll
  coinCount: {
    cent1: number;
    cent2: number;
    cent5: number;
    cent10: number;
    cent20: number;
    cent50: number;
    euro1: number;
    euro2: number;
  };
  noteCount: {
    euro5: number;
    euro10: number;
    euro20: number;
    euro50: number;
    euro100: number;
    euro200: number;
    euro500: number;
  };
  
  // Berechnung
  openingBalance: number;        // Anfangsbestand
  totalIncome: number;           // Summe Einnahmen
  totalExpenses: number;         // Summe Ausgaben
  calculatedBalance: number;     // Rechnerischer Endbestand
  countedBalance: number;        // Gezählter Endbestand
  difference: number;            // Differenz
  differenceReason?: string;     // Erklärung bei Differenz
  
  // Unterschrift
  closedBy: string;              // Mitarbeiter-ID
  closedAt: Timestamp;
  isLocked: boolean;
}
```

### 3.8 Handwerker- & Baurechnungen

#### 3.8.1 Besonderheiten im Handwerk & Baugewerbe

**Gesetzliche Grundlagen**:
- UStG §13b (Reverse Charge bei Bauleistungen)
- BGB §631-651 (Werkvertragsrecht)
- VOB/B (Vergabe- und Vertragsordnung für Bauleistungen)
- HwO (Handwerksordnung)

**Typische Rechnungsarten im Handwerk:**
| Art | Verwendung | Besonderheit |
|-----|------------|--------------|
| **Kostenvoranschlag** | Vor Auftragserteilung | Unverbindlich (ca. ±20% Toleranz) |
| **Angebot** | Verbindliche Preiszusage | Bindungsfrist angeben |
| **Auftragsbestätigung** | Nach Beauftragung | Vertragsgrundlage |
| **Abschlagsrechnung** | Während Bauphase | Teilzahlung für erbrachte Leistungen |
| **Schlussrechnung** | Nach Fertigstellung | Endabrechnung mit Aufmaß |
| **Gutschrift** | Bei Mängeln/Reklamation | Storno oder Teilstorno |

#### 3.8.2 Pflichtangaben auf Handwerkerrechnungen

**Gemäß §14 UStG + branchenspezifische Anforderungen:**

| Pflichtangabe | Beispiel | Hinweis |
|---------------|----------|---------|
| Vollständiger Name & Anschrift | Mustermann Elektro GmbH, Musterstr. 1, 12345 Musterstadt | Leistungserbringer |
| Name & Anschrift des Kunden | Max Kunde, Kundenweg 5, 12345 Musterstadt | Leistungsempfänger |
| Steuernummer ODER USt-IdNr | DE123456789 oder 12/345/67890 | Pflicht! |
| Rechnungsdatum | 16.01.2026 | Ausstellungsdatum |
| Rechnungsnummer | RE-2026-00042 | Fortlaufend, einmalig |
| Leistungsdatum/-zeitraum | 10.01.2026 - 15.01.2026 | Wann wurde gearbeitet? |
| **Leistungsort** | Baustelle: Hauptstr. 10, 12345 Stadt | **Wichtig bei Bauleistungen!** |
| Menge & Art der Leistung | 8 Std. Elektroinstallation | Detailliert! |
| Einzelpreise | 65,00 €/Std. | Netto |
| Materialkosten | 5x Steckdose à 12,50 € | Einzeln aufführen |
| Nettobetrag | 520,00 € + 62,50 € = 582,50 € | Summe netto |
| Steuersatz & Steuerbetrag | 19% = 110,68 € | Oder §13b-Hinweis |
| Bruttobetrag | 693,18 € | Endsumme |
| Bankverbindung | IBAN, BIC | Für Überweisung |
| Zahlungsziel | Zahlbar innerhalb 14 Tagen | Optional mit Skonto |

**Zusätzlich bei Handwerkerleistungen (§35a EStG):**
```
Hinweis gemäß §35a EStG:
Lohnkosten (haushaltsnahe Handwerkerleistung): 520,00 €
Davon 20% steuerlich absetzbar: max. 1.200 €/Jahr
```

#### 3.8.3 Leistungstabelle (Positions-Aufbau)

**Standard-Struktur einer Handwerker-Leistungstabelle:**

```
┌─────┬────────────────────────────────────────┬────────┬─────────┬──────────┬────────────┐
│ Pos │ Beschreibung                           │ Menge  │ Einheit │ EP netto │ GP netto   │
├─────┼────────────────────────────────────────┼────────┼─────────┼──────────┼────────────┤
│ 1   │ ARBEITSLEISTUNGEN                      │        │         │          │            │
│ 1.1 │ Elektroinstallation Facharbeiter       │   8,00 │ Std.    │    65,00 │     520,00 │
│ 1.2 │ Helfer/Auszubildender                  │   4,00 │ Std.    │    35,00 │     140,00 │
│ 1.3 │ Anfahrt pauschal                       │   1,00 │ Psch.   │    45,00 │      45,00 │
├─────┼────────────────────────────────────────┼────────┼─────────┼──────────┼────────────┤
│     │ Zwischensumme Arbeitsleistungen        │        │         │          │     705,00 │
├─────┼────────────────────────────────────────┼────────┼─────────┼──────────┼────────────┤
│ 2   │ MATERIAL                               │        │         │          │            │
│ 2.1 │ Schuko-Steckdose, UP, weiß             │   5,00 │ Stk.    │    12,50 │      62,50 │
│ 2.2 │ NYM-J 3x1,5mm², 100m Ring              │   1,00 │ Stk.    │    89,00 │      89,00 │
│ 2.3 │ Leitungsschutzschalter B16A            │   3,00 │ Stk.    │    15,80 │      47,40 │
│ 2.4 │ Kleinmaterial (Schrauben, Dübel, etc.) │   1,00 │ Psch.   │    25,00 │      25,00 │
├─────┼────────────────────────────────────────┼────────┼─────────┼──────────┼────────────┤
│     │ Zwischensumme Material                 │        │         │          │     223,90 │
├─────┼────────────────────────────────────────┼────────┼─────────┼──────────┼────────────┤
│     │ NETTOBETRAG GESAMT                     │        │         │          │     928,90 │
│     │ zzgl. 19% MwSt                         │        │         │          │     176,49 │
├─────┼────────────────────────────────────────┼────────┼─────────┼──────────┼────────────┤
│     │ BRUTTOBETRAG                           │        │         │          │   1.105,39 │
└─────┴────────────────────────────────────────┴────────┴─────────┴──────────┴────────────┘
```

**Einheiten im Handwerk:**
| Kürzel | Bedeutung | Typische Verwendung |
|--------|-----------|---------------------|
| Std. | Stunde | Arbeitszeit |
| Stk. | Stück | Material, Bauteile |
| m | Meter | Kabel, Rohre, Leisten |
| m² | Quadratmeter | Flächen (Malen, Fliesen) |
| m³ | Kubikmeter | Erdarbeiten, Beton |
| lfm | Laufende Meter | Rohre, Profile |
| Psch. | Pauschal | Anfahrt, Kleinmaterial |
| kg | Kilogramm | Metall, Schüttgut |
| l | Liter | Farbe, Flüssigkeiten |
| Satz | Satz/Set | Werkzeug-Sets |

#### 3.8.4 Abschlagsrechnungen & Schlussrechnung

**Abschlagsrechnung (§632a BGB):**

Berechtigung zur Abschlagsrechnung:
- Bei Werkverträgen (BGB §631)
- Für in sich abgeschlossene Teile des Werks
- Oder nach VOB/B §16 (Bauleistungen)

**Beispiel Abschlagsrechnung:**
```
ABSCHLAGSRECHNUNG Nr. 1
zum Auftrag: Elektroinstallation Neubau EFH

Auftragssumme netto:                    15.000,00 €

Bisher erbrachte Leistungen:
- Rohinstallation EG + OG komplett           40%
- Material geliefert und verbaut             35%
────────────────────────────────────────────────
Leistungsstand gesamt:                       75%

75% von 15.000,00 € =                   11.250,00 €
./. bereits gezahlte Abschläge:         - 5.000,00 €
────────────────────────────────────────────────
Abschlagsforderung netto:                6.250,00 €
zzgl. 19% MwSt:                          1.187,50 €
────────────────────────────────────────────────
ZAHLBETRAG:                              7.437,50 €
```

**Schlussrechnung:**

Pflichtbestandteile der Schlussrechnung:
1. Vollständige Leistungsaufstellung (Aufmaß)
2. Alle Abschlagsrechnungen auflisten
3. Alle erhaltenen Zahlungen abziehen
4. Gewährleistungseinbehalt (falls vereinbart)

**Beispiel Schlussrechnung:**
```
SCHLUSSRECHNUNG
zum Auftrag: Elektroinstallation Neubau EFH

Leistungen gemäß Aufmaß vom 15.01.2026:
(siehe beiliegendes Aufmaßblatt)

Pos. 1: Arbeitsleistungen                8.450,00 €
Pos. 2: Elektromaterial                  5.890,00 €
Pos. 3: Zusatzleistungen lt. Nachtrag      660,00 €
────────────────────────────────────────────────
AUFTRAGSSUMME NETTO:                    15.000,00 €
zzgl. 19% MwSt:                          2.850,00 €
────────────────────────────────────────────────
BRUTTO-AUFTRAGSSUMME:                   17.850,00 €

./. Abschlagsrechnung Nr. 1 (gezahlt)   - 5.950,00 €
./. Abschlagsrechnung Nr. 2 (gezahlt)   - 5.950,00 €
./. 5% Sicherheitseinbehalt               - 892,50 €
────────────────────────────────────────────────
RESTZAHLUNG (SCHLUSSZAHLUNG):            5.057,50 €

Hinweis: Der Sicherheitseinbehalt von 892,50 € wird 
nach Ablauf der Gewährleistungsfrist (5 Jahre) bzw. 
bei Vorlage einer Bürgschaft ausgezahlt.
```

#### 3.8.5 Aufmaß & Mengenermittlung

**Was ist ein Aufmaß?**
Die genaue Ermittlung der tatsächlich erbrachten Leistungsmengen vor Ort.

**Aufmaßblatt-Struktur:**
```
AUFMASSBLATT

Bauvorhaben: Neubau EFH Mustermann
Aufmaß-Nr.: AM-2026-001
Datum: 15.01.2026
Anwesend: Herr Mustermann (AG), Herr Schmidt (AN)

┌─────┬──────────────────────────┬────────────────────────────────┬───────────┐
│ Pos │ Leistung                 │ Berechnung                     │ Menge     │
├─────┼──────────────────────────┼────────────────────────────────┼───────────┤
│ 1.1 │ NYM-J 3x1,5mm² verlegt   │ EG: 45m + OG: 62m + Keller:23m │   130 m   │
│ 1.2 │ NYM-J 5x2,5mm² verlegt   │ Küche: 15m + Bad: 12m          │    27 m   │
│ 2.1 │ Steckdosen UP montiert   │ EG: 12 + OG: 15 + Keller: 3    │    30 Stk │
│ 2.2 │ Schalter UP montiert     │ EG: 8 + OG: 6                  │    14 Stk │
│ 3.1 │ Unterverteilung          │ 1 Stk. 4-reihig                │     1 Stk │
└─────┴──────────────────────────┴────────────────────────────────┴───────────┘

Unterschrift Auftraggeber: _________________
Unterschrift Auftragnehmer: _________________
```

**VOB-Aufmaßregeln (VOB/C):**
- Längen: Auf volle 10 cm aufrunden
- Flächen: Öffnungen ≤ 2,5 m² werden übermessen
- Rohre: Formstücke werden mitgemessen

#### 3.8.6 Reverse Charge bei Bauleistungen (§13b UStG)

**WICHTIG für B2B-Geschäfte im Baugewerbe!**

**Wann gilt §13b (Reverse Charge)?**
| Konstellation | Reverse Charge? |
|---------------|-----------------|
| Handwerker → Privatkunde | ❌ Nein, normale USt |
| Handwerker → Unternehmer (kein Bau) | ❌ Nein, normale USt |
| **Handwerker → Bauunternehmer** | ✅ **Ja, §13b!** |
| **Subunternehmer → Generalunternehmer** | ✅ **Ja, §13b!** |
| Handwerker → Vermieter (>10% Bauleistungen) | ✅ Ja, §13b! |

**Was sind "Bauleistungen" im Sinne von §13b?**
- Werklieferungen und Werkleistungen
- Die der Herstellung, Instandsetzung, Änderung oder Beseitigung von Bauwerken dienen
- Einschließlich: Einbau von Fenstern, Türen, Heizung, Elektro, Sanitär

**Rechnung MIT §13b (ohne USt):**
```
Subunternehmer Schmidt GmbH
an: Generalunternehmer Müller Bau AG

Elektroinstallation Bauvorhaben XY
Leistungszeitraum: 01.01. - 15.01.2026

Nettobetrag:                           15.000,00 €

Hinweis gemäß §13b UStG:
Die Umsatzsteuer für diese Bauleistung schuldet 
der Leistungsempfänger (Reverse Charge).

USt-IdNr. Leistungserbringer: DE123456789
USt-IdNr. Leistungsempfänger: DE987654321

ZAHLBETRAG (netto):                    15.000,00 €
```

**Nachweis der Bauleistereigenschaft:**
- Leistungsempfänger muss Bescheinigung nach §13b Abs. 5 UStG vorlegen
- Oder: Im Vorjahr mind. 10% Umsatz aus Bauleistungen
- Gültigkeitsprüfung beim Finanzamt (Bescheinigung USt 1 TG)

#### 3.8.7 Stundensätze & Kalkulation

**Übliche Stundensätze im Handwerk (2026, Richtwerte):**

| Gewerk | Meister/Geselle | Helfer/Azubi | Anfahrt |
|--------|-----------------|--------------|---------|
| Elektro | 55-75 €/Std. | 35-45 €/Std. | 35-55 € |
| Sanitär/Heizung | 55-80 €/Std. | 35-45 €/Std. | 35-55 € |
| Maler | 45-60 €/Std. | 30-40 €/Std. | 30-45 € |
| Tischler | 55-75 €/Std. | 35-45 €/Std. | 35-55 € |
| Dachdecker | 55-80 €/Std. | 35-45 €/Std. | 45-65 € |
| Maurer | 50-70 €/Std. | 35-45 €/Std. | 40-60 € |
| Fliesenleger | 50-70 €/Std. | 35-45 €/Std. | 35-50 € |
| Schlosser/Metallbau | 55-80 €/Std. | 35-45 €/Std. | 40-60 € |
| KFZ-Mechaniker | 80-130 €/Std. | 40-55 €/Std. | - |

**Stundenverrechnungssatz-Kalkulation:**
```
Produktivlohn (Tariflohn)                    22,00 €/Std.
+ Lohnnebenkosten (~40%)                    + 8,80 €
= Lohnkosten gesamt                          30,80 €

+ Gemeinkosten (~100% des Lohns)            + 30,80 €
  (Miete, Versicherung, Büro, Fahrzeuge...)
= Selbstkosten                               61,60 €

+ Gewinn (~15%)                             +  9,24 €
= Stundenverrechnungssatz netto              70,84 €
+ 19% MwSt                                  + 13,46 €
= Stundenverrechnungssatz brutto             84,30 €
```

**Material-Kalkulation:**
```
Einkaufspreis netto                          50,00 €
+ Handlingkosten (~10%)                     +  5,00 €
+ Gewinnaufschlag (~15-30%)                 + 10,00 €
= Verkaufspreis netto                        65,00 €
+ 19% MwSt                                  + 12,35 €
= Verkaufspreis brutto                       77,35 €
```

#### 3.8.8 Gewährleistung & Sicherheitseinbehalt

**Gewährleistungsfristen:**
| Regelung | Frist | Typische Anwendung |
|----------|-------|-------------------|
| BGB §634a | 5 Jahre | Bauleistungen am Gebäude |
| BGB §634a | 2 Jahre | Sonstige Werkleistungen |
| VOB/B §13 | 4 Jahre | Wenn VOB vereinbart |

**Sicherheitseinbehalt:**
- Üblich: 5% der Brutto-Auftragssumme
- Dauer: Bis Ende der Gewährleistungsfrist
- Alternative: Gewährleistungsbürgschaft (Bank)

**Bürgschaftsarten:**
| Art | Zweck | Höhe |
|-----|-------|------|
| Vertragserfüllungsbürgschaft | Sichert Auftragsausführung | 10% |
| Gewährleistungsbürgschaft | Sichert Mängelbeseitigung | 5% |
| Anzahlungsbürgschaft | Sichert Vorauszahlung | 100% der Anzahlung |

#### 3.8.9 Firestore-Struktur für Handwerkerrechnungen

```typescript
interface HandwerkerInvoice extends Invoice {
  // Branchenspezifische Felder
  projectSite: {
    street: string;
    city: string;
    postalCode: string;
    description?: string;        // "Neubau EFH", "Dachsanierung"
  };
  
  // Vertragsart
  contractType: 'bgb_werkvertrag' | 'vob_b' | 'kleinauftrag';
  
  // Rechnungsart
  invoiceType: 'angebot' | 'auftragsbestaetigung' | 
               'abschlagsrechnung' | 'schlussrechnung' | 'gutschrift';
  
  // Bei Abschlagsrechnungen
  abschlagInfo?: {
    abschlagNumber: number;      // 1, 2, 3...
    totalContractValue: number;  // Gesamtauftragssumme
    percentageCompleted: number; // Leistungsstand %
    previousPayments: number;    // Bereits gezahlte Abschläge
  };
  
  // Bei Schlussrechnungen
  schlussInfo?: {
    aufmassDate: Timestamp;
    aufmassDocument?: string;    // Link zum Aufmaß-PDF
    securityRetention: number;   // Sicherheitseinbehalt
    retentionReleaseDate?: Timestamp;
    previousAbschlaege: {
      invoiceId: string;
      amount: number;
      paidDate: Timestamp;
    }[];
  };
  
  // §13b Reverse Charge
  reverseCharge: boolean;
  reverseChargeReason?: 'bauleistung_b2b' | 'eu_leistung' | 'sonstige';
  recipientVatId?: string;       // USt-IdNr des Leistungsempfängers
  
  // §35a Steuerbonus
  haushaltsnaheLeistung: boolean;
  lohnkostenAnteil?: number;     // Für §35a-Bescheinigung
  
  // Gewährleistung
  warrantyPeriod: number;        // In Monaten
  warrantyEndDate?: Timestamp;
}

interface InvoicePosition {
  id: string;
  positionNumber: string;        // "1.1", "2.3"
  category: 'arbeit' | 'material' | 'maschine' | 'sonstiges';
  description: string;
  longDescription?: string;      // Detaillierte Beschreibung
  
  quantity: number;
  unit: 'std' | 'stk' | 'm' | 'm2' | 'm3' | 'lfm' | 'psch' | 'kg' | 'l';
  unitPrice: number;             // Einzelpreis netto
  totalPrice: number;            // Gesamtpreis netto (quantity × unitPrice)
  
  // Für Material
  articleNumber?: string;
  manufacturer?: string;
  
  // Für Stundenleistungen
  workerType?: 'meister' | 'geselle' | 'helfer' | 'azubi';
  workDate?: Timestamp;
  
  taxRate: 0 | 7 | 19;
  
  // Zuordnung
  costCenter?: string;           // Kostenstelle
  project?: string;              // Projekt/Bauvorhaben
}

// Aufmaß-Dokument
interface AufmassDocument {
  id: string;
  companyId: string;
  invoiceId?: string;
  
  projectName: string;
  projectSite: string;
  aufmassDate: Timestamp;
  
  participants: {
    name: string;
    role: 'auftraggeber' | 'auftragnehmer' | 'bauleiter';
    signature?: string;          // Base64 Unterschrift
  }[];
  
  positions: {
    posNumber: string;
    description: string;
    calculation: string;         // "EG: 45m + OG: 62m"
    quantity: number;
    unit: string;
  }[];
  
  notes?: string;
  photos?: string[];             // Links zu Fotos
  
  createdAt: Timestamp;
  createdBy: string;
}
```

#### 3.8.10 Checkliste Handwerkerrechnung

```
☐ Vollständige Absenderangaben (Name, Anschrift, Kontakt)
☐ Steuernummer ODER USt-IdNr.
☐ Vollständige Empfängerangaben
☐ Rechnungsnummer (fortlaufend)
☐ Rechnungsdatum
☐ Leistungszeitraum / Leistungsdatum
☐ Leistungsort (Baustelle)
☐ Detaillierte Leistungsbeschreibung
☐ Mengen und Einheiten korrekt
☐ Einzelpreise und Gesamtpreise
☐ Material separat aufgeführt
☐ Nettosumme
☐ Steuersatz und Steuerbetrag (oder §13b-Hinweis!)
☐ Bruttosumme
☐ Bankverbindung (IBAN, BIC)
☐ Zahlungsziel / Skonto
☐ Bei §35a: Lohnkostenanteil ausweisen
☐ Bei Abschlag: Bezug zum Gesamtauftrag
☐ Bei Schluss: Alle Abschläge abziehen
☐ Unterschrift (bei VOB empfohlen)
```

---

## 4. Betriebswirtschaftliche Auswertungen

### 4.1 BWA (Betriebswirtschaftliche Auswertung)

**Ursprung**: DATEV Standard-BWA Nr. 1 (seit 1969)

**Zweck**:
- Monatliche/quartalsweise Ertragslage-Übersicht
- Grundlage für Bankkredite und Controlling
- KEINE gesetzliche Pflicht, aber in der Praxis unverzichtbar

**Struktur der Standard-BWA Nr. 1** (wie in Taskilo implementiert):

```
UMSATZ & ERLÖSE
├── Zeile 1: Umsatzerlöse
├── Zeile 2: Bestandsveränderungen
├── Zeile 3: Aktivierte Eigenleistungen
├── Zeile 4: Sonstige Erlöse
└── Zeile 5: GESAMTLEISTUNG

MATERIALAUFWAND
├── Zeile 10: Wareneinkauf
├── Zeile 11: Fremdleistungen
├── Zeile 15: MATERIALAUFWAND GESAMT
└── Zeile 16: ROHERTRAG (= Gesamtleistung - Materialaufwand)
    └── Rohertrag-Quote: Rohertrag / Gesamtleistung × 100

PERSONALKOSTEN
├── Zeile 20: Löhne und Gehälter
├── Zeile 21: Soziale Abgaben
├── Zeile 22: Sonstige Personalkosten
└── Zeile 25: PERSONALKOSTEN GESAMT

RAUMKOSTEN
├── Zeile 30: Miete/Pacht
├── Zeile 31: Nebenkosten
└── Zeile 35: RAUMKOSTEN GESAMT

FAHRZEUG-/REISEKOSTEN
├── Zeile 40: Kfz-Kosten
├── Zeile 41: Reisekosten
└── Zeile 45: FAHRZEUGKOSTEN GESAMT

SONSTIGE KOSTEN
├── Zeile 50: Werbekosten
├── Zeile 51: Versicherungen
├── Zeile 52: Reparaturen/Instandhaltung
├── Zeile 53: Bürokosten
├── Zeile 54: Telekommunikation
├── Zeile 55: Beratungskosten
├── Zeile 56: Sonstige Aufwendungen
└── Zeile 60: SONSTIGE KOSTEN GESAMT

ABSCHREIBUNGEN
└── Zeile 65: Abschreibungen (AfA)

ERGEBNIS
├── Zeile 70: BETRIEBSERGEBNIS
├── Zeile 71: Zinserträge
├── Zeile 72: Zinsaufwendungen
├── Zeile 73: Neutrales Ergebnis
├── Zeile 74: ERGEBNIS VOR STEUERN
├── Zeile 75: Steuern vom Einkommen/Ertrag
└── Zeile 80: JAHRESÜBERSCHUSS/-FEHLBETRAG
```

**Wichtige Kennzahlen**:
- **Rohertrag-Quote**: Rohertrag / Gesamtleistung × 100 (branchenabhängig 30-70%)
- **Deckungsbeitrag I**: Rohertrag
- **Deckungsbeitrag II**: Rohertrag - Personalkosten
- **Cashflow**: Jahresüberschuss + Abschreibungen

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

### 6.3 DATEV-Export (Buchungsdatenservice) ✅ VOLLSTÄNDIG IMPLEMENTIERT

**Implementiert am**: 20.01.2026
**Status**: Produktionsreif

#### 6.3.1 Übersicht

Der DATEV-Export ermöglicht den Export von Buchungsdaten im offiziellen **DATEV EXTF-Format** (Extended Format). Dies ist das Standardformat für den Austausch mit DATEV-Software und Steuerberatern.

**Exportierbare Daten**:
- Ausgangsrechnungen (Debitorenbuchungen)
- Eingangsrechnungen/Ausgaben (Kreditorenbuchungen)
- Belegbilder als ZIP-Archiv

#### 6.3.2 Technische Implementierung

**Service-Datei**: `/src/services/datevExportService.ts`

```typescript
interface DatevExportOptions {
  companyId: string;
  startDate: Date;
  endDate: Date;
  beraternummer: string;     // 5-7 stellig
  mandantennummer: string;   // 1-5 stellig
  wirtschaftsjahrBeginn: string; // MMDD Format
  kontenrahmen?: 'SKR03' | 'SKR04';
  exportType?: 'invoices' | 'expenses' | 'all';
}

interface DatevExportResult {
  csvContent: string;        // DATEV ASCII-Datei
  zipContent?: string;       // Base64-kodiertes ZIP mit Belegen
  statistics: {
    totalBookings: number;
    invoiceCount: number;
    expenseCount: number;
    totalRevenue: number;
    totalExpenses: number;
  };
}
```

**DATEV EXTF-Format-Struktur**:
```
Zeile 1: Header (Formatversion, Datenkategorie, Beraternummer, Mandantennummer, etc.)
Zeile 2: Feldbezeichnungen (Umsatz, Soll/Haben, Konto, Gegenkonto, etc.)
Zeile 3+: Buchungsdaten
```

**Wichtige DATEV-Felder**:
| Feld | Beschreibung | Beispiel |
|------|--------------|----------|
| Umsatz | Bruttobetrag | 1190,00 |
| Soll/Haben | S oder H | S |
| Konto | Debitor/Kreditor | 10001 |
| Gegenkonto | Sachkonto | 8400 |
| BU-Schlüssel | Steuerschlüssel | 3 (19% USt) |
| Belegdatum | DDMM Format | 1501 |
| Belegfeld 1 | Rechnungsnummer | RE-2026-0001 |
| Buchungstext | Beschreibung | Kunde Müller |
| Beleglink | Pfad zum Beleg | BEDI/invoice_001.pdf |

#### 6.3.3 API-Endpunkt

**Route**: `/api/datev/export/bookings`

**Request**:
```typescript
POST /api/datev/export/bookings
{
  companyId: string;
  startDate: string;  // ISO-8601
  endDate: string;    // ISO-8601
}
```

**Response**:
```typescript
{
  success: true;
  csvContent: string;     // DATEV ASCII-Inhalt
  zipContent: string;     // Base64 ZIP
  statistics: {
    totalBookings: number;
    invoiceCount: number;
    expenseCount: number;
    totalRevenue: number;
    totalExpenses: number;
  }
}
```

#### 6.3.4 UI-Seiten

**Konfigurationsseite**: `/dashboard/company/[uid]/datev/export/booking-data-service`
- Eingabe von Beraternummer und Mandantennummer
- Wirtschaftsjahresbeginn einstellen
- Exporttyp wählen (Rechnungen, Ausgaben, Alle)
- **Speichert Einstellungen in Firebase** (`companies/{uid}.datevSettings`)

**Transfer-Seite**: `/dashboard/company/[uid]/datev/export/booking-data-service/transfer`
- Lädt echte Firmendaten aus Firebase
- Zeigt DATEV-Konfiguration an
- Download als CSV und ZIP
- Fortschrittsanzeige

#### 6.3.5 Firebase-Datenstruktur

**DATEV-Einstellungen** (in `companies/{uid}`):
```typescript
interface CompanyDatevSettings {
  datevSettings?: {
    beraternummer: string;
    mandantennummer: string;
    wirtschaftsjahrBeginn: string;
    kontenrahmen: 'SKR03' | 'SKR04';
    exportType: 'invoices' | 'expenses' | 'all';
  };
}
```

#### 6.3.6 ZIP-Erstellung mit JSZip

Belegbilder werden automatisch in einem ZIP-Archiv zusammengefasst:
- Ordnerstruktur: `BEDI/` (Belegdienst-Standard)
- Dateinamen: `invoice_{id}.pdf`, `expense_{id}.pdf`
- Format: Base64-kodiert für Download

#### 6.3.7 Steuerschlüssel (BU-Schlüssel)

| BU-Schlüssel | Bedeutung | Anwendung |
|--------------|-----------|-----------|
| 2 | 7% Vorsteuer | Eingangrechnung 7% |
| 3 | 19% Vorsteuer | Eingangsrechnung 19% |
| 8 | 7% Umsatzsteuer | Ausgangsrechnung 7% |
| 9 | 19% Umsatzsteuer | Ausgangsrechnung 19% |
| 40 | Innergemeinschaftliche Lieferung | EU-Verkauf |
| 94 | Reverse Charge § 13b | Bauleistungen |

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

---

## 8. Buchhaltungsmodul-Routen

### 8.1 Hauptbereiche

| Route | Beschreibung | Status |
|-------|-------------|--------|
| `/finance/quotes` | Angebotsverwaltung | ✅ |
| `/finance/quotes/create` | Neues Angebot erstellen | ✅ |
| `/finance/quotes/[quoteId]` | Angebot ansehen/bearbeiten | ✅ |
| `/finance/quotes/drafts` | Angebots-Entwürfe | ✅ |
| `/finance/quotes/sent` | Gesendete Angebote | ✅ |
| `/finance/quotes/accepted` | Angenommene Angebote | ✅ |
| `/finance/order-confirmations` | Auftragsbestätigungen | ✅ |
| `/finance/invoices` | Rechnungsverwaltung | ✅ |
| `/finance/invoices/create` | Neue Rechnung erstellen | ✅ |
| `/finance/invoices/[invoiceId]` | Rechnung ansehen/bearbeiten | ✅ |
| `/finance/invoices/recurring` | Wiederkehrende Rechnungen | ✅ |
| `/finance/invoices/recurring/create` | Neue wiederkehrende Rechnung | ✅ |
| `/finance/delivery-notes` | Lieferscheine | ✅ |
| `/finance/reminders` | Mahnungen | ✅ |
| `/finance/reminders/create` | Neue Mahnung erstellen | ✅ |
| `/finance/credits` | Gutschriften | ✅ |
| `/finance/expenses` | Ausgabenverwaltung | ✅ |
| `/finance/expenses/create` | Neue Ausgabe erfassen | ✅ |
| `/finance/expenses/[expenseId]` | Ausgabe ansehen/bearbeiten | ✅ |
| `/finance/expenses/recurring` | Wiederkehrende Ausgaben | ✅ |
| `/finance/expenses/assets` | Anlagevermögen (AfA) | ✅ |
| `/finance/taxes` | Steuerverwaltung | ✅ |
| `/finance/reports` | Finanzberichte (BWA/SuSa/EÜR) | ✅ |
| `/finance/accounting` | Buchhaltungsübersicht | ✅ |
| `/finance/cashbook` | Kassenbuch | ✅ |
| `/finance/einvoices` | E-Rechnungen (XRechnung/ZUGFeRD) | ✅ |
| `/finance/payments` | Zahlungsverwaltung | ✅ |

### 8.2 DATEV-Integration Routen

| Route | Beschreibung | Status |
|-------|-------------|--------|
| `/datev` | DATEV-Übersicht | ✅ |
| `/datev/debug` | DATEV-Debug | ✅ |
| `/datev/export` | DATEV-Export | ✅ |
| `/datev/overview` | DATEV-Übersicht | ✅ |
| `/datev/setup` | DATEV-Setup | ✅ |

---

## 9. Firestore-Datenstrukturen

### 9.1 Rechnungen (GoBD-konform)

**Collection**: `companies/{companyId}/invoices`

```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;          // Formatierte Rechnungsnummer
  sequentialNumber: number;       // Fortlaufende Nummer (GoBD)
  customerId: string;
  customerName: string;
  invoiceDate: Timestamp;
  dueDate: Timestamp;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  taxRuleType: TaxRuleType;       // DE_TAXABLE, DE_TAXABLE_REDUCED, etc.
  
  // GoBD-Felder
  isLocked: boolean;              // Rechnung festgeschrieben
  gobdStatus: 'draft' | 'locked';
  lockedAt?: Timestamp;           // Zeitpunkt der Festschreibung
  lockedBy?: string;              // User-ID
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 9.2 Auftragsbestätigungen

**Collection**: `companies/{companyId}/orderConfirmations`

```typescript
interface OrderConfirmation {
  id: string;
  confirmationNumber: string;
  quoteId?: string;
  quoteNumber?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  date: Date;
  validUntil?: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

### 9.3 Wiederkehrende Ausgaben

**Collection**: `companies/{companyId}/recurringExpenses`

```typescript
interface RecurringExpense {
  id: string;
  name: string;
  description?: string;
  amount: number;
  vatRate: number;
  category: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  nextDueDate: Date;
  lastExecuted?: Date;
  status: 'active' | 'paused' | 'cancelled';
  supplier?: string;
  accountingCategory?: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

### 9.4 Anlagevermögen (AfA)

**Collection**: `companies/{companyId}/fixedAssets`

```typescript
interface FixedAsset {
  id: string;
  name: string;
  description?: string;
  category: string;                              // Gebäude, Fahrzeuge, IT, etc.
  acquisitionDate: Date;
  acquisitionCost: number;                       // Anschaffungskosten (netto)
  currentValue: number;                          // Aktueller Buchwert
  depreciationMethod: 'linear' | 'degressive' | 'none';
  usefulLifeYears: number;                       // Nutzungsdauer in Jahren
  residualValue: number;                         // Restwert
  serialNumber?: string;
  location?: string;
  supplier?: string;
  invoiceNumber?: string;
  status: 'active' | 'disposed' | 'sold';
  disposalDate?: Date;
  disposalValue?: number;
  datevAccount?: string;                         // DATEV-Kontonummer (SKR03)
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

### 9.5 TaxRuleType Enum

```typescript
type TaxRuleType = 
  | 'DE_TAXABLE'           // 19% Regelsteuersatz
  | 'DE_TAXABLE_REDUCED'   // 7% ermäßigt
  | 'DE_EXEMPT_4_USTG'     // 0% steuerbefreit (§4 UStG)
  | 'DE_REVERSE_13B'       // §13b Reverse Charge (Inland)
  | 'EU_REVERSE_18B'       // §18b Reverse Charge (EU)
  | 'EU_INTRACOMMUNITY_SUPPLY'  // Innergemeinschaftliche Lieferung
  | 'EU_OSS'               // One-Stop-Shop
  | 'NON_EU_EXPORT'        // Ausfuhr (Drittland)
  | 'NON_EU_OUT_OF_SCOPE'; // Nicht steuerbar
```

### 9.6 Firestore-Regeln (Auszug)

```javascript
// Auftragsbestätigungen
match /companies/{companyId}/orderConfirmations/{confirmationId} {
  allow read: if (request.auth.uid == companyId && isCompany()) ||
                 isEmployeeOf(companyId) || isSupportStaff();
  allow create, update: if (request.auth.uid == companyId && isCompany()) ||
                           isEmployeeOf(companyId);
  allow delete: if isSupportStaff(); // GoBD-Konformität
}

// Wiederkehrende Ausgaben
match /companies/{companyId}/recurringExpenses/{expenseId} {
  allow read, list: if (request.auth.uid == companyId && isCompany()) ||
                       isEmployeeOf(companyId) || isSupportStaff();
  allow create, update, delete: if (request.auth.uid == companyId && isCompany()) ||
                                   isEmployeeOf(companyId) || isSupportStaff();
}

// Anlagevermögen
match /companies/{companyId}/fixedAssets/{assetId} {
  allow read, list: if (request.auth.uid == companyId && isCompany()) ||
                       isEmployeeOf(companyId) || isSupportStaff();
  allow create, update: if (request.auth.uid == companyId && isCompany()) ||
                           isEmployeeOf(companyId);
  allow delete: if isSupportStaff(); // GoBD
}
```

---

## 10. Services & Backend

### 10.1 Übersicht der Steuer-Services

| Service | Datei | Zeilen | Beschreibung |
|---------|-------|--------|--------------|
| **TaxService** | `taxService.ts` | ~1084 | UStVA, EÜR, GuV, BWA aus echten Daten |
| **FixedAssetService** | `fixedAssetService.ts` | ~645 | Anlagenbuchhaltung, AfA nach §7 EStG |
| **DatevAuswertungsService** | `datevAuswertungsService.ts` | ~1052 | BWA, SuSa, EÜR Generierung |
| **BusinessReportService** | `businessReportService.ts` | ~1188 | KPI-Aggregation |
| **GermanyValidationEngine** | `GermanyValidationEngine.ts` | - | Steuerliche Validierungen |

### 10.2 TaxService

```typescript
// Lädt echte Firestore-Daten (keine Mocks!)
static async calculateUStVA(companyId: string, year: number, quarter: number): Promise<UStVA>
static async calculateEUeR(companyId: string, year: number): Promise<EUeR>
static async calculateGuV(companyId: string, year: number): Promise<GuV>
static async calculateBWA(companyId: string, year: number, month: number): Promise<BWA>
```

**Integration mit FixedAssetService für AfA-Werte**

### 10.3 FixedAssetService

```typescript
static async createAsset(companyId: string, asset: FixedAssetInput): Promise<FixedAsset>
static async calculateYearlyDepreciation(asset: FixedAsset, year: number): Promise<number>
static async generateDepreciationSchedule(asset: FixedAsset): Promise<DepreciationSchedule[]>
static async disposeAsset(companyId: string, assetId: string, disposal: DisposalInfo): Promise<void>
static determineGwgTreatment(netPrice: number): 'sofortabzug' | 'sammelposten' | 'normal'
```

**AfA-Tabelle (Beispiele):**
| Kategorie | Nutzungsdauer | AfA-Satz | DATEV-Konto |
|-----------|---------------|----------|-------------|
| Computer/Notebooks | 3 Jahre | 33,33% | 0420 |
| Büromöbel | 13 Jahre | 7,69% | 0410 |
| Pkw | 6 Jahre | 16,67% | 0320 |
| Maschinen | 10 Jahre | 10,00% | 0210 |
| Gebäude (gewerblich) | 33 Jahre | 3,00% | 0100 |

### 10.4 DatevAuswertungsService

```typescript
static async generateBWA(companyId: string, monat: number, jahr: number): Promise<BWAData>
static async generateSuSa(companyId: string, monat: number, jahr: number): Promise<SuSaData>
static async generateEUR(companyId: string, jahr: number): Promise<EURData>
```

**Netto-Berechnung mit TaxRuleType:**
```typescript
// Korrekte Netto-Berechnung je nach Steuersatz
static calculateNetAmount(bruttoAmount: number, taxRuleType: TaxRuleType): number {
  const ustSatz = this.getUstSatzFromTaxRuleType(taxRuleType);
  return bruttoAmount / (1 + ustSatz);
}

static getUstSatzFromTaxRuleType(taxRuleType: TaxRuleType): number {
  switch (taxRuleType) {
    case 'DE_TAXABLE': return 0.19;
    case 'DE_TAXABLE_REDUCED': return 0.07;
    default: return 0;  // 0% für alle anderen
  }
}
```

**Konten-Mapping (BWA-Zeilen):**
| BWA-Position | Konten (SKR03) | Status |
|--------------|----------------|--------|
| Umsatzerlöse | 4000-4499 | ✅ |
| Bestandsveränderungen | 4800-4899 | ✅ |
| Wareneinkauf | 5000-5199 | ✅ |
| Personalkosten | 6000-6199 | ⚠️ Teilweise |
| Raumkosten | 6200-6299 | ✅ |
| Kfz-Kosten | 6300-6399 | ✅ |
| Abschreibungen | 6900-6999 | ✅ |
| Zinsen | 7000-7399 | ✅ |
| Steuern | 7600-7699 | ✅ |

### 10.5 HR-System & Personalkosten-Integration

**Aktuelle Architektur (Stand: 16.01.2026):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSONAL-MODUL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  PersonalService.ts                                                          │
│  ├── getEmployees()         → companies/{id}/employees                      │
│  ├── createPayroll()        → companies/{id}/payrolls                       │
│  ├── getPayrolls()          → Lädt Gehaltsabrechnungen                      │
│  ├── calculateEmployeeCosts() → Monatl. Kosten + AG-SV                      │
│  └── getPersonalStats()     → Aggregierte Personalstatistik                 │
│                                                                              │
│  UI-Seiten:                                                                  │
│  ├── /personal/payroll      → Lohnvorbereitung (Brutto/Netto/Abzüge)       │
│  ├── /personal/costs        → Personalkostenkalkulation                     │
│  ├── /personal/employees    → Mitarbeiterverwaltung                         │
│  └── /personal/analytics    → Personal-Auswertungen                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BUCHHALTUNG / AUSWERTUNGEN                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  businessReportService.ts   ✅ Nutzt Payrolls korrekt                       │
│  ├── generateBWA()          → Lädt payrolls Collection                      │
│  │   └── totalSalaries      = Σ payroll.grossSalary                         │
│  │   └── totalSocialSecurity = Σ payroll.employerCosts.socialSecurity       │
│  │   └── totalPersonnelCosts = totalSalaries + totalSocialSecurity          │
│  ├── generateEUR()          → Personalkosten in EÜR                         │
│  └── generateMonthlyData()  → Monatliche Profit-Berechnung mit Gehältern    │
│                                                                              │
│  taxService.ts              ⚠️ INKONSISTENT!                                 │
│  ├── calculateBWA()         → Nutzt employees.salary (NICHT payrolls!)      │
│  │   └── Schätzt: salary × 1.2 für AG-Anteil                                │
│  └── Keine Verbindung zu erstellten Gehaltsabrechnungen                     │
│                                                                              │
│  datevAuswertungsService.ts                                                  │
│  └── Personalkosten werden nicht separat exportiert                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Firestore Collections für Personal:**
| Collection | Inhalt | Genutzt von |
|------------|--------|-------------|
| `companies/{id}/employees` | Stammdaten, Vertrag, Gehalt | PersonalService, taxService (!) |
| `companies/{id}/payrolls` | Monatl. Abrechnungen | PersonalService, businessReportService |
| `companies/{id}/timeEntries` | Zeiterfassung | PersonalService (NICHT in BWA!) |
| `companies/{id}/shifts` | Dienstpläne | PersonalService |
| `companies/{id}/absenceRequests` | Urlaub/Krankmeldung | PersonalService |

**Aktuelle Lohnkostenberechnung in Payroll:**
```typescript
// Aus PersonalService.createPayroll():
const payroll = {
  grossSalary: employee.grossSalary,
  deductions: {
    incomeTax: grossSalary * 0.25,        // Vereinfacht!
    churchTax: incomeTax * 0.08,
    solidarityTax: incomeTax * 0.055,
    socialSecurity: {
      pension: 0.5,                        // Anteilig
      unemployment: 0.13,
      health: 0.37,
      care: 0.1,
    },
  },
  employerCosts: {
    socialSecurity: grossSalary * 0.0975, // ~9,75% AG-Anteil
    other: 0,
  },
};
```

**Fehlende Verknüpfungen:**
| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Zeiterfassung → Lohn | ❌ | Stunden werden nicht in Lohnkosten umgerechnet |
| Firmenwagen → Geldwerter Vorteil | ❌ | Kein automatischer Lohnzuschlag |
| Zuschläge → Payroll | ⚠️ | Im UI, aber nicht in BWA |
| DATEV-Lohnexport | ❌ | Keine LODAS-Schnittstelle |
| Lohnsteuer-Anmeldung | ❌ | Keine LSt-Aggregation |

### 10.6 Lagerwirtschaftssystem & Bestandsveränderungen

**Aktuelle Architektur (Analyse 16.01.2026):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LAGERWIRTSCHAFTS-MODUL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  InventoryService.ts                                                         │
│  ├── getInventoryItems()      → companies/{id}/inventory                    │
│  ├── addInventoryItem()       → Artikel anlegen mit Bestand                 │
│  ├── adjustStock()            → Bestandskorrekturen                         │
│  ├── addStockMovement()       → Zu-/Abgänge protokollieren                  │
│  ├── getStockMovements()      → Bewegungshistorie                           │
│  ├── getInventoryStats()      → totalValue, lowStock, outOfStock            │
│  └── reduceStockForDeliveryNote() → Automatischer Abgang bei Lieferschein  │
│                                                                              │
│  WarehouseService.ts                                                         │
│  ├── getWarehouseItems()      → warehouse_items (globale Collection!)       │
│  ├── processDeliveryNoteStock() → Lieferschein-Integration                  │
│  ├── checkLowStockAlerts()    → Mindestbestand-Warnungen                    │
│  └── getStockReport()         → totalValue, lowStock, movements             │
│                                                                              │
│  UI-Seiten:                                                                  │
│  └── /inventory               → Lagerbestandsverwaltung (InventoryComponent)│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ ❌ KEINE AUTOMATISCHE VERBINDUNG!
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BUCHHALTUNG / BWA                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  businessReportService.ts                                                    │
│  ├── getInventoryKPIs()       ✅ Lädt inventory für Dashboard-Statistik    │
│  │   └── totalValue           = Σ item.stockValue                           │
│  │   └── lowStockItems        = items.filter(i => i.isLowStock)             │
│  │   └── potentialProfit      = retailValue - purchaseValue                 │
│  └── ❌ NICHT in generateBWA() oder generateEUR() integriert!               │
│                                                                              │
│  datevAuswertungsService.ts                                                  │
│  ├── BWA-Zeile 2: Bestandsveränderungen                                     │
│  │   └── Nutzt Kontenbuchungen 4800-4899                                    │
│  │   └── ❌ KEINE Verbindung zu inventory oder stockMovements!              │
│  └── Bestandsveränderungen müssen MANUELL gebucht werden                    │
│                                                                              │
│  taxService.ts                                                               │
│  └── ❌ Keine Inventar-Integration                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Firestore Collections für Lager:**
| Collection | Inhalt | Genutzt von |
|------------|--------|-------------|
| `companies/{id}/inventory` | Artikelstammdaten, Bestände | InventoryService, businessReportService (nur KPIs!) |
| `companies/{id}/stockMovements` | Zu-/Abgänge (Bewegungen) | InventoryService (NICHT in BWA!) |
| `warehouse_items` (global!) | Lagerhaltung (Warehouse) | WarehouseService |
| `stock_movements` (global!) | Bewegungen (Warehouse) | WarehouseService |
| `low_stock_alerts` (global!) | Mindestbestand-Warnungen | WarehouseService |

**⚠️ KRITISCHE LÜCKEN:**

| Problem | Auswirkung | BWA-Relevanz |
|---------|------------|---------------|
| **Bestandsveränderungen nicht automatisch** | BWA-Zeile 2 ist immer 0 € oder manuell | ⚠️ BWA unvollständig |
| **Inventurbewertung fehlt** | Kein Jahresabschluss-Wert | ⚠️ Bilanz-relevant |
| **Inventurdifferenzen nicht erfasst** | Schwund/Diebstahl nicht dokumentiert | ⚠️ Betriebsausgabe |
| **Wareneinkauf nicht verknüpft** | Ausgaben ≠ Lagerzugang | ⚠️ Inkonsistenz |
| **Lieferschein-Abgang nicht gebucht** | Warenabgang fehlt in Buchhaltung | ⚠️ Rohertrag falsch |
| **Zwei parallele Services** | InventoryService vs WarehouseService | 🔴 Daten-Chaos |

**Aktuelle Bestandserfassung (nur für KPIs):**
```typescript
// Aus businessReportService.getInventoryKPIs():
const items = await InventoryService.getInventoryItems(companyId);
const stats = await InventoryService.getInventoryStats(companyId);

// Nur für Dashboard-Anzeige:
return {
  totalItems: stats.totalItems,
  totalValue: stats.totalValue,          // ← Wird NICHT in BWA verwendet!
  lowStockItems: stats.lowStockItems,
  // ...
};
```

**Was FEHLT für korrekte BWA:**
```typescript
// SOLL: Bestandsveränderung berechnen
interface InventoryValuation {
  // Anfangsbestand (aus Vorperiode)
  openingStock: number;
  
  // Zugänge (= Wareneinkauf, der ins Lager ging)
  additions: number;
  
  // Abgänge (= Warenverbrauch/Verkauf)
  removals: number;
  
  // Endbestand (aktuell)
  closingStock: number;
  
  // Bestandsveränderung für BWA-Zeile 2
  // Positiv = Bestandsmehrung (Aufbau)
  // Negativ = Bestandsminderung (Abbau)
  stockChange: number;  // = closingStock - openingStock
}

// Buchung für BWA:
// Bestandsmehrung (Aufbau): Soll 3900 an Haben 4800
// Bestandsminderung (Abbau): Soll 4800 an Haben 3900
```

**Steuerliche Relevanz der Bestandsveränderung:**

| Situation | BWA-Auswirkung | Gewinn-Auswirkung |
|-----------|----------------|-------------------|
| Wareneinkauf ohne Verkauf | Bestandsaufbau → Gesamtleistung ↑ | Neutralisiert Aufwand |
| Verkauf aus Lagerbestand | Bestandsabbau → Gesamtleistung ↓ | Erhöht Materialaufwand |
| Inventurschwund | Bestandsabbau → Betriebsausgabe | Gewinnmindernd |
| Inventurüberschuss | Bestandsaufbau → Ertrag | Gewinnerhöhend |

---

## 11. Handlungsempfehlungen

---

### ⚡ ÜBERSICHT: Was muss DRINGEND umgesetzt werden?

> **Stand: 17. Januar 2026** | Für Details siehe jeweilige Unterabschnitte

#### ✅ ERLEDIGT (Q1 2026) — Diese Punkte wurden implementiert

| # | Feature | Status | Umsetzung |
|---|---------|--------|-----------|
| 1 | **taxService.ts → Payrolls nutzen** | ✅ Erledigt | Nutzt jetzt `payrolls` Collection statt `employees.salary` |
| 2 | **Löhne vs. Gehälter trennen** | ✅ Erledigt | BWA-Zeilen 20+21 separat (loehne/gehaelter/sozialversicherungAG) |
| 3 | **InventoryService + WarehouseService konsolidieren** | ✅ Erledigt | WarehouseService deprecated, InventurService neu |
| 4 | **Lager-BWA-Integration** | ✅ Erledigt | BWA-Zeile 2 (bestandsveraenderung) aus InventurService |
| 5 | **Inventur-Modul Basis** | ✅ Erledigt | inventurService.ts + Frontend-Seiten erstellt |
| 6 | **Zähllisten nach Kategorie drucken** | ✅ Erledigt | Inventur-Druckseite mit Gruppierung implementiert |
| 7 | **fixedAssets → BWA/EÜR Integration** | ✅ Erledigt | AfA aus Anlagen in `datevAuswertungsService` und `businessReportService` integriert |

**Neue Komponenten:**
- `src/services/inventurService.ts` - Vollständiger Inventur-Service
- `src/app/dashboard/company/[uid]/inventory/inventur/*` - Frontend-Seiten
- Sidebar: Lagerbestand → Untermenü mit Übersicht + Inventur

---

#### 🟡 DANACH (Q2 2026) — Wichtig, aber nicht blocking

| # | Feature | Aufwand | Nutzen |
|---|---------|---------|--------|
| 7 | Inventur-Differenzbuchung | 1 Woche | Schwund/Überschuss automatisch buchen |
| 8 | Inventurprotokoll drucken (GoBD) | 1 Woche | Finanzamt-konforme Dokumentation |
| 9 | Wareneinkauf → Lagerzugang verknüpfen | 1 Woche | Automatische Bestandsführung |
| 10 | Sozialversicherung detailliert (RV, KV, PV, AV) | 1 Woche | Exakte Lohnnebenkosten |
| 11 | Firmenfahrzeug-Stammdaten + 1%-Regelung | 3 Wochen | Geldwerter Vorteil in Lohn |
| 12 | Fahrtenbuch-Modul | 3 Wochen | Alternative zur 1%-Regelung |
| 13 | Kfz-Kosten-Tracking | 2 Wochen | Betriebsausgaben pro Fahrzeug |

**Gesamt Q2 2026:** ~13 Wochen Entwicklungsaufwand

---

#### 🟢 SPÄTER (Q3/Q4 2026 & 2027) — Nice-to-have

| # | Feature | Aufwand | Nutzen |
|---|---------|---------|--------|
| 14 | Mobile Inventur-Erfassung (Barcode) | 2 Wochen | Schnellere Zählung |
| 15 | Bewertungsmethoden (FIFO, LIFO) | 2 Wochen | Korrekter Wareneinsatz |
| 16 | DATEV-Export erweitert (inkl. Inventar) | 2 Wochen | Steuerberater-Integration |
| 17 | DATEV-Lohnexport (LODAS) | 2 Wochen | Lohnbuchhaltung extern |
| 18 | Kassenbuch TSE-ready | 3 Wochen | Kassensicherungsverordnung |
| 19 | Reisekosten-Abrechnung | 2 Wochen | Verpflegungsmehraufwand etc. |
| 20 | ELSTER-Schnittstelle | 4 Wochen | Automatische Steuermeldungen |
| 21 | E-Bilanz / Jahresabschluss | 6 Wochen | Digitale Bilanz ans Finanzamt |

---

### 11.1 ✅ Bereits umgesetzt (Stand: 17. Januar 2026)

1. **TaxService komplett neu implementiert**
   - UStVA-Berechnung aus echten Firestore-Daten
   - EÜR-Berechnung nach BMF-Anlage
   - GuV nach Gesamtkostenverfahren
   - BWA mit monatlicher Analyse

2. **Anlagenbuchhaltung (Backend + Frontend)**
   - `fixedAssetService.ts` mit vollständiger AfA-Berechnung
   - AfA-Tabellen nach BMF hinterlegt
   - GWG-Behandlung (§6 Abs. 2 EStG)
   - Sammelposten-Logik (§6 Abs. 2a EStG)
   - DATEV-Kontenzuordnung
   - `/finance/expenses/assets` UI implementiert

3. **fixedAssets-Integration in BWA/EÜR (NEU 17.01.2026)**
   - `datevAuswertungsService.generateBWA()` liest jetzt `fixedAssets` Collection
   - `businessReportService.generateBWA()` berechnet AfA aus Anlagen
   - `businessReportService.generateEUR()` inkludiert AfA aus Anlagen
   - Neue Methoden: `berechneAfaAusFixedAssets()`, `getFixedAssetsDepreciation()`, `getFixedAssetsDepreciationYear()`
   - Berücksichtigt: Lineare AfA, GWG-Sofortabschreibung, Sammelposten (§6 Abs. 2a EStG)
   - BWA-Zeile 65 (Abschreibungen) zeigt jetzt Summe aus Buchungen + berechnete AfA aus Anlagen

4. **GoBD-Konformität**
   - Festschreibung für Rechnungen (`isLocked`, `gobdStatus`)
   - Fortlaufende Nummernkreise
   - Audit-Trail für Änderungen

5. **Kleinunternehmer-Grenze 2025**
   - Aktualisiert auf 25.000 € Vorjahresumsatz
   - 100.000 € laufendes Jahr

6. **Steuerdokumentation konsolidiert & verifiziert**
   - Alle Steuerwerte gegen offizielle Quellen geprüft
   - Grundfreibetrag 2026 (12.348 €) aktualisiert
   - Einkommensteuertarif 2026 aktualisiert
   - Firmenfahrzeuge-Dokumentation komplett

### 11.2 🔴 Hohe Priorität (Kurzfristig umsetzen)

1. **🔴 HR-System ↔ BWA/Buchhaltung Integration (KRITISCH)**

   **Aktueller Stand (Analyse 16.01.2026):**
   
   | Komponente | Status | Problem |
   |------------|--------|---------|
   | `PersonalService` | ✅ Vorhanden | Lädt Mitarbeiter, Payrolls, Zeiterfassung |
   | `businessReportService.generateBWA()` | ⚠️ Teilweise | Nutzt `payrolls` Collection, aber nur Brutto + AG-SV |
   | `taxService.calculateBWA()` | ⚠️ Inkonsistent | Nutzt `employees.salary` statt `payrolls`! |
   | Löhne vs. Gehälter | ❌ Fehlt | BWA zeigt nur `salaries`, nicht `wages` |
   | Zeiterfassung → Lohn | ❌ Nicht verbunden | Stunden werden nicht in Lohnkosten umgerechnet |
   | Lohnnebenkosten-Details | ⚠️ Vereinfacht | Nur pauschale AG-Anteile, keine echten Sätze |
   | DATEV-Lohnexport | ❌ Fehlt | Keine LODAS/LOHN-Schnittstelle |
   
   **Handlungsbedarf:**
   - [ ] **`taxService.ts` vereinheitlichen**: Payrolls statt Employees-Schätzung nutzen
   - [ ] **Löhne vs. Gehälter trennen**: BWA-Zeilen 20 (Löhne) + 21 (Gehälter) separat
   - [ ] **Sozialversicherung detailliert**: RV, KV, PV, AV, UV einzeln berechnen
   - [ ] **Lohnnebenkosten erweitern**: U1/U2/U3 Umlagen, BG-Beiträge
   - [ ] **Zeiterfassung → Stundenkosten**: `timeEntries` × Stundensatz = Lohnkosten
   - [ ] **Geldwerter Vorteil integrieren**: Firmenwagen, Sachbezüge in Payroll
   - [ ] **Lohnsteuer-Anmeldung vorbereiten**: LSt, SolZ, KiSt aggregieren
   - [ ] **DATEV-Lohnexport**: LODAS/Lohn-Format für Steuerberater
   
   **Betroffene Services:**
   ```
   src/services/personalService.ts     → Payroll-Berechnung
   src/services/taxService.ts          → BWA nutzt falsche Quelle!
   src/services/businessReportService.ts → BWA/EÜR Personalkosten
   src/services/datevAuswertungsService.ts → Export muss Löhne enthalten
   ```
   
   **Technische Lösung (vorgeschlagen):**
   ```typescript
   // AKTUELL in taxService.ts (FALSCH - nutzt Schätzung):
   const employeesRef = collection(db, 'companies', companyId, 'employees');
   employeesSnapshot.forEach(doc => {
     const emp = doc.data();
     personalkosten += (emp.salary / 100) * 1.2; // ← Schätzung!
   });
   
   // SOLL (wie businessReportService - nutzt echte Payrolls):
   const payrollsRef = collection(db, 'companies', companyId, 'payrolls');
   // Filter nach Periode
   payrolls.forEach(p => {
     personalkosten += p.grossSalary + (p.employerCosts?.socialSecurity || 0);
   });
   ```
   
   **Firestore-Erweiterung für detaillierte Lohnkosten:**
   ```typescript
   interface PayrollExtended extends Payroll {
     employerCosts: {
       // Sozialversicherung (AG-Anteil)
       pensionInsurance: number;      // RV: 9,3%
       healthInsurance: number;       // KV: ~7,3% (+ Zusatzbeitrag)
       careInsurance: number;         // PV: 1,7% (kinderlos: 2,3%)
       unemploymentInsurance: number; // AV: 1,3%
       accidentInsurance: number;     // UV: branchenabhängig
       
       // Umlagen
       u1Sickness: number;            // U1: Entgeltfortzahlung
       u2Maternity: number;           // U2: Mutterschaft
       u3Insolvency: number;          // U3: Insolvenzgeld (0,06%)
       
       // Sonstiges
       bgContribution: number;        // Berufsgenossenschaft
       otherBenefits: number;         // VWL, bAV, etc.
     };
     
     // Geldwerte Vorteile
     benefitsInKind: {
       companyCarValue?: number;      // 1%-Regelung Firmenwagen
       meals?: number;                // Essenszuschüsse
       other?: number;
     };
     
     // Für BWA-Zuordnung
     costCenter?: string;             // Kostenstelle
     department?: string;             // Abteilung
     isWage: boolean;                 // true = Lohn (gewerblich), false = Gehalt
   }
   ```

2. **Firmenfahrzeug-Modul implementieren**
   - [ ] Fahrzeugstammdaten in Firestore (`companies/{id}/vehicles`)
   - [ ] 1%-Regelung automatisch berechnen
   - [ ] Fahrtenbuch-Erfassung (digital, GoBD-konform)
   - [ ] Privatanteil-Berechnung für Buchhaltung
   - [ ] E-Fahrzeug-Erkennung (0,25%/0,5%-Regelung)
   - [ ] Integration in Lohnabrechnung (geldwerter Vorteil)

3. **Fahrtenbuch-App/Modul**
   - [ ] Mobile Erfassung (GPS optional)
   - [ ] Pflichtfelder: Datum, km-Stand, Ziel, Zweck, Person
   - [ ] Automatische Plausibilitätsprüfung
   - [ ] Jahresauswertung für Finanzamt
   - [ ] Export als PDF/CSV

4. **Kfz-Kosten-Tracking**
   - [ ] Automatische Zuordnung Tankbelege → Fahrzeug
   - [ ] Wartungs- und Reparaturkosten erfassen
   - [ ] Versicherung, Steuer, Leasing pro Fahrzeug
   - [ ] Kostenauswertung pro Fahrzeug/Jahr/km

5. **Entfernungspauschale für Mitarbeiter**
   - [ ] Erfassung Wohnung-Arbeitsstätte pro Mitarbeiter
   - [ ] Berechnung 0,30 €/0,38 € (ab 21 km)
   - [ ] Berücksichtigung in Lohnsteuer

6. **🔴 Lagerwirtschaft ↔ BWA/Buchhaltung Integration (KRITISCH)**

   **Aktueller Stand (Analyse 16.01.2026):**
   
   | Komponente | Status | Problem |
   |------------|--------|----------|
   | `InventoryService` | ✅ Vorhanden | Verwaltet Bestände, aber nicht buchhaltungs-verbunden |
   | `WarehouseService` | ✅ Vorhanden | Paralleler Service mit globalen Collections! |
   | `businessReportService.getInventoryKPIs()` | ⚠️ Nur Dashboard | Lädt Inventar, aber NICHT in BWA integriert! |
   | BWA-Zeile 2 (Bestandsveränderungen) | ❌ Leer | Nutzt nur manuelle Buchungen 4800-4899 |
   | `stockMovements` → Buchhaltung | ❌ Fehlt | Zu-/Abgänge erzeugen keine Buchungen |
   | Inventurbewertung | ❌ Fehlt | Kein Jahresabschluss-Support |
   | Wareneinkauf → Lagerzugang | ❌ Nicht verknüpft | Ausgaben und Lager unabhängig |
   
   **Handlungsbedarf:**
   - [ ] **Services konsolidieren**: InventoryService + WarehouseService vereinen
   - [ ] **Bestandsveränderung automatisch berechnen**: `closingStock - openingStock`
   - [ ] **BWA-Integration**: Bestandsveränderung in `datevAuswertungsService.generateBWA()` einfließen lassen
   - [ ] **Wareneinkauf verknüpfen**: Ausgabe mit Kategorie "Wareneinkauf" → automatischer Lagerzugang
   - [ ] **Lieferschein-Buchung**: Warenabgang bei Lieferschein → Buchung 4800 erzeugen
   - [ ] **Inventurfunktion**: Jahresinventur mit Differenzbuchung
   - [ ] **Bewertungsmethoden**: FIFO, LIFO, Durchschnitt für korrekten Wareneinsatz
   - [ ] **DATEV-Export Inventar**: Bestandsliste + Bewegungen exportieren
   
   **🔴 Inventur-Modul (FEHLT KOMPLETT):**
   
   | Feature | Status | Beschreibung |
   |---------|--------|--------------|
   | Inventurliste erstellen | ❌ Fehlt | Stichtags-Inventur anlegen mit Zähldatum |
   | Nach Kategorien filtern | ❌ Fehlt | Inventur pro Kategorie/Lagerort/Lieferant |
   | Zähllisten drucken | ❌ Fehlt | PDF-Export mit Artikel, Soll-Bestand, Zählfeld |
   | Ist-Bestände erfassen | ❌ Fehlt | Gezählte Mengen eintragen (auch mobil) |
   | Differenzen anzeigen | ❌ Fehlt | Soll vs. Ist mit Abweichung |
   | Differenzbuchungen | ❌ Fehlt | Schwund/Überschuss als Ausgabe/Ertrag buchen |
   | Inventur abschließen | ❌ Fehlt | Bestände aktualisieren, Protokoll erstellen |
   | Inventurprotokoll drucken | ❌ Fehlt | GoBD-konformes PDF mit Unterschrift |
   | Stichprobeninventur | ❌ Fehlt | Für große Lager (statistisches Verfahren) |
   | Permanente Inventur | ❌ Fehlt | Unterjährige Zählung aller Artikel |
   
   **Inventur-Handlungsbedarf:**
   - [ ] **Inventur-Collection** in Firestore: `companies/{id}/inventories/{inventoryId}`
   - [ ] **Inventur erstellen**: Stichtag wählen, Kategorien/Lagerorte auswählen
   - [ ] **Zähllisten generieren**: Gruppiert nach Kategorie, Lagerort oder alphabetisch
   - [ ] **Zähllisten drucken (PDF)**: Mit Artikel-Nr., Name, Einheit, Soll-Bestand, Zählfeld leer
   - [ ] **Mobile Erfassung**: Barcode-Scan + Menge eingeben
   - [ ] **Differenzberechnung**: Automatisch Soll vs. Ist
   - [ ] **Differenzbuchung**: Schwund → Betriebsausgabe (Konto 6950), Überschuss → Ertrag (Konto 4830)
   - [ ] **Inventur abschließen**: Bestände in `inventory` Collection aktualisieren
   - [ ] **Inventurprotokoll drucken**: Alle Artikel mit Soll/Ist/Differenz + Unterschriftsfeld
   - [ ] **Inventurhistorie**: Vergangene Inventuren einsehen + vergleichen
   
   **Firestore-Struktur für Inventur:**
   ```typescript
   interface Inventory {
     id: string;
     companyId: string;
     name: string;                      // z.B. "Jahresinventur 2025"
     type: 'vollstaendig' | 'stichprobe' | 'permanent';
     status: 'geplant' | 'in_bearbeitung' | 'abgeschlossen' | 'storniert';
     
     // Stichtag & Zeitraum
     countDate: Timestamp;              // Stichtag der Inventur
     startedAt?: Timestamp;             // Beginn der Zählung
     completedAt?: Timestamp;           // Abschluss
     
     // Filter (optional)
     filterByCategories?: string[];     // Nur bestimmte Kategorien
     filterByLocations?: string[];      // Nur bestimmte Lagerorte
     filterBySuppliers?: string[];      // Nur bestimmte Lieferanten
     
     // Zusammenfassung
     totalItems: number;                // Anzahl Artikel
     countedItems: number;              // Bereits gezählt
     itemsWithDifference: number;       // Mit Abweichung
     totalDifferenceValue: number;      // Gesamtwert der Differenzen
     
     // GoBD
     createdAt: Timestamp;
     createdBy: string;
     lockedAt?: Timestamp;
     lockedBy?: string;
   }
   
   interface InventoryItem {
     id: string;
     inventoryId: string;
     itemId: string;                    // Referenz zu inventory-Artikel
     itemName: string;
     sku?: string;
     category: string;
     location?: string;
     unit: string;
     
     // Bestände
     expectedQuantity: number;          // Soll (System)
     countedQuantity?: number;          // Ist (gezählt)
     difference?: number;               // Abweichung
     differenceValue?: number;          // Wert der Abweichung
     
     // Status
     status: 'offen' | 'gezaehlt' | 'geprueft';
     countedAt?: Timestamp;
     countedBy?: string;
     notes?: string;                    // Bemerkung bei Differenz
     
     // Buchung
     differenceBooked: boolean;
     expenseId?: string;                // Verknüpfung zur Ausgabe (Schwund)
   }
   ```
   
   **Betroffene Services:**
   ```
   src/services/inventoryService.ts    → Bestandsverwaltung
   src/services/warehouseService.ts    → Paralleler Service (konsolidieren!)
   src/services/businessReportService.ts → Inventory-KPIs vorhanden, BWA-Integration fehlt
   src/services/datevAuswertungsService.ts → BWA-Zeile 2 aus echten Daten berechnen
   src/services/taxService.ts          → EÜR braucht Bestandsveränderung
   ```
   
   **Technische Lösung (vorgeschlagen):**
   ```typescript
   // NEU: Bestandsveränderung für BWA berechnen
   static async calculateStockChange(
     companyId: string,
     startDate: Date,
     endDate: Date
   ): Promise<{ openingStock: number; closingStock: number; change: number }> {
     // Anfangsbestand = Inventarwert zu Periodenbeginn
     const openingItems = await this.getInventorySnapshot(companyId, startDate);
     const openingStock = openingItems.reduce((sum, i) => 
       sum + (i.currentStock * i.purchasePrice), 0);
     
     // Endbestand = Aktueller Inventarwert
     const closingItems = await InventoryService.getInventoryItems(companyId);
     const closingStock = closingItems.reduce((sum, i) => 
       sum + (i.currentStock * i.purchasePrice), 0);
     
     // Bestandsveränderung (positiv = Aufbau, negativ = Abbau)
     return {
       openingStock,
       closingStock,
       change: closingStock - openingStock
     };
   }
   
   // In datevAuswertungsService.generateBWA() integrieren:
   const inventoryChange = await InventoryService.calculateStockChange(
     companyId,
     new Date(jahr, monat - 1, 1),
     new Date(jahr, monat, 0)
   );
   
   // BWA-Zeile 2 mit echtem Wert:
   const bestandsveraenderungen: BWAZeile = {
     zeile: 2,
     bezeichnung: 'Bestandsveränderungen',
     monatswert: inventoryChange.change,
     kumuliert: inventoryChange.change, // Für Jahresansicht
     // ...
   };
   ```
   
   **Firestore-Erweiterung für Inventur:**
   ```typescript
   interface InventorySnapshot {
     id: string;
     companyId: string;
     snapshotDate: Timestamp;           // Stichtag
     type: 'periode_start' | 'periode_ende' | 'inventur';
     items: {
       itemId: string;
       name: string;
       quantity: number;
       unitPrice: number;               // Bewertungspreis
       totalValue: number;
     }[];
     totalValue: number;                // Gesamtwert
     createdAt: Timestamp;
     createdBy: string;
   }
   
   interface InventoryDifference {
     id: string;
     companyId: string;
     inventoryDate: Timestamp;
     itemId: string;
     itemName: string;
     expectedQuantity: number;          // Laut System
     actualQuantity: number;            // Gezählt
     difference: number;                // Differenz
     differenceValue: number;           // Wert der Differenz
     reason?: 'schwund' | 'diebstahl' | 'verderb' | 'zählfehler' | 'sonstiges';
     notes?: string;
     bookedToExpense: boolean;          // Als Betriebsausgabe gebucht?
     expenseId?: string;                // Verknüpfung zur Ausgabe
   }
   ```

### 11.3 🟡 Mittlere Priorität (Q2/Q3 2026)

1. **Steuerrechner verbessern**
   - [ ] Gewerbesteuer-Hebesatz pro Unternehmen konfigurierbar
   - [ ] Vorauszahlungen planen und tracken
   - [ ] USt-Voranmeldung vorbereiten (ELSTER-Format)
   - [ ] Körperschaftsteuer-Berechnung (15% bis 2027, dann sinkend)

2. **GoBD für Ausgaben erweitern**
   - [ ] `isLocked` für Ausgaben implementieren
   - [ ] Storno-Logik wie bei Rechnungen
   - [ ] Unveränderbarkeit nach Festschreibung

3. **DATEV-Export erweitern**
   - [ ] DATEV-Format für Buchungsstapel (ASCII)
   - [ ] Stammdaten-Export (master-data:master-clients)
   - [ ] Automatischer Upload (DATEV Unternehmen online)
   - [ ] Anlagenbuchführung-Export

4. **Kassenbuch verbessern**
   - [ ] Täglicher Kassenabschluss
   - [ ] Kassensturz-Protokoll
   - [ ] TSE-Integration vorbereiten (Kassensicherungsverordnung)

5. **Reisekosten-Abrechnung**
   - [ ] Verpflegungsmehraufwand (14€/28€ Pauschalen)
   - [ ] Übernachtungspauschale
   - [ ] Kilometergeld für Privatfahrzeug (0,30 €/km)
   - [ ] Auslandsreisekosten (BMF-Tabellen)

### 11.4 🟢 Langfristig (2027+)

1. **Jahresabschluss-Vorbereitung**
   - [ ] Bilanz-Erstellung (HGB §266)
   - [ ] Anhang-Generierung
   - [ ] Prüfungs-Checklisten
   - [ ] E-Bilanz-Taxonomie (XBRL)

2. **Steuerberater-Schnittstelle**
   - [ ] Direkter DATEV-Upload
   - [ ] Echtzeit-Zugriff für Steuerberater (Read-Only)
   - [ ] Mandanten-Kommunikation im System
   - [ ] Belegaustausch digital

3. **Automatisierte Steuermeldungen**
   - [ ] ELSTER-Schnittstelle (USt-VA, LSt-Anmeldung)
   - [ ] Zusammenfassende Meldung (EU)
   - [ ] Intrastat-Meldung (ab Schwellenwert)

4. **KI-gestützte Buchhaltung**
   - [ ] Automatische Belegerfassung (OCR)
   - [ ] Kontierungsvorschläge
   - [ ] Anomalie-Erkennung
   - [ ] Steueroptimierungs-Hinweise

5. **Internationale Erweiterung**
   - [ ] Österreich (USt 20%/10%/13%)
   - [ ] Schweiz (MwSt 8,1%/2,6%)
   - [ ] EU-Reverse-Charge automatisch
   - [ ] Währungsumrechnung

### 11.5 📋 Priorisierte Roadmap

| Quartal | Feature | Aufwand | Business Value |
|---------|---------|---------|----------------|
| **Q1 2026** | 🔴 HR-BWA-Integration (taxService fix) | 1 Woche | **Kritisch** |
| **Q1 2026** | 🔴 Payroll-Details erweitern (SV-Aufschlüsselung) | 2 Wochen | Hoch |
| **Q1 2026** | 🔴 Lager-BWA-Integration (Bestandsveränderung) | 2 Wochen | **Kritisch** |
| **Q1 2026** | 🔴 InventoryService + WarehouseService konsolidieren | 1 Woche | Hoch |
| **Q1 2026** | Firmenfahrzeug-Stammdaten | 2 Wochen | Hoch |
| **Q1 2026** | 1%-Regelung Berechnung | 1 Woche | Hoch |
| **Q2 2026** | 🔴 Inventur-Modul (Erstellen, Kategorien) | 2 Wochen | **Kritisch** |
| **Q2 2026** | 🔴 Zähllisten drucken (PDF nach Kategorie) | 1 Woche | Hoch |
| **Q2 2026** | 🔴 Inventur-Differenzbuchung | 1 Woche | Hoch |
| **Q2 2026** | 🔴 Inventurprotokoll drucken (GoBD) | 1 Woche | Hoch |
| **Q2 2026** | Wareneinkauf → Lagerzugang verknüpfen | 1 Woche | Hoch |
| **Q2 2026** | Fahrtenbuch-Modul | 3 Wochen | Mittel |
| **Q2 2026** | Kfz-Kosten-Tracking | 2 Wochen | Hoch |
| **Q2 2026** | Reisekosten-Abrechnung | 2 Wochen | Mittel |
| **Q3 2026** | Mobile Inventur-Erfassung (Barcode) | 2 Wochen | Mittel |
| **Q3 2026** | Bewertungsmethoden (FIFO, LIFO, Durchschnitt) | 2 Wochen | Mittel |
| **Q3 2026** | DATEV-Export erweitert (inkl. Inventar) | 2 Wochen | Hoch |
| **Q3 2026** | Kassenbuch TSE-ready | 3 Wochen | Mittel |
| **Q4 2026** | ELSTER-Schnittstelle | 4 Wochen | Hoch |
| **2027** | E-Bilanz / Jahresabschluss | 6 Wochen | Mittel |

### 11.6 📊 Firestore-Strukturen (geplant)

**Fahrzeuge Collection** (`companies/{companyId}/vehicles/{vehicleId}`):
```typescript
interface Vehicle {
  id: string;
  licensePlate: string;              // Kennzeichen
  vin: string;                       // Fahrgestellnummer
  make: string;                      // Hersteller
  model: string;                     // Modell
  type: 'verbrenner' | 'hybrid' | 'plugin_hybrid' | 'elektro';
  fuelType?: 'benzin' | 'diesel' | 'gas' | 'strom';
  listPrice: number;                 // Bruttolistenpreis bei Erstzulassung
  purchasePrice?: number;            // Tatsächlicher Kaufpreis
  purchaseDate: Timestamp;           // Anschaffungsdatum
  firstRegistration: Timestamp;      // Erstzulassung
  electricRange?: number;            // Elektrische Reichweite (km) für Plug-in
  assignedTo?: string;               // Mitarbeiter-ID
  usageType: 'rein_betrieblich' | 'gemischt' | 'privat_ueberlassen';
  valuationMethod: '1_prozent' | 'fahrtenbuch';
  status: 'aktiv' | 'verkauft' | 'verschrottet';
  
  // Berechnete Werte
  monthlyPrivateUsageValue?: number; // Monatlicher geldwerter Vorteil
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Fahrtenbuch Collection** (`companies/{companyId}/vehicles/{vehicleId}/logbook/{entryId}`):
```typescript
interface LogbookEntry {
  id: string;
  date: Timestamp;
  startOdometer: number;             // km-Stand Beginn
  endOdometer: number;               // km-Stand Ende
  distance: number;                  // Gefahrene km
  tripType: 'geschaeftlich' | 'privat' | 'wohnung_arbeit';
  destination: string;               // Reiseziel
  purpose: string;                   // Reisezweck
  visitedPerson?: string;            // Besuchte Person/Firma
  driverId: string;                  // Fahrer
  
  // GoBD
  createdAt: Timestamp;
  isLocked: boolean;
  lockedAt?: Timestamp;
}
```

**Fahrzeugkosten Collection** (`companies/{companyId}/vehicles/{vehicleId}/costs/{costId}`):
```typescript
interface VehicleCost {
  id: string;
  date: Timestamp;
  type: 'kraftstoff' | 'wartung' | 'reparatur' | 'versicherung' | 
        'steuer' | 'leasing' | 'finanzierung' | 'sonstiges';
  amount: number;                    // Netto-Betrag
  vatAmount: number;                 // USt-Betrag
  grossAmount: number;               // Brutto-Betrag
  description: string;
  odometer?: number;                 // km-Stand bei Tankung
  liters?: number;                   // Liter getankt
  receiptId?: string;                // Verknüpfung zu Beleg
  
  createdAt: Timestamp;
}
```

---

## Anhang A: Gesetzliche Quellen

| Gesetz | Relevante Paragraphen |
|--------|----------------------|
| EStG | §4 (Gewinn), §6 (Bewertung), §7 (AfA), §11 (Zufluss/Abfluss) |
| UStG | §12 (Steuersätze: 19%/7%/0%), §19 (Kleinunternehmer: 25.000 € Vorjahr / 100.000 € laufend seit 2025) |
| KStG | §23 (Steuersatz) |
| GewStG | §11 (Steuermesszahl) |
| HGB | §238 (Buchführungspflicht), §275 (GuV), §267 (Größenklassen) |
| AO | §140-148 (Buchführungspflichten), §158 (Beweiskraft) |
| GoBD | BMF-Schreiben 28.11.2019 |

---

## Anhang B: DATEV-API-Integration

### B.1 Verfügbare DATEV Sandbox APIs

| API | Version | Beschreibung |
|-----|---------|--------------|
| cashregister:import | v2.6.0 | Kassendaten-Import für Barzahlungen |
| master-data:master-clients | v3 | Mandanten-Stammdaten synchronisieren |
| accounting:extf-files | v2.0 | DATEV-Buchungsdateien generieren |
| accounting:dxso-jobs | v2.0 | Batch-Verarbeitung von Buchungsjobs |
| accounting:documents | v2.0 | Belege und Dokumente verwalten |

### B.2 OAuth 2.0 + PKCE Workflow

1. **Auth URL generieren**: `POST /api/datev/auth-url`
2. **Benutzer-Login** (Sandbox: Test6/bTomu4cTKg)
3. **Token-Austausch**: Automatisch via Callback
4. **API-Aufrufe**: Mit Bearer Token

### B.3 Taskilo DATEV-Endpunkte

| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/datev/auth-url` | OAuth URL generieren |
| `/api/datev/callback` | OAuth Callback |
| `/api/datev/organizations` | Organisationen abrufen |
| `/api/datev/status` | Verbindungsstatus |

**Ausführliche DATEV-Dokumentation**: Siehe `/docs/datev/` Ordner

---

## Anhang C: UI/UX Standards

Alle Buchhaltungsseiten folgen den Taskilo Design-Richtlinien:

| Element | Klasse |
|---------|--------|
| **Primary Color** | `#14ad9f` (Teal) |
| **Cards** | `bg-white rounded-2xl border border-gray-200 shadow-sm` |
| **Buttons** | `bg-[#14ad9f] hover:bg-teal-700 text-white` |
| **Icons** | Lucide React |
| **Statistik-Karten** | 4-spaltige Grid mit Icon-Badges |
| **Tabellen** | shadcn/ui Table-Komponenten |
| **Dialoge** | shadcn/ui Dialog |

### Datum-Formatierung
```typescript
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
const formatDate = (date: Date) => format(date, 'dd.MM.yyyy', { locale: de });
```

### Währungs-Formatierung
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};
```

---

## Anhang D: Verifizierungs-Protokoll (Stand: 16.01.2026)

### Geprüfte Quellen
- **gesetze-im-internet.de** (offizieller Bundesgesetz-Server)
- **Bundesministerium der Finanzen (BMF)**

### Verifizierte Werte

| Regelung | Wert(e) | Gesetzliche Grundlage | Status |
|----------|---------|----------------------|--------|
| **Regelsteuersatz** | 19% | UStG §12 Abs. 1 | ✅ Korrekt |
| **Ermäßigter Steuersatz** | 7% | UStG §12 Abs. 2 | ✅ Korrekt |
| **Nullsteuersatz Photovoltaik** | 0% (≤30 kWp Wohngebäude) | UStG §12 Abs. 3 | ✅ Korrekt |
| **Kleinunternehmer Vorjahr** | 25.000 € | UStG §19 Abs. 1 (seit 01.01.2025) | ✅ Korrekt |
| **Kleinunternehmer laufend** | 100.000 € | UStG §19 Abs. 1 (seit 01.01.2025) | ✅ KORRIGIERT |
| **Grundfreibetrag 2026** | 12.348 € | EStG §32a Abs. 1 Nr. 1 | ✅ KORRIGIERT |
| **Spitzensteuersatz** | 42% (ab 69.879 €) | EStG §32a Abs. 1 Nr. 4 | ✅ KORRIGIERT |
| **Reichensteuer** | 45% (ab 277.826 €) | EStG §32a Abs. 1 Nr. 5 | ✅ Korrekt |
| **Körperschaftsteuer 2024-2027** | 15% | KStG §23 Abs. 1 Nr. 1 | ✅ Korrekt |
| **Körperschaftsteuer 2028** | 14% | KStG §23 Abs. 1 Nr. 2 | ✅ Korrekt |
| **Körperschaftsteuer 2029** | 13% | KStG §23 Abs. 1 Nr. 3 | ✅ Korrekt |
| **Körperschaftsteuer 2030** | 12% | KStG §23 Abs. 1 Nr. 4 | ✅ Korrekt |
| **Körperschaftsteuer 2031** | 11% | KStG §23 Abs. 1 Nr. 5 | ✅ Korrekt |
| **Körperschaftsteuer ab 2032** | 10% | KStG §23 Abs. 1 Nr. 6 | ✅ Korrekt |
| **Gewerbesteuer Messzahl** | 3,5% | GewStG §11 Abs. 2 | ✅ Korrekt |
| **GewSt-Freibetrag (natürlich)** | 24.500 € | GewStG §11 Abs. 1 Nr. 1 | ✅ Korrekt |
| **GewSt-Freibetrag (juristisch)** | 5.000 € | GewStG §11 Abs. 1 Nr. 2 | ✅ Korrekt |
| **GWG Sofortabschreibung** | bis 800 € netto | EStG §6 Abs. 2 Satz 1 | ✅ Korrekt |
| **Sammelposten** | 250 € - 1.000 € | EStG §6 Abs. 2a | ✅ Korrekt |
| **Degressive AfA (max)** | 30% / 3-fache linear | EStG §7 Abs. 2 (30.06.2025-01.01.2028) | ✅ Korrekt |
| **E-Fahrzeug AfA Jahr 1** | 75% | EStG §7 Abs. 2a (nach 30.06.2025) | ✅ Korrekt |
| **1%-Regelung Verbrenner** | 1% Bruttolistenpreis | EStG §6 Abs. 1 Nr. 4 | ✅ NEU |
| **1%-Regelung E-Fahrzeug ≤70k** | 0,25% (¼ Bemessung) | EStG §6 Abs. 1 Nr. 4 | ✅ NEU |
| **1%-Regelung E-Fahrzeug >70k** | 0,5% (½ Bemessung) | EStG §6 Abs. 1 Nr. 4 | ✅ NEU |
| **Entfernungspauschale 1-20km** | 0,30 €/km | EStG §9 Abs. 1 Nr. 4 | ✅ NEU |
| **Entfernungspauschale ab 21km** | 0,38 €/km | EStG §9 Abs. 1 Nr. 4 | ✅ NEU |
| **Kfz-Steuer E-Fahrzeuge** | Befreit bis 31.12.2030 | KraftStG §3d | ✅ NEU |
| **TSE-Pflicht** | Seit 01.01.2020 | AO §146a, KassenSichV | ✅ NEU |
| **Belegausgabepflicht** | Seit 01.01.2020 | AO §146a Abs. 2 | ✅ NEU |
| **Bargeld-Identifikation** | Ab 10.000 € | GwG §10 | ✅ NEU |
| **Bußgeld fehlende TSE** | Bis 25.000 € | AO §379 | ✅ NEU |

### Korrigierte Werte bei dieser Prüfung:
1. **Kleinunternehmer laufendes Jahr**: 50.000 € → **100.000 €**
2. **Grundfreibetrag**: 11.604 € (2024) → **12.348 € (2026)**
3. **Spitzensteuersatz-Grenze**: 66.760 € → **69.879 €**
4. **Einkommensteuerzonen**: Aktualisiert auf 2026-Tarif

### Neu hinzugefügt (16.01.2026):
5. **Abschnitt 3.6 Firmenfahrzeuge & Dienstwagen** komplett neu
   - 1%-Regelung und Fahrtenbuch-Methode
   - Vorsteuerabzug bei Fahrzeugen
   - Leasing vs. Kauf
   - Elektrofahrzeug-Steuervorteile
   - Entfernungspauschale

6. **Abschnitt 3.7 Bareinnahmen & Kassenführung** komplett neu
   - Kassenbuch-Pflicht (wer muss?)
   - Einzelaufzeichnungspflicht (§146 AO)
   - GoBD-Anforderungen für Kasse
   - TSE & Kassensicherungsverordnung
   - Belegausgabepflicht
   - Offene Ladenkasse (Zählprotokoll)
   - Geldwäschegesetz-Schwellenwerte
   - Typische Fehler & Bußgelder
   - Firestore-Strukturen (CashbookEntry, DailyCashReport)

7. **Abschnitt 3.8 Handwerker- & Baurechnungen** komplett neu
   - Pflichtangaben auf Handwerkerrechnungen
   - Leistungstabellen-Struktur (Positionen, Einheiten)
   - Abschlagsrechnungen & Schlussrechnungen
   - Aufmaß & Mengenermittlung
   - §13b Reverse Charge bei Bauleistungen
   - Stundensätze & Kalkulation (alle Gewerke)
   - Gewährleistung & Sicherheitseinbehalt
   - Firestore-Strukturen (HandwerkerInvoice, InvoicePosition, AufmassDocument)
   - Checkliste Handwerkerrechnung

8. **Abschnitt 10.5 HR-System & Personalkosten-Integration** (NEU 16.01.2026)
   - Architektur-Diagramm: Personal-Modul ↔ Buchhaltung
   - Firestore Collections für Personal dokumentiert
   - **KRITISCHE INKONSISTENZ identifiziert**: `taxService.ts` nutzt `employees.salary` statt `payrolls`
   - Fehlende Verknüpfungen aufgedeckt (Zeiterfassung, Firmenwagen, DATEV-Lohn)
   - Handlungsbedarf als 🔴 Hohe Priorität in Abschnitt 11.2 eingetragen
   - PayrollExtended Interface vorgeschlagen (detaillierte SV-Aufschlüsselung)

9. **Abschnitt 10.6 Lagerwirtschaftssystem & Bestandsveränderungen** (NEU 16.01.2026)
   - Architektur-Diagramm: Lager-Modul ↔ Buchhaltung
   - Zwei parallele Services identifiziert: `InventoryService` + `WarehouseService`
   - **KRITISCHE LÜCKE identifiziert**: BWA-Zeile 2 (Bestandsveränderungen) NICHT aus Inventar berechnet
   - `stockMovements` Collection wird NICHT für Buchhaltung genutzt
   - `businessReportService.getInventoryKPIs()` nur für Dashboard, nicht in BWA integriert
   - Handlungsbedarf als 🔴 Hohe Priorität (Punkt 6) in Abschnitt 11.2 eingetragen
   - InventorySnapshot + InventoryDifference Interfaces vorgeschlagen
   - Roadmap erweitert mit Lager-BWA-Tasks (Q1-Q3 2026)

---

*Diese Dokumentation dient der internen Verwendung und ersetzt keine steuerliche Beratung.*

**Konsolidiert aus:**
- STEUERN_BUCHHALTUNG_DOKUMENTATION.md (Original)
- BUCHHALTUNGSMODUL_DOKUMENTATION.md
- STEUER_COMPLIANCE_SYSTEMANALYSE.md

**Verifiziert gegen offizielle Quellen am 16.01.2026**

