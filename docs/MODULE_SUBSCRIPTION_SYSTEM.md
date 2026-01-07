# Taskilo Business Modul-System

## Übersicht

Das Taskilo Business Modul-System ermöglicht es Unternehmen, ihre Taskilo Business Subscription 
mit Premium-Modulen zu erweitern und zusätzliche Nutzer-Plätze (Seats) zu buchen.

## Preisstruktur

### Basis-Abonnement
- **Taskilo Business**: 29,99 €/Monat
- Enthält 1 Nutzer-Platz (Inhaber)
- Alle Basis-Module inkludiert

### Basis-Module (im Business enthalten)
| Modul | Beschreibung |
|-------|-------------|
| Tasker | Auftragsverwaltung & Marktplatz |
| Kalender | Terminverwaltung |
| E-Mail | E-Mail-Client Integration |
| Finanzen | Buchhaltung, Rechnungen, Angebote |
| Geschäftspartner | Kunden- & Lieferantenverwaltung |
| Banking | Kontenübersicht, Kassenbuch |
| Lagerbestand | Inventarverwaltung |
| Personal | Mitarbeiter, Dienstplan (Basis) |
| Support | Hilfe & Support |
| Einstellungen | Unternehmenseinstellungen |

### Premium-Module
| Modul | Monatlich | Jährlich | Ersparnis |
|-------|-----------|----------|-----------|
| WhatsApp Business | 14,99 € | 149,90 € | 16% |
| Taskilo Advertising | 24,99 € | 249,90 € | 16% |
| Recruiting | 19,99 € | 199,90 € | 16% |
| Workspace Pro | 9,99 € | 99,90 € | 16% |

### Bundle (alle Premium-Module)
- **Komplett-Bundle**: 49,99 €/Monat (statt 69,96 €)
- **Ersparnis**: 28%

### Zusätzliche Nutzer-Plätze (Seats)
- **Preis pro Seat**: 5,99 €/Monat
- **Im Business enthalten**: 1 Seat (Inhaber)
- **Maximum**: 100 zusätzliche Seats

## Architektur

### Dateien & Services

```
src/
├── lib/
│   └── moduleConfig.ts              # Modul-Definitionen & Preise
├── services/subscription/
│   ├── ModuleSubscriptionService.ts # Modul-Abonnement-Logik
│   └── SeatService.ts               # Seat-Verwaltung
├── components/guards/
│   └── ModuleGuard.tsx              # Feature-Sperrung für Premium
├── app/
│   ├── pricing/
│   │   └── page.tsx                 # Pricing-Seite für Module & Seats
│   ├── api/company/[uid]/
│   │   ├── modules/
│   │   │   └── route.ts             # Module-API
│   │   └── seats/
│   │       └── route.ts             # Seats-API
│   └── dashboard/company/[uid]/settings/
│       └── modules/
│           └── page.tsx             # Module-Verwaltung in Settings
└── components/dashboard/
    └── CompanySidebar.tsx           # Angepasst für Premium-Module
```

### Firestore-Struktur

```
companies/{companyId}
├── modules: {                       # Basis-Module Status
│   tasker: true,
│   calendar: true,
│   ...
│   whatsapp: false,                 # Premium - standardmäßig false
│   advertising: false,
│   recruiting: false,
│   workspace: true                  # Basis-Workspace
│ }
├── activeModules: ['advertising']   # Aktive Premium-Module
├── moduleBundleActive: false        # Bundle-Status
├── seats: {
│   included: 1,                     # Im Abo enthalten
│   additional: 0,                   # Zusätzlich gebucht
│   used: 1,                         # Aktuell in Verwendung
│   pricePerSeat: 5.99,              # Preis pro Seat
│   pendingRemoval: 0,               # Ausstehende Entfernung
│   pendingRemovalDate: null         # Datum der Entfernung
│ }
├── module_subscriptions/{id}        # Subcollection für Modul-Abos
│   ├── moduleId: 'whatsapp'
│   ├── moduleName: 'WhatsApp Business'
│   ├── status: 'trial' | 'active' | 'cancelled' | 'pending'
│   ├── priceGross: 14.99
│   ├── priceNet: 12.60
│   ├── vatRate: 19
│   ├── billingInterval: 'monthly' | 'yearly'
│   ├── trialEndDate: Timestamp
│   ├── trialUsed: false
│   ├── currentPeriodStart: Timestamp
│   ├── currentPeriodEnd: Timestamp
│   ├── revolutSubscriptionId: string (optional)
│   └── createdAt, updatedAt
└── seat_changes/{id}                # Historie der Seat-Änderungen
    ├── type: 'add' | 'remove'
    ├── quantity: number
    ├── previousTotal: number
    ├── newTotal: number
    ├── effectiveDate: Timestamp
    ├── proratedAmount: number (optional)
    └── createdAt, createdBy
```

