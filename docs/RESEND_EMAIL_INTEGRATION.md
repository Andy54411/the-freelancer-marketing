# Resend E-Mail Integration für Taskilo

## Übersicht
Diese Dokumentation beschreibt die vollständige E-Mail-Integration mit Resend für das Taskilo Admin-Dashboard.

## Features
- ✅ E-Mails senden über Resend API
- ✅ Bulk-E-Mail-Versand
- ✅ E-Mail-Templates
- ✅ E-Mail-Status-Tracking
- ✅ Webhook-Integration für Events
- ✅ Kontakt-Verwaltung
- ✅ E-Mail-Statistiken und Analytics

## Umgebungsvariablen

Fügen Sie diese Variable zu Ihrer `.env.local` hinzu:

```bash
# Resend API-Schlüssel
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Konfiguration

### 1. Resend Account Setup
1. Registrieren Sie sich bei [Resend](https://resend.com)
2. Erstellen Sie einen API-Schlüssel
3. Verifizieren Sie Ihre Domain (z.B. taskilo.de)

### 2. Domain-Konfiguration
```bash
# DNS-Einträge für taskilo.de
TXT _resend.taskilo.de "resend-verify=YOUR_VERIFICATION_CODE"
MX taskilo.de "mx.resend.com" (priority 10)
```

### 3. Webhook-Setup
Webhook-URL für Events: `https://taskilo.de/api/webhooks/resend`

Events zu abonnieren:
- `email.sent`
- `email.delivered` 
- `email.bounced`
- `email.complained`

## API-Endpunkte

### E-Mail senden
```
POST /api/admin/emails/send
```

Body:
```json
{
  "to": ["empfaenger@example.com"],
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "subject": "E-Mail Betreff",
  "htmlContent": "<p>HTML-Inhalt</p>",
  "textContent": "Text-Inhalt (optional)"
}
```

### Bulk-E-Mail senden
```
POST /api/admin/emails/bulk-send
```

Body:
```json
{
  "messages": [
    {
      "to": ["user1@example.com"],
      "subject": "Betreff 1",
      "htmlContent": "<p>Inhalt 1</p>"
    },
    {
      "to": ["user2@example.com"],
      "subject": "Betreff 2", 
      "htmlContent": "<p>Inhalt 2</p>"
    }
  ]
}
```

### Template-E-Mail senden
```
POST /api/admin/emails/templates
```

Body:
```json
{
  "templateId": "welcome",
  "to": ["neuer-nutzer@example.com"],
  "variables": {
    "name": "Max Mustermann",
    "company": "Beispiel GmbH"
  }
}
```

### Templates abrufen
```
GET /api/admin/emails/templates
```

## E-Mail-Templates

### Verfügbare Standard-Templates

#### Welcome Template
- **ID**: `welcome`
- **Variablen**: `{{name}}`
- **Verwendung**: Begrüßung neuer Nutzer

#### Support-Ticket Template  
- **ID**: `support-ticket`
- **Variablen**: `{{customerName}}`, `{{ticketId}}`, `{{subject}}`, `{{priority}}`
- **Verwendung**: Support-Ticket-Benachrichtigungen

### Custom Templates erstellen
Templates können über das Admin-Dashboard oder direkt im Code definiert werden.

## Integration im Admin-Dashboard

### Navigation
Das E-Mail-System ist verfügbar unter:
- **Menü**: Admin-Dashboard → E-Mail-Verwaltung
- **URL**: `/dashboard/admin/email-management`

### Tabs
1. **Dashboard**: Statistiken und Übersicht
2. **Posteingang**: Eingehende E-Mails (Webhook-basiert)
3. **Gesendet**: Gesendete E-Mails
4. **Templates**: E-Mail-Template-Verwaltung
5. **Kontakte**: Kontakt-Verwaltung

## Verwendung

