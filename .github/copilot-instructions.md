# Taskilo AI Coding Guidelines

## Architecture Overview
Taskilo is a service marketplace platform connecting customers with verified service providers. Built with **Next.js 15 + TypeScript**, **Firebase** backend, and **AWS** integrations.

### Core Components
- **Frontend**: Next.js App Router (`src/app/`) with shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Functions, Storage, Realtime DB)
- **Dashboards**: Three distinct user interfaces - Customer, Provider, and Admin dashboards
- **Invoice System**: Professional German accounting module (SevDesk/LexOffice-style) with GoBD compliance
- **Payments**: Stripe integration with complex B2B/B2C flows
- **Integrations**: AWS SES/Resend emails, Google services, DATEV accounting, FinAPI banking
- **Deployment**: Vercel (frontend) + Firebase (functions) + AWS Lambda (specialized services)

### Key Data Patterns
- **Users Collection**: Single document merging registration (35 fields) + onboarding (13 fields) data
- **Customers Collection**: B2B customer management with VAT validation, customer numbers, supplier flags
- **Multi-tenant**: Companies as service providers with complex tax/finance logic
- **Dual Business Model**: B2B (business-to-business) + B2C (business-to-consumer) flows
- **Real-time**: Firestore listeners for chat, notifications, live updates
- **German Business Context**: VAT, tax methods, DATEV integration, Kleinunternehmer rules

### Database Collections Overview
- **Core**: users, companies, customers, auftraege (orders), quotes, invoices
- **Communication**: chats, directChats, supportChats, notifications
- **Financial**: escrowPayments, expenses, payout_logs, stripe_cache
- **Operations**: inventory, stockMovements, timeEntries, orderTimeTracking
- **Analytics**: admin_logs, analytics, ai_conversations, ai_learning_patterns
- **Compliance**: finapi_disconnections, revolut_disconnections, steuerberater_invites

### Dashboard Architecture
- **Customer Dashboard**: End-user interface for booking services, managing orders, payments
- **Provider Dashboard**: Service provider interface for managing business, quotes, invoices, time tracking
- **Admin Dashboard**: Platform administration with analytics, user management, financial oversight

### Invoice System (SevDesk/LexOffice-style)
- **GoBD Compliance**: Fortlaufende Rechnungsnummerierung, deutsche Steuerstandards
- **Storno Functionality**: Professionelle Stornorechnungen mit negativen Beträgen
- **E-Invoicing**: Elektronische Rechnungsstellung (XRechnung, ZUGFeRD)
- **Templates**: Mehrere Rechnungsvorlagen mit Branding-Optionen
- **Customer Management**: Kunden- und Lieferantenverwaltung mit VAT-Validierung
- **Tax Logic**: Automatische Steuerberechnung (19%/7%/0%), Kleinunternehmer-Unterstützung
- **Delivery Notes**: Lieferscheine mit DATEV-Integration
- **Reminders**: Automatische Mahnwesen-Funktionalität
- **PDF Generation**: Professionelle PDF-Erstellung mit React-PDF
- **DATEV Export**: Standardisierte Exportformate für Steuerberater
- **Online Banking**: Integrierte Bankkonten-Anbindung
- **OCR Belegerfassung**: Automatische Texterkennung für Belege

## Development Workflow

### Local Development
```bash
# Install dependencies (pnpm required)
pnpm install


# Alternative: Start Next.js only
pnpm run dev

# Build with memory optimization
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build
```

### Firebase Emulators
- **Auto-connect**: Set `NEXT_PUBLIC_FIREBASE_*_EMULATOR_HOST` env vars to enable
- **Data seeding**: `pnpm run setup-emulator` imports production data
- **Functions**: `cd firebase_functions && pnpm run serve` for local function testing

### Testing & Quality
```bash
# Type checking (critical for complex types)
pnpm run type-check

# Linting with max 100 warnings
pnpm run lint

# Format code
pnpm run format

# Console log cleanup
pnpm run logs:remove  # Remove debug logs before commits
```

## Code Patterns & Conventions

### Firebase Integration
```typescript
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
```

### Component Structure
- **UI Components**: `src/components/ui/` (Radix-based, shadcn/ui)
- **Feature Components**: `src/components/` with subdirectories
- **Finance Components**: `src/components/finance/` - Complete accounting suite (invoices, quotes, customers, suppliers, e-invoicing)
- **Forms**: React Hook Form + Zod validation
- **State**: Firebase real-time listeners, React Context for global state

