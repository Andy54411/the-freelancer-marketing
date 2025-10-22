# WhatsApp Quick Start 🚀

## ⚡ 5-Minuten Setup (Click-to-Chat)

### Schritt 1: Import Component

```tsx
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton';
```

### Schritt 2: In Kunden-Profil einfügen

```tsx
// z.B. in Kunden-Detailseite
<WhatsAppButton
  customerPhone={customer.phone}
  customerName={customer.name}
  customerId={customer.id}
  companyId={companyId}
  variant="button"
/>
```

### Fertig! ✅

- Funktioniert **sofort** ohne weitere Konfiguration
- Öffnet WhatsApp Web/App beim Klick
- **€0 Kosten**

---

## 🚀 Full Integration (optional, später)

Für In-App Messaging und automatische Benachrichtigungen:

### 1. Environment Variables (.env.local)

```bash
META_WHATSAPP_ACCESS_TOKEN="your_token"
META_WHATSAPP_PHONE_NUMBER_ID="your_phone_id"
META_WHATSAPP_WEBHOOK_VERIFY_TOKEN="taskilo_whatsapp_2024"
```

### 2. Automatische Benachrichtigungen aktivieren

In `src/services/firestoreInvoiceService.ts`:

```typescript
import { WhatsAppNotificationService } from '@/services/whatsapp-notifications.service';

// Bei Rechnung bezahlt
if (status === 'paid' && customer.phone) {
  await WhatsAppNotificationService.notifyInvoicePaid(
    companyId,
    companyData.companyName,
    customer.id,
    customer.name,
    customer.phone,
    invoice.invoiceNumber,
    invoice.total
  );
}
```

### 3. Test

```bash
# Status prüfen
curl http://localhost:3000/api/whatsapp/status

# Test-Nachricht
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+491234567890", "message": "Test!"}'
```

---

## 📍 Wo WhatsApp-Buttons hinzufügen?

### 1. Kunden-Detailseite
```tsx
// In Kontakt-Informationen Sektion
<div className="flex gap-2">
  <Button>E-Mail</Button>
  <WhatsAppButton {...props} variant="button" />
  <Button>Anrufen</Button>
</div>
```

### 2. Kunden-Liste (Actions)
```tsx
// In DropdownMenu
<DropdownMenuItem>
  <WhatsAppButton {...props} variant="link" />
</DropdownMenuItem>
```

### 3. Rechnungs-Detailseite
```tsx
// "Rechnung versenden" Sektion
<WhatsAppButton
  {...props}
  defaultMessage={`Rechnung ${invoiceNumber} über ${total}€`}
/>
```

---

## 🎨 Button-Varianten

```tsx
// Full Button
<WhatsAppButton variant="button" />

// Icon only
<WhatsAppButton variant="icon" />

// Link style
<WhatsAppButton variant="link" />
```

---

## 📊 Beispiel-Integration

```tsx
'use client';

import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton';
import { useParams } from 'next/navigation';

export function CustomerProfile({ customer }: { customer: Customer }) {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <div className="space-y-4">
      <h2>{customer.name}</h2>
      
      <div className="flex gap-2">
        <WhatsAppButton
          customerPhone={customer.phone}
          customerName={customer.name}
          customerId={customer.id}
          companyId={companyId}
          variant="button"
        />
        
        <Button variant="outline">
          E-Mail senden
        </Button>
      </div>
    </div>
  );
}
```

---

## ✅ Checkliste

- [ ] WhatsAppButton Component importiert
- [ ] In Kunden-Profil eingefügt
- [ ] Getestet (sollte WhatsApp öffnen)
- [ ] Optional: Meta API konfiguriert
- [ ] Optional: Automatische Benachrichtigungen aktiviert

**Das war's! 🎉**