## API-Referenz

### Module-API

#### GET /api/company/{uid}/modules

Listet alle verfügbaren Module und deren Status.

**Response:**
```json
{
  "success": true,
  "data": {
    "baseModules": [...],
    "premiumModules": [
      {
        "id": "whatsapp",
        "name": "WhatsApp Business",
        "status": "trial" | "active" | "available" | "bundle",
        "statusLabel": "Testphase (5 Tage)",
        "subscription": { ... }
      }
    ],
    "bundle": {
      "id": "all-premium",
      "price": { "monthly": 49.99 },
      "isActive": false
    },
    "summary": {
      "activeModules": ["advertising"],
      "trialingModules": ["whatsapp"],
      "bundleActive": false,
      "monthlyTotal": 39.98
    }
  }
}
```

#### POST /api/company/{uid}/modules

Modul buchen oder kündigen.

**Body (Modul buchen):**
```json
{
  "action": "subscribe",
  "moduleId": "whatsapp",
  "billingInterval": "monthly",
  "withTrial": true
}
```

**Body (Bundle buchen):**
```json
{
  "action": "subscribe-bundle",
  "billingInterval": "monthly",
  "withTrial": true
}
```

**Body (Kündigen):**
```json
{
  "action": "cancel",
  "moduleId": "whatsapp",
  "reason": "Nicht mehr benötigt"
}
```

### Seats-API

#### GET /api/company/{uid}/seats

Ruft Seat-Informationen ab.

**Response:**
```json
{
  "success": true,
  "data": {
    "seats": {
      "included": 1,
      "additional": 2,
      "total": 3,
      "used": 2,
      "available": 1,
      "pricePerSeat": 5.99,
      "monthlyTotal": 11.98
    },
    "config": {
      "maxSeats": 100,
      "priceMonthly": 5.99,
      "priceYearly": 59.90
    },
    "history": [...]
  }
}
```

#### POST /api/company/{uid}/seats

Seats hinzufügen oder entfernen.

**Body (Hinzufügen):**
```json
{
  "action": "add",
  "quantity": 5
}
```

**Body (Entfernen):**
```json
{
  "action": "remove",
  "quantity": 2
}
```

**Body (Verfügbarkeit prüfen):**
```json
{
  "action": "check"
}
```

## Komponenten-Verwendung

### ModuleGuard

Sperrt Premium-Features wenn das Modul nicht gebucht ist.

```tsx
import { ModuleGuard } from '@/components/guards/ModuleGuard';

// Als Wrapper-Komponente
<ModuleGuard moduleId="whatsapp">
  <WhatsAppInbox />
</ModuleGuard>

// Mit Blur-Effekt
<ModuleGuard moduleId="advertising" showBlurred>
  <AdvertisingDashboard />
</ModuleGuard>

// Mit Custom-Fallback
<ModuleGuard moduleId="recruiting" fallback={<UpgradePrompt />}>
  <RecruitingModule />
</ModuleGuard>
```

### useModuleAccess Hook

Prüft den Zugang zu einem Premium-Modul.

```tsx
import { useModuleAccess } from '@/components/guards/ModuleGuard';

function MyComponent() {
  const { hasAccess, isTrialing, loading } = useModuleAccess('whatsapp');

  if (loading) return <Spinner />;

  return (
    <button disabled={!hasAccess}>
      WhatsApp öffnen
      {isTrialing && <Badge>Testphase</Badge>}
    </button>
  );
}
```

## Seat-Limit bei Mitarbeiter-Dashboard

Bei der Einladung eines Mitarbeiters zum Dashboard wird automatisch geprüft, 
ob noch Seats verfügbar sind:

```typescript
// In /api/company/[uid]/employees/invite/route.ts

const seatCheck = await SeatService.checkSeatAvailable(companyId);

if (!seatCheck.available) {
  return NextResponse.json({
    success: false,
    error: 'Seat-Limit erreicht',
    code: 'SEAT_LIMIT_REACHED',
    upgradeRequired: true,
  }, { status: 402 });
}
```

## Sidebar-Integration

Die CompanySidebar zeigt Premium-Module mit einem Lock-Icon und "Premium"-Badge an, 
wenn sie nicht gebucht sind. Bei Klick wird zur Pricing-Seite weitergeleitet.

Markierte Premium-Module in der Sidebar:
- WhatsApp (premiumModule: 'whatsapp')
- Taskilo Advertising (premiumModule: 'advertising')
- Recruiting (premiumModule: 'recruiting')

## Testphase (Trial)

- **Dauer**: 7 Tage
- **Pro Modul**: Jedes Premium-Modul kann einmal kostenlos getestet werden
- **Automatische Aktivierung**: Nach Trial wird das Modul kostenpflichtig
- **Cron-Job**: Hetzner Cron ruft `/api/cron/module-trial-expiration` täglich auf