### Design System
- **CSS Framework**: Tailwind CSS v4 with custom configuration
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Additional UI**: Material-UI (@mui/material) for complex components
- **Icons**: Tabler Icons, Lucide React, Heroicons
- **Notifications**: Sonner for toast notifications
- **Animations**: Framer Motion for smooth transitions

### German Business Logic
```typescript
// Kleinunternehmer-Regelung (deutsche Steuerlogik)
interface TaxSettings {
  kleinunternehmer: 'ja' | 'nein';  // §19 UStG - Umsatzgrenze 22.000€
  profitMethod: 'euer' | 'bilanz';  // EÜR vs. doppelte Buchführung
  priceInput: 'brutto' | 'netto';   // Brutto-/Netto-Preiseingabe
  taxRate: string;                  // "19", "7", "0" (Kleinunternehmer)
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
```

### Environment & Configuration
- **Path Aliases**: `@/` maps to `src/`
- **Environment Variables**: Extensive Firebase/AWS/Google service configs
- **Build Optimization**: Webpack externals for Firebase functions, CSS optimization

## Integration Points

### Payment Flow (Stripe)
- **B2B/B2C**: Different tax calculations and invoice requirements
- **Connect**: Service providers have Stripe Connect accounts
- **Webhooks**: Firebase functions handle payment events
- **Currency**: EUR-focused with German tax rules
- **Business Logic**: B2B requires formal invoices with VAT, B2C allows simplified receipts

### Email Systems
- **Multi-provider**: AWS SES + Resend for reliability
- **Resend Integration**: Modern transactional email service with React Email templates
- **Domain Strategy**: Separate subdomains for different email types
- **Templates**: React Email components for transactional emails (@react-email/components)

### External APIs
- **DATEV**: Accounting integration for German businesses
- **FinAPI**: Banking connections for payment verification
- **Google Services**: Maps, Ads, Generative AI
- **AWS Lambda**: Specialized services (realtime, email, admin workspace)

## Common Pitfalls

### Firebase Data Structure
- **Users Collection**: Single document with registration + onboarding data
- **Subcollections**: Complex nested structures (orders, time tracking, inventory)
- **Real-time Updates**: Careful listener management to avoid memory leaks

### German Business Logic
- **Kleinunternehmer-Regelung**: §19 UStG - Umsatzgrenze 22.000€, keine Umsatzsteuer-Ausweisung
- **Steuersätze**: 19% Regelsteuersatz, 7% ermäßigter Steuersatz, 0% für Kleinunternehmer
- **Gewinnermittlung**: Einnahmen-Überschuss-Rechnung (EÜR) vs. doppelte Buchführung
- **Preiskalkulation**: Brutto-/Netto-Logik je nach Unternehmenstyp
- **DATEV-Integration**: Spezifische Belegformate und Kontenrahmen
- **Rechtsformen**: GmbH, UG, Einzelunternehmer mit unterschiedlichen Anforderungen

### B2B vs B2C Logic
- **B2B**: Formal invoices with VAT, customer numbers, supplier relationships, business contracts
- **B2C**: Simplified receipts, consumer protection, different tax calculations
- **Hybrid Model**: Companies can operate in both B2B and B2C markets
- **Customer Types**: `isSupplier` flag distinguishes business partners from end customers

### Performance Considerations
- **Bundle Splitting**: Next.js optimizePackageImports for large libraries
- **Image Optimization**: Next.js Image with WebP/AVIF support
- **Firestore Queries**: Compound queries, pagination for large datasets

## Deployment & Production

### Build Process
- **Memory**: 8GB Node.js memory limit for large builds
- **Functions**: Separate build in `firebase_functions/`
- **Assets**: Vercel handles static assets, Firebase for dynamic content

### Environment Management
- **Emulators**: Extensive local testing with production data seeding
- **Secrets**: Firebase service accounts, AWS credentials, Stripe keys
- **Monitoring**: Vercel Analytics, Firebase functions logs

Remember: This is a complex German B2B/B2C marketplace with strict legal/tax requirements. Always verify business logic changes with domain experts.</content>
<parameter name="filePath">/Users/andystaudinger/Tasko/.github/copilot-instructions.md