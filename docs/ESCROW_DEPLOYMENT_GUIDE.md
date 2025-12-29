# Escrow System Deployment Guide

## Deployment Status (Stand: 29.12.2025)

### ✅ VOLLSTÄNDIG DEPLOYED

| Komponente | Status | Datum |
|------------|--------|-------|
| Firestore Rules | ✅ Deployed | 29.12.2025 |
| Firestore Indexes | ✅ Deployed | 29.12.2025 |
| Firebase Functions | ✅ Deployed | 29.12.2025 |
| Vercel (Next.js) | ✅ Deployed | 29.12.2025 |
| Hetzner Payment Backend | ✅ Deployed | 29.12.2025 |
| Revolut Zertifikate | ✅ Konfiguriert | 29.12.2025 |
| Revolut API Credentials | ✅ Eingerichtet | 29.12.2025 |
| Nginx Proxy Config | ✅ Konfiguriert | 29.12.2025 |

### ✅ ALLE PROBLEME GELÖST

| Problem | Status | Lösung |
|---------|--------|--------|
| Cloudflare Block | ✅ Gelöst | OAuth Authorization Code Flow implementiert |
| Revolut Business API | ✅ Funktioniert | Access Token über OAuth erhalten |
| Automatische Auszahlungen | ✅ Bereit | Token wird automatisch erneuert |

**Status:** Das Escrow-System ist vollständig funktionsfähig!
- Revolut Business API verbunden
- Alle Konten erreichbar
- Auszahlungen können ausgeführt werden

---

## Deployment Details

### 1. ~~Firestore Rules~~ ✅ ERLEDIGT
Die Escrow-Collection Regeln sind live.

### 2. ~~Firestore Indexes~~ ✅ ERLEDIGT
Indexes deployed:
- `escrows: status + clearingEndsAt` (für Payout-Query)
- `escrows: buyerId + createdAt`
- `escrows: providerId + createdAt`

### 3. ~~Firebase Functions~~ ✅ ERLEDIGT
Functions deployed:
- `scheduledAutoPayouts` - Läuft täglich um 06:00
- `triggerAutoPayouts` - HTTP-Trigger für Tests
- `scheduledClearingRelease` - Läuft täglich um 02:00
- `triggerClearingReleaseManually` - HTTP-Trigger

### 4. ~~Vercel Deployment~~ ✅ ERLEDIGT
Deployed Files:
- `/src/app/api/payment/escrow/route.ts`
- `/src/components/EscrowPaymentComponent.tsx`
- `/src/services/payment/EscrowService.ts`
- Alle aktualisierten Pages

---

## ~~Hetzner Backend~~ ✅ ERLEDIGT

Das Payment-Backend auf mail.taskilo.de ist vollständig konfiguriert:
- Docker Container läuft auf Port 3100
- Nginx Proxy leitet `/api/payment/` weiter
- Revolut API funktioniert

**Konfigurierte Umgebungsvariablen:**
- [x] REVOLUT_CLIENT_ID
- [x] REVOLUT_ENVIRONMENT=production
- [x] REVOLUT_ACCESS_TOKEN
- [x] REVOLUT_REFRESH_TOKEN
- [x] Alle Zertifikate in `/opt/taskilo/webmail-proxy/certs/revolut/`

---

## Quick Reference Commands

```bash
# Firebase Datenbank bereinigen (für Tests)
cd /Users/andystaudinger/Tasko
npx tsx scripts/cleanup-firebase.ts

# Hetzner Container neustarten
ssh root@mail.taskilo.de "cd /opt/taskilo/webmail-proxy && docker compose restart webmail-proxy"

# Revolut API testen
curl -s -H "X-API-Key: 2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076" \
  https://mail.taskilo.de/api/payment/accounts | jq .
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

## Environment Variables ✅ ALLES KONFIGURIERT

### Vercel (Production)
- [x] NEXT_PUBLIC_FIREBASE_*
- [x] REVOLUT_CLIENT_ID
- [x] REVOLUT_ENVIRONMENT=production
- [x] REVOLUT_PRIVATE_KEY (Base64)
- [x] WEBMAIL_API_KEY

### Hetzner (mail.taskilo.de)
- [x] REVOLUT_CLIENT_ID
- [x] REVOLUT_ENVIRONMENT=production
- [x] REVOLUT_ACCESS_TOKEN
- [x] REVOLUT_REFRESH_TOKEN
- [x] Alle Zertifikate

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
