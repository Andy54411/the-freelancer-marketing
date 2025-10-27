# LeadTable Reverse Engineering Guide

## Ziel
Herausfinden, wie LeadTable WhatsApp Business API technisch implementiert

## Test-Account
- URL: https://portal.lead-table.com/
- Test-Account vorhanden ✅

---

## 1. Network Analysis Checklist

### Browser DevTools Setup
```bash
# Chrome/Firefox
Cmd + Option + I (Mac)
Ctrl + Shift + I (Windows/Linux)

# Wechsle zu Network Tab
# Filter: Fetch/XHR
# Preserve log aktivieren
```

### Wichtige Endpoints zu dokumentieren

#### WhatsApp Connection Flow
- [ ] `POST /api/whatsapp/connect` - Initial connection request
- [ ] `GET /api/whatsapp/oauth/callback` - OAuth callback handler
- [ ] `POST /api/whatsapp/setup` - Setup nach OAuth
- [ ] `GET /api/whatsapp/status` - Connection status check

**Zu dokumentieren:**
```json
// Request Headers
{
  "Authorization": "Bearer xxx",
  "Content-Type": "application/json"
}

// Request Payload
{
  "code": "oauth_code_from_meta",
  "agencyId": "xxx",
  "clientId": "yyy"
}

// Response
{
  "wabaId": "xxx",
  "phoneNumberId": "yyy",
  "accessToken": "EAA...",
  "status": "connected"
}
```

#### Message Sending Flow
- [ ] `POST /api/whatsapp/send` - Send message endpoint
- [ ] `GET /api/whatsapp/messages` - Fetch messages
- [ ] `POST /api/whatsapp/templates/send` - Send template message

#### Webhook Flow
- [ ] URL wo Webhooks hin gehen
- [ ] Payload Struktur von Meta
- [ ] Response Struktur

---

## 2. Meta Business Manager Inspection

### Zugriff auf Meta Settings
1. Nach WhatsApp Verbindung gehe zu: https://business.facebook.com/wa/manage/
2. Wähle die verbundene WABA
3. Dokumentiere:

**WABA Details:**
```
WABA ID: _______________
Phone Number ID: _______________
App ID: 3871620746489351 (aus OAuth URL bekannt)
Config ID: 1070128328239797 (aus OAuth URL bekannt)
```

**Webhook Configuration:**
- [ ] Webhook URL: `_______________`
- [ ] Verify Token: `_______________` (falls sichtbar)
- [ ] Subscribed Events: messages, message_status, ...

**Permissions:**
- [ ] whatsapp_business_messaging
- [ ] whatsapp_business_management
- [ ] business_management
- [ ] Weitere: _______________

**Solution Provider Status:**
- [ ] Ist LeadTable als BSP registriert?
- [ ] Oder nutzen sie Embedded Signup wie wir?

---

## 3. Frontend Code Analysis

### JavaScript Bundle Inspection

**Sources Tab in DevTools:**
```bash
# Suche in allen Files nach:
Cmd + Shift + F (Mac)
Ctrl + Shift + F (Windows)

# Search terms:
- "whatsapp"
- "sendMessage"
- "template"
- "webhook"
- "accessToken"
```

**Interessante Code-Patterns:**
```javascript
// API Calls dokumentieren
const sendWhatsAppMessage = async (...) => {
  // Implementation hier
}

// State Management
const [whatsappConnection, setWhatsappConnection] = useState(...)

// Firestore/Database Calls
collection(db, 'agencies', agencyId, 'clients', clientId, 'whatsappMessages')
```

---

## 4. Database Structure Reverse-Engineering

### Firestore Collections (falls sichtbar)

**Erwartete Struktur:**
```
/agencies/{agencyId}
  /clients/{clientId}
    /whatsappConnection
      - wabaId
      - phoneNumberId
      - accessToken
      - status
    /whatsappMessages/{messageId}
      - from
      - to
      - body
      - timestamp
      - status
    /whatsappTemplates/{templateId}
      - name
      - language
      - body
```

**Alternative: API-based (kein Firestore):**
```
/api/agencies/{agencyId}/clients
/api/clients/{clientId}/whatsapp/messages
/api/clients/{clientId}/whatsapp/connection
```

---

## 5. Template System Analysis

### Template Creation Flow
1. Gehe zu Templates Sektion in LeadTable
2. Erstelle Test-Template
3. Dokumentiere Network Call:

