# Stripe Storage Products - Created on 10. Oktober 2025

## ✅ Created Products & Prices

### 1. 5 GB Dokumentenspeicher
- **Product ID**: `prod_TD4OSjgjj7DjsT`
- **Price ID**: `price_1SGeFID5Lvjon30abB9nNcVv`
- **Amount**: €9.99/month
- **Metadata**: 
  - `storage_gb`: 5
  - `plan_id`: 5gb
  - `type`: storage_subscription

### 2. 20 GB Dokumentenspeicher (Beliebt)
- **Product ID**: `prod_TD4OExHJjhjQFM`
- **Price ID**: `price_1SGeFID5Lvjon30aXeWvMTFz`
- **Amount**: €29.99/month
- **Metadata**: 
  - `storage_gb`: 20
  - `plan_id`: 20gb
  - `type`: storage_subscription

### 3. 50 GB Dokumentenspeicher
- **Product ID**: `prod_TD4OZLCKogaUF8`
- **Price ID**: `price_1SGeFJD5Lvjon30ajjw5jvAE`
- **Amount**: €59.99/month
- **Metadata**: 
  - `storage_gb`: 50
  - `plan_id`: 50gb
  - `type`: storage_subscription

### 4. 100 GB Dokumentenspeicher
- **Product ID**: `prod_TD4OjkUHhBsgZi`
- **Price ID**: `price_1SGeFKD5Lvjon30a0J2wVLmy`
- **Amount**: €99.99/month
- **Metadata**: 
  - `storage_gb`: 100
  - `plan_id`: 100gb
  - `type`: storage_subscription

---

## 🔧 Stripe Dashboard Links (Test Mode)

- [Products](https://dashboard.stripe.com/test/products)
- [Prices](https://dashboard.stripe.com/test/prices)
- [Subscriptions](https://dashboard.stripe.com/test/subscriptions)
- [Webhooks](https://dashboard.stripe.com/test/webhooks)

---

## ⚠️ WICHTIG: Webhook einrichten

### Schritt 1: Webhook erstellen
1. Gehe zu: https://dashboard.stripe.com/test/webhooks
2. Klicke auf "Add endpoint"
3. **Endpoint URL**: `https://taskilo.de/api/storage/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Schritt 2: Webhook Secret hinzufügen
Nach dem Erstellen des Webhooks:
1. Klicke auf den erstellten Webhook
2. Kopiere den "Signing secret" (beginnt mit `whsec_`)
3. Füge ihn zu `.env.local` hinzu:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

---

## 🧪 Test-Kreditkarten

Für Testing in Test Mode:
- **Erfolgreich**: `4242 4242 4242 4242`
- **Zahlung erforderlich**: `4000 0025 0000 3155`
- **Abgelehnt**: `4000 0000 0000 9995`

Beliebige Daten für:
- CVC: 3-stellige Zahl
- Ablaufdatum: Zukünftiges Datum
- Postleitzahl: Beliebig

---

## 🚀 Production Deployment

Wenn du auf Production umstellst:

1. **Live Products erstellen**:
   ```bash
   # Stripe Dashboard auf Live Mode umschalten
   # Script erneut ausführen mit Live Keys
   STRIPE_SECRET_KEY="sk_live_..." node scripts/setup-stripe-storage-plans.js
   ```

2. **Live Webhook einrichten**:
   - URL: `https://taskilo.de/api/storage/webhook`
   - Gleiche Events wie Test Mode
   - Neuen Signing Secret in Production Environment Variables

3. **Environment Variables aktualisieren**:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_live_..."
   ```

---

**Status**: ✅ Test Mode aktiv und bereit zum Testen
**Nächster Schritt**: Webhook einrichten (siehe oben)
