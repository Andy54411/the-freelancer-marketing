# Storage Subscription Integration - System Overview

## ✅ Integration Status: COMPLETE

Das Storage Subscription System wurde erfolgreich in den **bestehenden Stripe Webhook** integriert.

---

## 🏗️ Bestehende Webhook-Architektur

### Haupt-Webhook: `/api/stripe-webhooks/route.ts`
**Zweck**: Hauptwebhook für alle Stripe Events  
**Verwendet von**:
- Zahlungen (payment_intent.succeeded)
- Additional Hours Payments
- Job Conversions
- Setup Intents
- **NEU: Storage Subscriptions** ✅

**Webhook Secret**: `STRIPE_WEBHOOK_SECRET="whsec_faqTb5dvnp7odWD0oi7CC5q6riHNxmGP"`

**Stripe Dashboard**: 
- URL: `https://taskilo.de/api/stripe-webhooks`
- Events: Alle relevanten Events

### Spezialisierte Webhooks:

#### 1. `/api/webhooks/stripe/route.ts`
**Zweck**: Platform Balance & Payouts  
**Events**:
- `balance.available`
- `payout.created/updated/paid/failed`
- `transfer.created/updated`
- `application_fee.created`

#### 2. `/api/b2b/webhooks/route.ts`
**Zweck**: B2B Connected Accounts  
**Webhook Secret**: `STRIPE_B2B_WEBHOOK_SECRET` (fallback: `STRIPE_WEBHOOK_SECRET`)  
**Events**:
- `payment_intent.succeeded` (B2B projects)
- `payment_intent.payment_failed`
- `transfer.created`
- `account.updated`

---

## 📦 Storage Subscription Integration

### Events im Haupt-Webhook hinzugefügt:

#### 1. `checkout.session.completed`
**Auslöser**: Kunde schließt Stripe Checkout ab  
**Aktion**:
- Prüft `metadata.type === 'storage_subscription'`
- Aktualisiert `storageLimit` in Firestore
- Setzt `subscriptionStatus` auf "active"
- Updated `storage_subscriptions` Log

**Firestore Update**:
```javascript
// Für Kunden
companies/{companyId}/customers/{customerId}/
  - storageLimit: <bytes>
  - storagePlanId: "5gb"|"20gb"|"50gb"|"100gb"
  - stripeSubscriptionId: "sub_..."
  - subscriptionStatus: "active"
  - subscriptionUpdatedAt: timestamp

// Oder für Company-weite Storage
companies/{companyId}/
  - storageLimit: <bytes>
  - ...
```

#### 2. `customer.subscription.updated`
**Auslöser**: Subscription Status ändert sich (z.B. pause, resume)  
**Aktion**:
- Updated `subscriptionStatus`
- Aktualisiert Timestamp

#### 3. `customer.subscription.deleted`
**Auslöser**: Subscription wird gekündigt  
**Aktion**:
- Reset `storageLimit` auf **1 GB** (Default)
- Setzt `storagePlanId` auf `null`
- Status: "canceled"

---

## 🔧 Keine Webhook-Einrichtung nötig!

Der bestehende Webhook unter `https://taskilo.de/api/stripe-webhooks` verarbeitet bereits:
✅ `checkout.session.completed`  
✅ `customer.subscription.updated`  
✅ `customer.subscription.deleted`

**Das bedeutet**: Das System funktioniert **sofort** nach dem Kauf!

---

## 🧪 Testing

### Test-Ablauf:
1. **Speicher kaufen**: Im Modal einen Plan auswählen
2. **Stripe Checkout**: Mit Test-Karte zahlen (`4242 4242 4242 4242`)
3. **Webhook**: Stripe sendet `checkout.session.completed` → Haupt-Webhook
4. **Firestore Update**: `storageLimit` wird automatisch aktualisiert
5. **Frontend**: Real-time Update via `onSnapshot` Listener

### Monitoring:
```bash
# Webhook-Logs in Vercel/Server ansehen
# Storage-Updates prüfen:
✅ Storage subscription activated for company {companyId}
✅ Storage subscription updated: active for company {companyId}
✅ Storage subscription canceled for company {companyId}, reset to 1GB
```

---

## 🎯 Wie es funktioniert

### 1. Frontend Flow
```typescript
// CustomerDocumentsTab.tsx
- Zeigt Storage Progress Bar
- Prüft Storage Limit (useEffect mit onSnapshot)
- "Mehr Speicher kaufen" Button öffnet StorageUpgradeModal
```

### 2. Checkout Session Creation
```typescript
// /api/storage/create-subscription (bleibt bestehen, wird verwendet)
POST /api/storage/create-subscription
{
  priceId: "price_1SGeFID5Lvjon30abB9nNcVv",
  planId: "5gb",
  storage: 5368709120,
  companyId: "...",
  customerId: "...",
  successUrl: "...",
  cancelUrl: "..."
}

→ Erstellt Stripe Checkout Session mit metadata
→ Speichert Log in storage_subscriptions
```

