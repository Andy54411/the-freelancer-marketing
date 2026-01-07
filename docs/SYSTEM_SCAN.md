# TASKILO SYSTEM SCAN

**Vollständiger Funktionsüberblick | Stand: 7. Januar 2026**

---

## STATISTIK

| Bereich | Anzahl |
|---------|--------|
| Company Dashboard Seiten | **156** |
| Admin Dashboard Seiten | **25+** |
| User Dashboard Seiten | **20+** |
| API Routes | **120+** |
| Services | **80+** |
| Components | **100+ Ordner** |
| Hooks | **30+** |
| Integration Files | **276** |

---

## FERTIGE FEATURES

### 1. MARKTPLATZ (B2C + B2B)
- Auftragssystem mit Treuhand (Escrow via Stripe)
- Projekt-Marktplatz für Anfragen
- Angebots-System (Quotes)
- Chat nach Auftragsannahme
- Bewertungs-Management
- Provider-Profile + Services
- Kategorien + Subkategorien

### 2. BUCHHALTUNG (GoBD-konform)
- Rechnungen erstellen/bearbeiten
- Wiederkehrende Rechnungen
- Angebote erstellen + verwalten
- Ausgaben-Management
- E-Rechnungen (XRechnung, ZUGFeRD)
- Lieferscheine
- Gutschriften
- Mahnwesen
- Kassenbuch
- Steuer-Reports (BWA, UStVA, EÜR, GuV)
- DATEV Export + API
- PDF-Generierung
- OCR Beleg-Scan (Gemini AI)
- Kontakte/Kunden-Verwaltung
- Lieferanten-Verwaltung
- Zeiterfassung
- Projekte

### 3. BANKING
- finAPI Integration
- Revolut Business API
- Bank-Konten verbinden
- Transaktionen synchronisieren
- Beleg-Zuordnung (Receipt Linking)
- Kassenbuch
- Bankabgleich (Reconciliation)
- Überweisungen

**Seiten:**
- `/banking` - Übersicht
- `/banking/accounts` - Konten
- `/banking/transactions` - Transaktionen
- `/banking/reconciliation` - Bankabgleich
- `/banking/cashbook` - Kassenbuch
- `/banking/receipt` - Beleg-Scan
- `/banking/connect` - Bank verbinden
- `/banking/import` - Import
- `/banking/webform` - finAPI WebForm

### 4. E-MAIL SYSTEM
- Webmail (Mailcow via Hetzner)
- Gmail Workspace Integration
- SMTP Anbindung
- E-Mail Client im Dashboard
- Spam/Trash/Drafts/Sent/Starred/Archived
- E-Mail Versand von Dokumenten

**Seiten:**
- `/emails` - Posteingang
- `/emails/sent` - Gesendet
- `/emails/drafts` - Entwürfe
- `/emails/spam` - Spam
- `/emails/trash` - Papierkorb
- `/emails/starred` - Markiert
- `/emails/archived` - Archiviert

### 5. PERSONAL-MANAGEMENT
- Mitarbeiter-Verwaltung
- Dienstplan-Erstellung
- Wunschzeiten
- Abwesenheiten
- Zeiterfassung
- Lohnabrechnung (Payroll)
- GPS-Check
- Mobile Stempeluhr
- AI-Planung
- Analytics
- Activity Log
- Personalkosten

**Seiten:**
- `/personal` - Übersicht
- `/personal/employees` - Mitarbeiter
- `/personal/schedule` - Dienstplan
- `/personal/schedule/wish-times` - Wunschzeiten
- `/personal/absence` - Abwesenheiten
- `/personal/timesheet` - Zeiterfassung
- `/personal/payroll` - Lohnabrechnung
- `/personal/gps-check` - GPS-Check
- `/personal/mobile` - Mobile App
- `/personal/ai-planning` - AI-Planung
- `/personal/analytics` - Auswertungen
- `/personal/costs` - Personalkosten
- `/personal/eau` - Elektronische Arbeitsunfähigkeit
- `/personal/integrations` - Integrationen

### 6. LAGER + INVENTAR
- Inventar-Verwaltung
- Lagerbewegungen
- Warehouse Service
- Stock Movements

**Services:**
- `inventoryService.ts`
- `warehouseService.ts`

### 7. KOMMUNIKATION
- WhatsApp Business Integration
- Chat-System
- Notifications
- Video-Calls (TaskiloMeeting)
- Newsletter-System

**WhatsApp Seiten:**
- `/whatsapp` - Übersicht
- `/whatsapp/setup` - Einrichtung
- `/whatsapp/connections` - Verbindungen
- `/whatsapp/templates` - Vorlagen
- `/whatsapp/settings` - Einstellungen

