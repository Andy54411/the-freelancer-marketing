# TASKILO - VOLLSTÄNDIGE

**Stand:** Januar 2026  
**Plattform:** Web-App (Next.js) + Mobile/Desktop App (Flutter)

---

## 📊 EXECUTIVE SUMMARY

Taskilo ist eine **All-in-One Business Management Platform** mit integriertem **Webmail-Client** und **Freelancer-Marktplatz**. Die Plattform kombiniert:
- GoBD-konforme Buchhaltung mit deutschem Steuerrecht (§19 UStG)
- Vollwertiger E-Mail-Client (IMAP/SMTP) mit KI-gestützten Features
- Freelancer-Marktplatz (Tasker-System)
- Enterprise-Features (Mitarbeiterverwaltung, Recruiting, Projekte, Werbeplattform)

---

## 🌐 WEB-PLATTFORM (Next.js + Firebase)

### 1. DASHBOARD & ÜBERSICHT
- **Company Dashboard**: Zentrale Übersicht für Unternehmen
- **Admin Dashboard**: Systemweite Verwaltung für Taskilo-Team
- **Mitarbeiter-Dashboard**: Rollenbasierte Ansicht mit individuellen Berechtigungen

### 2. TASKER-SYSTEM (Freelancer-Marktplatz)
**Für Freelancer (Tasker):**
- Posteingang für Projektanfragen
- Auftrags-Management (Eingehend, Aktiv, Abgeschlossen, Storniert)
- Projekt-Marktplatz mit:
  - Verfügbare Projekte
  - Bewerbungsverwaltung
  - Direkte Anfragen
  - Kategorie-Anfragen
- Bewertungssystem (5-Sterne + Rezensionen)
- Tasker-Level-System (Gamification)
- Profil-Management:
  - Portfolio
  - Keyword-Analyse für Sichtbarkeit
  - Dienstleistungskatalog
  - FAQ-Bereich

**Für Auftraggeber:**
- Tasker suchen & beauftragen
- Auftrags-Tracking
- Escrow-Zahlungssystem (Revolut Integration)

### 3. BUCHHALTUNG & FINANZEN (GoBD-konform)
**Angebote & Rechnungen:**
- Angebotserstellung
- Auftragsbestätigungen
- Lieferscheine
- Rechnungserstellung (einmalig & wiederkehrend)
- Automatische Rechnungsnummerierung (fortlaufend, keine Lücken)
- Mahnwesen (automatische Mahnläufe)
- Gutschriften & Stornorechnungen
- E-Rechnungen (XRechnung/ZUGFeRD-konform)

**Ausgaben & Kosten:**
- Einmalige Ausgaben
- Wiederkehrende Ausgaben
- Anlagenverwaltung
- OCR-Dokumentenerkennung

**Steuern & Compliance:**
- Kleinunternehmer-Regelung (§19 UStG)
- USt-IdNr Validierung
- Steuerberater-Export (DATEV-Schnittstelle)
- Steuerauswertungen
- GoBD-konforme Archivierung

**Banking & Zahlungen:**
- FinAPI-Integration (Bankverbindungen)
- Kassenbuch
- Zahlungsabgleich
- Unvollständige Zahlungen
- Revolut-Integration für Escrow

### 4. KUNDEN- & LIEFERANTENVERWALTUNG
- Geschäftspartner-Datenbank
- Kontakthistorie
- Dokumentenverwaltung
- OCR-Dokumentenerkennung

### 5. KALENDER & TERMINE
- Integrierter Kalender
- Termin-Management
- Team-Kalender
- Ressourcenplanung

### 6. E-MAIL-SYSTEM
**IMAP/SMTP Integration:**
- Gmail-Anbindung
- Hetzner Webmail (mailcow)
- Beliebige IMAP/SMTP-Provider

**Features:**
- Posteingang, Gesendet, Entwürfe, Spam, Papierkorb
- Favoriten & Archiv
- E-Mail-Suche
- Ordner-Verwaltung
- HTML-Editor
- Signaturen
- Anhänge
- Ungelesene Zähler

