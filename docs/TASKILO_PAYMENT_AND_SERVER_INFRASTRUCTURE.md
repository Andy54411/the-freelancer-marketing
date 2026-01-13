# TASKILO PAYMENT & SERVER INFRASTRUKTUR

> **Vollständige Analyse und Dokumentation**  
> Stand: 12. Januar 2026

---

## 📋 INHALTSVERZEICHNIS

1. [Übersicht](#1-übersicht)
2. [Revolut Payment-System](#2-revolut-payment-system)
3. [Escrow-System (Treuhand)](#3-escrow-system-treuhand)
4. [Hetzner Server Infrastruktur](#4-hetzner-server-infrastruktur)
5. [Webmail-Proxy Dienste](#5-webmail-proxy-dienste)
6. [Domain-Management Plan](#6-domain-management-plan)
7. [Technische Implementation](#7-technische-implementation)
8. [Sicherheitsmaßnahmen](#8-sicherheitsmaßnahmen)
9. [Checkliste vor Umsetzung](#9-checkliste-vor-umsetzung)

---

## 1. ÜBERSICHT

### Aktuelle Architektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASKILO INFRASTRUKTUR                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐           ┌──────────────────────────────────┐    │
│  │      VERCEL          │           │      HETZNER SERVER              │    │
│  │   (taskilo.de)       │◄─────────►│   (mail.taskilo.de)              │    │
│  │                      │           │   IP: 91.99.79.104               │    │
│  │  • Next.js Frontend  │   HTTPS   │                                  │    │
│  │  • API Routes        │   Proxy   │  • Webmail-Proxy (Port 3100)     │    │
│  │  • Firebase Client   │           │  • Mailcow (IMAP/SMTP)           │    │
│  │                      │           │  • Redis Cache                   │    │
│  │  Keine feste IP!     │           │  • TURN Server                   │    │
│  └──────────────────────┘           │  • Revolut-Proxy (IP-Whitelist)  │    │
│           │                         └──────────────────────────────────┘    │
│           │                                        │                        │
│           ▼                                        ▼                        │
│  ┌──────────────────────┐           ┌──────────────────────────────────┐    │
│  │     FIREBASE         │           │       REVOLUT API                │    │
│  │                      │           │                                  │    │
│  │  • Firestore DB      │           │  • Business API v1.0/v2.0        │    │
│  │  • Authentication    │           │  • JWT Client Credentials        │    │
│  │  • Cloud Storage     │           │  • IP-Whitelist: 91.99.79.104    │    │
│  │  • Cloud Functions   │           │                                  │    │
│  └──────────────────────┘           └──────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Warum Hetzner-Proxy für Revolut?

| Problem | Lösung |
|---------|--------|
| Vercel hat keine feste IP | Hetzner hat feste IP `91.99.79.104` |
| Revolut erlaubt nur IP-Whitelist | Nur Hetzner-IP ist freigeschaltet |
| API-Calls von Vercel werden blockiert | Vercel → Hetzner Proxy → Revolut |

---

## 2. REVOLUT PAYMENT-SYSTEM

### 2.1 Revolut-Integration Übersicht

**Basis-URL:** `https://b2b.revolut.com/api/1.0`  
**Client-ID:** `tIWziunOHZ6vbF4ygxxAT43mrVe4Fh-c7FIdM78TSmU`  
**Issuer:** `taskilo.de`

### 2.2 Authentifizierung

```
┌──────────────────────────────────────────────────────────────────┐
│                    JWT CLIENT CREDENTIALS FLOW                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. JWT erstellen mit Private Key (RS256)                        │
│     ├─ iss: "taskilo.de"                                         │
│     ├─ sub: CLIENT_ID                                            │
│     ├─ aud: "https://revolut.com"                                │
│     └─ exp: now + 5 min                                          │
│                                                                  │
│  2. Token Exchange                                               │
│     POST /1.0/auth/token                                         │
│     ├─ grant_type: client_credentials                            │
│     ├─ client_assertion_type: jwt-bearer                         │
│     └─ client_assertion: <JWT>                                   │
│                                                                  │
│  3. Access Token erhalten (expires_in: 2400s = 40 min)           │
│                                                                  │
│  4. Refresh Token für Erneuerung                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Verfügbare Revolut-Endpunkte

| Endpunkt | Beschreibung | Vercel Route |
|----------|--------------|--------------|
| `GET /accounts` | Alle Konten abrufen | `/api/revolut/accounts` |
| `GET /transactions` | Transaktionen abrufen | Via Proxy |
| `GET /webhooks` | Alle Webhooks | `/api/revolut/business-webhooks` |
| `POST /webhooks` | Webhook registrieren | `/api/revolut/business-webhooks` |
| `GET /counterparties` | Zahlungsempfänger | Via Proxy |
| `GET /exchange-rate` | Wechselkurse | Via Proxy |
| `POST /refresh-token` | Token erneuern | `/api/revolut/refresh-token` |

### 2.4 Token-Speicherung

**Speicherort auf Hetzner:**
```
/opt/taskilo/webmail-proxy/data/revolut-tokens.json
```

**Struktur:**
```json
{
  "accessToken": "oa_prod_xxx...",
  "refreshToken": "ort_prod_xxx...",
  "expiresAt": "2026-01-12T15:30:00.000Z",
  "updatedAt": "2026-01-12T15:00:00.000Z"
}
```

### 2.5 Vercel Revolut-Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/revolut-openbanking-service.ts` | Original Service (direkt) |
| `src/lib/revolut-hetzner-proxy.ts` | Proxy-Client für Hetzner |
| `src/app/api/revolut/accounts/route.ts` | Konten-API |
| `src/app/api/revolut/oauth/callback/route.ts` | OAuth Callback |
| `src/app/api/revolut/refresh-token/route.ts` | Token Refresh |
| `src/app/api/revolut/business-webhooks/route.ts` | Webhook Management |

---

## 3. ESCROW-SYSTEM (TREUHAND)

### 3.1 Escrow-Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ESCROW ZAHLUNGSFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCHRITT 1: AUFTRAG ERSTELLT                                                 │
│  ─────────────────────────────                                               │
│  Kunde erstellt Auftrag → Escrow-Eintrag in Firestore (status: "pending")   │
│                                                                              │
│  SCHRITT 2: ZAHLUNG                                                          │
│  ─────────────────────                                                       │
│  Kunde zahlt → Revolut empfängt → Webhook → Escrow (status: "held")         │
│  └─ Clearing-Periode startet (Level-abhängig: 7 Tage / 2 Tage / sofort)     │
│                                                                              │
│  SCHRITT 3: AUFTRAG ABGESCHLOSSEN                                            │
│  ──────────────────────────────────                                          │
│  Tasker bestätigt Abschluss → Warte auf Clearing-Ende                       │
│                                                                              │
│  SCHRITT 4: AUSZAHLUNG                                                       │
│  ─────────────────────────                                                   │
│  Clearing abgelaufen → POST /api/company/[uid]/payout                       │
│  → Hetzner Proxy → Revolut Transfer → Tasker-Bankkonto                      │
│  → Escrow (status: "released")                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Level-basierte Auszahlung

| Level | Clearing-Zeit | Express-Option | Platform-Gebühr |
|-------|--------------|----------------|-----------------|
| `new` | 7 Tage | 2 Tage (4,5%) | 15% |
| `level1` | 7 Tage | 2 Tage (4,5%) | 15% |
| `level2` | Sofort | - | 10% |
| `top_rated` | Sofort | - | 10% |

### 3.3 Escrow-Datenstruktur (Firestore)

**Collection:** `escrows`

```typescript
interface EscrowRecord {
  id: string;                    // "escrow_order123_1736697600000"
  orderId: string;               // Auftrags-ID
  buyerId: string;               // Kunden-UID
  providerId: string;            // Tasker-UID
  amount: number;                // Gesamtbetrag
  currency: string;              // "EUR"
  platformFee: number;           // Taskilo-Gebühr
  providerAmount: number;        // Tasker-Auszahlung
  status: EscrowStatus;          // pending | held | released | refunded | disputed
  clearingDays: number;          // Level-basiert
  clearingEndsAt: Timestamp;     // Wann Auszahlung möglich
  paymentMethod: string;         // "revolut" | "bank_transfer"
  paymentId?: string;            // Revolut Transaction ID
  payoutId?: string;             // Auszahlungs-ID
  paymentReference: string;      // "ESC-XXXXXXXX" (für SEPA)
  createdAt: Timestamp;
  heldAt?: Timestamp;
  releasedAt?: Timestamp;
}
```

### 3.4 Escrow-API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/company/[uid]/payout` | POST | Auszahlung anfordern |
| `/api/company/[uid]/payout` | GET | Ausstehende Auszahlungen |
| `/api/company/[uid]/payout-history` | GET | Auszahlungshistorie |

### 3.5 Sicherheit: Bank-Verifizierung

Vor der ersten Auszahlung muss die IBAN verifiziert werden:

```
┌─────────────────────────────────────────────────────────────────┐
│                   IBAN VERIFIZIERUNG                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Tasker gibt IBAN ein                                         │
│                                                                  │
│  2. Taskilo überweist 0,01 EUR mit Verifizierungscode            │
│     (via Revolut → Tasker-Konto)                                 │
│                                                                  │
│  3. Tasker gibt Code in Dashboard ein                            │
│                                                                  │
│  4. IBAN als "verifiziert" markiert                              │
│                                                                  │
│  5. Auszahlungen nun möglich                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. HETZNER SERVER INFRASTRUKTUR

### 4.1 Server-Details

| Eigenschaft | Wert |
|-------------|------|
| **IP-Adresse** | `91.99.79.104` |
| **Domain** | `mail.taskilo.de` |
| **OS** | Ubuntu/Debian |
| **Ort** | `/opt/taskilo/webmail-proxy/` |

### 4.2 Docker-Container

```yaml
services:
  # Webmail-Proxy (Node.js/Express)
  webmail-proxy:
    container_name: taskilo-webmail-proxy
    ports: ["3100:3100"]
    volumes:
      - recordings:/data/recordings
      - drive-data:/opt/taskilo/webmail-proxy/data
      - /opt/mailcow-dockerized/data/assets/ssl:/certs:ro

  # Redis (Cache & Sessions)
  redis:
    container_name: taskilo-redis
    ports: ["6379"]
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  # TURN Server (WebRTC für Video-Calls)
  coturn:
    container_name: taskilo-coturn
    ports:
      - "3478:3478/tcp"
      - "3478:3478/udp"
      - "5349:5349/tcp"
      - "5349:5349/udp"
      - "49152-49200:49152-49200/udp"
```

### 4.3 Persistente Volumes

| Volume | Pfad | Inhalt |
|--------|------|--------|
| `recordings` | `/data/recordings` | Meeting-Aufzeichnungen |
| `drive-data` | `/opt/taskilo/webmail-proxy/data` | Revolut-Tokens, Drive-Daten |
| `redis-data` | `/data` | Redis Persistenz |

### 4.4 Netzwerk

```
┌─────────────────────────────────────────────────────────────────┐
│                    HETZNER NETZWERK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Internet → Nginx (443/SSL) → webmail-proxy (3100)               │
│                                                                  │
│  Internes Docker-Netzwerk: webmail-network                       │
│  ├─ webmail-proxy ◄──► redis (6379)                              │
│  ├─ webmail-proxy ◄──► mailcow (IMAP 993, SMTP 465)              │
│  └─ coturn (STUN/TURN)                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. WEBMAIL-PROXY DIENSTE

### 5.1 Alle verfügbaren Routes

| Route | Datei | Beschreibung |
|-------|-------|--------------|
| `/api/mailboxes` | `routes/mailboxes.ts` | IMAP Mailboxen |
| `/api/messages` | `routes/messages.ts` | E-Mail-Liste |
| `/api/message` | `routes/message.ts` | Einzelne E-Mail |
| `/api/send` | `routes/send.ts` | E-Mail senden (SMTP) |
| `/api/attachments` | `routes/attachments.ts` | Anhänge |
| `/api/search` | `routes/search.ts` | E-Mail-Suche |
| `/api/actions` | `routes/actions.ts` | Verschieben, Löschen |
| `/api/calendar` | `routes/calendar.ts` | CalDAV |
| `/api/contacts` | `routes/contacts.ts` | CardDAV |
| `/api/drive` | `routes/drive.ts` | Taskilo Drive |
| `/api/meeting` | `routes/meeting.ts` | Video-Meetings |
| `/api/recording` | `routes/recording.ts` | Meeting-Aufnahmen |
| `/api/turn` | `routes/turn.ts` | TURN-Credentials |
| `/api/payment` | `routes/payment.ts` | Zahlungen |
| `/api/revolut-proxy/*` | `routes/revolut-proxy.ts` | Revolut Business API |
| `/api/registration` | `routes/registration.ts` | Webmail-Registrierung |
| `/api/profile` | `routes/profile.ts` | Benutzerprofile |
| `/api/newsletter` | `routes/newsletter.ts` | Newsletter-Versand |
| `/api/mobileconfig` | `routes/mobileconfig.ts` | iOS/macOS E-Mail-Profile |
| `/api/phone-verification` | `routes/phone-verification.ts` | SMS-Verifizierung |

### 5.2 Revolut-Proxy Endpunkte (auf Hetzner)

**Basis-URL:** `https://mail.taskilo.de/webmail-api/api/revolut-proxy`

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/health` | GET | Health Check + Token-Status |
| `/refresh-token` | POST | Access Token erneuern |
| `/token-exchange` | POST | Auth Code → Token |
| `/accounts` | GET | Revolut Konten |
| `/transactions` | GET | Transaktionen |
| `/webhooks` | GET | Alle Webhooks |
| `/webhooks` | POST | Webhook erstellen |
| `/webhooks/:id` | DELETE | Webhook löschen |
| `/counterparties` | GET | Zahlungsempfänger |
| `/exchange-rate` | GET | Wechselkurse |
| `/team-members` | GET | Team-Mitglieder |
| `/payout-links` | GET | Payout Links |
| `/api` | POST | Generischer API-Proxy |
| `/set-tokens` | POST | Tokens manuell setzen |

### 5.3 Services

| Service | Datei | Beschreibung |
|---------|-------|--------------|
| `EmailService` | `services/EmailService.ts` | IMAP-Verbindung |
| `CacheService` | `services/CacheService.ts` | Redis-Cache |
| `DriveService` | `services/DriveService.ts` | Cloud-Speicher |
| `CalDAVService` | `services/CalDAVService.ts` | Kalender |
| `CardDAVService` | `services/CardDAVService.ts` | Kontakte |
| `SearchService` | `services/SearchService.ts` | E-Mail-Suche |
| `WebSocketService` | `services/WebSocketService.ts` | Real-time Updates |
| `MeetingRoomService` | `services/MeetingRoomService.ts` | Video-Räume |
| `TURNService` | `services/TURNService.ts` | WebRTC Relay |
| `NewsletterService` | `services/NewsletterService.ts` | Newsletter |
| `ProfileService` | `services/ProfileService.ts` | Benutzerprofile |
| `ConnectionPool` | `services/ConnectionPool.ts` | IMAP Pool |

---

## 6. DOMAIN-MANAGEMENT PLAN

### 6.1 Was haben wir bereits?

✅ **Mailcow** läuft auf Hetzner (mail.taskilo.de)  
✅ **Webmail-Proxy** für alle E-Mail-Operationen  
✅ **Revolut-Proxy** mit IP-Whitelist  
✅ **TURN-Server** für WebRTC  
✅ **Redis** für Caching  

### 6.2 Was fehlt für Domain-Management?

| Komponente | Status | Benötigt für |
|------------|--------|--------------|
| **Hetzner DNS API** | ❌ Nicht integriert | DNS-Zonen verwalten |
| **Domain-Registrierung** | ❌ Nicht vorhanden | Domains kaufen |
| **Domain-Verifizierung** | ⚠️ Teilweise vorhanden | Besitz bestätigen |
| **Mailcow API** | ✅ Vorhanden | E-Mail-Domains hinzufügen |
| **DKIM-Key Generation** | ✅ Via Mailcow | E-Mail-Signierung |

### 6.3 Hetzner DNS API (KOSTENLOS)

**API-Dokumentation:** https://dns.hetzner.com/api-docs/

| Endpunkt | Beschreibung |
|----------|--------------|
| `GET /zones` | Alle DNS-Zonen |
| `POST /zones` | Zone erstellen |
| `GET /records` | Alle Records |
| `POST /records` | Record erstellen |
| `POST /records/bulk` | Mehrere Records |
| `PUT /records/:id` | Record aktualisieren |
| `DELETE /records/:id` | Record löschen |

**Unterstützte Record-Typen:**
- A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, TLSA, DS

### 6.4 Implementierungsplan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOMAIN-MANAGEMENT IMPLEMENTATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: GRUNDLAGEN (1-2 Wochen)                                           │
│  ─────────────────────────────────                                           │
│  ☐ Hetzner DNS API Token generieren                                         │
│  ☐ DNS-Service in webmail-proxy erstellen                                   │
│  ☐ API-Endpunkte für Domain-Verwaltung                                      │
│  ☐ Firebase Collection "webmailDomains" anlegen                             │
│                                                                              │
│  PHASE 2: BASIC PLAN - EIGENE DOMAINS (1 Woche)                              │
│  ───────────────────────────────────────────────                             │
│  ☐ Domain-Verifizierung via TXT-Record                                      │
│  ☐ DNS-Anleitung für User anzeigen                                          │
│  ☐ Verifizierungsstatus prüfen                                              │
│  ☐ Domain in Mailcow hinzufügen                                             │
│                                                                              │
│  PHASE 3: PREMIUM PLAN - HETZNER DNS (1 Woche)                               │
│  ────────────────────────────────────────────────                            │
│  ☐ Auto-DNS-Setup via Hetzner API                                           │
│  ☐ MX, SPF, DKIM, DMARC automatisch setzen                                  │
│  ☐ DKIM-Key aus Mailcow abrufen                                             │
│                                                                              │
│  PHASE 4: DOMAIN-REGISTRIERUNG (Optional, 2 Wochen)                          │
│  ─────────────────────────────────────────────────                           │
│  ☐ Hetzner Domain Robot E-Mail-Interface                                    │
│  ☐ PGP-Signierung für Befehle                                               │
│  ☐ Oder: Alternative API (INWX, Namecheap)                                  │
│                                                                              │
│  PHASE 5: UI & ABRECHNUNG (1 Woche)                                          │
│  ──────────────────────────────────                                          │
│  ☐ Dashboard: /webmail/settings/domains                                     │
│  ☐ Domain hinzufügen Modal                                                  │
│  ☐ DNS-Status-Anzeige                                                       │
│  ☐ Speicher-Anzeige                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. TECHNISCHE IMPLEMENTATION

### 7.1 Neue Hetzner DNS Service Datei

**Ort:** `webmail-proxy/src/services/HetznerDNSService.ts`

```typescript
/**
 * Hetzner DNS API Service
 * 
 * Verwaltet DNS-Zonen und Records für Kunden-Domains
 * API: https://dns.hetzner.com/api-docs/
 */

const HETZNER_DNS_API = 'https://dns.hetzner.com/api/v1';

export class HetznerDNSService {
  private apiToken: string;

  constructor() {
    this.apiToken = process.env.HETZNER_DNS_API_TOKEN || '';
    if (!this.apiToken) {
      console.warn('[HetznerDNS] API Token nicht konfiguriert');
    }
  }

  // Zone erstellen
  async createZone(domainName: string): Promise<Zone>;

  // Zone löschen
  async deleteZone(zoneId: string): Promise<void>;

  // E-Mail-Records setzen (MX, SPF, DKIM, DMARC)
  async setEmailRecords(zoneId: string, mailServer: string, dkimKey: string): Promise<void>;

  // Verifikations-Record prüfen
  async verifyDomainOwnership(domain: string, expectedCode: string): Promise<boolean>;
}
```

### 7.2 Neue Route für Domain-Management

**Ort:** `webmail-proxy/src/routes/domains.ts`

```typescript
/**
 * Domain Management API
 */
router.post('/add', /* Domain hinzufügen */);
router.get('/list/:userId', /* Domains eines Users */);
router.post('/verify', /* Domain verifizieren */);
router.delete('/:domainId', /* Domain entfernen */);
router.post('/setup-dns', /* Auto-DNS-Setup */);
```

### 7.3 Firebase Collection

**Collection:** `webmailDomains`

```typescript
interface WebmailDomain {
  id: string;
  userId: string;
  domain: string;
  status: 'pending' | 'verified' | 'active' | 'failed';
  verificationCode: string;
  verifiedAt?: Timestamp;
  dnsProvider: 'hetzner' | 'external';
  hetznerZoneId?: string;
  mailcowDomainId?: string;
  dkimKey?: string;
  dkimSelector?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 7.4 Vercel API-Endpunkte

| Route | Beschreibung |
|-------|--------------|
| `POST /api/webmail/domains/add` | Domain hinzufügen |
| `GET /api/webmail/domains` | Meine Domains |
| `POST /api/webmail/domains/verify` | Domain verifizieren |
| `DELETE /api/webmail/domains/:id` | Domain entfernen |
| `POST /api/webmail/domains/dns-setup` | Auto-DNS (Premium) |

---

## 8. SICHERHEITSMASSNAHMEN

### 8.1 Bestehende Sicherheit

| Maßnahme | Implementiert in |
|----------|------------------|
| API-Key Authentifizierung | Alle Hetzner-Endpunkte |
| IP-Whitelist für Revolut | Nur 91.99.79.104 |
| Rate Limiting | `SecurityMiddleware.ts` |
| IP-Blocking | `SecurityMiddleware.ts` |
| CORS | Nur erlaubte Origins |
| Helmet (Security Headers) | Express App |
| JWT-Validierung | Revolut OAuth |
| Token-Persistenz | Docker Volume |
| IBAN-Verifizierung | Vor Auszahlung |
| PGP-Signierung | Hetzner Domain Robot |

### 8.2 Zusätzliche Maßnahmen für Domain-System

| Maßnahme | Beschreibung |
|----------|--------------|
| Domain-Ownership-Check | TXT-Record Verifizierung |
| Rate Limit für Domain-Adds | Max. 5 Domains pro Stunde |
| Blacklist für Domains | Keine reservierten/Spam-Domains |
| Abuse-Monitoring | Ungewöhnliche DNS-Aktivität |
| Audit-Logging | Alle Domain-Änderungen loggen |

---

## 9. CHECKLISTE VOR UMSETZUNG

### 9.1 Vorbereitung

- [ ] **Hetzner DNS API Token generieren**
  - DNS Console öffnen: https://dns.hetzner.com
  - API Token erstellen
  - In `.env.production` auf Hetzner speichern

- [ ] **Environment Variables erweitern**
  ```bash
  # Hetzner Server: /opt/taskilo/webmail-proxy/.env.production
  HETZNER_DNS_API_TOKEN=xxx
  ```

- [ ] **Firebase Collection erstellen**
  - `webmailDomains` anlegen
  - Security Rules definieren

- [ ] **Mailcow API prüfen**
  - Kann Domains programmatisch hinzufügen
  - DKIM-Keys abrufen

### 9.2 Entwicklung

- [ ] **Phase 1: DNS-Service**
  - [ ] `HetznerDNSService.ts` erstellen
  - [ ] Unit Tests schreiben
  - [ ] In webmail-proxy integrieren

- [ ] **Phase 2: Domain-Routes**
  - [ ] `routes/domains.ts` erstellen
  - [ ] API-Dokumentation

- [ ] **Phase 3: Vercel Integration**
  - [ ] Proxy-Funktionen für Domain-API
  - [ ] Dashboard-Seite `/webmail/settings/domains`

- [ ] **Phase 4: UI**
  - [ ] Domain hinzufügen Modal
  - [ ] DNS-Anleitung für externe Domains
  - [ ] Verifizierungsstatus anzeigen

### 9.3 Testing

- [ ] Test: Domain hinzufügen (extern)
- [ ] Test: TXT-Record Verifizierung
- [ ] Test: Auto-DNS-Setup (Hetzner)
- [ ] Test: Mailcow Integration
- [ ] Test: E-Mail senden/empfangen mit neuer Domain

### 9.4 Deployment

- [ ] Webmail-Proxy neu deployen
  ```bash
  ssh root@mail.taskilo.de
  cd /opt/taskilo/webmail-proxy
  git pull  # oder: scp neue Dateien
  docker compose up -d --build
  ```

- [ ] Vercel automatisch via `git push`

### 9.5 Dokumentation

- [ ] Benutzer-Dokumentation für Domain-Setup
- [ ] Admin-Dokumentation
- [ ] API-Dokumentation aktualisieren

---

## 📊 ZUSAMMENFASSUNG

### Was wir haben:
| ✅ | Komponente |
|----|------------|
| ✅ | Revolut Business API Integration |
| ✅ | Escrow-System für Treuhandzahlungen |
| ✅ | Hetzner Server mit fester IP |
| ✅ | Webmail-Proxy mit 20+ Services |
| ✅ | Mailcow für E-Mail |
| ✅ | TURN Server für WebRTC |
| ✅ | Token-Persistenz |
| ✅ | Bank-Verifizierung |

### Was wir brauchen:
| ❌ | Komponente | Aufwand |
|----|------------|---------|
| ❌ | Hetzner DNS API Integration | 1 Woche |
| ❌ | Domain-Verifizierung | 3 Tage |
| ❌ | Auto-DNS-Setup | 3 Tage |
| ❌ | Dashboard UI | 1 Woche |
| ❌ | Domain-Registrierung (optional) | 2 Wochen |

### Geschätzter Gesamtaufwand:
**3-4 Wochen** für vollständiges Domain-Management-System

---

*Dokumentation erstellt am 12. Januar 2026*
