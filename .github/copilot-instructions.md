# Taskilo AI - Quick Reference

**Stack**: Next.js 15 + TypeScript + Firebase + Vercel

## 🚨 Critical Rules
1. **Path Aliases**: `@/` imports only
2. **Zod Validation**: ALL data must validate
3. **TypeScript**: 100% error-free
4. **NO console.log**: Structured logging only
5. **NO Mock Data**: Fix root causes
6. **German Tax**: Follow GoBD + §19 UStG
7. **Skeleton Loading**: Required for async

## 🔥 Firebase Patterns
```typescript
// Client: @/firebase/clients
import { db, auth } from '@/firebase/clients';

// Service
export class Service {
  static async get(id: string) {
    return getDoc(doc(db, 'collection', id));
  }
}
```

## 🎨 UI/UX
- **Color**: Teal (NEVER black)
- **Info**: Use icon tooltips, NOT text
- **Forms**: React Hook Form + Zod

## 📁 Dashboards
- Customer: `/dashboard/user/[uid]`
- Provider: `/dashboard/company/[uid]`
- Admin: `/dashboard/admin`

## ⚡ Dev Workflow
```bash
pnpm run dev
NODE_OPTIONS="--max-old-space-size=8192" pnpm build
pnpm run type-check
```

## ⚠️ Pitfalls
- **NO orderBy()** in Firestore - sort in app
- Clean up listeners in useEffect
- Soft deletes for audit trails

📚 Full docs in `/docs/` when needed.