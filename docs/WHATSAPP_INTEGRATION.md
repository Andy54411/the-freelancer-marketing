# WhatsApp Integration für Taskilo

Vollständige WhatsApp Business Integration mit Meta API.

## 📋 Features

### ✅ Bereits implementiert:

1. **Click-to-Chat Links** (funktioniert SOFORT, €0)
   - Button in Kunden-Profilen
   - Öffnet WhatsApp Web/App
   - Keine Konfiguration nötig

2. **Meta WhatsApp Business API** (optional)
   - In-App Messaging
   - Automatische Benachrichtigungen
   - Chat-Historie in Firestore
   - Webhook für eingehende Nachrichten

3. **Automatische Benachrichtigungen**
   - Rechnung bezahlt
   - Rechnung versendet
   - Mahnungen
   - Terminerinnerungen

## 🚀 Setup (Optional - für In-App Features)

### Schritt 1: Meta Business Manager Account

1. Gehe zu https://business.facebook.com/
2. Erstelle einen Business Manager Account
3. Verifiziere dein Unternehmen

### Schritt 2: WhatsApp Business API einrichten

1. Gehe zu https://developers.facebook.com/
2. Erstelle eine neue App → "Business" → "WhatsApp"
3. Füge WhatsApp Product hinzu
4. Telefonnummer verifizieren

### Schritt 3: Credentials in .env.local

```bash
# Meta WhatsApp Business API
META_WHATSAPP_ACCESS_TOKEN="dein_access_token_hier"
META_WHATSAPP_PHONE_NUMBER_ID="deine_phone_number_id_hier"
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN="taskilo_whatsapp_2024"
```

**Access Token bekommen:**
1. In Meta App → WhatsApp → API Setup
2. Kopiere "Temporary access token" (später: System User Token)
3. Phone Number ID findest du unter "Phone numbers"

### Schritt 4: Webhook einrichten

1. In Meta App → WhatsApp → Configuration
2. Webhook URL: `https://taskilo.de/api/whatsapp/webhook`
3. Verify Token: `taskilo_whatsapp_2024`
4. Subscribe to: `messages`

### Schritt 5: Testen

```bash
# Prüfe Status
curl https://taskilo.de/api/whatsapp/status

# Test-Nachricht (Terminal)
curl -X POST https://taskilo.de/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+4915012345678",
    "message": "Test von Taskilo!"
  }'
```

## 💻 Verwendung im Code

### 1. WhatsApp Button in Kunden-Profile

```tsx
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton';

<WhatsAppButton
  customerPhone={customer.phone}
  customerName={customer.name}
  customerId={customer.id}
  companyId={companyId}
  variant="button" // oder "icon" oder "link"
/>
```

### 2. Programmatisch Nachricht senden

```typescript
import { WhatsAppService } from '@/services/whatsapp.service';

// Nachricht senden
const result = await WhatsAppService.sendMessage(
  companyId,
  '+4915012345678',
  'Hallo von Taskilo!',
  customerId,
  customerName
);

// Oder: Click-to-Chat öffnen
WhatsAppService.openChat('+4915012345678', 'Hallo!');
```

### 3. Automatische Benachrichtigungen

```typescript
import { WhatsAppNotificationService } from '@/services/whatsapp-notifications.service';

// Rechnung bezahlt
await WhatsAppNotificationService.notifyInvoicePaid(
  companyId,
  companyName,
  customerId,
  customerName,
  customerPhone,
  'RE-2024-001',
  1500.00
);

// Mahnung senden
await WhatsAppNotificationService.sendInvoiceReminder(
  companyId,
  companyName,
  customerId,
  customerName,
  customerPhone,
  'RE-2024-001',
  1500.00,
  14 // Tage überfällig
);
```

## 📁 Dateien-Struktur

```
src/
├── services/
│   ├── whatsapp.service.ts                    # Haupt-Service
│   └── whatsapp-notifications.service.ts      # Automatische Benachrichtigungen
├── components/
│   └── whatsapp/
│       └── WhatsAppButton.tsx                 # UI-Komponente
├── lib/
│   └── whatsapp.ts                            # Click-to-Chat Helper
└── app/api/whatsapp/
    ├── send/route.ts                          # Senden via Meta API
    ├── status/route.ts                        # Konfigurations-Check
    └── webhook/route.ts                       # Eingehende Nachrichten
```

## 🔐 Firestore Collections

WhatsApp-Nachrichten werden gespeichert unter:

```
companies/{companyId}/whatsappMessages/
  - messageId: string
  - customerPhone: string
  - customerId: string
  - customerName: string
  - direction: 'inbound' | 'outbound'
  - status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  - body: string
  - createdAt: Timestamp
  - errorMessage?: string
```

## 💰 Kosten

| Anbieter | Kosten pro Nachricht | Setup-Gebühr |
|----------|---------------------|--------------|
| **Meta WhatsApp API** | €0.01 - €0.05 | €0 |
| Click-to-Chat | €0 (kostenlos) | €0 |

### Beispiel-Rechnung:
- 100 Nachrichten/Monat: ~€2-5
- 500 Nachrichten/Monat: ~€10-25
- 1000 Nachrichten/Monat: ~€20-50

## 📱 Integration mit bestehenden Services

### Invoice Service Integration

```typescript
// In src/services/firestoreInvoiceService.ts

import { WhatsAppNotificationService } from '@/services/whatsapp-notifications.service';

static async updateInvoiceStatus(
  companyId: string,
  invoiceId: string,
  status: 'paid' | 'sent'
) {
  // ... existing code ...
  
  // WhatsApp Benachrichtigung senden
  if (status === 'paid' && customer.phone) {
    await WhatsAppNotificationService.notifyInvoicePaid(
      companyId,
      companyName,
      customer.id,
      customer.name,
      customer.phone,
      invoice.invoiceNumber,
      invoice.total
    );
  }
}
```

## 🐛 Troubleshooting

### "WhatsApp nicht konfiguriert"
→ Prüfe `.env.local` - sind `META_WHATSAPP_ACCESS_TOKEN` und `META_WHATSAPP_PHONE_NUMBER_ID` gesetzt?

### Webhook funktioniert nicht
→ Prüfe in Meta App ob Webhook URL korrekt ist und `messages` subscribed ist

### Nachrichten kommen nicht an
→ Prüfe ob Telefonnummer im E.164 Format ist (+491234567890)
→ Prüfe Meta App Status & Limits

### "Click-to-Chat Modus"
→ Normal! System funktioniert ohne Meta API - Nachrichten öffnen WhatsApp direkt

## 🔄 Migration von Twilio (falls vorhanden)

Falls ihr vorher Twilio verwendet habt:

```typescript
// Alt (Twilio)
import TwilioWhatsAppService from '@/services/TwilioWhatsAppService';

// Neu (Meta)
import { WhatsAppService } from '@/services/whatsapp.service';

// API ist identisch - kein Code-Change nötig!
```

## 📞 Support

Bei Fragen:
- Meta WhatsApp Docs: https://developers.facebook.com/docs/whatsapp
- Taskilo Support: support@taskilo.de

---

**Status:** ✅ Production Ready  
**Letzte Aktualisierung:** 22. Oktober 2025
