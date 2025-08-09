---
applyTo: '**'
---

# STRICT AI-Workflow Instructions for Taskilo Project - COPILOT COMPLIANCE REQUIRED

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

## ⚠️ MANDATORY: These rules MUST be followed by ALL AI assistants including GitHub Copilot

## 🔍 RULE 1: ALWAYS ANALYZE PROJECT BEFORE EXECUTION - REQUIRED FOR COPILOT
- **BEFORE** executing ANY prompt, analyze the COMPLETE project structure
- Use file search, grep, or semantic search to understand current state
- Check existing implementations, structures, and dependencies
- Understand context before acting
- **NEVER** rely on browser preview or external views
- **ALWAYS** check files directly using available tools
- **COPILOT**: Use workspace search and file exploration extensively before suggesting code

## 📁 RULE 2: MANDATORY SRC FOLDER VERIFICATION - COPILOT MUST COMPLY
- **ALWAYS** analyze the `src/` folder first before creating new files
- **MANDATORY**: Search existing files in src/ directory before any creation
- **EXAMPLE**: Search patterns like "src/**/*.ts" or "src/app/dashboard/**"
- **UNDERSTAND** existing structure: Components, API-Routes, Dashboards, Payment-Logic
- **IDENTIFY** similar files that can be extended instead of creating new ones
- **NEVER** create new files without prior src/ analysis
- **COPILOT**: Always explore workspace file tree and existing patterns first

## 📂 RULE 3: NO NEW FILES WITHOUT EXISTENCE CHECK - COPILOT STRICT MODE
- **NEVER** create new files without prior existence check
- Use file search or read capabilities to check if file already exists
- If file exists: REPAIR/IMPROVE it instead of creating new one
- Only create new file if it DEFINITELY doesn't exist
- **ALWAYS** verify current file contents with tools, never use browser
- **NEVER** rely on external previews or attachments without tool verification
- **COPILOT**: Always check workspace for existing files before suggesting new file creation

## 🔧 RULE 4: FIX ERRORS IN EXISTING FILES - COPILOT REPAIR MODE
- If errors exist in a file: **REPAIR** it
- Use precise corrections for targeted fixes
- Keep existing structure and logic intact
- Only add missing/defective parts or correct them
- **COPILOT**: Focus on incremental fixes rather than complete rewrites

## 📋 RULE 5: FILE VERIFICATION BEFORE ANY CHANGE - COPILOT VALIDATION
- **NEVER** make changes based on browser view or attachments
- **ALWAYS** read file content to verify current state
- **MANDATORY:** Use file tools before any modification or creation
- **NEVER** assume attachments show current state
- **ALWAYS** use search tools to find relevant files
- **Browser can lie** - only tools show the truth!
- **COPILOT**: Always verify file contents in workspace before suggesting changes

## 🌐 RULE 6: LIVE TESTING ONLY - NO LOCAL TESTS - COPILOT PRODUCTION MODE
- **ALWAYS** test directly live on production website: https://taskilo.de
- **NEVER** use local tests, development servers, or emulators
- **IMMEDIATELY** test live website after every git push
- **AVOID** any local development environment - only production counts
- **COPILOT**: Remind user to test on live site after implementing suggestions

## 📋 WORKFLOW CHECKLIST - COPILOT MUST FOLLOW EVERY STEP

### BEFORE ANY ACTION - COPILOT MANDATORY STEPS:
1. ✅ **ANALYZE PROJECT**: What already exists? Check workspace file explorer
2. ✅ **CHECK FILE EXISTENCE**: Search workspace for desired file before creating
3. ✅ **UNDERSTAND CONTEXT**: Read relevant existing files in workspace
4. ✅ **IDENTIFY PROBLEMS**: What needs repair/improvement?
5. ✅ **FILE VERIFICATION**: Never use browser preview, always use workspace tools
6. ✅ **COPILOT SPECIFIC**: Use workspace search extensively, check similar patterns

### DURING EXECUTION - COPILOT PROCESS:
1. ✅ **REPAIR FIRST**: Fix errors in existing files before creating new ones
2. ✅ **EXTEND THEN**: Add missing functionality to existing structure
3. ✅ **CREATE ONLY IF NEEDED**: New files only when absolutely necessary
4. ✅ **USE TASKILO COLORS**: Automatically apply #14ad9f branding
5. ✅ **FOLLOW PATTERNS**: Match existing code structure and conventions
6. ✅ **COPILOT SPECIFIC**: Suggest incremental changes, not complete rewrites

