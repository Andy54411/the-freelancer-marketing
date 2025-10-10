# Taskilo AI Coding Instructions

## Architecture Overview

**Taskilo** ist eine deutsche Service-Marktplatz-Plattform mit professionellem Rechnungswesen. Das System verbindet Kunden mit verifizierten Dienstleistern und bietet ein vollwertiges B2B/B2C-Finanzmanagement.

**Stack**: Next.js 15 App Router + TypeScript, Firebase (Firestore/Auth/Functions), AWS Lambda, Vercel Deployment

## Key Patterns & Conventions

### Dashboard Architecture
- **3 separate dashboards**: Customer (`/dashboard/user/[uid]`), Provider (`/dashboard/company/[uid]`), Admin (`/dashboard/admin`)
- **Role-based routing**: `RoleBasedRedirect` component handles automatic navigation
- **Dynamic layouts**: Each dashboard has its own layout with navigation based on user role

### Firebase Integration Pattern
```typescript
// Client-side: src/firebase/clients.ts
import { db, auth, functions } from '@/firebase/clients';

// Server-side: src/firebase/server.ts - Build-safe initialization
import { db, auth } from '@/firebase/server';

// Service pattern in src/services/
export class SomeService {
  static async operation(userId: string) {
    const doc = await getDoc(doc(db, 'users', userId));
  }
}
```

### German Business Logic (Critical)
- **GoBD Compliance**: `src/services/gobdService.ts` - Rechnungen niemals löschen, nur stornieren
- **Tax calculations**: Kleinunternehmer-Regelung (§19 UStG), VAT rates 19%/7%/0%
- **Invoice numbering**: Fortlaufende Nummerierung via `NumberSequenceService`
- **Customer management**: VAT validation, supplier flags in `customers` collection

### Component Structure
- **UI Components**: `src/components/ui/` (shadcn/ui + Radix)
- **Feature Components**: `src/components/[feature]/`
- **Finance System**: `src/components/finance/` - Complete accounting suite
- **Design System**: Uses teal as primary color, avoid black

## Critical Development Rules

### 1. Data Validation
```typescript
// ALL incoming data MUST use Zod validation
import { z } from 'zod';
const schema = z.object({ ... });
const validatedData = schema.parse(requestData);
```

### 2. Path Aliases
```typescript
// ALWAYS use @/ for internal imports
import { Component } from '@/components/ui/component';
import { service } from '@/services/service';
```

### 3. Error Handling & Quality
- **NEVER use console.log** - Use structured logging only
- **ALWAYS run `get_errors`** before completing tasks
- **Fix ALL TypeScript errors** - System must compile completely
- **Skeleton screens required** for async data loading

### 4. UI/UX Patterns
```tsx
// Info dialogs: ALWAYS as icons with tooltips, NOT separate text
<div className="relative">
  <Input className="pr-8" />
  <button className="absolute right-2 top-1/2 transform -translate-y-1/2">
    <InfoIcon className="h-4 w-4" />
  </button>
</div>
```

## Development Workflow

### Local Development
```bash
# Install with pnpm (required)
pnpm install

# Development server
pnpm run dev

# Build with memory optimization
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build

# Type checking (critical)
pnpm run type-check

# Clean console logs before commits
pnpm run logs:remove
```

### Firebase Emulators
- Set `NEXT_PUBLIC_FIREBASE_*_EMULATOR_HOST` env vars to enable
- `pnpm run setup-emulator` imports production data
- Functions: `cd firebase_functions && pnpm run serve`

## Database Collections

**Core**: `users`, `companies`, `customers`, `auftraege`, `quotes`, `invoices`
**Communication**: `chats`, `directChats`, `supportChats`, `notifications` 
**Financial**: `escrowPayments`, `expenses`, `payout_logs`, `stripe_cache`
**Operations**: `inventory`, `stockMovements`, `timeEntries`, `orderTimeTracking`

### Multi-tenant Pattern
- Companies are service providers with subcollections
- User documents merge registration (35 fields) + onboarding (13 fields)
- Dual business model: B2B/B2C flows with different tax logic

## Deployment & Integration

### Production Environment
- **Frontend**: Vercel with `next build`
- **Functions**: Firebase Functions (europe-west1)
- **Specialized Services**: AWS Lambda (OCR, email, admin workspace)
- **Payment**: Stripe Connect for service providers

### External Integrations
- **DATEV**: Accounting integration (`src/app/api/datev/`)
- **FinAPI**: Banking connections (`src/lib/finapi-*`)
- **AWS SES/Resend**: Email services
- **Google Services**: Maps, Analytics via GTM

## Common Pitfalls

1. **Firestore Queries**: Avoid `orderBy()` - sort in application to prevent index errors
2. **German Tax Logic**: Kleinunternehmer-Regelung MUST follow §19 UStG correctly
3. **Real-time Updates**: Careful listener management to avoid memory leaks
4. **Build Memory**: Use 8GB Node.js memory limit for large builds
5. **Mock Data**: NEVER use fallback/mock data - always fix the root cause

Folge diese Konventionen für konsistente, konforme und sichere Entwicklung in der Taskilo-Plattform.