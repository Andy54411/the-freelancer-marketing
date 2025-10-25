# WhatsApp Business QR-Code Verbindung

## Übersicht

Die neue WhatsApp-Integration in Taskilo ermöglicht es Unternehmen, direkt mit ihrer WhatsApp Business Nummer zu kommunizieren - **OHNE die Web-App zu öffnen**.

## Features

- **QR-Code Verbindung**: Scannen mit WhatsApp Business statt Web-App
- **Eigene Nummer**: Nutze deine firmen-spezifische WhatsApp Business Nummer
- **In-App Chat**: Schreibe und empfange Nachrichten direkt in Taskilo
- **Nachrichtenhistorie**: Alle Konversationen werden in Firestore gespeichert
- **Deutsche Compliance**: GoBD-konform mit fortlaufender Speicherung

## Ablauf

### 1. Erste Verbindung

1. Öffne **WhatsApp > Einstellungen** 
2. Gehe zu **Chat** → **Chat-Verlauf**
3. In Taskilo: Klicke auf **QR-Code generieren**
4. Scanne mit WhatsApp Business
5. Bestätige die Verbindung

### 2. Nachrichten senden

Nach erfolgreicher Verbindung:
1. Wähle einen Kontakt aus der Liste
2. Gib deine Nachricht ein
3. Drücke Enter oder klicke Send
4. Nachricht wird via deine WhatsApp Business Nummer versendet

### 3. Verbindung verwalten

- **Status**: Zeigt deine verbundene Nummer und Status
- **Trennen**: Beendet die Verbindung (über Status-Button)
- **Neue QR**: Kann jederzeit neu generiert werden

## Technische Details

### Firestore Schema

```typescript
// Verbindungsstatus
companies/{companyId}/whatsappConnection/current
{
  companyId: string;
  phoneNumber: string;        // "+4912345678"
  isConnected: boolean;
  qrCode?: string;           // Data URL (2 min. gültig)
  connectedAt?: ISO8601;
  expiresAt?: ISO8601;
  lastQrGeneratedAt?: ISO8601;
}

// Nachrichten
companies/{companyId}/whatsappMessages/{messageId}
{
  companyId: string;
  customerId?: string;
  customerName?: string;
  customerPhone: string;
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  body: string;
  createdAt: Timestamp;
}
```

### API Routes

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/whatsapp/generate-qr` | POST | QR-Code generieren |
| `/api/whatsapp/connection` | GET | Verbindungsstatus laden |
| `/api/whatsapp/disconnect` | POST | Verbindung trennen |
| `/api/whatsapp/send` | POST | Nachricht senden (Meta API) |

### Service Methods

```typescript
// Verbindung laden
const connection = await WhatsAppService.getConnection(companyId);

// Nachrichten laden
const messages = await WhatsAppService.getCustomerMessages(companyId, customerId);

// Verbindung speichern
await WhatsAppService.saveConnection(companyId, phoneNumber);

// Trennen
await WhatsAppService.disconnectConnection(companyId);
```

## Fehlerbehandlung

### QR-Code Fehler

| Fehler | Ursache | Lösung |
|--------|--------|--------|
| "QR-Code abgelaufen" | > 2 Minuten alt | Neuen QR-Code generieren |
| "Firebase nicht verfügbar" | Server-Problem | Seite neu laden |
| "Validierungsfehler" | Ungültige Eingabe | Prüfe Company ID |

### Nachrichten Fehler

| Fehler | Ursache | Lösung |
|--------|--------|--------|
| "Kunde hat keine Nummer" | Phone-Feld leer | Nummer im Kundenprofil hinzufügen |
| "Nachricht konnte nicht gesendet werden" | Meta API Fehler | Status prüfen, später erneut versuchen |

## Integration mit bestehenden Services

### Mit CustomerService

```typescript
// Nur Kunden mit Telefonnummer anzeigen
const customersWithPhone = customers.filter(c => c.phone && c.phone.trim() !== '');
```

### Mit Invoice Service

```typescript
import { WhatsAppNotificationService } from '@/services/whatsapp-notifications.service';

// Nach Rechnungserstellung
await WhatsAppNotificationService.notifyInvoicePaid(
  companyId,
  companyName,
  customerId,
  customerName,
  customerPhone,
  invoiceNumber,
  total
);
```

## Deutsche Steuerkonformität

- **GoBD**: Alle Nachrichten werden mit Timestamp gespeichert
- **Audit Trail**: Soft Delete Pattern - Nachrichten werden nicht gelöscht
- **Datenschutz**: Nur verifizierte Nummern speichern
- **Opt-In**: Kunden müssen WhatsApp-Kontakt bestätigen

## Troubleshooting

### QR-Code wird nicht angezeigt

1. Browser-Cache leeren (Ctrl+Shift+Del)
2. Seite neu laden (F5)
3. Andere Browser versuchen

### Verbindung wird nicht gespeichert

1. Firebase-Verbindung prüfen
2. Firestore-Regeln kontrollieren
3. Browser-Konsole auf Fehler prüfen (F12)

### Nachrichten werden nicht empfangen

1. WhatsApp Web noch geöffnet? (Schließen)
2. Nur eine WhatsApp-Session gleichzeitig möglich
3. Browser-Tabs mit WhatsApp Web schließen

## Best Practices

1. **Nur eine Session**: Schließe WhatsApp Web bevor du die Nummer in Taskilo verbindest
2. **Regelmäßig verbinden**: Verbindung läuft nach 24h ab (WhatsApp Web Standard)
3. **Fehler prüfen**: Konsole öffnen (F12) um Fehler zu sehen
4. **Backup**: Exportiere Nachrichten regelmäßig
5. **Datenschutz**: Informiere Kunden über WhatsApp-Kommunikation

## Nächste Schritte

- [ ] Webhook für automatische eingehende Nachrichten
- [ ] Batch-Messaging (Newsletter)
- [ ] Message Templates (Vorlagen)
- [ ] Analytics (Nachrichten-Statistiken)
- [ ] Mobile App Integration
