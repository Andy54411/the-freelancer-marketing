# TASKILO AI - KOMPAKT

## ZUGANGSDATEN & ACCOUNTS
- **Haupt-Admin-Account**: andy.staudinger@taskilo.de
- **Admin Dashboard**: `/dashboard/admin` (Login via `/admin/login`)
- **Webmail**: `/webmail` oder mail.taskilo.de
- **Passwort-Hinweis**: Alle Taskilo-Dienste nutzen das gleiche Passwort (in .env.local oder beim Benutzer erfragen)

## NICHT VERHANDELBAR
1. **GoBD + §19 UStG**: Steuerkonform, fortlaufende Nummern, nur Stornierungen
2. **KEINE Mock-Daten**: Wurzelprobleme lösen
3. **TypeScript 100%**: get_errors vor Abschluss
4. **Zod-Validierung**: ALLE Inputs validieren
5. **Update-Notifications**: Bei jedem Commit via `/dashboard/admin/updates`
6. **KEINE FALLBACKS**: Fehler müssen sichtbar sein! Keine `|| ''`, `|| 'default'`, `?? fallback` - Problem an der Wurzel lösen!
7. **KEINE EMOJIS**: Professioneller Code und UI - KEINE Icons/Emojis in Code, Kommentaren oder UI
8. **CHATBOT CRAWLER**: Bei neuen Seiten IMMER URLs in `/src/app/api/cron/refresh-knowledge-base/route.ts` hinzufügen!

---

## INFRASTRUKTUR-ÜBERSICHT (KRITISCH - NIEMALS VERGESSEN!)

### 1. VERCEL (taskilo.de) - Next.js Frontend + API
| Was | Details |
|-----|---------|
| **Dienste** | Next.js App, API Routes, Firebase Client SDK |
| **Deployment** | AUTOMATISCH via `git push` auf `main` |
| **Verzeichnis** | `/Users/andystaudinger/Tasko/` (ALLES außer `webmail-proxy/`) |
| **Domains** | taskilo.de, www.taskilo.de |
| **Datenbank** | Firebase Firestore (Cloud) |

**Vercel-Dateien (Frontend):**
- `src/components/webmail/*.tsx` - Webmail UI (MailSidebar, WebmailClient, etc.)
- `src/app/api/webmail/*` - API Routes die zum Hetzner-Proxy weiterleiten
- `src/hooks/useWebmail.ts` - React Hook für Webmail
- `src/services/webmail/*` - Frontend Services

### 2. HETZNER SERVER (mail.taskilo.de) - E-Mail Backend
| Was | Details |
|-----|---------|
| **Dienste** | Webmail-Proxy, Mailcow (IMAP/SMTP), TURN Server, Redis |
| **Deployment** | MANUELL per SCP + Docker! KEIN Git! |
| **Verzeichnis lokal** | `/Users/andystaudinger/Tasko/webmail-proxy/` |
| **Verzeichnis Server** | `/opt/taskilo/webmail-proxy/` |
| **Container** | `taskilo-webmail-proxy`, `taskilo-redis`, `taskilo-coturn` |

**Hetzner-Dateien (Backend - webmail-proxy):**
- `webmail-proxy/src/routes/*.ts` - Express API Routes (actions, mailboxes, etc.)
- `webmail-proxy/src/services/*.ts` - IMAP/SMTP Services (EmailService, etc.)
- `webmail-proxy/src/index.ts` - Express Server Entry Point

### 3. FIREBASE (Cloud) - Datenbank + Auth
| Was | Details |
|-----|---------|
| **Dienste** | Firestore, Authentication, Storage, Cloud Functions |
| **Konfiguration** | `firebase.json`, `firestore.rules` |
| **Collections** | users, companies, customers, invoices, etc. |
| **NICHT für Webmail** | Webmail nutzt Hetzner IMAP, NICHT Firebase! |

---

## DEPLOYMENT-ENTSCHEIDUNGSBAUM

