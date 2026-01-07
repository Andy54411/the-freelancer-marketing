# TASKILO AI - COMPREHENSIVE CODING GUIDE

> **STOP! VOR JEDER ANTWORT DIESE REGELN PRÜFEN!**
> Diese Datei enthält verbindliche Projektregeln. Bei Verstößen wird der Code abgelehnt.

---

## CHECKLISTE (VOR JEDER ANTWORT)
- [ ] Deutsche Umlaute: ä, ö, ü, ß korrekt? (NICHT ae/oe/ue/ss)
- [ ] Keine Fallbacks wie `|| ''` oder `?? fallback`?
- [ ] Keine console.log()?
- [ ] Keine Emojis in Code/UI?
- [ ] TypeScript fehlerfrei (get_errors)?
- [ ] Zod-Validierung für Inputs?
- [ ] @/ Pfade statt relative Imports?

---

**Core Stack**: Next.js 15+ + TypeScript + Firebase + Vercel + Hetzner (Webmail) + German Tax Compliance

## CRITICAL NON-NEGOTIABLE RULES

1. **GoBD + §19 UStG**: Steuerkonform, fortlaufende Nummern, nur Stornierungen
2. **KEINE Mock-Daten**: Wurzelprobleme lösen, echte Firebase-Daten
3. **TypeScript 100%**: get_errors vor Abschluss
4. **Zod-Validierung**: ALLE Inputs validieren
5. **Update-Notifications**: Bei jedem Commit via `/dashboard/admin/updates`
6. **KEINE FALLBACKS**: Fehler müssen sichtbar sein! Keine `|| ''`, `|| 'default'`, `?? fallback`
7. **KEINE EMOJIS**: Professioneller Code und UI - KEINE Icons/Emojis in Code, Kommentaren oder UI
8. **Path Aliases**: NUR `@/` imports - keine relativen Pfade
9. **DEUTSCHE UMLAUTE PFLICHT**: IMMER ä, ö, ü, ß korrekt schreiben! NIEMALS ae/oe/ue/ss als Ersatz!
10. **KEINE console.log()**: Strukturiertes Logging oder entfernen
11. **DATEIEN LÖSCHEN**: NIEMALS Dateien löschen ohne explizite Benutzeranfrage

---

## ZUGANGSDATEN & ACCOUNTS
- **Haupt-Admin-Account**: andy.staudinger@taskilo.de
- **Admin Dashboard**: `/dashboard/admin` (Login via `/admin/login`)
- **Webmail**: `/webmail` oder mail.taskilo.de

---

## INFRASTRUKTUR-ÜBERSICHT

### 1. VERCEL (taskilo.de) - Next.js Frontend + API
| Was | Details |
|-----|---------|
| **Dienste** | Next.js App, API Routes, Firebase Client SDK |
| **Deployment** | AUTOMATISCH via `git push` auf `main` |
| **Verzeichnis** | `/Users/andystaudinger/Tasko/` (ALLES außer `webmail-proxy/`) |
| **Domains** | taskilo.de, www.taskilo.de |
| **Datenbank** | Firebase Firestore (Cloud) |

### 2. HETZNER SERVER (mail.taskilo.de) - E-Mail Backend
| Was | Details |
|-----|---------|
| **Dienste** | Webmail-Proxy, Mailcow (IMAP/SMTP), TURN Server, Redis |
| **Deployment** | MANUELL per SCP + Docker! KEIN Git! |
| **Verzeichnis lokal** | `/Users/andystaudinger/Tasko/webmail-proxy/` |
| **Verzeichnis Server** | `/opt/taskilo/webmail-proxy/` |
| **Container** | `taskilo-webmail-proxy`, `taskilo-redis`, `taskilo-coturn` |