### Einzelne E-Mail senden
```typescript
import { emailService } from '@/lib/resend-email-service';

const result = await emailService.sendEmail({
  to: ['kunde@example.com'],
  from: 'noreply@taskilo.de',
  subject: 'Ihr Auftrag ist bereit',
  htmlContent: '<p>Ihr Auftrag wurde abgeschlossen.</p>'
});
```

### Template-E-Mail senden
```typescript
const result = await emailService.sendTemplateEmail(
  'welcome',
  ['neuer-nutzer@example.com'],
  { name: 'Max Mustermann' }
);
```

### Bulk-E-Mail senden
```typescript
const messages = users.map(user => ({
  to: [user.email],
  from: 'noreply@taskilo.de',
  subject: 'Newsletter',
  htmlContent: `<p>Hallo ${user.name}!</p>`
}));

const result = await emailService.sendBulkEmails(messages);
```

## E-Mail-Status-Tracking

### Status-Typen
- `draft`: Entwurf
- `sent`: Gesendet
- `delivered`: Zugestellt
- `bounced`: Nicht zustellbar
- `complained`: Als Spam markiert

### Status abrufen
```typescript
const status = await emailService.getEmailStatus('message-id');
console.log(status.status); // 'delivered'
```

## Webhook-Events

Events werden automatisch verarbeitet und in der Konsole geloggt:

```typescript
// Beispiel Webhook-Event
{
  "type": "email.delivered",
  "data": {
    "messageId": "xxx",
    "to": "empfaenger@example.com",
    "deliveredAt": "2024-01-15T10:30:00Z"
  }
}
```

## Fehlerbehandlung

### Häufige Fehler
1. **Ungültiger API-Schlüssel**: Überprüfen Sie `RESEND_API_KEY`
2. **Domain nicht verifiziert**: Verifizieren Sie Ihre Sender-Domain
3. **Rate-Limiting**: Resend hat API-Limits je nach Plan
4. **Bounce-Behandlung**: Automatische Behandlung von Bounces

### Error-Handling im Code
```typescript
const result = await emailService.sendEmail({...});

if (result.success) {
  console.log('E-Mail gesendet:', result.messageId);
} else {
  console.error('Fehler:', result.error);
}
```

## Sicherheit

### Best Practices
- API-Schlüssel niemals im Frontend verwenden
- Webhook-Endpoints mit Signatur-Verifikation absichern
- Rate-Limiting implementieren
- E-Mail-Adressen validieren

### DSGVO-Konformität
- Einverständnis für Marketing-E-Mails einholen
- Abmelde-Links in allen E-Mails
- Datenverarbeitung dokumentieren

## Monitoring & Analytics

### Metriken
- Gesendete E-Mails
- Zustellrate
- Bounce-Rate
- Spam-Beschwerden
- Öffnungsraten (falls implementiert)

### Dashboard-Statistiken
Das Admin-Dashboard zeigt automatisch:
- Tagesstatistiken
- Erfolgs-/Fehlerquoten
- Top-Empfänger
- Template-Nutzung

## Troubleshooting

### Häufige Probleme

1. **E-Mails kommen nicht an**
   - Domain-Verifikation prüfen
   - SPF/DKIM-Records kontrollieren
   - Spam-Filter berücksichtigen

2. **API-Fehler**
   - API-Schlüssel validieren
   - Rate-Limits prüfen
   - Request-Format kontrollieren

3. **Webhook-Events nicht empfangen**
   - Webhook-URL erreichbar?
   - SSL-Zertifikat gültig?
   - Firewall-Einstellungen

### Debug-Modus
```typescript
// In development
console.log('E-Mail-Debug:', {
  apiKey: process.env.RESEND_API_KEY ? 'Set' : 'Missing',
  environment: process.env.NODE_ENV
});
```

## Weiterführende Dokumentation
- [Resend API Docs](https://resend.com/docs)
- [E-Mail-Best-Practices](https://resend.com/docs/best-practices)
- [Webhook-Integration](https://resend.com/docs/webhooks)