```
Datei geändert in:
│
├── src/components/webmail/*.tsx ──────► Vercel (automatisch via git push)
├── src/app/api/webmail/*.ts ──────────► Vercel (automatisch via git push)  
├── src/hooks/useWebmail.ts ───────────► Vercel (automatisch via git push)
│
├── webmail-proxy/src/*.ts ────────────► HETZNER (manuell SCP + Docker!)
│
└── Alle anderen src/ Dateien ─────────► Vercel (automatisch via git push)
```

### Webmail-Proxy Deployment (NUR wenn webmail-proxy/ geändert wurde!)
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

---

## REVOLUT BUSINESS API (KOMPLETT AUF HETZNER!)

### Architektur
| Was | Details |
|-----|---------|
| **Hetzner API** | `https://mail.taskilo.de/webmail-api/api/revolut-proxy/*` |
| **Whitelisted IP** | NUR `91.99.79.104` (Hetzner Server) |
| **Private Key** | `/opt/taskilo/certs/revolut/private.key` (auf Hetzner) |
| **Token Storage** | In-Memory + `.env` auf Hetzner |
| **Auto-Refresh** | Tokens werden bei Bedarf automatisch erneuert |

### WICHTIG: ALLE Revolut-Aufrufe via Hetzner!
- Vercel kann NICHT direkt mit Revolut kommunizieren (IP-Whitelist)
- Alle APIs sind auf Hetzner implementiert
- Vercel-Routen leiten an Hetzner weiter

### Hetzner Revolut API Endpunkte:
```
GET  /health           - Status Check
POST /refresh-token    - Token erneuern
POST /token-exchange   - Auth Code gegen Token tauschen
GET  /accounts         - Alle Konten
GET  /transactions     - Transaktionen
GET  /webhooks         - Webhooks auflisten
POST /webhooks         - Webhook registrieren
DELETE /webhooks/:id   - Webhook loeschen
GET  /counterparties   - Counterparties
GET  /exchange-rate    - Wechselkurse
GET  /team-members     - Team Mitglieder
GET  /payout-links     - Payout Links
POST /api              - Generischer API Proxy
POST /set-tokens       - Tokens manuell setzen
```

### Vercel Client Service:
```typescript
import { revolutHetznerProxy } from '@/lib/revolut-hetzner-proxy';

// Beispiele:
const accounts = await revolutHetznerProxy.getAccounts();
const webhooks = await revolutHetznerProxy.getWebhooks();
const transactions = await revolutHetznerProxy.getTransactions({ count: 10 });
await revolutHetznerProxy.refreshToken();
```

### Token manuell erneuern (Notfall)

**1. JWT Client Assertion erstellen:**
```bash
# Header (certs/revolut/header.json)
{"alg":"RS256","typ":"JWT"}

# Payload (certs/revolut/payload.json) - Zeiten anpassen!
{
  "iss": "taskilo.de",
  "sub": "tIWziunOHZ6vbF4ygxxAT43mrVe4Fh-c7FIdM78TSmU",
  "aud": "https://revolut.com",
  "iat": $(date +%s),
  "exp": $(date -v+1y +%s)
}

# JWT generieren
HEADER=$(cat certs/revolut/header.json | tr -d '\n' | base64 | tr -d '=' | tr '/+' '_-')
PAYLOAD=$(cat certs/revolut/payload.json | tr -d '\n' | base64 | tr -d '=' | tr '/+' '_-')
SIGNATURE=$(echo -n "$HEADER.$PAYLOAD" | openssl dgst -sha256 -sign certs/revolut/private.key | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
echo "$HEADER.$PAYLOAD.$SIGNATURE" > certs/revolut/client_assertion.txt
```

**2. Authorization Code holen (im Browser):**
```
https://business.revolut.com/app-confirm?client_id=tIWziunOHZ6vbF4ygxxAT43mrVe4Fh-c7FIdM78TSmU&redirect_uri=https://taskilo.de/api/revolut/oauth/callback&response_type=code&state=admin
```
- User muss eingeloggt sein und Zugriff bestätigen
- Code aus URL kopieren (nur 2 Minuten gültig!)