**Multi-Account System (Google-Style):**
- Mehrere E-Mail-Konten verknüpfen
- Schnelles Konto-Wechseln mit einem Klick
- Jedes Konto behält eigene Inbox
- Bidirektionale Konto-Verknüpfung
- Multi-Session Cookie-Management
- Legacy-Account Migration

### 7. WHATSAPP BUSINESS (Premium-Modul)
- WhatsApp Business Integration
- Team-Postfach
- Automatisierte Antworten

### 8. PERSONAL & MITARBEITER
**Mitarbeiterverwaltung:**
- Mitarbeiter-Datenbank
- Dienstplanung
- Gehaltsabrechnung
- Arbeitszeiterfassung
- Kostenkalkulation
- Personal-Analytics
- Urlaubs- & Abwesenheitsverwaltung
- Dokumentenverwaltung

**Berechtigungssystem:**
- 17 granulare Berechtigungen
- Individuell konfigurierbar pro Mitarbeiter
- Voller Zugang oder eingeschränkt

### 9. RECRUITING (Premium-Modul)
- Unternehmensprofil
- Stellenanzeigen-Erstellung
- Bewerbermanagement
- Bewerbungs-Tracking

### 10. WORKSPACE & PROJEKTMANAGEMENT (Premium-Modul)
**Projekt-Management:**
- Projekt-Übersicht
- Status-Ansicht
- Gantt-Charts
- Disposition
- Ressourcenplanung

**Aufgaben-Management:**
- Alle Aufgaben
- Meine Aufgaben
- Task-Assignment
- Prioritäten

**Einsatzplanung:**
- Wochenansicht
- Monatsansicht
- Ressourcen-Management

**Ansichten:**
- Board-Ansicht (Kanban)
- Listen-Ansicht
- Kalender-Ansicht
- Dokumente
- Prozesse
- Zeiterfassung

### 11. TASKILO ADVERTISING (Premium-Modul)
**Multi-Channel Werbeplattform:**
- Dashboard mit Analytics
- Google Ads Integration:
  - Kampagnen-Verwaltung
  - Neue Kampagne erstellen
  - Zielvorhaben
  - Tools
  - Abrechnung
  - Verwaltung
- LinkedIn Ads
- Meta Ads (Facebook/Instagram)
- Zentrale Analytics

### 12. LAGERBESTAND
- Inventar-Übersicht
- Inventur-Funktionen
- Artikel-Verwaltung

### 13. ADMIN-FUNKTIONEN
**Systemverwaltung:**
- Übersicht (Dashboard)
- Kalender
- Workspace
- Ticket-System
- Chat-Monitoring
- Content-Überwachung
- Storno-Verwaltung
- Enhanced Analytics
- **Taskilo KI Analytics** (Nutzungsstatistiken für KI-Features)

**Datenbank-Verwaltung:**
- Unternehmen
- Benutzer
- Admin-Benutzer
- E-Mail-System
- Webmail-Abrechnung
- Modul-Abonnements

**Content-Management:**
- Updates & Changelog
- Bewertungen
- Newsletter-System

**Speicher & Infrastruktur:**
- Taskilo Drive
- Storage-Management
- Einstellungen

### 14. SUPPORT & HILFE
- Support-Ticket-System
- Dokumentation
- FAQ

### 15. EINSTELLUNGEN
- Allgemeine Einstellungen
- Module & Seats (Abo-Verwaltung)
- Buchhaltung & Steuer
- Zahlungskonditionen
- Bankverbindung
- Logo & Dokumente
- Auszahlungen
- Storno-Einstellungen
- Textvorlagen
- E-Mail Integration

---

## 📱 TASKILO WEBMAIL APP (Flutter - Mobile & Desktop)

### 1. AUTHENTICATION & ONBOARDING
**OAuth 2.0 Integration:**
- Gmail OAuth
- Hetzner Webmail OAuth
- Generische IMAP/SMTP-Anbieter

**Anbieter-Auswahl:**
- Gmail
- Hetzner Webmail
- Outlook/Office 365
- Yahoo Mail
- iCloud Mail
- Eigener Server (IMAP/SMTP)

