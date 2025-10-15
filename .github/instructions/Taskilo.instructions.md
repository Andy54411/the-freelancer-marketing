# TASKILO AI - KOMPAKT

## NICHT VERHANDELBAR
1. **GoBD + §19 UStG**: Steuerkonform, fortlaufende Nummern, nur Stornierungen
2. **KEINE Mock-Daten**: Wurzelprobleme lösen
3. **TypeScript 100%**: get_errors vor Abschluss
4. **Zod-Validierung**: ALLE Inputs validieren
5. **Update-Notifications**: Bei jedem Commit via `/dashboard/admin/updates`
6. **KEINE FALLBACKS**: Fehler müssen sichtbar sein! Keine `|| ''`, `|| 'default'`, `?? fallback` - Problem an der Wurzel lösen!
7. **KEINE EMOJIS**: Professioneller Code und UI - KEINE Icons/Emojis in Code, Kommentaren oder UI

## STACK
Next.js 15 + TypeScript + Firebase + Vercel

**Dashboards**: `/dashboard/user/[uid]`, `/dashboard/company/[uid]`, `/dashboard/admin`

**Collections**: users, companies, customers, auftraege, quotes, invoices, chats, notifications, escrowPayments, expenses, inventory, timeEntries, updates

## CODE-PATTERNS

```typescript
// Firebase
import { db, auth } from '@/firebase/clients';

// Service
export class Service {
  static async get(id: string) {
    return getDoc(doc(db, 'collection', id));
  }
}

// Zod (MANDATORY)
const schema = z.object({ field: z.string() });

// Deutsche Steuer
interface TaxSettings {
  kleinunternehmer: 'ja' | 'nein';  // §19 UStG
  taxRate: '19' | '7' | '0';
}
```

## UI/UX
- **Color**: Teal (NEVER black)
- **Info**: Lucide icons for tooltips, NO emojis
- **Forms**: React Hook Form + Zod
- **NO EMOJIS**: Use Lucide icons instead

## DEV
```bash
pnpm run dev
NODE_OPTIONS="--max-old-space-size=8192" pnpm build
pnpm run type-check
```

## VERBOTEN
- console.log() - Structured logging only
- Mock-Daten - Fix root causes
- TypeScript errors - 100% clean
- orderBy() in Firestore - Sort in app
- Deletions - Soft deletes only
- FALLBACKS - Keine `|| ''`, `|| 'default'`, `?? fallback` - Problem an der Wurzel lösen!
- EMOJIS - Keine Emojis in Code, Kommentaren oder UI

## ERFOLG
Aufgabe abgeschlossen wenn:
1. Keine TypeScript-Fehler (get_errors clean)
2. Deutsche Compliance (GoBD, §19 UStG)
3. Update-Notification erstellt
4. Echte Daten (keine Mocks)
5. Code-Qualität (Zod, @/ Pfade)