TASKILO AI CODING GUIDELINES: MASTER-DOKUMENT
Architecture Overview
Taskilo is a service marketplace platform connecting customers with verified service providers. Built with Next.js 15 + TypeScript, Firebase backend, and AWS integrations.

Core Components
Frontend: Next.js App Router (src/app/) with shadcn/ui components.

Backend: Firebase (Firestore, Auth, Functions, Storage, Realtime DB) and AWS Lambda (specialized services).

Dashboards: Three distinct user interfaces - Customer, Provider, and Admin dashboards.

Invoice System: Professional German accounting module (SevDesk/LexOffice-style) with GoBD compliance.

Payments: Stripe integration with complex B2B/B2C flows.

Integrations: AWS SES/Resend emails, Google services, DATEV accounting, FinAPI banking.

Deployment: Vercel (frontend) + Firebase (functions) + AWS Lambda (specialized services).

Key Data Patterns
Users Collection: Single document merging registration (35 fields) + onboarding (13 fields) data.

Customers Collection: B2B customer management with VAT validation, customer numbers, supplier flags.

Multi-tenant: Companies as service providers with complex tax/finance logic.

Dual Business Model: B2B (business-to-business) + B2C (business-to-consumer) flows.

Real-time: Firestore listeners for chat, notifications, live updates.

German Business Context: VAT, tax methods, DATEV integration, Kleinunternehmer rules.

Database Collections Overview
Core: users, companies, customers, auftraege (orders), quotes, invoices

Communication: chats, directChats, supportChats, notifications

Financial: escrowPayments, expenses, payout_logs, stripe_cache

Operations: inventory, stockMovements, timeEntries, orderTimeTracking

Analytics: admin_logs, analytics, ai_conversations, ai_learning_patterns

Compliance: finapi_disconnections, revolut_disconnections, steuerberater_invites

Dashboard Architecture
Customer Dashboard: End-user interface for booking services, managing orders, payments.

Provider Dashboard: Service provider interface for managing business, quotes, invoices, time tracking.

Admin Dashboard: Platform administration with analytics, user management, financial oversight.

Invoice System (SevDesk/LexOffice-style)
GoBD Compliance: Fortlaufende Rechnungsnummerierung, deutsche Steuerstandards.

Storno Functionality: Professionelle Stornorechnungen mit negativen Beträgen. Keine Rechnungen löschen!

E-Invoicing: Elektronische Rechnungsstellung (XRechnung, ZUGFeRD).

Templates: Mehrere Rechnungsvorlagen mit Branding-Optionen.

Customer Management: Kunden- und Lieferantenverwaltung mit VAT-Validierung.

Tax Logic: Automatische Steuerberechnung (19%/7%/0%), Kleinunternehmer-Unterstützung.

PDF Generation: Professionelle PDF-Erstellung mit React-PDF.

OCR Belegerfassung: Automatische Texterkennung für Belege.

Development Workflow
Local Development
# Install dependencies (pnpm required)
pnpm install


# Alternative: Start Next.js only
pnpm run dev

# Build with memory optimization
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build

Firebase Emulators
Auto-connect: Set NEXT_PUBLIC_FIREBASE_*_EMULATOR_HOST env vars to enable.

Data seeding: pnpm run setup-emulator imports production data.

Functions: cd firebase_functions && pnpm run serve for local function testing.

Testing & Quality
# Type checking (critical for complex types)
pnpm run type-check

# Linting with max 100 warnings
pnpm run lint

# Format code
pnpm run format

# Console log cleanup
pnpm run logs:remove  # Remove debug logs before commits

KRITISCHE AI-ANWEISUNGEN - NIEMALS IGNORIEREN!
FÜHRENDES PRINZIP: Die oberste Priorität ist die Einhaltung deutscher Finanz- und Steuergesetze (GoBD, UStG). Sicherheit und Korrektheit vor Geschwindigkeit.

PROBLEMLÖSUNG-PRINZIPIEN:

NIEMALS NUR SYMPTOME VERSTECKEN - Debug-Logs entfernen oder NIemals Fallback/Mock-Daten verwenden!!

PROBLEME RICHTIG UND GEWISSENHAFT LÖSEN - Die echte Ursache finden und beheben.

KEINE MOCK-DATEN - Immer echte Daten verwenden.

ZEIT RESPEKTIEREN - Effizient und zielgerichtet arbeiten.

QUALITÄTSSICHERUNG:

IMMER ARBEITSBEREICH PRÜFEN - Vor Abschluss jeder Aufgabe MUSS get_errors ausgeführt werden.

TYPESCRIPT-ERRORS BEHEBEN - Alle TypeScript-Compilation-Fehler müssen behoben werden.

FEHLERFREIE PRODUCTION - System muss vollständig kompilierbar und einsatzbereit sein.