### 3. FIREBASE (Cloud) - Datenbank + Auth
| Was | Details |
|-----|---------|
| **Dienste** | Firestore, Authentication, Storage, Cloud Functions |
| **Collections** | users, companies, customers, invoices, escrows, etc. |
| **NICHT für Webmail** | Webmail nutzt Hetzner IMAP, NICHT Firebase! |

### 4. REVOLUT ESCROW-SYSTEM (Zahlungen)
| Was | Details |
|-----|---------|
| **Hetzner (Proxy)** | `mail.taskilo.de/webmail-api/api/revolut-proxy` - ALLE Revolut API-Aufrufe |
| **Vercel (Client)** | `src/lib/revolut-hetzner-proxy.ts` - Leitet an Hetzner weiter |
| **IP-Whitelist** | Nur Hetzner IP `91.99.79.104` ist bei Revolut freigeschaltet! |
| **Token Storage** | `/opt/taskilo/webmail-proxy/data/revolut-tokens.json` auf Hetzner |
| **Firestore** | `escrows` Collection für Treuhand-Transaktionen |

**WICHTIG: Warum Hetzner-Proxy?**
- Revolut Business API erlaubt nur IP-Whitelist-Zugriff
- Vercel hat KEINE feste IP (ändert sich dynamisch)
- Hetzner hat feste IP `91.99.79.104` → in Revolut Whitelist
- Alle Revolut-Aufrufe von Vercel → Hetzner Proxy → Revolut API

**Revolut-Proxy Endpunkte (auf Hetzner):**
| Route | Beschreibung |
|-------|--------------|
| `GET /health` | Health Check |
| `POST /refresh-token` | Token erneuern |
| `POST /token-exchange` | Authorization Code → Token |
| `GET /accounts` | Alle Konten |
| `GET /transactions` | Transaktionen |
| `GET /webhooks` | Alle Webhooks |
| `POST /webhooks` | Neuen Webhook registrieren |
| `GET /counterparties` | Counterparties |
| `GET /exchange-rate` | Wechselkurse |
| `POST /api` | Generischer API Proxy |

**Vercel Revolut APIs:**
| Route | Beschreibung |
|-------|--------------|
| `/api/company/[uid]/payout` | Auszahlung an Tasker |
| `/api/company/[uid]/payout-history` | Auszahlungshistorie |
| `/api/webmail/create-payment` | Webmail-Zahlungen |

**Escrow-Flow:**
1. Kunde zahlt → Geld in Escrow (Firebase `escrows` Collection)
2. Auftrag abgeschlossen → Tasker bestätigt
3. Auszahlung → Vercel API → Hetzner Proxy → Revolut API → Tasker-Konto

---

## DEPLOYMENT-ENTSCHEIDUNGSBAUM

```
Datei geändert in:
├── src/components/webmail/*.tsx ──────► Vercel (automatisch via git push)
├── src/app/api/webmail/*.ts ──────────► Vercel (automatisch via git push)  
├── webmail-proxy/src/*.ts ────────────► HETZNER (manuell SCP + Docker!)
└── Alle anderen src/ Dateien ─────────► Vercel (automatisch via git push)
```

### Webmail-Proxy Deployment (NUR wenn webmail-proxy/ geändert wurde!)
```bash
# 1. Dateien per SCP hochladen
scp webmail-proxy/src/services/EmailService.ts root@mail.taskilo.de:/opt/taskilo/webmail-proxy/src/services/

# 2. Docker Container neu bauen und starten
ssh root@mail.taskilo.de "cd /opt/taskilo/webmail-proxy && docker compose up -d --build"
```

---

## ARCHITECTURE PATTERNS

### Firebase Company-Subcollection Architecture
```typescript
// NEW: Company-based subcollections (ALWAYS USE)
import { db } from '@/firebase/clients';
export class CustomerService {
  static async getByCompany(companyId: string) {
    return getDocs(collection(db, 'companies', companyId, 'customers'));
  }
}

// OLD: Global collections (NEVER USE)
// collection(db, 'customers') // DEPRECATED
```

