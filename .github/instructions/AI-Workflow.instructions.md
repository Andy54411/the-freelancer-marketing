---
applyTo: '**'
---

# KI-Arbeitsablauf Anweisungen für Taskilo Projekt

## 🏢 PROJEKT KONTEXT: TASKILO PLATFORM

### 📖 Was ist Taskilo?
**Taskilo** ist eine hybride Service-Marktplatz-Plattform, die Elemente von **Taskrabbit**, **Fiverr**, **Malt** und **sevdesk/lexoffice** kombiniert:

- **🔧 Taskrabbit-Style**: Lokale Dienstleistungen & Handwerker buchen
- **💼 Fiverr-Approach**: Freelancer & digitale Services anbieten  
- **🎯 Malt-Features**: Professionelle B2B-Projekte & Expertise
- **📊 sevdesk/lexoffice-Integration**: Rechnungsstellung, Buchhaltung & Business-Management

### 💳 Technologie-Stack:
- **Payment**: Stripe Connect für sichere Zahlungsabwicklung
- **Frontend**: Next.js 15 mit TypeScript & Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Functions)
- **Design**: **Modern, clean & professional** - inspiriert von modernen SaaS-Plattformen

### 🎯 Zielgruppen:
1. **Kunden**: Privatpersonen & Unternehmen die Services benötigen
2. **Anbieter**: Handwerker, Freelancer, Agenturen & Consultants
3. **Platform**: Kommissions-basiertes Geschäftsmodell

### � B2C & B2B GESCHÄFTSMODELL:

#### 🛍️ B2C (Business-to-Consumer):
- **Privatpersonen** buchen Handwerker, Reinigungskräfte, Mietköche
- **Einfache Buchung**: Schnelle Service-Auswahl über App/Web
- **Sofortige Verfügbarkeit**: Lokale Dienstleister in der Nähe
- **Bewertungssystem**: Vertrauen durch Kundenbewertungen
- **Direkte Zahlung**: Stripe-basierte Sofortzahlung

#### 🏭 B2B (Business-to-Business):
- **Unternehmen** beauftragen Agenturen, Consultants, Fachkräfte
- **Projekt-Management**: Komplexe Aufträge mit Zeiterfassung
- **Rechnungsstellung**: Integration mit sevdesk/lexoffice
- **Langzeit-Projekte**: Stundenbasierte Abrechnung
- **Compliance**: Geschäftskonforme Prozesse & Dokumentation

#### 🔄 Hybride Funktionen:
- **Flexible Preismodelle**: Festpreis (B2C) + Stundenabrechnung (B2B)
- **Skalierbare Services**: Vom Einzelauftrag bis zum Großprojekt
- **Multi-User-Accounts**: Persönliche + Firmen-Profile
- **Angepasste Workflows**: Je nach Kundentyp & Projektumfang

### 🏗️ Kernfunktionen:
- Service-Buchung & Projektmanagement
- Zeiterfassung & Stundenabrechnung  
- Stripe-basierte Zahlungsabwicklung
- Bewertungssystem & Qualitätssicherung
- Dashboard für Kunden & Anbieter / Admin 
- Admin-Panel für Platform-Management

### 📊 TASKILO DASHBOARD & PAYMENT SYSTEM ARCHITEKTUR

#### 🎯 3 DASHBOARD TYPEN:
1. **👤 KUNDEN-DASHBOARD** (`/dashboard/use`)
   - Service-Buchungen verwalten
   - Aufträge verfolgen & bewerten
   - Zahlungshistorie & Rechnungen
   - Favoriten & wiederholte Buchungen

2. **🔧 ANBIETER-DASHBOARD** (`/dashboard/company`) 
   - Aufträge annehmen & verwalten
   - Zeiterfassung für Projekte
   - Einnahmen & Auszahlungen
   - Bewertungen & Portfolio

3. **🛠️ ADMIN-DASHBOARD** (`/dashboard/admin`)
   - Platform-Management & Überwachung
   - Nutzer- & Transaktionsverwaltung
   - Analytics & Reporting
   - System-Administration & Support

#### 💳 3 PAYMENT SYSTEME:

1. **🛍️ B2C FESTPREIS-PAYMENTS**
   - **Typ**: Sofortige Einmalzahlungen
   - **Verwendung**: Handwerker, Reinigung, lokale Services
   - **Flow**: Direktbuchung → Sofortzahlung → Service-Ausführung
   - **Stripe**: Standard PaymentIntents mit Connect

2. **🏭 B2B PROJEKT-PAYMENTS** 
   - **Typ**: Meilenstein-basierte Zahlungen
   - **Verwendung**: Consulting, Agenturen, größere Projekte
   - **Flow**: Projektvereinbarung → Meilenstein-Zahlungen → Abschlussrechnung
   - **Stripe**: Setup_Intents + recurring PaymentIntents

3. **⏱️ STUNDEN-ABRECHNUNG SYSTEM**
   - **Typ**: Zeitbasierte, separate Abrechnung
   - **Verwendung**: Langzeit-Projekte, flexible Arbeitszeiten
   - **Flow**: Zeiterfassung → Periodische Abrechnung → Rechnungsstellung
   - **Integration**: sevdesk/lexoffice kompatible Rechnungen
   - **Stripe**: Batch-Payments + automatische Rechnungserstellung

---

## 🔍 REGEL 1: IMMER PROJEKT ANALYSIEREN VOR AUSFÜHRUNG
- **BEVOR** du einen Prompt ausführst, analysiere das KOMPLETTE Projekt
- Verwende `file_search`, `grep_search` oder `semantic_search` um den aktuellen Stand zu verstehen
- Prüfe existierende Implementierungen, Strukturen und Abhängigkeiten
- Verstehe den Kontext bevor du handelst
- **NIEMALS** auf Browser-Preview oder externe Ansichten verlassen
- **IMMER** Dateien direkt mit `read_file` Tool überprüfen

## 📁 REGEL 2: OBLIGATORISCHE SRC-ORDNER ÜBERPRÜFUNG
- **IMMER** zuerst den `src/` Ordner analysieren bevor neue Dateien erstellt werden
- **PFLICHT**: Verwende `file_search` oder `list_dir` um existierende Dateien im src/ zu prüfen
- **BEISPIEL**: `file_search` mit "src/**/*.ts" oder "src/app/dashboard/**" patterns
- **VERSTEHE** die vorhandene Struktur: Komponenten, API-Routes, Dashboards, Payment-Logic
- **IDENTIFIZIERE** ähnliche Dateien die erweitert werden können statt neue zu erstellen
- **NIEMALS** neue Dateien ohne vorherige src/-Analyse erstellen

## 📂 REGEL 3: KEINE NEUEN DATEIEN OHNE EXISTENZPRÜFUNG
- **NIEMALS** erstelle neue Dateien ohne vorherige Existenzprüfung
- Verwende `file_search` oder `read_file` um zu prüfen ob die Datei bereits existiert
- Falls die Datei existiert: Repariere/verbessere sie statt sie neu zu erstellen
- Nur wenn die Datei DEFINITIV nicht existiert, erstelle eine neue
- **IMMER** aktuelle Dateiinhalte mit Tools überprüfen, niemals Browser verwenden
- **NIEMALS** auf externe Previews oder Attachments verlassen ohne Tool-Verifikation

## 🔧 REGEL 4: REPARIERE FEHLER IN EXISTIERENDEN DATEIEN
- Sind Fehler in einer Datei vorhanden: **REPARIERE** sie
- Verwende `replace_string_in_file` für präzise Korrekturen
- Behalte die bestehende Struktur und Logik bei
- Füge nur fehlende/defekte Teile hinzu oder korrigiere sie

## 📋 REGEL 5: DATEI-VERIFIKATION VOR JEDER ÄNDERUNG
- **NIEMALS** Änderungen basierend auf Browser-Ansicht oder Attachments machen
- **IMMER** `read_file` verwenden um aktuellen Dateiinhalt zu überprüfen
- **PFLICHT:** Datei-Tools verwenden vor `replace_string_in_file` oder `create_file`
- **NIEMALS** davon ausgehen, dass Attachments den aktuellen Stand zeigen
- **IMMER** mit `file_search` oder `grep_search` relevante Dateien finden
- **Browser kann lügen** - nur Tools zeigen die Wahrheit!