### Hetzner Cron Konfiguration

```bash
# In Hetzner Crontab hinzufügen:
0 0 * * * curl -X GET -H "Authorization: Bearer $CRON_SECRET" https://taskilo.de/api/cron/module-trial-expiration
```

### E-Mail-Benachrichtigungen

| Event | Zeitpunkt | Template |
|-------|-----------|----------|
| Trial-Erinnerung | 3 Tage vor Ablauf | `sendTrialEndingEmail` |
| Trial-Erinnerung | 1 Tag vor Ablauf | `sendTrialEndingEmail` |
| Trial abgelaufen | Am Ablauftag | `sendTrialExpiredEmail` |
| Modul aktiviert | Nach Zahlung | `sendModuleActivatedEmail` |
| Zahlung fehlgeschlagen | Nach Fehler | `sendPaymentFailedEmail` |
| Kündigung bestätigt | Nach Kündigung | `sendCancellationConfirmationEmail` |

## Revolut Webhook

Der Webhook unter `/api/webhooks/revolut-modules` verarbeitet:
- `ORDER_COMPLETED`: Zahlung erfolgreich, Modul aktivieren
- `SUBSCRIPTION_ACTIVATED`: Wiederkehrende Zahlung gestartet
- `SUBSCRIPTION_CANCELLED`: Subscription gekündigt
- `ORDER_PAYMENT_DECLINED`: Zahlung fehlgeschlagen

## Abrechnung

### Monatliche Abrechnung
Alle Module werden zusammen mit dem Taskilo Business Abo abgerechnet:
- Basis-Abo: 29,99 €
- Premium-Module: Summe der gebuchten Module
- Seats: Anzahl × 5,99 €

### Anteilige Berechnung
Bei unterjährigen Änderungen:
- Neue Module/Seats: Anteiliger Preis für restlichen Monat
- Entfernte Seats: Wirksam zum Monatsende

## TODOs / Ausstehend

1. ~~**Revolut Webhook**: Implementierung des Webhooks für Zahlungsbestätigungen~~ ✅
2. ~~**Rechnungserstellung**: Automatische Rechnungen für Module & Seats~~ ✅
3. ~~**E-Mail-Benachrichtigungen**: Trial-Ablauf, Zahlungserinnerungen~~ ✅
4. ~~**Admin-Dashboard**: Übersicht aller Modul-Abonnements für Admins~~ ✅
5. ~~**Zwei Pricing-Seiten**: `/pricing/webmail` und `/pricing/business`~~ ✅
6. ~~**Header Dropdown**: Preise-Dropdown mit Webmail und Business Links~~ ✅
7. **Kompletter Test**: End-to-End Test des gesamten Modul-Systems

## Neue Dateien (Implementiert)

| Datei | Beschreibung |
|-------|--------------|
| `src/lib/moduleConfig.ts` | Modul-Definitionen & Preiskonfiguration |
| `src/services/subscription/ModuleSubscriptionService.ts` | Modul-Abonnement-Logik |
| `src/services/subscription/SeatService.ts` | Seat-Verwaltung |
| `src/services/subscription/ModuleNotificationService.ts` | E-Mail-Benachrichtigungen für Module |
| `src/services/subscription/ModuleInvoiceService.ts` | Automatische Rechnungserstellung |
| `src/app/api/company/[uid]/modules/route.ts` | Module-API |
| `src/app/api/company/[uid]/seats/route.ts` | Seats-API |
| `src/app/api/webhooks/revolut-modules/route.ts` | Revolut Webhook für Module-Zahlungen |
| `src/app/api/cron/module-trial-expiration/route.ts` | Cron-Endpunkt für Trial-Ablauf |
| `src/app/api/admin/modules/stats/route.ts` | Admin-API für Modul-Statistiken |
| `src/app/pricing/page.tsx` | Pricing-Übersichtsseite |
| `src/app/pricing/webmail/page.tsx` | Webmail-Preise |
| `src/app/pricing/business/page.tsx` | Business Premium-Module |
| `src/app/dashboard/admin/modules/page.tsx` | Admin-Dashboard für Module |
| `src/app/dashboard/company/[uid]/settings/modules/page.tsx` | Modul-Verwaltung in Settings |
| `src/components/guards/ModuleGuard.tsx` | Feature-Guard für Premium-Module |

## Modifizierte Dateien

| Datei | Änderungen |
|-------|------------|
| `src/components/dashboard/CompanySidebar.tsx` | Premium-Module Markierung |
| `src/app/api/company/[uid]/employees/invite/route.ts` | Seat-Limit Check |
| `src/app/dashboard/admin/layout.tsx` | Modul-Link zur Admin-Navigation |
| `src/components/hero8-header.tsx` | Preise-Dropdown-Menü | 