**Migration Status**: Active transition from 37 → 15 collections. ALWAYS use company subcollection pattern: `/companies/{companyId}/{collection}/{docId}`

### Dashboard Routing Structure
- **Company Dashboard**: `/dashboard/company/[uid]` (Primary business logic)
- **Taskilo Advertising**: `/dashboard/company/[uid]/taskilo-advertising/{google-ads,linkedin,meta,campaigns,keywords,analytics}`
- **Finance**: `/dashboard/company/[uid]/finance/{invoices,expenses,reports}`
- **Settings**: `/dashboard/company/[uid]/settings?view={profile,tax,banking}`

### Header-Komponenten (WICHTIG!)
Es gibt **3 verschiedene Header** je nach Kontext:

| Header | Komponente | Verwendung |
|--------|------------|------------|
| **HeroHeader** | `@/components/hero8-header` | Öffentliche Seiten (/, /services, /kontakt, /about, /agb, etc.) |
| **Header** | `@/components/Header` | Dashboard-Seiten für eingeloggte User ohne Webmail |
| **MailHeader** | `@/components/webmail/MailHeader` | Webmail-Seiten und Dashboard für User MIT Taskilo Webmail |

**Regeln:**
1. **Öffentliche Seiten** (ausgeloggte User können sehen): Immer `HeroHeader` verwenden
2. **Dashboard-Seiten**: `Header` oder `MailHeader` (je nach Webmail-Status)
3. **Webmail-Seiten** (`/webmail/*`): Immer `MailHeader` mit AppLauncher
4. Der `ConditionalFooter` im Root-Layout fügt automatisch den Footer hinzu - NIEMALS manuell `<Footer />` in öffentliche Seiten einfügen!

```typescript
// Öffentliche Seiten (RICHTIG)
import { HeroHeader } from '@/components/hero8-header';
export default function PublicPage() {
  return (
    <div>
      <HeroHeader />
      {/* Content */}
    </div>
  );
}

// Dashboard-Seiten (RICHTIG)
import Header from '@/components/Header';
// oder für Webmail-verbundene User:
import { MailHeader } from '@/components/webmail/MailHeader';
```

---

## GERMAN TAX & COMPLIANCE

### Kleinunternehmer (§19 UStG) Detection
```typescript
const isKleinunternehmer = 
  companyData.kleinunternehmer === 'ja' ||
  companyData.ust === 'kleinunternehmer' ||
  companyData.step2?.kleinunternehmer === 'ja';
```

### GoBD-Compliant Invoice Numbering
- Sequential numbers per company (never reuse)  
- Storno invoices instead of deletions
- Tax validation through `GermanyValidationEngine`

### USt-IdNr Validation
Companies need either `vatId` (USt-IdNr) OR `taxNumber` (Steuernummer).
Kleinunternehmer: only `taxNumber`, never `vatId`.

---

## DEVELOPMENT WORKFLOW

### Essential Build Commands
```bash
pnpm dev                                        # Development server
NODE_OPTIONS="--max-old-space-size=8192" pnpm build  # Production build
pnpm run type-check                            # TypeScript validation
```

### Error Handling Patterns
```typescript
// Structured API responses
return NextResponse.json({
  success: false,
  error: 'Specific error message',
  details: error.message,
  timestamp: new Date().toISOString(),
}, { status: 500 });
```

---

## FIREBASE SECURITY & PATTERNS

### Firestore Rules Pattern
```javascript
match /companies/{companyId}/customers/{customerId} {
  allow read, write: if request.auth.uid == companyId;
}
```

### Critical Firestore Limitations
- **NO orderBy()** - Sort in application code
- Always cleanup listeners in `useEffect` 
- Use soft deletes for audit trails (`deletedAt: Timestamp`)

### Firebase Import Pattern
```typescript
// Es gibt server.ts für Admin SDK und clients.ts für Client SDK
import { db, auth } from '@/firebase/clients';
```