### 8. TASKILO ADVERTISING
- Google Ads Integration
- Meta (Facebook) Ads
- LinkedIn Ads
- Kampagnen-Management
- Keyword-Analyse
- Analytics

**Seiten:**
- `/taskilo-advertising` - Übersicht
- `/taskilo-advertising/google-ads` - Google Ads
- `/taskilo-advertising/google-ads/campaigns` - Kampagnen
- `/taskilo-advertising/google-ads/analytics` - Analytics
- `/taskilo-advertising/google-ads/settings` - Einstellungen
- `/taskilo-advertising/meta` - Meta/Facebook
- `/taskilo-advertising/linkedin` - LinkedIn
- `/taskilo-advertising/keywords` - Keyword-Analyse
- `/taskilo-advertising/campaigns` - Alle Kampagnen

### 9. WORKSPACE
- Realtime Workspace (wie Notion)
- Cloud Storage (Drive)
- Kalender
- Ticket-System

**Services:**
- `WorkspaceService.ts`
- `DriveApiService.ts`

### 10. ADMIN DASHBOARD
- User-Verwaltung
- Company-Verwaltung
- Storno-Management
- Chat-Monitoring
- Content-Monitoring
- Reviews verwalten
- Webmail-Billing
- Chatbot Knowledge Base
- AI Analytics
- Newsletter-Versand
- Tickets
- Drive
- Kalender

**Seiten:**
- `/admin` - Dashboard
- `/admin/users` - Benutzer
- `/admin/companies` - Firmen
- `/admin/storno-management` - Stornos
- `/admin/chat-monitoring` - Chat-Überwachung
- `/admin/content-monitoring` - Content-Überwachung
- `/admin/reviews` - Bewertungen
- `/admin/webmail-billing` - Webmail-Abrechnung
- `/admin/chatbot-knowledge` - Chatbot-Wissen
- `/admin/ai-analytics` - AI Analytics
- `/admin/newsletter` - Newsletter
- `/admin/tickets` - Tickets
- `/admin/workspace` - Workspace-Verwaltung
- `/admin/email` - E-Mail
- `/admin/drive` - Drive
- `/admin/calendar` - Kalender
- `/admin/analytics` - Analytics
- `/admin/updates` - Updates
- `/admin/settings` - Einstellungen
- `/admin/admin-users` - Admin-Benutzer

### 11. RECRUITING
- Stellenanzeigen erstellen
- Bewerbungen verwalten
- Kandidaten-Profile
- Job-Portal

**Seiten:**
- `/recruiting` - Übersicht
- `/recruiting/create` - Stelle erstellen
- `/recruiting/[jobId]` - Stelle bearbeiten
- `/recruiting/applications` - Bewerbungen
- `/recruiting/profile` - Profil

### 12. USER DASHBOARD
- Persönliche Einstellungen
- Karriere / Jobfinder
- Angebote erhalten
- Projekte
- Bestellungen
- Inbox

**Seiten:**
- `/user/[uid]` - Dashboard
- `/user/[uid]/settings` - Einstellungen
- `/user/[uid]/career` - Karriere
- `/user/[uid]/career/jobfinder` - Jobfinder
- `/user/[uid]/career/jobs` - Jobs
- `/user/[uid]/career/applications` - Bewerbungen
- `/user/[uid]/career/profile` - Karriere-Profil
- `/user/[uid]/quotes` - Angebote
- `/user/[uid]/projects` - Projekte
- `/user/[uid]/orders` - Bestellungen
- `/user/[uid]/inbox` - Posteingang
- `/user/[uid]/updates` - Updates

### 13. SONSTIGES
- Chatbot (AI Support)
- Multi-Language (DE/EN)
- Dark Mode
- Mobile-Responsive
- SEO optimiert
- Changelog/Updates
- Hilfe-Center

---

## INTEGRATIONEN

| Service | Zweck | Status |
|---------|-------|--------|
| **Stripe** | Payment + Escrow | Aktiv |
| **finAPI** | Banking (Open Banking) | Aktiv |
| **Revolut Business** | Banking + Subscriptions | Aktiv |
| **DATEV** | Steuerberater-Export | Aktiv |
| **Gmail/Google** | E-Mail + OAuth | Aktiv |
| **WhatsApp Business** | Messaging | Aktiv |
| **Google Ads** | Werbung | Aktiv |
| **Meta/Facebook** | Werbung | Aktiv |
| **LinkedIn** | Werbung | Aktiv |
| **Gemini AI** | OCR + Chatbot | Aktiv |
| **Mailcow** | Webmail Server | Aktiv |
| **Firebase** | Auth + Firestore | Aktiv |
| **Vercel** | Hosting Frontend | Aktiv |
| **Hetzner** | Mail + Proxy Server | Aktiv |
| **Google Business Profile** | Reviews | Aktiv |
| **INWX** | Domain API | Aktiv |

