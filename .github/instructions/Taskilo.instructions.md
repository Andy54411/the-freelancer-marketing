# TASKILO AI DEVELOPMENT GUIDELINES

## 🎯 OBERSTE PRIORITÄTEN

### 1. DEUTSCHE FINANZ-COMPLIANCE (NICHT VERHANDELBAR)
- **GoBD-Konformität**: Alle Finanz- und Buchhaltungsfunktionen müssen deutschen Gesetzen entsprechen
- **Steuerrecht §19 UStG**: Kleinunternehmer-Regelung korrekt implementieren
- **Rechnungslegung**: Fortlaufende Nummerierung, keine Löschungen (nur Stornierungen)
- **DATEV-Integration**: Kompatibilität zu deutschen Buchhaltungsstandards

### 2. QUALITÄTS-STANDARDS (AUSNAHMSLOS)
- **NIEMALS Mock-Daten**: Immer echte Daten verwenden, Probleme an der Wurzel lösen
- **TypeScript-Compliance**: Alle Compilation-Fehler müssen behoben werden
- **get_errors vor Abschluss**: Jede Aufgabe muss mit fehlerfreiem Code enden
- **Zod-Validierung**: ALLE eingehenden Daten müssen validiert werden

### 3. UPDATE-NOTIFICATION-PFLICHT (MANDATORY)
Bei **JEDEM** Commit/Push MUSS ein detailliertes Update erstellt werden:
- **Admin-Panel nutzen**: `/dashboard/admin/updates`
- **Kategorisierung**: feature | improvement | bugfix | security
- **Deutsche Sprache**: Benutzerfreundliche Beschreibungen
- **Screenshots/Dokumentation**: Vollständige visuelle Dokumentation

## 🏗️ ARCHITEKTUR-ÜBERBLICK

### Core Technology Stack
- **Frontend**: Next.js 15 App Router + TypeScript
- **Backend**: Firebase (Firestore, Auth, Functions, Storage)
- **Cloud Services**: AWS Lambda (specialized services)
- **UI Framework**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS mit Taskilo-Farbschema (Teal: 14ad9f)
- **Deployment**: Vercel (Frontend) + Firebase (Functions)

### Database Collections (Firestore)
```
Core Business:
├── users (35 registration + 13 onboarding fields)
├── companies (service providers)
├── customers (B2B customer management with VAT)
├── auftraege (orders/jobs)
├── quotes (Angebote)
└── invoices (GoBD-compliant invoicing)

Communication:
├── chats (general messaging)
├── directChats (1:1 conversations)
├── supportChats (customer support)
└── notifications (system notifications)

Financial Management:
├── escrowPayments (payment processing)
├── expenses (expense tracking)
├── payout_logs (payment history)
└── stripe_cache (payment cache)

Operations:
├── inventory (stock management)
├── stockMovements (inventory changes)
├── timeEntries (time tracking)
└── orderTimeTracking (project time)

Update System:
├── updates (changelog entries)
└── userUpdateStatus (user notification tracking)

Analytics & Compliance:
├── admin_logs (audit trail)
├── analytics (business metrics)
├── ai_conversations (AI interaction logs)
└── finapi_disconnections (banking compliance)
```

### Dashboard Architecture
1. **Customer Dashboard** (`/dashboard/user/[uid]`)
   - Service booking interface
   - Order management
   - Payment processing

2. **Provider Dashboard** (`/dashboard/company/[uid]`)
   - Business management
   - Invoice generation (SevDesk-style)
   - Time tracking & projects
   - Financial reporting

3. **Admin Dashboard** (`/dashboard/admin`)
   - Platform administration
   - User management
   - Analytics & reporting
   - Update notifications management

## 💻 ENTWICKLUNGS-STANDARDS

### Code Patterns
```typescript
// ✅ Firebase Client Integration
import { db, auth, functions } from '@/firebase/clients';

// ✅ Server-side Firebase
import * as admin from 'firebase-admin';

// ✅ Service Pattern
export class CustomerService {
  static async getCustomer(id: string) {
    const doc = await getDoc(doc(db, 'customers', id));
    return doc.exists() ? doc.data() : null;
  }
}

// ✅ Zod Validation (MANDATORY)
import { z } from 'zod';
const CustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  vatId: z.string().optional()
});
```

### Path Aliases (ALWAYS USE)
```typescript
// ✅ CORRECT
import { Button } from '@/components/ui/button';
import { CustomerService } from '@/services/customerService';

// ❌ WRONG
import { Button } from '../../../components/ui/button';
```

