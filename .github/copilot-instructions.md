# Taskilo AI - Comprehensive Coding Guide

**Core Stack**: Next.js 14+ + TypeScript + Firebase + Vercel + German Tax Compliance + Multi-Platform Advertising

## 🚫 CRITICAL NON-NEGOTIABLE RULES

1. **TypeScript**: 100% error-free - use `get_errors` tool before completion
2. **NO Fallbacks**: No `|| ''`, `|| 'default'`, `?? fallback` - solve problems at root
3. **NO console.log**: Structured logging via error monitoring or remove entirely
4. **NO Mock/Demo Data**: NEVER create demo data, placeholder content, or mock responses - ALWAYS integrate with real Firebase collections and live data sources
5. **Clean Up Old Files**: ALWAYS delete old/deprecated files when creating new ones - use `rm` commands to clean up
6. **Path Aliases**: ONLY `@/` imports - never relative paths
7. **Zod Validation**: ALL inputs must be validated through schemas
8. **German Tax Compliance**: GoBD + §19 UStG with sequential numbering
9. **NO EMOJIS**: Professional code/UI - only Lucide Icons

## 🏗️ Architecture Patterns

### Firebase Company-Subcollection Architecture (CRITICAL MIGRATION)
```typescript
// ✅ NEW: Company-based subcollections (ALWAYS USE)
import { db } from '@/firebase/clients';
export class CustomerService {
  static async getByCompany(companyId: string) {
    return getDocs(collection(db, 'companies', companyId, 'customers'));
  }
}

// ❌ OLD: Global collections (NEVER USE)
// collection(db, 'customers') // DEPRECATED
```

**Migration Status**: Active transition from 37 → 15 collections. ALWAYS use company subcollection pattern: `/companies/{companyId}/{collection}/{docId}`

### Dashboard Routing Structure
- **Company Dashboard**: `/dashboard/company/[uid]` (Primary business logic)
- **Taskilo Advertising**: `/dashboard/company/[uid]/taskilo-advertising/{google-ads,linkedin,meta,campaigns,keywords,analytics}`
- **Finance**: `/dashboard/company/[uid]/finance/{invoices,expenses,reports}`
- **Settings**: `/dashboard/company/[uid]/settings?view={profile,tax,banking}`

### Multi-Platform Advertising Architecture
```typescript
// Central service managing all advertising platforms
export class MultiPlatformAdvertisingService {
  // Google Ads: Manager Account 578-822-9684 linking workflow
  // LinkedIn, Meta, Taboola, Outbrain: OAuth-based connections
  async connectPlatform(platform: AdvertisingPlatform, companyId: string, authData: any)
}
```

## 🇩🇪 German Tax & Compliance

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
- E-Invoice compliance with `AutoEInvoiceService`

### USt-IdNr Validation
Companies need either `vatId` (USt-IdNr) OR `taxNumber` (Steuernummer).
Kleinunternehmer: only `taxNumber`, never `vatId`.

## 🔧 Development Workflow

### Essential Build Commands
```bash
pnpm dev                                        # Development server
NODE_OPTIONS="--max-old-space-size=8192" pnpm build  # Production build (MEMORY CRITICAL)
pnpm run type-check                            # TypeScript validation
```

### VS Code Task System
- **TypeScript Watch**: Available via Command Palette → "Tasks: Run Task"
- **Background Type Checking**: `NODE_OPTIONS='--max-old-space-size=8192' pnpm exec tsc --noEmit --watch`

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

## 🔐 Firebase Security & Patterns

### Firestore Rules Pattern
Company-based subcollections for data isolation:
```javascript
match /companies/{companyId}/customers/{customerId} {
  allow read, write: if request.auth.uid == companyId;
}
```

### Critical Firestore Limitations
- **NO orderBy()** - Sort in application code
- Always cleanup listeners in `useEffect` 
- Use soft deletes for audit trails (`deletedAt: Timestamp`)

### Production Firebase Configuration
```typescript
// Always use production Firebase configuration
import { db } from '@/firebase/clients';
// Direct connection to Firebase production services
```

## 🎨 UI/UX Standards

- **Primary Color**: Teal - NEVER black
- **Icons**: Only Lucide React (import from lucide-react)
- **Loading States**: Always show Skeleton Loading for async operations
- **Mobile-First**: All layouts must be responsive

### Component Patterns
```typescript
// Skeleton loading example
{isLoading ? (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
  </div>
) : (
  <ActualContent />
)}
```

## 📋 Project-Specific Context

### Key Service Classes
- `CustomerService`, `InvoiceService` - Firestore operations
- `GermanyValidationEngine` - Tax compliance validation
- `EInvoiceTransmissionService` - Electronic invoice handling
- `WorkspaceService` - Company workspace management

### Important Directories
- `/src/services/` - Business logic services
- `/src/components/finance/` - Financial components
- `/firebase_functions/` - Cloud Functions
- `/scripts/` - Maintenance and migration scripts

### Migration Context
The project is transitioning from flat Firestore collections to company-based subcollections.
Always use the new subcollection pattern: `/companies/{companyId}/{collection}/{docId}`

## 🚨 Common Pitfalls

1. **Firestore Queries**: No `orderBy()` - sort client-side
2. **Auth Context**: Always check loading state before user access  
3. **German Dates**: Use `toLocaleDateString('de-DE')` for display
4. **Memory**: Large builds need `NODE_OPTIONS="--max-old-space-size=8192"`
5. **Type Safety**: Never use `any` - define proper interfaces

## 📚 Documentation References

Critical docs in `/docs/`:
- `MIGRATION_GUIDE.md` - Firestore subcollection migration
- `COMPLETE_USAGE_TRACKING_SYSTEM.md` - Storage limits
- `FIRESTORE_MIGRATION_TROUBLESHOOTING.md` - Common issues

For questions about specific implementations, check the relevant Service files or existing Component patterns.