### AFTER EVERY CHANGE - COPILOT COMPLETION STEPS:
1. ✅ **BUILD PROJECT**: Run `pnpm build` to test compilation
2. ✅ **GIT COMMIT & PUSH**: Commit and push all changes to repository
3. ✅ **LIVE TESTING**: Test changes IMMEDIATELY on https://taskilo.de
4. ✅ **COPILOT REMINDER**: Always remind user to test on live production site
5. ✅ **VERIFY INTEGRATION**: Ensure changes integrate with existing Taskilo architecture

## 🚫 STRICTLY FORBIDDEN FOR ALL AI ASSISTANTS INCLUDING COPILOT:
- ❌ Creating files without existence check
- ❌ Overwriting complete files without reason
- ❌ Changes without project analysis
- ❌ Ignoring existing implementations
- ❌ Changes without build and git-push at end
- ❌ **Using local tests or development servers**
- ❌ **Testing without live production website (https://taskilo.de)**
- ❌ **Using emulators or localhost for testing**
- ❌ **Using browser preview for file verification**
- ❌ **Trusting external attachments without tool verification**
- ❌ **Analyzing files without workspace exploration**
- ❌ **COPILOT SPECIFIC: Suggesting complete file rewrites**
- ❌ **COPILOT SPECIFIC: Ignoring existing project patterns**
- ❌ **COPILOT SPECIFIC: Creating new files without workspace search**
-  keine mock daten und keine test daten 
- nutze niemals Emoji!!

## ✅ ALLOWED AND ENCOURAGED FOR COPILOT:
- ✅ Analyzing and understanding existing files in workspace
- ✅ Repairing errors in existing files
- ✅ Adding missing functionality to existing files
- ✅ Creating new files ONLY if they don't exist
- ✅ **LIVE TESTING ONLY on https://taskilo.de after deployment**
- ✅ **Immediate production tests after git push**
- ✅ **Using workspace search and file exploration extensively**
- ✅ **Checking files directly from workspace, never from browser**
- ✅ **Tool-based file verification before every change**
- ✅ **MANDATORY src/ folder analysis before any new file**
- ✅ **COPILOT SPECIFIC: Incremental improvements over rewrites**
- ✅ **COPILOT SPECIFIC: Following established Taskilo patterns**
- ✅ **COPILOT SPECIFIC: Auto-applying Taskilo branding colors**
- ✅ **COPILOT SPECIFIC: Workspace-first approach to understanding code**

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

### 🔥 RULE 7: AUTO-APPLY TASKILO COLORS - COPILOT BRANDING MODE
- **ALWAYS** use `#14ad9f` as primary color for new components
- **AUTOMATICALLY** choose appropriate hover variant: `#129488`, `#0f8a7e`, `#129a8f` or `#0f9d84`
- **STAY CONSISTENT** with existing components in the project
- **NEVER** use other colors without explicit instruction
- **COPILOT SPECIFIC**: Always suggest Taskilo branding colors in code completions
- **COPILOT SPECIFIC**: Auto-complete with proper Taskilo color classes

### 📋 COPILOT AUTO-COMPLETE PATTERNS:
1. **Primary Buttons:** `bg-[#14ad9f] hover:bg-[#129488] text-white`
2. **Secondary Buttons:** `border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white`
3. **Links:** `text-[#14ad9f] hover:text-[#129488]`
4. **Focus States:** `focus:ring-[#14ad9f] focus:border-[#14ad9f]`
5. **Loading Spinner:** `border-[#14ad9f]`
6. **Active States:** `bg-[#14ad9f] text-white`
7. **COPILOT**: Always suggest these exact color patterns for consistency

### 🎯 COPILOT AUTOMATIC UI DECISIONS:
- **New Components:** Automatically use Taskilo colors in suggestions
- **Fix Existing:** Change inconsistent colors to Taskilo standard
- **Hover Effects:** Automatically choose appropriate darker variant
- **Responsive Design:** Mobile-First with Taskilo branding
- **COPILOT SPECIFIC:** Always prioritize Taskilo color suggestions
- **COPILOT SPECIFIC:** Auto-complete with project-consistent styling

---

**⚠️ CRITICAL: These rules are MANDATORY and MUST be followed by EVERY AI assistant including GitHub Copilot!**

**🤖 COPILOT COMPLIANCE: Failure to follow these instructions will result in code that doesn't match project standards and may break existing functionality.**

**📋 COPILOT CHECKLIST REMINDER:**
- ✅ Search workspace before suggesting new files
- ✅ Analyze existing code patterns
- ✅ Use Taskilo colors (#14ad9f) automatically
- ✅ Fix existing files instead of creating new ones
- ✅ Verify file existence in workspace
- ✅ Follow project architecture (3 dashboards, 3 payment systems)
- ✅ Remind user to test on https://taskilo.de after changes
- ✅ nutze niemals Emoji