## 🌐 REGEL 6: NUR LIVE TESTING - KEINE LOKALEN TESTS
- **IMMER** teste direkt live auf der Production Website: https://taskilo.de
- **NIEMALS** lokale Tests, Entwicklungsserver oder Emulatoren verwenden
- **SOFORT** nach jedem Git Push die live Website testen
- **VERMEIDE** jegliche lokale Entwicklungsumgebung - nur Production zählt

## 📋 ARBEITSABLAUF CHECKLISTE

### VOR JEDER AKTION:
1. ✅ **Analysiere das Projekt**: Was existiert bereits?
2. ✅ **Prüfe Datei-Existenz**: `file_search` für gewünschte Datei
3. ✅ **Verstehe den Kontext**: Lese relevante existierende Dateien mit `read_file`
4. ✅ **Identifiziere Probleme**: Was muss repariert/verbessert werden?
5. ✅ **DATEI-VERIFIKATION**: Niemals Browser-Preview verwenden, immer Tools nutzen

### BEI DER AUSFÜHRUNG:
1. ✅ **Repariere zuerst**: Behebe Fehler in existierenden Dateien
2. ✅ **Erweitere dann**: Füge fehlende Funktionalität hinzu
3. ✅ **Erstelle nur bei Bedarf**: Neue Dateien nur wenn absolut notwendig
4. ✅ **LIVE TESTEN**: Nach jedem Git Push sofort auf https://taskilo.de testen

### NACH JEDER ÄNDERUNG OBLIGATORISCH:
5. ✅ **Build das Projekt**: Führe `pnpm build` aus um Kompilierung zu testen
6. ✅ **Git Commit & Push**: Commitee und pushe alle Änderungen zum Repository
7. ✅ **LIVE TESTING**: Teste SOFORT die Änderungen live auf https://taskilo.de