---

## NOCH OFFEN / GEPLANT

| Feature | Priorität |
|---------|-----------|
| Microsoft 365 E-Mail Integration | Hoch |
| DHL/Hermes API (Versand-Tracking) | Mittel |
| Webflow/WordPress Integration | Niedrig |
| X (Twitter) Posting | Niedrig |
| Meta/Instagram Posting | Niedrig |
| Taboola/Outbrain Ads | Niedrig |
| AI Video Generation (Veo) | Optional |
| Lead-CRM System (erweitern) | Mittel |
| Mobile App (iOS/Android) | Hoch |

---

## TECHNISCHER STACK

| Bereich | Technologie |
|---------|-------------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind CSS |
| **Backend** | Next.js API Routes + Firebase Functions |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **Storage** | Firebase Storage + Google Cloud |
| **Hosting** | Vercel (Frontend) + Hetzner (Mail) |
| **AI** | Google Gemini |
| **Mail Server** | Mailcow (Docker) |
| **Video** | TURN Server (Coturn) |

---

## FIRESTORE COLLECTIONS

```
auftraege
chats
companies
companyReviews
content_violations
expenses
inventory
invoices
numberSequences
payments
reviewRequests
stockMovements
updates
users
customers (Subcollection unter companies)
quotes (Subcollection unter companies)
... und mehr
```

---

## SERVICES ÜBERSICHT

### Core Services
- `customerService.ts` - Kundenverwaltung
- `firestoreInvoiceService.ts` - Rechnungen
- `quoteService.ts` - Angebote
- `financeService.ts` - Finanzen
- `gobdService.ts` - GoBD-Compliance
- `numberSequenceService.ts` - Nummernkreise

### Banking
- `BankVerificationService.ts` - Bank-Verifizierung
- `paymentAccountService.ts` - Zahlungskonten
- `transaction-link.service.ts` - Transaktions-Verknüpfung

### E-Invoice
- `eInvoiceService.ts` - E-Rechnungen
- `eInvoiceTransmissionService.ts` - E-Rechnung Übermittlung
- `autoEInvoiceService.ts` - Automatische E-Rechnungen
- `xrechnungParserService.ts` - XRechnung Parser

### Tax & Compliance
- `GermanyValidationEngine.ts` - Deutsche Steuer-Validierung
- `taxService.ts` - Steuerberechnung
- `datevService.ts` - DATEV Export
- `datevCardService.ts` - DATEV Karten

### OCR & AI
- `EnhancedOCRService.ts` - Beleg-Scan
- `GeminiReceiptCategorizationService.ts` - Kategorisierung
- `ChatbotKnowledgeService.ts` - Chatbot-Wissen
- `ContentSafetyService.ts` - Content-Moderation

### Advertising
- `googleAdsClientService.ts` - Google Ads
- `multiPlatformAdvertisingService.ts` - Multi-Platform
- `KeywordAnalysisService.ts` - Keyword-Analyse
- `GoogleBusinessProfileService.ts` - Google Business

### Communication
- `whatsapp.service.ts` - WhatsApp
- `whatsapp-notifications.service.ts` - WhatsApp Notifications
- `HetznerNewsletterService.ts` - Newsletter
- `newGmailService.ts` - Gmail

### Personal
- `personalService.ts` - Personalverwaltung
- `EmployeeActivityLogService.ts` - Aktivitätslog
- `availabilityService.ts` - Verfügbarkeiten
- `timeTrackingService.ts` - Zeiterfassung

### Storage & Files
- `pdfGenerationService.ts` - PDF-Generierung
- `storageLimitService.ts` - Speicherlimits
- `storageTrackingService.ts` - Speicher-Tracking
- `WorkspaceService.ts` - Workspace

### Other
- `inventoryService.ts` - Inventar
- `warehouseService.ts` - Lager
- `deliveryNoteService.ts` - Lieferscheine
- `reviewRequestService.ts` - Bewertungsanfragen
- `updateService.ts` - Updates
- `TaskiloLevelService.ts` - Tasker-Level
- `TextTemplateService.ts` - Textvorlagen

---

## FAZIT

**Taskilo ist zu ~90% feature-complete.**

Die wichtigsten Module sind fertig und produktionsreif:
- Marktplatz mit Escrow
- Vollständige Buchhaltung (GoBD)
- Banking-Integration
- E-Mail-System
- Personalverwaltung
- Advertising-Plattform
- Admin-Dashboard

Offene Punkte sind hauptsächlich:
- Microsoft 365 Integration
- Versand-APIs (DHL, Hermes)
- Mobile App
- Erweiterte Social Media Posting Features
