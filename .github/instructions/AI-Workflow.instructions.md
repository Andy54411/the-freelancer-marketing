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

### �🏗️ Kernfunktionen:
- Service-Buchung & Projektmanagement
- Zeiterfassung & Stundenabrechnung  
- Stripe-basierte Zahlungsabwicklung
- Bewertungssystem & Qualitätssicherung
- Dashboard für Kunden & Anbieter
- Admin-Panel für Platform-Management

---

## 🔍 REGEL 1: IMMER PROJEKT ANALYSIEREN VOR AUSFÜHRUNG
- **BEVOR** du einen Prompt ausführst, analysiere das KOMPLETTE Projekt
- Verwende `file_search`, `grep_search` oder `semantic_search` um den aktuellen Stand zu verstehen
- Prüfe existierende Implementierungen, Strukturen und Abhängigkeiten
- Verstehe den Kontext bevor du handelst

## 📁 REGEL 2: KEINE NEUEN DATEIEN OHNE PRÜFUNG
- **NIEMALS** erstelle neue Dateien ohne vorherige Existenzprüfung
- Verwende `file_search` oder `read_file` um zu prüfen ob die Datei bereits existiert
- Falls die Datei existiert: Repariere/verbessere sie statt sie neu zu erstellen
- Nur wenn die Datei DEFINITIV nicht existiert, erstelle eine neue

## 🔧 REGEL 3: REPARIERE FEHLER IN EXISTIERENDEN DATEIEN
- Sind Fehler in einer Datei vorhanden: **REPARIERE** sie
- Verwende `replace_string_in_file` für präzise Korrekturen
- Behalte die bestehende Struktur und Logik bei
- Füge nur fehlende/defekte Teile hinzu oder korrigiere sie

## 🌐 REGEL 4: NUR LIVE TESTING - KEINE LOKALEN TESTS
- **IMMER** teste direkt live auf der Production Website: https://taskilo.de
- **NIEMALS** lokale Tests, Entwicklungsserver oder Emulatoren verwenden
- **SOFORT** nach jedem Git Push die live Website testen
- **VERMEIDE** jegliche lokale Entwicklungsumgebung - nur Production zählt

## 📋 ARBEITSABLAUF CHECKLISTE

### VOR JEDER AKTION:
1. ✅ **Analysiere das Projekt**: Was existiert bereits?
2. ✅ **Prüfe Datei-Existenz**: `file_search` für gewünschte Datei
3. ✅ **Verstehe den Kontext**: Lese relevante existierende Dateien
4. ✅ **Identifiziere Probleme**: Was muss repariert/verbessert werden?

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

## ✅ ERLAUBT:
- ✅ Dateien analysieren und verstehen
- ✅ Fehler in bestehenden Dateien reparieren
- ✅ Fehlende Funktionalität zu existierenden Dateien hinzufügen
- ✅ Neue Dateien erstellen NUR wenn sie nicht existieren
- ✅ **NUR LIVE TESTING auf https://taskilo.de nach jedem Deployment**
- ✅ **Sofortige Production-Tests nach Git Push**

## 🎯 ZIEL:
- **STABILITÄT**: Erhalte funktionierende Teile des Projekts
- **KONSISTENZ**: Behalte bestehende Strukturen und Patterns bei
- **EFFIZIENZ**: Repariere und verbessere statt neu zu erstellen
- **QUALITÄT**: Verstehe bevor du handelst

## 🎨 DESIGN & ENTWICKLUNGS-RICHTLINIEN

### 🖼️ Design-Prinzipien:
- **Modern & Clean**: Minimalistisches, professionelles Design
- **SaaS-inspiriert**: Moderne Business-Software Ästhetik
- **Mobile-First**: Responsive Design für alle Geräte
- **Taskilo-Branding**: Hauptfarbe `#14ad9f` (Türkis/Teal)
- **Konsistente UI**: Shadcn/ui Komponenten verwenden

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

---

**Diese Regeln sind OBLIGATORISCH und müssen bei JEDEM Prompt befolgt werden!**