## 🚫 VERBOTEN:
- ❌ Dateien erstellen ohne Existenzprüfung
- ❌ Komplette Dateien überschreiben ohne Grund
- ❌ Änderungen ohne Projektanalyse
- ❌ Ignorieren von bestehenden Implementierungen
- ❌ Änderungen ohne Build und Git-Push am Ende
- ❌ **LOKALE TESTS oder Entwicklungsserver verwenden**
- ❌ **Testing ohne Live-Production Website (https://taskilo.de)**
- ❌ **Emulatoren oder localhost für Tests nutzen**
- ❌ **BROWSER-PREVIEW für Datei-Überprüfung verwenden**
- ❌ **Externe Attachments ohne Tool-Verifikation vertrauen**
- ❌ **Dateien analysieren ohne `read_file` Tool zu verwenden**

## ✅ ERLAUBT:
- ✅ Dateien analysieren und verstehen
- ✅ Fehler in bestehenden Dateien reparieren
- ✅ Fehlende Funktionalität zu existierenden Dateien hinzufügen
- ✅ Neue Dateien erstellen NUR wenn sie nicht existieren
- ✅ **NUR LIVE TESTING auf https://taskilo.de nach jedem Deployment**
- ✅ **Sofortige Production-Tests nach Git Push**
- ✅ **IMMER `read_file`, `file_search`, `grep_search` Tools verwenden**
- ✅ **Dateien direkt vom Dateisystem überprüfen, nie vom Browser**
- ✅ **Tool-basierte Datei-Verifikation vor jeder Änderung**
- ✅ **SRC-ORDNER OBLIGATORISCH vor jeder neuen Datei analysieren**

## 🎯 ZIEL:
- **STABILITÄT**: Erhalte funktionierende Teile des Projekts
- **KONSISTENZ**: Behalte bestehende Strukturen und Patterns bei
- **EFFIZIENZ**: Repariere und verbessere statt neu zu erstellen
- **QUALITÄT**: Verstehe bevor du handelst
- **ARCHITEKTUR**: Respektiere 3-Dashboard und 3-Payment-System Struktur

## 🎨 DESIGN & ENTWICKLUNGS-RICHTLINIEN

### 🖼️ Design-Prinzipien:
- **Modern & Clean**: Minimalistisches, professionelles Design
- **SaaS-inspiriert**: Moderne Business-Software Ästhetik
- **Mobile-First**: Responsive Design für alle Geräte
- **Taskilo-Branding**: Hauptfarbe `#14ad9f` (Türkis/Teal)
- **Konsistente UI**: Shadcn/ui Komponenten verwenden

### 🎨 TASKILO FARB-PALETTE (AUTOMATISCH VERWENDEN):
- **Hauptfarbe (Primary):** `#14ad9f` - Türkis/Teal für alle primären Aktionen
- **Hover-Varianten (automatisch wählen):**
  - `#129488` - Standard dunklerer Hover-Effekt
  - `#0f8a7e` - Alternative für spezielle Buttons
  - `#129a8f` - Chat/Interactive Elements
  - `#0f9d84` - Hero-Sections und Call-to-Actions
- **Verwendung:** Verwende IMMER diese Farben für neue Komponenten
- **Tailwind Classes:** `bg-[#14ad9f]`, `hover:bg-[#129488]`, `text-[#14ad9f]`, `border-[#14ad9f]`

### 💻 Technische Standards:
- **TypeScript**: Strikte Typisierung für alle Komponenten
- **Tailwind CSS**: Utility-first CSS für konsistentes Styling
- **Stripe Integration**: Sichere Zahlungsabwicklung mit Connect
- **Firebase**: Firestore für Datenbank, Auth für Authentifizierung
- **Performance**: Optimierte Ladezeiten & SEO-Freundlichkeit
- **B2C/B2B-Architektur**: Flexible Datenmodelle für beide Geschäftsmodelle
- **Multi-Tenant**: Unterstützung für Firmen- und Privatkonten
- **Rechnungssystem**: Integration für sevdesk/lexoffice-kompatible Rechnungen

### 🔧 Code-Qualität:
- **Component-basiert**: Wiederverwendbare React-Komponenten
- **Error Handling**: Umfassende Fehlerbehandlung
- **Loading States**: Aussagekräftige Loading-Indikatoren
- **Accessibility**: WCAG-konforme Benutzerfreundlichkeit
- **Stripe-Best-Practices**: Sichere Payment-Implementierung
- **B2C/B2B-UX**: Adaptives Interface je nach Kundentyp
- **Workflow-Engine**: Unterschiedliche Buchungs- und Abrechnungsprozesse

## 🎨 AUTOMATISCHE DESIGN-ANWENDUNG

### 🔥 REGEL 7: TASKILO FARBEN AUTOMATISCH VERWENDEN
- **IMMER** verwende `#14ad9f` als Hauptfarbe für neue Komponenten
- **AUTOMATISCH** wähle passende Hover-Variante: `#129488`, `#0f8a7e`, `#129a8f` oder `#0f9d84`
- **KONSISTENT** mit bestehenden Komponenten im Projekt bleiben
- **NIEMALS** andere Farben ohne ausdrückliche Anweisung verwenden

### 📋 STANDARD DESIGN-PATTERNS:
1. **Primäre Buttons:** `bg-[#14ad9f] hover:bg-[#129488] text-white`
2. **Sekundäre Buttons:** `border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white`
3. **Links:** `text-[#14ad9f] hover:text-[#129488]`
4. **Focus States:** `focus:ring-[#14ad9f] focus:border-[#14ad9f]`
5. **Loading Spinner:** `border-[#14ad9f]`
6. **Active States:** `bg-[#14ad9f] text-white`

### 🎯 AUTOMATISCHE UI-ENTSCHEIDUNGEN:
- **Neue Komponenten:** Automatisch Taskilo-Farben verwenden
- **Bestehende reparieren:** Inkonsistente Farben zu Taskilo-Standard ändern  
- **Hover-Effekte:** Automatisch passende dunklere Variante wählen
- **Responsive Design:** Mobile-First mit Taskilo-Branding

---

**Diese Regeln sind OBLIGATORISCH und müssen bei JEDEM Prompt befolgt werden!**