**Features:**
- Biometrische Authentifizierung
- Multi-Account Support
- Automatische Konfiguration
- Splash Screen
- Welcome Screen

### 2. E-MAIL-CLIENT
**Posteingang & Verwaltung:**
- E-Mail-Liste mit Vorschau
- Ungelesene Zähler
- Ordner (Inbox, Sent, Drafts, Spam, Trash, Archive)
- Favoriten (Starred)
- E-Mail-Suche
- Swipe-Aktionen (Archiv, Löschen, Favorit)

**E-Mail-Ansicht:**
- HTML & Plain Text Rendering
- Anhänge anzeigen & herunterladen
- Inline-Bilder
- Antworten / Allen antworten / Weiterleiten
- Als gelesen/ungelesen markieren
- Favoriten
- In Ordner verschieben
- Löschen

**E-Mail Verfassen:**
- HTML-Editor (WYSIWYG)
- Rich Text Formatting
- Anhänge (Dateien, Fotos, Kamera)
- Signaturen
- CC/BCC
- Entwürfe speichern
- Von-Adresse auswählen
- Responsive Design

### 3. TASKILO MEET (Videokonferenzen)
**Meeting-Funktionen:**
- Sofort-Meetings erstellen
- Geplante Meetings
- Meeting-Code beitreten
- Einladungslinks teilen

**Meeting-Features:**
- Video & Audio
- Bildschirmfreigabe
- Chat
- Teilnehmer-Liste
- Moderator-Kontrollen
- Hand heben
- Reactions

**Meeting-Verwaltung:**
- Anstehende Meetings
- Vergangene Meetings
- Meeting-Historie

### 4. TASKILO DRIVE (Cloud-Speicher)
**Datei-Management:**
- Ordner-Hierarchie
- Datei-Upload
- Ordner erstellen
- Suche
- Favoriten
- Zuletzt verwendet
- Mit mir geteilt

**Datei-Aktionen:**
- Umbenennen
- Verschieben
- Löschen
- Herunterladen
- Teilen (Links)
- Vorschau
- Details anzeigen

**Ansichten:**
- Listen-Ansicht
- Raster-Ansicht
- Sortierung (Name, Datum, Größe, Typ)

### 5. TASKILO PHOTOS (Foto-Verwaltung)
**Foto-Bibliothek:**
- Alle Fotos
- Nach Datum sortiert
- Raster-Ansicht
- Scroll-Datum-Anzeige

**Alben:**
- Alben-Übersicht
- Album erstellen
- Fotos zu Alben hinzufügen
- Album-Cover

**Foto-Ansicht:**
- Vollbild-Ansicht
- Zoom & Pan
- Foto-Details (Datum, Größe, Auflösung)
- Teilen
- Löschen
- Favoriten
- Album hinzufügen

**KI-Features (Taskilo KI):**
- **Automatische Foto-Klassifikation**
  - Landschaft
  - Porträt
  - Essen
  - Tiere
  - Dokumente
  - Screenshots
- **Dokumenten-Erkennung**
  - Rechnungen
  - Quittungen
  - Verträge
  - Personalausweis
  - Führerschein
- **Silent Learning** (Feedback-basiertes Training)

### 6. CHAT (Taskilo Chat)
**Messaging:**
- Chat-Liste
- Einzel-Chats
- Gruppen-Chats
- Nachricht senden
- Ungelesene Nachrichten

### 7. TASKS (Aufgaben)
**To-Do-Listen:**
- Aufgaben erstellen
- Aufgaben abhaken
- Prioritäten
- Fälligkeitsdatum

### 8. CALENDAR (Kalender)
**Termin-Verwaltung:**
- Monatsansicht
- Wochenansicht
- Tagesansicht
- Ereignisse erstellen
- Erinnerungen

### 9. SETTINGS (Einstellungen)
**Account-Verwaltung:**
- Profil bearbeiten
- E-Mail-Konten verwalten
- Signaturen
- Benachrichtigungen
- Dark Mode
- Sprache
- Speicher-Verwaltung

---

## 🤖 TASKILO KI (Hetzner Server - Python FastAPI)

