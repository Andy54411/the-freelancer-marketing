# Escrow System Deployment Guide

## Deployment Reihenfolge

### 1. Firestore Rules (KRITISCH)
Die Escrow-Collection braucht Sicherheitsregeln.

```bash
cd /Users/andystaudinger/Tasko
firebase deploy --only firestore:rules
```

**Prüfpunkt:** Die Regeln für `/escrows/{escrowId}` müssen deployed sein.

---

### 2. Firestore Indexes (BEREITS DEPLOYED)
Die Composite-Indexes für Escrow-Queries wurden bereits deployed.

```bash
# Falls nötig erneut deployen:
firebase deploy --only firestore:indexes
```

**Indexes:**
- `escrows: status + clearingEndsAt` (für Payout-Query)
- `escrows: buyerId + createdAt`
- `escrows: providerId + createdAt`

---

### 3. Firebase Functions (KRITISCH)
Die Cloud Functions für Auto-Payouts müssen deployed werden.

```bash
cd /Users/andystaudinger/Tasko/firebase_functions
pnpm build
cd ..
firebase deploy --only functions:scheduledAutoPayouts,functions:triggerAutoPayouts,functions:scheduledClearingRelease,functions:triggerClearingReleaseManually
```

**Functions:**
- `scheduledAutoPayouts` - Läuft täglich um 06:00 für Auszahlungen
- `triggerAutoPayouts` - Manueller HTTP-Trigger für Tests
- `scheduledClearingRelease` - Läuft täglich um 02:00 für Clearing
- `triggerClearingReleaseManually` - Manueller HTTP-Trigger

---

### 4. Vercel Deployment (Next.js App)
Die Escrow-API und UI-Komponenten.

```bash
# Push to GitHub triggers auto-deploy, oder:
vercel --prod
```

**Deployed Files:**
- `/src/app/api/payment/escrow/route.ts`
- `/src/components/EscrowPaymentComponent.tsx`
- `/src/services/payment/EscrowService.ts`
- Alle aktualisierten Pages (BestaetigungsPage, Order-Seiten, etc.)

---

### 5. Hetzner Backend (Revolut Integration) - OPTIONAL FÜR ERSTE TESTS

Das Payment-Backend auf mail.taskilo.de für echte Revolut-Auszahlungen.

```bash
# SSH auf Hetzner Server
ssh root@mail.taskilo.de

cd /app/webmail-proxy
git pull origin main
pnpm install
pnpm build
pm2 restart webmail-proxy
```

**Benötigte Umgebungsvariablen auf Hetzner:**
```env
REVOLUT_CLIENT_ID=xxx
REVOLUT_ENVIRONMENT=sandbox  # oder 'production'
REVOLUT_CERTS_DIR=/app/certs/revolut
PAYMENT_API_KEY=xxx
```

**Revolut Zertifikate:**
Die Transport-Zertifikate müssen in `/app/certs/revolut/` liegen:
- `transport.pem`
- `private.key`

---

## Deployment Commands (Quick Reference)

```bash
# 1. Alles auf einmal (außer Hetzner)
cd /Users/andystaudinger/Tasko

# Firestore Rules + Indexes
firebase deploy --only firestore

# Firebase Functions (nur Escrow-relevante)
cd firebase_functions && pnpm build && cd ..
firebase deploy --only functions:scheduledAutoPayouts,functions:triggerAutoPayouts,functions:scheduledClearingRelease,functions:triggerClearingReleaseManually

# Vercel (automatisch bei git push, oder manuell)
git add -A
git commit -m "Deploy Escrow System"
git push origin main
```

---

## Live Test Workflow

Nach Deployment:

1. **Erstelle Test-Auftrag:**
   - Gehe zu `/auftrag/get-started/[kategorie]/BestaetigungsPage`
   - Klicke auf "Jetzt bezahlen"
   - Escrow wird erstellt

2. **Simuliere Zahlung (Admin):**
   ```bash
   # Manuell in Firestore Console:
   # - Finde den Escrow in /escrows
   # - Setze status: "held"
   # - Setze heldAt: Timestamp
   # - Setze clearingEndsAt: Timestamp (14 Tage später)
   ```

3. **Teste Auto-Payout:**
   ```bash
   # Trigger manuell:
   curl -X POST https://europe-west1-tilvo-f142f.cloudfunctions.net/triggerAutoPayouts \
     -H "Authorization: Bearer $(gcloud auth print-identity-token)"
   ```

4. **Prüfe Logs:**
   ```bash
   firebase functions:log --only scheduledAutoPayouts
   ```

---

## Environment Variables Checklist

### Vercel (Production)
- [x] NEXT_PUBLIC_FIREBASE_* (bereits konfiguriert)
- [ ] PAYMENT_BACKEND_URL=https://mail.taskilo.de
- [ ] WEBMAIL_API_KEY (für Backend-Kommunikation)

### Firebase Functions
- [ ] PAYMENT_BACKEND_URL
- [ ] PAYMENT_API_KEY

### Hetzner (mail.taskilo.de)
- [ ] REVOLUT_CLIENT_ID
- [ ] REVOLUT_ENVIRONMENT
- [ ] REVOLUT_CERTS_DIR

---

## Rollback Plan

Falls Probleme auftreten:

```bash
# Firebase Functions zurückrollen
firebase functions:delete scheduledAutoPayouts --region europe-west1 --force

# Vercel zurückrollen
vercel rollback

# Firestore Rules zurückrollen (vorherige Version)
firebase firestore:rules:get > firestore.rules.backup
# Dann alte Version deployen
```