**3. Token Exchange (VIA HETZNER!):**
```bash
ssh root@mail.taskilo.de 'curl -s -X POST "https://b2b.revolut.com/api/1.0/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE_HIER" \
  -d "client_id=tIWziunOHZ6vbF4ygxxAT43mrVe4Fh-c7FIdM78TSmU" \
  -d "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer" \
  -d "client_assertion=JWT_HIER"'
```

**4. Token mit Refresh Token erneuern (VIA HETZNER!):**
```bash
ssh root@mail.taskilo.de 'curl -s -X POST "https://b2b.revolut.com/api/1.0/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=REFRESH_TOKEN_HIER" \
  -d "client_id=tIWziunOHZ6vbF4ygxxAT43mrVe4Fh-c7FIdM78TSmU" \
  -d "client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer" \
  -d "client_assertion=JWT_HIER"'
```

**5. Neue Tokens in .env.local, Vercel und Hetzner speichern:**
```bash
# Vercel
npx vercel env add REVOLUT_ACCESS_TOKEN production
npx vercel env add REVOLUT_REFRESH_TOKEN production

# Hetzner
ssh root@mail.taskilo.de "vim /opt/taskilo/webmail-proxy/.env"
ssh root@mail.taskilo.de "cd /opt/taskilo/webmail-proxy && docker compose up -d --build"
```

### Webhook registrieren (VIA HETZNER!)
```bash
ssh root@mail.taskilo.de 'curl -s -X POST "https://b2b.revolut.com/api/2.0/webhooks" \
  -H "Authorization: Bearer ACCESS_TOKEN_HIER" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://taskilo.de/api/payment/revolut-business-webhook\",\"events\":[\"TransactionStateChanged\",\"TransactionCreated\"]}"'
```
Antwort enthält `signing_secret` - in `REVOLUT_BUSINESS_WEBHOOK_SECRET` speichern!

### API testen (VIA HETZNER!)
```bash
ssh root@mail.taskilo.de 'curl -s -H "Authorization: Bearer ACCESS_TOKEN_HIER" "https://b2b.revolut.com/api/1.0/accounts"'
```

### Dateien
- Webhook Handler: `/src/app/api/payment/revolut-business-webhook/route.ts`
- OAuth Callback: `/src/app/api/revolut/oauth/callback/route.ts`
- Refresh Token API: `/src/app/api/revolut/refresh-token/route.ts`
- Webhook Management: `/src/app/api/revolut/business-webhooks/route.ts`
- Private Key: `/certs/revolut/private.key`
- JWT Assertion: `/certs/revolut/client_assertion.txt`

---

## CHATBOT KNOWLEDGE BASE
Bei neuen Website-Seiten IMMER die URL in `WEBSITE_URLS` Array hinzufügen:
- Datei: `/src/app/api/cron/refresh-knowledge-base/route.ts`
- Wöchentliches Re-Crawling: Sonntag 3:00 Uhr (Vercel Cron)
- Manuell: POST `/api/cron/refresh-knowledge-base`
- Admin UI: `/dashboard/admin/chatbot-knowledge`

## STACK
Next.js 15 + TypeScript + Firebase + Vercel + Hetzner (Webmail)

**Dashboards**: `/dashboard/user/[uid]`, `/dashboard/company/[uid]`, `/dashboard/admin`

**Collections**: users, companies, customers, auftraege, quotes, invoices, chats, notifications, escrowPayments, expenses, inventory, timeEntries, updates, chatbot_knowledge, chatbot_website_content, chatbot_config

## CODE-PATTERNS

```typescript
// Firebase (Vercel)
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
- DATEIEN LÖSCHEN: NIEMALS Dateien löschen ohne explizite Benutzeranfrage! Immer zuerst fragen!
- UMLAUT-FEHLER: Deutsche Umlaute (ä, ö, ü, ß) IMMER korrekt schreiben! NIEMALS ae/oe/ue/ss in UI-Texten, Kommentaren oder Strings verwenden (außer in URLs/IDs)!

## ERFOLG
Aufgabe abgeschlossen wenn:
1. Keine TypeScript-Fehler (get_errors clean)
2. Deutsche Compliance (GoBD, §19 UStG)
3. Update-Notification erstellt
4. Echte Daten (keine Mocks)
5. Code-Qualität (Zod, @/ Pfade)