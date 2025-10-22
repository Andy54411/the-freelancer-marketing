# WhatsApp API Setup via Terminal 🚀

## Automatisiertes Setup-Script

Wir haben ein Script erstellt, das **so viel wie möglich automatisiert**!

### Quick Start:

```bash
# Script ausführen
./scripts/setup-whatsapp-api.sh
```

### Was macht das Script?

1. ✅ **Prüft Dependencies** (jq für JSON)
2. ✅ **Holt Access Token** (du musst ihn eingeben)
3. ✅ **Ruft Phone Number ID automatisch ab** (via API)
4. ✅ **Sendet Test-Nachricht** (optional)
5. ✅ **Aktualisiert .env.local** (automatisch)
6. ⚠️ **Webhook-Setup** (Info + Anleitung)

---

## Was KANN per Terminal gemacht werden:

### ✅ Vollständig automatisierbar:

```bash
# 1. Test ob API funktioniert
curl -X GET \
  "https://graph.facebook.com/v18.0/me/phone_numbers" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 2. Test-Nachricht senden
curl -X POST \
  "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "491234567890",
    "type": "text",
    "text": {
      "body": "Test von Taskilo!"
    }
  }'

# 3. Phone Number Info abrufen
curl -X GET \
  "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. Business Account Info
curl -X GET \
  "https://graph.facebook.com/v18.0/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Was NICHT per Terminal geht (Manuell):

### ❌ Erfordert Web-Interface:

1. **App erstellen** - Muss im Facebook Developer Portal gemacht werden
2. **WhatsApp Product hinzufügen** - Nur via Web
3. **Telefonnummer verifizieren** - SMS/Call-Verifizierung via Web
4. **Business Verification** - Dokumente hochladen (nur Web)
5. **Webhook Subscription** - Erste Einrichtung nur via Web

---

## Hybrid-Ansatz (Empfohlen):

### Schritt 1: Einmalig im Browser (5-10 Minuten)

1. Gehe zu https://developers.facebook.com/apps
2. Klicke "Create App" → "Business"
3. App-Name: "Taskilo WhatsApp"
4. Füge Product hinzu: "WhatsApp"
5. Telefonnummer hinzufügen & verifizieren

**→ Kopiere Access Token & Phone Number ID**

### Schritt 2: Rest per Terminal (unser Script)

```bash
./scripts/setup-whatsapp-api.sh
```

Script fragt nach Token & Phone ID und macht den Rest!

---

## Alternative: Meta CLI Tool

Meta hat ein offizielles CLI Tool (experimentell):

```bash
# Installation
npm install -g @facebook/create-meta-app

# Setup
create-meta-app init whatsapp

# Login
create-meta-app login

# Deploy
create-meta-app deploy
```

**⚠️ Aktuell noch Beta!**

---

## Unser Setup-Script im Detail:

### Voraussetzungen:

```bash
# jq für JSON-Parsing
brew install jq

# curl (bereits auf macOS)
```

### Script-Flow:

```
1. Access Token eingeben
   ↓
2. Phone Number ID automatisch abrufen (oder manuell)
   ↓
3. API-Test durchführen
   ↓
4. Optional: Test-Nachricht senden
   ↓
5. .env.local automatisch aktualisieren
   ↓
6. Webhook-Info anzeigen (muss manuell im Portal)
   ↓
7. ✅ Fertig!
```

---

## Trouble

shooting:

### "jq: command not found"
```bash
brew install jq
```

### "Error: Invalid OAuth access token"
- Token ist abgelaufen (nur 24h gültig in Sandbox)
- Neuen Token im Developer Portal generieren

### "Phone Number not found"
- Im Business Manager Nummer hinzufügen
- Dann Script erneut ausführen

### Test-Nachricht kommt nicht an
- Nummer muss im Sandbox registriert sein
- Sandbox: Nur Test-Nummern erlaubt
- Production: Alle Nummern erlaubt (nach Review)

---

## Pro-Tipp: System User Token (dauerhaft)

Temporary Tokens verfallen nach 24h. Für Production:

```bash
# 1. System User erstellen (im Business Manager Web)
# 2. Token generieren (nie abläuft)
# 3. In Script/ENV verwenden
```

Siehe: https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens

---

## Zusammenfassung:

| Aufgabe | Terminal | Web | Unser Script |
|---------|----------|-----|--------------|
| App erstellen | ❌ | ✅ | ❌ |
| Nummer verifizieren | ❌ | ✅ | ❌ |
| Access Token holen | ❌ | ✅ | Eingabe |
| Phone ID abrufen | ✅ | ✅ | ✅ Auto |
| Test-Nachricht | ✅ | ✅ | ✅ Auto |
| .env.local update | ✅ | ❌ | ✅ Auto |
| Webhook setup | ❌ | ✅ | ℹ️ Info |

**→ Unser Script automatisiert ~60% des Setups!**

---

## Quick Commands:

```bash
# Setup starten
./scripts/setup-whatsapp-api.sh

# Status prüfen
curl http://localhost:3000/api/whatsapp/status

# Test-Nachricht (direkt)
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+491234567890", "message": "Test!"}'
```

---

**Fazit:** Teilweise ja - unser Script automatisiert alles was per API geht! 🚀