```http
POST /api/whatsapp/templates
Content-Type: application/json

{
  "name": "test_template",
  "language": "de",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hallo {{1}}, willkommen bei {{2}}!"
    }
  ]
}
```

### Template Sending
```http
POST /api/whatsapp/send
{
  "to": "+491234567890",
  "type": "template",
  "template": {
    "name": "test_template",
    "language": {
      "code": "de"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Max" },
          { "type": "text", "text": "Firma XYZ" }
        ]
      }
    ]
  }
}
```

---

## 6. Pricing & Limits Testing

### Multi-Number Test
- [ ] Verbinde erste WhatsApp Nummer → Kosten: €38/Monat?
- [ ] Versuche zweite Nummer → Direkt möglich?
- [ ] Limitierung sichtbar?

### Message Limits
- [ ] Sende 10 Nachrichten → Throttling?
- [ ] Sende 50 Nachrichten → Rate Limit Error?
- [ ] Template vs. Free-form Messages → Unterschied?

---

## 7. Architecture Patterns zu dokumentieren

### Multi-Tenancy Model
```
Agency (LeadTable User)
  ├─ Client 1
  │   └─ WhatsApp Number A (€38/month)
  ├─ Client 2
  │   └─ WhatsApp Number B (€38/month)
```

**Vs. Unser Model:**
```
Company 1 (Taskilo User)
  └─ WhatsApp Number A (free feature)

Company 2 (Taskilo User)
  └─ WhatsApp Number B (free feature)
```

### Access Control
- [ ] Agency Admin → Sieht alle Client Chats?
- [ ] Client User → Sieht nur eigene Chats?
- [ ] Permissions Model dokumentieren

---

## 8. Key Findings Template

### OAuth & Setup
- **Meta App ID:** 3871620746489351
- **Config ID:** 1070128328239797
- **API Version:** v19.0
- **Embedded Signup:** ✅ Ja / ❌ Nein
- **BSP Status:** ✅ Ja / ❌ Nein

### API Architecture
- **Backend Framework:** (Node.js/Python/Go?)
- **Database:** (Firestore/PostgreSQL/MongoDB?)
- **Hosting:** (Vercel/AWS/GCP?)
- **Webhook Pattern:** (Push/Pull?)

### WhatsApp Integration
- **Template Approval:** Automatisch / Manuell via Meta
- **24h Window Tracking:** ✅ Ja / ❌ Nein
- **Message Delivery Status:** ✅ Ja / ❌ Nein
- **Media Support:** Bilder/PDFs/Audio?

### Features wir nicht haben
1. _______________
2. _______________
3. _______________

### Features die wir besser machen
1. _______________
2. _______________
3. _______________

---

## 9. Comparison Matrix

| Feature | LeadTable | Taskilo (aktuell) | Gap Analysis |
|---------|-----------|-------------------|--------------|
| Multi-Tenant | B2B2C (Agency→Client) | B2C (Direct) | Different business model |
| OAuth Flow | Embedded Signup | Embedded Signup | ✅ Same |
| Template Selector | ✅ Yes | ❌ No | Need to implement |
| 24h Window | ? (to check) | ❌ No | Need to implement |
| Automated Messages | ✅ Yes | ⚠️ Partial | Enhance automation |
| Team Inbox | ✅ Yes | ✅ Yes | ✅ Same |
| Lead-Chat Link | ✅ Yes | ✅ Yes (Customer-based) | ✅ Same |
| Pricing | €38/number/month | Free feature | Monetization opportunity? |

---

## 10. Next Steps

### Immediate Actions
1. [ ] Verbinde WhatsApp Nummer in LeadTable Test-Account
2. [ ] Dokumentiere kompletten OAuth Flow via Network Tab
3. [ ] Sende Test-Nachrichten und dokumentiere API Calls
4. [ ] Prüfe Meta Business Manager für Webhook URL
5. [ ] Analysiere Template System

### Implementation für Taskilo
1. [ ] Template Message Selector UI bauen
2. [ ] 24h Customer Service Window Tracking
3. [ ] Automatisierte Nachrichten System
4. [ ] Bessere Error Handling & Status Anzeige
5. [ ] Message Delivery Status Tracking

### Optional: Monetization
1. [ ] Überlegen: WhatsApp als Premium Feature? (€X/Monat)
2. [ ] Oder: Inklusive im Abo, aber mit Message-Limits?
3. [ ] Oder: Pay-per-Conversation Model wie Meta?

---

## Notizen

*(Hier während der Analyse Notizen hinzufügen)*