### LOKALE KI-DIENSTE (KEINE CLOUD!)
**Wichtig:** Alle KI-Daten werden **lokal auf Hetzner gespeichert**, NICHT in Firebase/Firestore!

### 1. FOTO-KLASSIFIKATION
**Kategorien:**
- Landschaft
- Porträt
- Essen
- Tiere
- Dokumente
- Screenshots

**Features:**
- Automatische Erkennung beim Upload
- Konfidenz-Score
- Batch-Processing

### 2. DOKUMENT-KLASSIFIKATION
**Dokument-Typen:**
- Rechnungen
- Quittungen
- Verträge
- Personalausweis
- Führerschein
- Sonstige Dokumente

**Features:**
- OCR-Integration (optional)
- Metadaten-Extraktion
- Konfidenz-Score

### 3. SILENT LEARNING
**Feedback-basiertes Training:**
- Benutzer korrigiert Klassifikation
- System lernt aus Feedback
- JSON-basierte Datenspeicherung
- Offline-Training (keine externe API)

**Datenspeicher (Lokal auf Hetzner):**
- `/opt/taskilo/training-data/` - Trainingsdaten
- `/opt/taskilo/models/` - ML-Modelle
- JSON-Format für Feedback

---

## 🔐 SICHERHEIT & COMPLIANCE

### DATENSCHUTZ
- DSGVO-konform
- Verschlüsselte Datenübertragung (HTTPS/TLS)
- Verschlüsselte Datenspeicherung
- **KI-Daten lokal** (keine Cloud-Übertragung)

### STEUER-COMPLIANCE
- GoBD-konform (Deutschland)
- Kleinunternehmer-Regelung (§19 UStG)
- USt-IdNr Validierung
- Fortlaufende Rechnungsnummern
- Stornierungen statt Löschungen
- DATEV-Schnittstelle

### AUTHENTIFIZIERUNG
- OAuth 2.0 (Gmail, Office 365)
- Biometrische Authentifizierung (App)
- 2-Faktor-Authentifizierung
- JWT-Tokens

---

## 💰 MONETARISIERUNGS-MODELL

### FREEMIUM-BASIS
- Basis-Features kostenlos
- E-Mail-Client (begrenzt)
- Tasker-Profil

### PREMIUM-MODULE (Einzeln buchbar)
1. **WhatsApp Business** - 29€/Monat
2. **Taskilo Advertising** - 49€/Monat
3. **Recruiting** - 39€/Monat
4. **Workspace** (erweitert) - 59€/Monat

### BUNDLE-PRICING
- Alle Module kombiniert: 149€/Monat (Rabatt!)

### ZUSATZ-EINNAHMEN
- Webmail-Hosting (mailcow auf Hetzner)
- Taskilo Drive (Storage > 5GB)
- Taskilo Meet (> 50 Minuten/Monat)
- Tasker-Provision (10% auf vermittelte Aufträge)
- Escrow-Gebühr (2,5% auf Transaktionen)

---

## 🏗️ TECHNOLOGIE-STACK

### FRONTEND
- **Web**: Next.js 15+, TypeScript, Tailwind CSS
- **Mobile/Desktop**: Flutter 3.x (iOS, Android, macOS, Windows, Linux)

### BACKEND
- **Hosting**: Vercel (Next.js), Hetzner (E-Mail + KI)
- **Datenbank**: Firebase Firestore
- **Authentifizierung**: Firebase Auth + OAuth 2.0
- **E-Mail**: mailcow (Hetzner), IMAP/SMTP
- **Zahlungen**: Revolut Business API (Escrow)
- **Speicher**: Firebase Storage + Hetzner (Webmail)

### KI & ML
- **Python FastAPI** (Taskilo KI auf Hetzner)
- **Lokale Modelle** (TensorFlow/PyTorch)
- **Silent Learning** (Feedback-basiert)

### INTEGRATIONS
- FinAPI (Banking)
- DATEV (Steuerberater)
- Revolut (Zahlungen)
- Google Ads API
- LinkedIn Ads API
- Meta Business API
- Gmail API
- Google Calendar API

