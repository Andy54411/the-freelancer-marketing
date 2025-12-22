# TASKILO AI - KOMPAKT

## NICHT VERHANDELBAR
1. **GoBD + §19 UStG**: Steuerkonform, fortlaufende Nummern, nur Stornierungen
2. **KEINE Mock-Daten**: Wurzelprobleme lösen
3. **TypeScript 100%**: get_errors vor Abschluss
4. **Zod-Validierung**: ALLE Inputs validieren
5. **Update-Notifications**: Bei jedem Commit via `/dashboard/admin/updates`
6. **KEINE FALLBACKS**: Fehler müssen sichtbar sein! Keine `|| ''`, `|| 'default'`, `?? fallback` - Problem an der Wurzel lösen!
7. **KEINE EMOJIS**: Professioneller Code und UI - KEINE Icons/Emojis in Code, Kommentaren oder UI
8. **CHATBOT CRAWLER**: Bei neuen Seiten IMMER URLs in `/src/app/api/cron/refresh-knowledge-base/route.ts` hinzufügen!

## DEPLOYMENT ARCHITEKTUR (KRITISCH!)

### Vercel (Hauptprojekt - taskilo.de)
- **Was läuft hier**: Next.js App, API Routes, Firebase Client
- **Deployment**: Automatisch via GitHub Push auf `main`
- **Verzeichnis**: `/Users/andystaudinger/Tasko/` (alles außer webmail-proxy)
- **Domains**: taskilo.de, www.taskilo.de

### Hetzner Server (mail.taskilo.de)
- **Was läuft hier**: Webmail-Proxy, Mailcow (E-Mail Server), TURN Server
- **KEIN GitHub-Deployment**: Manuelle Dateiübertragung per SCP!
- **Verzeichnis auf Server**: `/opt/taskilo/webmail-proxy/`
- **Deployment-Methode**: Docker Compose
- **Container**: `taskilo-webmail-proxy`, `taskilo-redis`, `taskilo-coturn`

### Webmail-Proxy Deployment (Hetzner)
```bash
# 1. Dateien per SCP hochladen
scp webmail-proxy/src/services/EmailService.ts root@mail.taskilo.de:/opt/taskilo/webmail-proxy/src/services/
scp webmail-proxy/src/routes/actions.ts root@mail.taskilo.de:/opt/taskilo/webmail-proxy/src/routes/

# 2. Docker Container neu bauen und starten
ssh root@mail.taskilo.de "cd /opt/taskilo/webmail-proxy && docker compose up -d --build"
```

### WICHTIG - VOR JEDEM WEBMAIL-DEPLOYMENT PRÜFEN:
- Webmail-Proxy läuft als Docker Container (`taskilo-webmail-proxy`)
- TypeScript wird IM Container kompiliert (nicht auf Host)
- Keine npm/node auf dem Host installiert - NUR Docker!

## CHATBOT KNOWLEDGE BASE
Bei neuen Website-Seiten IMMER die URL in `WEBSITE_URLS` Array hinzufügen:
- Datei: `/src/app/api/cron/refresh-knowledge-base/route.ts`
- Wöchentliches Re-Crawling: Sonntag 3:00 Uhr (Vercel Cron)
- Manuell: POST `/api/cron/refresh-knowledge-base`
- Admin UI: `/dashboard/admin/chatbot-knowledge`

## STACK
Next.js 15 + TypeScript + Firebase + Vercel

**Dashboards**: `/dashboard/user/[uid]`, `/dashboard/company/[uid]`, `/dashboard/admin`

**Collections**: users, companies, customers, auftraege, quotes, invoices, chats, notifications, escrowPayments, expenses, inventory, timeEntries, updates, chatbot_knowledge, chatbot_website_content, chatbot_config

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


## Es gibt server.ts für Admin SDK und clients.ts für Client SDK.
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