---

## UI/UX STANDARDS

### Design-Philosophie
**Modern, Minimalistisch, Clean** - IMMER diese drei Prinzipien befolgen:
- Viel Weißraum für Klarheit
- Klare Hierarchien durch Typografie
- Subtile Animationen statt aufdringlicher Effekte
- Professionelles, Business-orientiertes Erscheinungsbild

### Farben
| Verwendung | Farbe | Hex-Code |
|------------|-------|----------|
| **Primary** | Teal | `#14ad9f` |
| **Primary Dark** | Teal 700 | `#0d8a7f` |
| **Text Primary** | Gray 900 | `#111827` |
| **Text Secondary** | Gray 500 | `#6b7280` |
| **Background** | White / Gray 50 | `#ffffff` / `#f9fafb` |
| **Border** | Gray 200 | `#e5e7eb` |

**NIEMALS schwarz (#000000) als Primary-Farbe verwenden!**

### Typografie
- **Headings**: `font-bold`, klare Größenhierarchie (`text-4xl` → `text-xl`)
- **Body Text**: `text-gray-600` oder `text-gray-700`
- **Labels**: `text-sm font-medium text-gray-500`

### Komponenten-Patterns
```tsx
// Buttons - Immer mit Hover-Transition
<button className="bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-semibold 
  hover:bg-teal-700 transition-colors shadow-sm">

// Cards - Subtiler Schatten, gerundete Ecken
<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 
  hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

// Inputs - Clean mit Focus-State
<input className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 
  focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none">

// Icon-Badges
<div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
  <Icon className="w-5 h-5 text-[#14ad9f]" />
</div>
```

### Layout-Patterns
- **Sections**: `py-16` bis `py-24` für vertikalen Rhythmus
- **Container**: `max-w-7xl mx-auto px-6`
- **Grids**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **Alternating Backgrounds**: `bg-white` / `bg-gray-50` zwischen Sektionen

### Animationen
- **Framer Motion** für komplexe Animationen
- **Tailwind Transitions**: `transition-all duration-300 ease-in-out`
- **Hover-Effekte**: `hover:shadow-xl hover:-translate-y-2`
- **Float-Animation** für schwebende Elemente

### Hero-Sections
```tsx
// Gradient Background
<section className="bg-gradient-to-br from-teal-50 via-white to-teal-50">

// Oder mit Bild-Overlay
<section className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800">
  <img src="..." className="absolute inset-0 object-cover" />
  <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/95 via-teal-700/90" />
</section>
```

### Karten mit Illustrationen
- Pastellfarbene Hintergründe pro Kategorie
- Weiße Container für Bilder: `bg-white rounded-xl shadow-sm`
- Hover mit Scale-Effekt: `group-hover:scale-110 transition-transform`

### Icons
- **NUR Lucide React**: `import { Icon } from 'lucide-react'`
- Einheitliche Größen: `w-4 h-4`, `w-5 h-5`, `w-6 h-6`
- Icon-Farbe: `text-[#14ad9f]` oder `text-gray-400`

### Loading States
```tsx
// Skeleton Loading
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>

// Spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
```

### Responsive Design
- **Mobile-First**: Immer zuerst mobile Styles, dann `md:` und `lg:`
- **Breakpoints**: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- **Hidden/Show**: `hidden lg:block` / `lg:hidden`

### Verboten
- Schwarze Buttons oder Primary-Elemente
- Überladene UIs mit zu vielen Elementen
- Harte Kanten (immer `rounded-lg` oder `rounded-xl`)
- Zu kleine Touch-Targets (min. 44x44px für Buttons)
- Inkonsistente Abstände

---

## CHATBOT KNOWLEDGE BASE
Bei neuen Website-Seiten IMMER URLs in `/src/app/api/cron/refresh-knowledge-base/route.ts` hinzufügen!

---

## DASHBOARD FUNKTIONSÜBERSICHT (Stand: Januar 2026)

### ADMIN DASHBOARD (`/dashboard/admin`)
Datei: `src/app/dashboard/admin/layout.tsx`
| Menüpunkt | Route | Beschreibung |
|-----------|-------|--------------|
| Übersicht | `/dashboard/admin` | Admin-Hauptseite |
| Kalender | `/admin-calendar` | Admin-Kalender |
| Workspace | `/dashboard/admin/workspace` | Admin-Workspace |
| Tickets | `/dashboard/admin/tickets` | Support-Tickets |
| Chat-Monitoring | `/dashboard/admin/chat-monitoring` | Chatbot-Überwachung |
| Content-Überwachung | `/dashboard/admin/content-monitoring` | Content-Moderation |
| Storno-Verwaltung | `/dashboard/admin/storno-management` | Stornierungen verwalten |
| Enhanced Analytics | `/dashboard/admin/analytics` | Erweiterte Analysen |
| Taskilo KI Analytics | `/dashboard/admin/ai-analytics` | KI-Nutzungsstatistiken |
| Updates & Changelog | `/dashboard/admin/updates` | Release-Notes |
| Bewertungen | `/dashboard/admin/reviews` | Bewertungsverwaltung |
| Newsletter | `/dashboard/admin/newsletter` | Newsletter-System |
| Unternehmen | `/dashboard/admin/companies` | Firmenverwaltung |
| Benutzer | `/dashboard/admin/users` | Benutzerverwaltung |
| Admin-Benutzer | `/dashboard/admin/admin-users` | Admin-Zugänge |
| E-Mail System | `/dashboard/admin/email` | E-Mail-Verwaltung |
| Webmail-Abrechnung | `/dashboard/admin/webmail-billing` | Webmail-Kosten |
| Taskilo Drive | `/dashboard/admin/drive` | Cloud-Speicher |
| Einstellungen | `/dashboard/admin/settings` | Admin-Einstellungen |

### COMPANY DASHBOARD (`/dashboard/company/[uid]`)
Datei: `src/components/dashboard/CompanySidebar.tsx`

**Hauptbereiche:**
| Bereich | Untermenüs | Beschreibung |
|---------|------------|--------------|
| Übersicht | - | Dashboard-Startseite |
| Tasker | Posteingang, Aufträge, Projekt-Marktplatz, Bewertungen, Tasker-Level, Tasker-Einstellungen | Freelancer-Funktionen |
| Kalender | - | Terminverwaltung |
| E-Mail | Posteingang, Gesendet, Entwürfe, Spam, Papierkorb | E-Mail-Client |
| Buchhaltung | Angebote, Rechnungen, Ausgaben, Steuern, Auswertung, DATEV, Buchhaltungseinstellungen | GoBD-konforme Finanzen |
| Geschäftspartner | - | Kunden/Lieferanten |
| WhatsApp | - | WhatsApp-Business |
| Banking | Konten, Kassenbuch, Unvollständige Zahlungen | Bankanbindung |
| Lagerbestand | - | Inventarverwaltung |
| Taskilo Advertising | Dashboard, Google Ads, LinkedIn Ads, Meta Ads, Analytics | Werbeplattform |
| Personal | Übersicht, Mitarbeiter, Dienstplan, Gehaltsabrechnung, Arbeitszeit, Kostenkalkulation, Analytics, Urlaub, Dokumente | HR-Verwaltung |
| Recruiting | Unternehmensprofil, Stellenanzeigen, Bewerbungen | Bewerbermanagement |
| Workspace | Übersicht, Projekte, Aufgaben, Dokumente, Prozesse, Zeiterfassung, Board/Listen/Kalender-Ansicht | Projektmanagement |
| Support | - | Hilfe & Support |
| Einstellungen | Allgemein, Buchhaltung & Steuer, Zahlungskonditionen, Bankverbindung, Logo & Dokumente, Auszahlungen, Storno, Textvorlagen, E-Mail Integration | Firmeneinstellungen |

**Buchhaltung - Details:**
- Angebote: Erstellen, Auftragsbestätigungen, Lieferscheine
- Rechnungen: Erstellen, Wiederkehrend, Mahnungen, Gutschriften
- Ausgaben: Einmalig, Wiederkehrend, Anlagen
- Buchhaltungseinstellungen: Übersicht, Kassenbuch, E-Rechnungen, Zahlungen

**Tasker - Details:**
- Aufträge: Übersicht, Eingehend, Erstellt, Abgeschlossen, Storniert
- Projekt-Marktplatz: Verfügbare Projekte, Meine Bewerbungen, Direkte Anfragen, Kategorie-Anfragen
- Tasker-Einstellungen: Profil, Keyword-Analyse, Portfolio, Dienstleistungen, FAQs

**Taskilo Advertising - Details:**
- Google Ads: Kampagnen, Neue Kampagne, Zielvorhaben, Tools, Abrechnung, Verwaltung

### MITARBEITER DASHBOARD (eingeschränkt)
Für Mitarbeiter-Accounts mit reduzierten Berechtigungen:
| Bereich | Untermenüs |
|---------|------------|
| Übersicht | - |
| Kalender | - |
| Mein Bereich | Dienstplan, Arbeitszeit, Urlaub & Abwesenheit, Meine Dokumente |
| Workspace | Übersicht, Meine Aufgaben, Zeiterfassung |
| Support | - |

### MITARBEITER-BERECHTIGUNGEN (EmployeePermissions)
```typescript
interface EmployeePermissions {
  overview: boolean;      // Übersicht
  personal: boolean;      // Personalbereich
  employees: boolean;     // Mitarbeiterliste
  shiftPlanning: boolean; // Dienstplanung
  timeTracking: boolean;  // Zeiterfassung
  absences: boolean;      // Urlaub/Abwesenheit
  evaluations: boolean;   // Auswertungen
  orders: boolean;        // Aufträge
  quotes: boolean;        // Angebote
  invoices: boolean;      // Rechnungen
  customers: boolean;     // Kunden
  calendar: boolean;      // Kalender
  workspace: boolean;     // Workspace
  finance: boolean;       // Finanzen
  expenses: boolean;      // Ausgaben
  inventory: boolean;     // Lagerbestand
  settings: boolean;      // Einstellungen
}
```

---

## COMMON PITFALLS

1. **Firestore Queries**: No `orderBy()` - sort client-side
2. **Auth Context**: Always check loading state before user access  
3. **German Dates**: Use `toLocaleDateString('de-DE')` for display
4. **Memory**: Large builds need `NODE_OPTIONS="--max-old-space-size=8192"`
5. **Type Safety**: Never use `any` - define proper interfaces

---

## VERBOTEN
- console.log() - Structured logging only
- Mock-Daten - Fix root causes
- TypeScript errors - 100% clean
- orderBy() in Firestore - Sort in app
- Deletions - Soft deletes only
- FALLBACKS - Keine `|| ''`, `|| 'default'`, `?? fallback`
- EMOJIS - Keine Emojis in Code, Kommentaren oder UI
- DATEIEN LÖSCHEN - NIEMALS ohne explizite Benutzeranfrage
- UMLAUT-FEHLER - Deutsche Umlaute IMMER korrekt (ä, ö, ü, ß)

---

## ERFOLG
Aufgabe abgeschlossen wenn:
1. Keine TypeScript-Fehler (get_errors clean)
2. Deutsche Compliance (GoBD, §19 UStG)
3. Update-Notification erstellt
4. Echte Daten (keine Mocks)
5. Code-Qualität (Zod, @/ Pfade)
6. Deutsche Umlaute korrekt