---

## 📈 SKALIERBARKEIT

### AKTUELLE ARCHITEKTUR
- **Vercel**: Automatische Skalierung (Serverless)
- **Firebase**: Managed Database (Auto-Scaling)
- **Hetzner**: Dedizierter Server (erweiterbar)

### WACHSTUM
- Multi-Tenant-Architektur (eine Instanz für alle Kunden)
- Firestore-Subcollections pro Firma
- Load-Balancing für KI-Server
- CDN für statische Assets

---

## 🎯 WETTBEWERBSVORTEILE

### ALLEINSTELLUNGSMERKMALE
1. **All-in-One-Plattform**: Buchhaltung + E-Mail + Freelancer-Marktplatz
2. **GoBD-Konformität**: Eingebaut, nicht nachträglich
3. **Deutsche Steuerregelungen**: Kleinunternehmer, USt-IdNr, DATEV
4. **Integrierter Webmail-Client**: Eigene App + Web-Integration
5. **Lokale KI**: Datenschutzfreundlich, keine Cloud-Abhängigkeit
6. **Escrow-System**: Sicheres Bezahlen für Freelancer-Projekte
7. **Premium-Module**: Flexibles Abo-Modell

### VS. WETTBEWERBER
- **Lexoffice/sevDesk**: Keine E-Mail, kein Marktplatz, keine KI
- **Gmail/Outlook**: Keine Buchhaltung, kein Marktplatz
- **Upwork/Fiverr**: Keine Buchhaltung, keine E-Mail-Integration
- **Slack/Teams**: Keine Buchhaltung, keine Freelancer-Features

---

## 🚀 ROADMAP & ZUKUNFT

### Q1 2026
- ✅ Webmail App Release (iOS, Android, Desktop)
- ✅ Taskilo KI Integration (Foto-Klassifikation)
- ✅ Escrow-System (Revolut)

### Q2 2026
- WhatsApp Team-Postfach (Multi-User)
- Erweiterte KI-Features (OCR, Rechnungserkennung)
- Mobile Push-Benachrichtigungen

### Q3 2026
- API für Drittanbieter
- Zapier/Make-Integrationen
- Mobile Payment (Apple Pay, Google Pay)

### Q4 2026
- Enterprise-Features (SSO, LDAP)
- White-Label-Optionen
- KI-Assistenten (ChatGPT-Integration)

---

## 📊 METRIKEN & KPIs

### ERFOLGS-MESSUNG
- **Aktive Unternehmen**: Companies-Collection
- **Premium-Subscriptions**: Module-Collection
- **Tasker-Vermittlungen**: Orders-Collection
- **E-Mail-Volumen**: Webmail-API Logs
- **KI-Nutzung**: `/opt/taskilo/training-data/`
- **Speicher-Nutzung**: Firebase Storage + Hetzner
- **Support-Tickets**: Admin Dashboard

---

## 💡 ZUSAMMENFASSUNG FÜR INVESTOREN

### WARUM TASKILO?
1. **Unerschlossener Markt**: Freelancer + Kleinunternehmer in Deutschland
2. **Compliance-First**: GoBD & Steuerrecht eingebaut
3. **Sticky Product**: E-Mail + Buchhaltung = tägliche Nutzung
4. **Skalierbar**: Cloud-Native, Multi-Tenant
5. **Diversifizierte Einnahmen**: SaaS + Provision + Premium
6. **Datenschutz**: Lokale KI, deutsche Server
7. **Technologisch modern**: Next.js 15, Flutter 3.x, Firebase

### INVESTITIONS-POTENZIAL
- **Adressierbarer Markt**: 3,7 Mio. Freelancer + 2,5 Mio. Kleinunternehmen (Deutschland)
- **Customer Lifetime Value**: 149€/Monat × 36 Monate = 5.364€
- **Churn-Reduktion**: Buchhaltung + E-Mail = Lock-in
- **Upsell-Potenzial**: 4 Premium-Module + Drive + Meet

---

**Erstellt:** Januar 2026  
**Version:** 1.0  
**Kontakt:** Taskilo GmbH