### German Business Logic
```typescript
// Steuerlogik für deutsche Unternehmen
interface TaxSettings {
  kleinunternehmer: 'ja' | 'nein';  // §19 UStG
  profitMethod: 'euer' | 'bilanz';
  priceInput: 'brutto' | 'netto';
  taxRate: '19' | '7' | '0';        // 0% für Kleinunternehmer
}

// Customer Management
interface Customer {
  customerNumber: string;      // "LF-001" fortlaufend
  vatId?: string;             // EU-Umsatzsteuer-ID
  isSupplier: boolean;        // Lieferant vs. Kunde
  vatValidated: boolean;      // VAT-Validierung Status
}
```

## 🎨 UI/UX GUIDELINES

### Design System
- **Primary Color**: Taskilo Teal (Hex: 14ad9f)
- **Buttons**: `bg-[color:14ad9f] hover:bg-[color:129488] text-white`
- **NEVER use black (Hex: 000000)** as primary color

### Component Patterns
```tsx
// ✅ Info-Icons with Tooltips (NOT separate text)
<div className="relative">
  <Input className="pr-8" />
  <button className="absolute right-2 top-1/2 transform -translate-y-1/2">
    <InfoIcon className="h-4 w-4" />
  </button>
</div>

// ✅ Loading States (ALWAYS implement)
{isLoading ? <Skeleton className="w-full h-8" /> : <ActualContent />}
```

### Form Handling
- **React Hook Form** + **Zod validation**
- **Error handling** with proper user feedback
- **Loading states** during submissions

## 🔧 DEVELOPMENT WORKFLOW

### Local Development
```bash
# Dependencies (pnpm REQUIRED)
pnpm install

# Development server
pnpm run dev

# Build with memory optimization
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build

# Quality checks (MANDATORY before commits)
pnpm run type-check
pnpm run lint
pnpm run format
pnpm run logs:remove
```

### Firebase Integration
- **Emulators**: Set `NEXT_PUBLIC_FIREBASE_*_EMULATOR_HOST` env vars
- **Data seeding**: `pnpm run setup-emulator`
- **Functions**: `cd firebase_functions && pnpm run serve`

## 🚫 VERBOTENE PRAKTIKEN

### Code Quality
- ❌ **console.log()** - Use structured logging only
- ❌ **Mock/Fallback data** - Always fix root causes
- ❌ **TypeScript errors** - Must be 100% error-free
- ❌ **Missing validation** - All inputs must be validated

### Firebase/Database
- ❌ **orderBy() in queries** - Sort in application to avoid index errors
- ❌ **Uncontrolled listeners** - Always clean up subscriptions
- ❌ **Direct document deletion** - Use soft deletes for audit trails

### Business Logic
- ❌ **Incorrect tax calculations** - Must follow German tax law
- ❌ **Missing GoBD compliance** - All financial operations must be compliant
- ❌ **B2B/B2C logic mixing** - Keep business flows separate

## 🔄 INTEGRATION POINTS

### External Services
- **DATEV**: German accounting software integration
- **FinAPI**: Banking connections and verification
- **Stripe Connect**: Payment processing for service providers
- **AWS SES/Resend**: Email delivery services
- **Google Services**: Maps, Analytics (via GTM)

### Payment Flows
- **B2B**: Complex tax calculations, invoice requirements
- **B2C**: Simplified consumer flows
- **Escrow**: Secure payment handling
- **Webhooks**: Firebase functions handle Stripe events

## 📊 MONITORING & ANALYTICS

### Performance
- **Build optimization**: 8GB Node.js memory limit
- **Bundle analysis**: Monitor bundle sizes
- **Real-time updates**: Efficient listener management

### Compliance & Auditing
- **Admin logs**: All administrative actions
- **Audit trails**: Complete change history
- **Error tracking**: Comprehensive error monitoring
- **Business intelligence**: Analytics for decision making

## 🎯 ERFOLGS-KRITERIEN

Eine Aufgabe ist nur dann abgeschlossen, wenn:
1. ✅ **Keine TypeScript-Fehler** (`get_errors` zeigt sauberes Ergebnis)
2. ✅ **Deutsche Compliance** beachtet (GoBD, Steuerrecht)
3. ✅ **Update-Notification** erstellt (bei Code-Änderungen)
4. ✅ **Echte Daten** verwendet (keine Mocks/Fallbacks)
5. ✅ **Code-Qualität** eingehalten (Zod, Pfad-Aliase, etc.)

**REMEMBER**: Taskilo ist eine professionelle deutsche B2B-Plattform. Qualität, Compliance und Benutzerfreundlichkeit haben absolute Priorität.