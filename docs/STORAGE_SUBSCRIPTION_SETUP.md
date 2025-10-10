# Storage Subscription System - Setup Guide

## 🎯 Übersicht

Das Storage Subscription System ermöglicht es Unternehmen, zusätzlichen Speicherplatz für Kundendokumente über Stripe-Abonnements zu kaufen.

## 📋 Features

- ✅ **Kompaktes Modal-Design** - Kleine, übersichtliche Auswahl
- ✅ **4 Speicherpläne** - 5GB, 20GB, 50GB, 100GB
- ✅ **Stripe Integration** - Checkout Sessions & Webhooks
- ✅ **Automatische Updates** - Storage Limit wird nach Zahlung aktualisiert
- ✅ **Firestore Synchronisation** - Speicherlimit in Echtzeit
- ✅ **Loading States** - Benutzerfreundliche Ladeanimationen

## 🚀 Stripe Setup

### 1. Stripe Produkte erstellen

Gehe zum [Stripe Dashboard](https://dashboard.stripe.com/products) und erstelle folgende **wiederkehrende Produkte**:

#### Produkt 1: 5 GB Speicher
- **Name**: "5 GB Dokumentenspeicher"
- **Beschreibung**: "Ideal für kleine Unternehmen"
- **Preis**: €9.99/Monat
- **Billing Period**: Monatlich
- **Price ID kopieren**: z.B. `price_1ABC...`

#### Produkt 2: 20 GB Speicher (Beliebt)
- **Name**: "20 GB Dokumentenspeicher"
- **Beschreibung**: "Perfekt für wachsende Teams"
- **Preis**: €29.99/Monat
- **Billing Period**: Monatlich
- **Price ID kopieren**: z.B. `price_2ABC...`

#### Produkt 3: 50 GB Speicher
- **Name**: "50 GB Dokumentenspeicher"
- **Beschreibung**: "Für große Datenmengen"
- **Preis**: €59.99/Monat
- **Billing Period**: Monatlich
- **Price ID kopieren**: z.B. `price_3ABC...`

#### Produkt 4: 100 GB Speicher
- **Name**: "100 GB Dokumentenspeicher"
- **Beschreibung**: "Für Unternehmen"
- **Preis**: €99.99/Monat
- **Billing Period**: Monatlich
- **Price ID kopieren**: z.B. `price_4ABC...`

### 2. Price IDs eintragen

Öffne die Datei:
```
src/components/storage/StorageUpgradeModal.tsx
```

Ersetze die Platzhalter `price_storage_5gb`, `price_storage_20gb`, etc. mit den echten Stripe Price IDs:

```typescript
const STORAGE_PLANS: StoragePlan[] = [
  {
    id: '5gb',
    name: '5 GB',
    storage: 5 * 1024 * 1024 * 1024,
    price: 9.99,
    description: 'Kleine Unternehmen',
    priceId: 'price_1ABC...', // <-- HIER ERSETZEN
  },
  {
    id: '20gb',
    name: '20 GB',
    storage: 20 * 1024 * 1024 * 1024,
    price: 29.99,
    description: 'Wachsende Teams',
    popular: true,
    priceId: 'price_2ABC...', // <-- HIER ERSETZEN
  },
  // ... usw.
];
```

### 3. Webhook einrichten

1. Gehe zu [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Klicke auf "Add endpoint"
3. **Endpoint URL**: `https://taskilo.de/api/storage/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Klicke auf "Add endpoint"
6. **Webhook Secret kopieren**: `whsec_...`

### 4. Environment Variables

Stelle sicher, dass folgende Variablen in `.env.local` gesetzt sind:

```env
# Stripe Keys (bereits vorhanden)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."

# Webhook Secret (NEU)
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 📁 Dateien & Struktur

### Frontend
- `src/components/storage/StorageUpgradeModal.tsx` - Kompaktes Upgrade-Modal
- `src/components/finance/customer-detail/CustomerDocumentsTab.tsx` - Dokumenten-Tab mit Storage-Anzeige

### Backend
- `src/app/api/storage/create-subscription/route.ts` - Erstellt Stripe Checkout Session
- `src/app/api/storage/webhook/route.ts` - Verarbeitet Stripe Webhooks

### Firestore Collections
```
companies/{companyId}/
  ├── storageLimit (number) - Aktuelles Limit in Bytes
  ├── storagePlanId (string) - Aktiver Plan (5gb, 20gb, etc.)
  ├── stripeSubscriptionId (string) - Stripe Subscription ID
  ├── subscriptionStatus (string) - active, canceled, etc.
  └── storage_subscriptions/{sessionId}/
      ├── sessionId
      ├── stripeCustomerId
      ├── planId
      ├── storage
      ├── priceId
      ├── status
      └── createdAt
```

## 🔄 User Flow

1. **Limit erreicht**: Nutzer versucht, Datei hochzuladen → Toast-Nachricht
2. **Modal öffnen**: "Mehr Speicher kaufen" Button
3. **Plan wählen**: Nutzer klickt auf einen der 4 Pläne
4. **Stripe Checkout**: Automatische Weiterleitung zu Stripe
5. **Zahlung**: Nutzer zahlt mit Karte oder SEPA
6. **Webhook**: Stripe sendet Event an `/api/storage/webhook`
7. **Update**: Firestore wird aktualisiert mit neuem Limit
8. **Erfolg**: Nutzer wird zurückgeleitet, kann weiter hochladen

## 🧪 Testing

### Test Mode (aktuell aktiv)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
```

**Test-Karten**:
- Erfolgreich: `4242 4242 4242 4242`
- Zahlung erforderlich: `4000 0025 0000 3155`
- Abgelehnt: `4000 0000 0000 9995`

### Production Mode
Ersetze Test-Keys durch Live-Keys:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_live_..."
```

## 🐛 Troubleshooting

### Webhook funktioniert nicht
- Prüfe Webhook-Endpoint in Stripe Dashboard
- Prüfe `STRIPE_WEBHOOK_SECRET` in Environment Variables
- Checke Logs in Stripe Dashboard unter "Developers → Webhooks"

### Storage Limit wird nicht aktualisiert
- Prüfe Firestore Console: `companies/{companyId}/storageLimit`
- Checke API-Logs: `/api/storage/webhook`
- Stelle sicher, dass Webhook-Events richtig konfiguriert sind

### Checkout öffnet nicht
- Prüfe Browser-Konsole auf Fehler
- Checke Network-Tab für `/api/storage/create-subscription`
- Stelle sicher, dass `companyId` korrekt übergeben wird

## 📊 Monitoring

### Firestore Queries
```javascript
// Aktive Subscriptions
db.collection('companies')
  .where('subscriptionStatus', '==', 'active')
  .get();

// Storage Usage pro Company
db.collection('companies')
  .doc(companyId)
  .get()
  .then(doc => {
    const used = doc.data().storageUsed || 0;
    const limit = doc.data().storageLimit || 1073741824; // 1GB
    console.log(`${(used / limit * 100).toFixed(1)}% verwendet`);
  });
```

### Stripe Dashboard
- Abonnements: [Dashboard → Subscriptions](https://dashboard.stripe.com/subscriptions)
- Umsätze: [Dashboard → Payments](https://dashboard.stripe.com/payments)
- Webhooks: [Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

## 💡 Nächste Schritte

1. ✅ Modal ist kompakt und nutzerfreundlich
2. ✅ Stripe Integration vollständig
3. ✅ Webhook-Handler implementiert
4. ⏳ **Stripe Price IDs eintragen** (siehe Schritt 2)
5. ⏳ **Webhook einrichten** (siehe Schritt 3)
6. ⏳ **Testing durchführen**
7. ⏳ **Live-Keys für Production**

## 🎨 Design-Anpassungen

Das Modal ist bewusst **kompakt** gehalten:
- Max-Width: `sm:max-w-md` (448px)
- Kompakte Progress Bar
- Inline Plan-Details
- Kleine Schriftgrößen für Trust-Elemente

Farben:
- Primary: `#14ad9f` (Teal)
- Beliebt-Badge: Teal mit weißem Text
- Progress Bar: Grün → Orange → Rot

---

**Entwickelt für Taskilo** | Storage Monetization System