Code Patterns & Conventions
Firebase Integration
// Client-side (src/firebase/clients.ts)
import { db, auth, functions } from '@/firebase/clients';

// Server-side (src/firebase/server.ts) 
import * as admin from 'firebase-admin';

// Service pattern (src/services/)
export class SomeService {
  static async someOperation(userId: string) {
    const doc = await getDoc(doc(db, 'users', userId));
    // ... business logic
  }
}

Data Validation & Multi-Cloud Strategy
ZOD-PFLICHT: ALLE eingehenden Daten aus HTTP-, Cloud Function- oder API-Requests MÜSSEN mit Zod validiert werden (z.B. in den Service-Schichten).

Path Aliases: @/ maps to src/. IMMER diesen Alias für alle internen Imports verwenden.

Cloud Access (Lambda): Der Handler muss dynamisch zwischen S3 und GCS/HTTP-Zugriff wechseln.

Cloud Access Logik

Details

AWS S3 Download

Nativer Zugriff über @aws-sdk/client-s3 (höchste Priorität für s3:// Pfade).

GCS/HTTP Download

Generischer Download über axios (für https:// oder gs:// Pfade, wobei gs:// eine signierte HTTP-URL voraussetzt).

Logging Veto

console.log ist verboten. Nur strukturierte Logger verwenden.

Component Structure
UI Components: src/components/ui/ (Radix-based, shadcn/ui)

Feature Components: src/components/ with subdirectories

Finance Components: src/components/finance/ - Complete accounting suite

Forms: React Hook Form + Zod validation.

Ladezustände: Implementiere IMMER Skeleton-Screens oder Ladeindikatoren bei asynchronen Datenabrufen.

Design System & Taskilo Color Scheme
Primary Color: #14ad9f (Türkis/Teal). NEVER use black (#000000) as the primary color.

Primary Buttons: bg-[#14ad9f] hover:bg-[#129488] text-white.

UI Library: shadcn/ui components built on Radix UI primitives.

UI/UX Patterns
Info-Dialoge: IMMER als Info-Icons rechts in Input-Feldern mit Tooltip implementieren. NIEMALS als separaten Text darunter.

// ✅ RICHTIG: Info-Icon im Input mit Tooltip
<div className="relative">
  <Input className="pr-8" />
  <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
    <InfoIcon className="h-4 w-4" />
  </button>
  {tooltip && <div className="tooltip">Erklärungstext</div>}
</div>

Tooltips: State-basierte onMouseEnter/onMouseLeave Handler, NICHT CSS-only hover.

Dropdown-Menüs: Click-outside Handler mit useRef für automatisches Schließen.

German Business Logic
// Kleinunternehmer-Regelung (deutsche Steuerlogik)
interface TaxSettings {
  kleinunternehmer: 'ja' | 'nein';  // §19 UStG - Umsatzgrenze 22.000€
  profitMethod: 'euer' | 'bilanz';  
  priceInput: 'brutto' | 'netto';   
  taxRate: string;                  // "19", "7", "0" (0 für Kleinunternehmer)
}

// Customer Management mit VAT-Validierung
interface Customer {
  customerNumber: string;     // "LF-002" - fortlaufende Nummerierung
  vatId: string;             // Umsatzsteuer-ID
  vatValidated: boolean;     // EU VAT validation status
  isSupplier: boolean;       // Lieferant vs. Kunde
  totalAmount: number;       // Gesamtumsatz mit diesem Kunden
  totalInvoices: number;     // Anzahl Rechnungen
}

Environment & Configuration
Environment Variables: Extensive Firebase/AWS/Google service configs.

Build Optimization: Webpack externals for Firebase functions, CSS optimization.

Integration Points
Payment Flow (Stripe)
B2B/B2C: Different tax calculations and invoice requirements.

Connect: Service providers have Stripe Connect accounts.

Webhooks: Firebase functions handle payment events.

External APIs
DATEV: Accounting integration for German businesses.

FinAPI: Banking connections for payment verification.

AWS Lambda: Specialized services (realtime, email, admin workspace).

Common Pitfalls
Firebase Data Structure
Firestore Queries: Vermeide orderBy(), sortiere stattdessen in der Anwendung, um Indexfehler zu verhindern.

Performance: Compound queries und Paginierung für große Datensätze sind Pflicht.

Real-time Updates: Careful listener management to avoid memory leaks.

German Business Logic
Kleinunternehmer-Regelung: MUSS §19 UStG korrekt implementieren (keine Umsatzsteuer-Ausweisung).

Preiskalkulation: Brutto-/Netto-Logik je nach Unternehmenstyp korrekt behandeln.

B2B vs B2C Logic: Logik strikt trennen.

Deployment & Production
Build Process
Memory: 8GB Node.js memory limit for large builds.

Environment Management
Emulators: Extensive local testing with production data seeding.

Secrets: Firebase service accounts, AWS credentials, Stripe keys.