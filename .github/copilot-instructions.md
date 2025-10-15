# Taskilo AI - Umfassender Coding-Leitfaden

**Core Stack**: Next.js 15 + TypeScript + Firebase + Vercel + Deutsche Steuerkonformität

## 🚫 KRITISCHE NICHT-VERHANDELBARE REGELN

1. **TypeScript**: 100% fehlerfrei - verwende `get_errors` Tool vor Abschluss
2. **KEINE Fallbacks**: Keine `|| ''`, `|| 'default'`, `?? fallback` - Probleme an der Wurzel lösen
3. **KEINE console.log**: Strukturiertes Logging über Error-Monitoring oder entfernen
4. **KEINE Mock-Daten**: Immer echte Datenquellen verwenden
5. **Path Aliases**: NUR `@/` Imports - niemals relative Pfade
6. **Zod-Validierung**: ALLE Eingaben müssen durch Schemas validiert werden
7. **Deutsche Steuerkonformität**: GoBD + §19 UStG mit fortlaufender Nummerierung
8. **KEINE EMOJIS**: Professioneller Code/UI - nur Lucide Icons verwenden

## 🏗️ Architektur-Muster

### Firebase Daten-Architektur
```typescript
// Client-side Firebase
import { db, auth, functions } from '@/firebase/clients';

// Server-side (API routes)
import { db, auth, admin } from '@/firebase/server';

// Service Pattern - Static classes
export class CustomerService {
  static async getByCompany(companyId: string) {
    return getDocs(collection(db, 'companies', companyId, 'customers'));
  }
}
```

### Dashboard Routing-Struktur
- **Kunden-Dashboard**: `/dashboard/user/[uid]`
- **Firmen-Dashboard**: `/dashboard/company/[uid]` (Haupt-Geschäftslogik)
- **Admin-Dashboard**: `/dashboard/admin`

Firmen-Routen verwenden verschachtelte Strukturen:
- Finanzen: `/dashboard/company/[uid]/finance/{invoices,expenses,reports}`
- Einstellungen: `/dashboard/company/[uid]/settings?view={profile,tax,banking}`

### Formular-Muster mit Zod
```typescript
// Alle Formulare verwenden React Hook Form + Zod Validierung
const schema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  email: z.string().email('Gültige E-Mail erforderlich'),
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

## 🇩🇪 Deutsche Steuer & Compliance

### Kleinunternehmer (§19 UStG) Erkennung
```typescript
const isKleinunternehmer = 
  companyData.kleinunternehmer === 'ja' ||
  companyData.ust === 'kleinunternehmer' ||
  companyData.step2?.kleinunternehmer === 'ja';
```

### GoBD-konforme Rechnungsnummerierung
- Fortlaufende Nummern pro Firma (niemals wiederverwenden)
- Storno-Rechnungen statt Löschungen
- Steuervalidierung durch `GermanyValidationEngine`

### USt-IdNr Validierung
Firmen benötigen entweder `vatId` (USt-IdNr) ODER `taxNumber` (Steuernummer).
Kleinunternehmer: nur `taxNumber`, niemals `vatId`.

## 🔧 Development Workflow

### Build Commands
```bash
pnpm run dev                                    # Development
NODE_OPTIONS="--max-old-space-size=8192" pnpm build  # Production build
pnpm run type-check                            # TypeScript validation
pnpm emulators                                 # Firebase emulators
```

### Task Management
Verwende VS Code's integriertes Task-System:
```bash
# TypeScript watch task verfügbar
# Ausführen über Command Palette: "Tasks: Run Task"
```

### Error Handling Patterns
```typescript
// Strukturierte Error-Responses
return NextResponse.json(
  {
    success: false,
    error: 'Spezifische Fehlermeldung',
    details: error.message,
    timestamp: new Date().toISOString(),
  },
  { status: 500 }
);
```

## 🔐 Firebase Security & Patterns

### Firestore Rules Pattern
Company-based subcollections für Datenisolation:
```javascript
match /companies/{companyId}/customers/{customerId} {
  allow read, write: if request.auth.uid == companyId;
}
```

### Kritische Firestore Limitations
- **KEINE orderBy()** - Sortierung im Application Code
- Immer Listener in `useEffect` cleanup aufräumen
- Soft Deletes für Audit Trails verwenden (`deletedAt: Timestamp`)

### Environment Detection
```typescript
// Prüfung auf Emulator
if (process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST) {
  // Emulator-spezifische Logik
}
```

## 🎨 UI/UX Standards

- **Primary Color**: Teal - NIEMALS black
- **Icons**: Nur Lucide React (importiert von lucide-react)
- **Loading States**: Immer Skeleton Loading für async Operationen zeigen
- **Mobile-First**: Alle Layouts müssen responsive sein

### Component Patterns
```typescript
// Skeleton loading Beispiel
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

### Wichtige Verzeichnisse
- `/src/services/` - Business logic services
- `/src/components/finance/` - Financial components
- `/firebase_functions/` - Cloud Functions
- `/scripts/` - Maintenance and migration scripts

### Migration Context
Das Projekt wechselt von flachen Firestore Collections zu company-basierten Subcollections.
Immer das neue Subcollection Pattern verwenden: `/companies/{companyId}/{collection}/{docId}`

## 🚨 Common Pitfalls

1. **Firestore Queries**: No `orderBy()` - sort client-side
2. **Auth Context**: Always check loading state before user access  
3. **German Dates**: Use `toLocaleDateString('de-DE')` for display
4. **Memory**: Large builds need `NODE_OPTIONS="--max-old-space-size=8192"`
5. **Type Safety**: Never use `any` - define proper interfaces

## 📚 Documentation References

Kritische Docs in `/docs/`:
- `MIGRATION_GUIDE.md` - Firestore subcollection migration
- `COMPLETE_USAGE_TRACKING_SYSTEM.md` - Storage limits
- `FIRESTORE_MIGRATION_TROUBLESHOOTING.md` - Common issues

Für Fragen zu spezifischen Implementierungen, überprüfe die relevanten Service-Dateien oder bestehende Component-Patterns.