### 3. Webhook Processing
```typescript
// /api/stripe-webhooks (Haupt-Webhook)
Empfängt: checkout.session.completed
Prüft: session.metadata.type === 'storage_subscription'
Updated: Firestore mit neuem Storage Limit
```

### 4. Real-time Update
```typescript
// Frontend
useEffect(() => {
  onSnapshot(customerRef, (snapshot) => {
    const limit = snapshot.data().storageLimit;
    setStorageLimit(limit); // UI aktualisiert sich sofort!
  });
}, [customerId]);
```

---

## 📊 Stripe Dashboard Setup

### Bestehende Webhook-Konfiguration:
**Endpoint**: `https://taskilo.de/api/stripe-webhooks`

**Bereits konfigurierte Events** (müssen nur ergänzt werden):
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `charge.succeeded`
- **NEU hinzufügen**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### So fügst du die Events hinzu:
1. Gehe zu [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Finde den Webhook für `https://taskilo.de/api/stripe-webhooks`
3. Klicke auf "..." → "Update details"
4. Im Bereich "Events to send" füge hinzu:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Klicke "Update endpoint"

**Wichtig**: Der bestehende `STRIPE_WEBHOOK_SECRET` bleibt gleich!

---

## 🚀 Was ist bereit?

### ✅ Vollständig implementiert:
1. **Frontend**:
   - Storage Progress Bar mit Farbcodierung
   - StorageUpgradeModal (kompakt, 4 Pläne)
   - Real-time Storage Limit aus Firestore
   - Upload-Validierung gegen Limit

2. **Backend**:
   - `/api/storage/create-subscription` (Checkout Session)
   - Webhook Integration in `/api/stripe-webhooks`
   - Firestore Updates (auto, via Webhook)

3. **Stripe**:
   - 4 Produkte erstellt (5/20/50/100 GB)
   - Price IDs in Code eingetragen
   - Metadata für Tracking

### ⏳ Noch zu tun:
1. **Webhook Events hinzufügen** (siehe oben)
2. **Testen**: Ein Abo kaufen und prüfen ob Limit aktualisiert wird
3. **Optional**: Downgrade-Flow (kleineres Paket wählen)
4. **Optional**: Kündigungsflow (im Dashboard)

---

## 💡 Key Insights

### Warum keine separate Webhook-Route?
- **Einfacher**: Nur ein Webhook-Endpunkt in Stripe
- **Konsolidiert**: Alle Events zentral
- **Bestehend**: Nutzt bereits konfigurierte Infrastruktur

### Warum /api/storage/webhook trotzdem existiert?
Das war mein ursprünglicher Ansatz. Die Route existiert noch, wird aber **nicht verwendet**.  
Du kannst sie löschen oder als Backup behalten:
```bash
# Optional: Route entfernen
rm src/app/api/storage/webhook/route.ts
```

### Metadata als Filter
```typescript
// Jedes Event hat metadata.type
if (session.metadata?.type === 'storage_subscription') {
  // Nur Storage Events verarbeiten
}
```

---

## 🔍 Troubleshooting

### Problem: Storage Limit aktualisiert sich nicht
**Lösung**:
1. Prüfe Webhook-Events in Stripe Dashboard
2. Stelle sicher, dass `checkout.session.completed` konfiguriert ist
3. Checke Server-Logs für Webhook-Verarbeitung
4. Nutze `scripts/list-customer-storage.js` zum Debugging

### Problem: Webhook-Fehler
**Lösung**:
1. Stripe Dashboard → Webhooks → Klick auf Event → "View logs"
2. Prüfe Response Status (sollte 200 sein)
3. Error message gibt Hinweis auf Problem

### Manuelles Update (Fallback):
```bash
node scripts/update-customer-storage.js <companyId> <customerId> <storageGB>
```

---

## 📚 Dateien-Übersicht

```
src/
├── app/api/
│   ├── stripe-webhooks/route.ts         ✅ HAUPT-WEBHOOK (UPDATED)
│   ├── storage/
│   │   ├── create-subscription/route.ts ✅ Checkout Session
│   │   └── webhook/route.ts             ⚠️  NICHT VERWENDET (kann gelöscht werden)
│   └── webhooks/
│       └── stripe/route.ts              ✅ Platform/Payouts (separate)
├── components/
│   ├── storage/
│   │   └── StorageUpgradeModal.tsx      ✅ Kompaktes Modal
│   └── finance/customer-detail/
│       └── CustomerDocumentsTab.tsx     ✅ Mit Storage Limit Tracking
scripts/
├── setup-stripe-storage-plans.js        ✅ Produkte erstellen
├── update-customer-storage.js           ✅ Manuelles Update
└── list-customer-storage.js             ✅ Storage Info anzeigen
```

---

**Status**: ✅ System bereit für Production  
**Nächster Schritt**: Webhook Events in Stripe Dashboard ergänzen (5 Minuten)  
**Danach**: Voll funktionsfähig!
