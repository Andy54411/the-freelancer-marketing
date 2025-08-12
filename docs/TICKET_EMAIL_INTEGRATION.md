# Taskilo Ticket System - E-Mail Integration mit Resend

## 📧 Übersicht

Das Taskilo Ticket-System nutzt **Resend** für vollständige E-Mail-Integration - sowohl für ausgehende Benachrichtigungen als auch für eingehende E-Mails zur Ticket-Erstellung.

## 🚀 Features

### ✅ Ausgehende E-Mails (Implementiert)
- **Ticket erstellt** → Benachrichtigung an Team & Kunden
- **Ticket aktualisiert** → Status-Updates an Beteiligte
- **Neue Kommentare** → Benachrichtigungen an alle Beteiligten
- **Ticket gelöst** → Bestätigung an Kunden
- **Ticket zugewiesen** → Benachrichtigung an Zugewiesenen
- **Ticket wiedereröffnet** → Alert an Team

### 📨 Eingehende E-Mails (Webhook-bereit)
- **Neue Tickets** → E-Mails an support@taskilo.de erstellen automatisch Tickets
- **Antworten** → E-Mails mit #ticket-id im Subject werden als Kommentare hinzugefügt
- **Automatische Kategorisierung** → KI-basierte Zuordnung von Priorität & Kategorie

## 🔧 API-Endpunkte

### `/api/tickets/email` (POST)
Sendet E-Mail-Benachrichtigungen für Ticket-Events

```typescript
{
  "type": "created" | "updated" | "commented" | "resolved" | "reopened" | "assigned",
  "ticket": Ticket,
  "comment"?: TicketComment,
  "assignedTo"?: string,
  "assignedBy"?: string
}
```

### `/api/tickets/webhook` (POST)
Webhook für eingehende E-Mails von Resend

```typescript
// Automatisch von Resend aufgerufen
// Erstellt Tickets aus E-Mails oder fügt Kommentare hinzu
```

## 📋 Setup-Anleitung

### 1. Resend-Konfiguration
```bash
# Environment Variables (bereits konfiguriert)
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_BASE_URL=https://taskilo.de
```

### 2. E-Mail-Domain bei Resend
- Domain: `taskilo.de`
- From-Adresse: `support@taskilo.de`
- Reply-To: `support@taskilo.de`

### 3. Webhook-Setup (Optional)
```bash
# Resend Webhook URL für eingehende E-Mails
https://taskilo.de/api/tickets/webhook
```

## 🎯 Verwendung im Code

### Ticket erstellen mit E-Mail
```typescript
import { TicketEmailService } from '@/lib/ticket-email-service';

// Neues Ticket erstellen
const newTicket = await createTicket(ticketData);

// E-Mail-Benachrichtigung senden
await TicketEmailService.sendTicketCreatedEmail(newTicket);
```

### Status-Änderung mit E-Mail
```typescript
// Ticket-Status ändern
const updatedTicket = await updateTicketStatus(ticketId, 'resolved');

// E-Mail senden
await TicketEmailService.sendTicketResolvedEmail(updatedTicket);
```

### Automatische E-Mail bei Änderungen
```typescript
// Vergleicht alten und neuen Ticket-Status und sendet entsprechende E-Mails
await TicketEmailService.sendTicketChangeEmails(
  oldTicket, 
  newTicket, 
  userEmail
);
```

## 📧 E-Mail-Templates

### Ticket-Erstellungs-E-Mail
- **Subject**: `🎫 Neues Ticket: {title} (#{id})`
- **Template**: Professionell mit Taskilo-Branding
- **CTA**: "Ticket bearbeiten" → Link zum Admin-Dashboard

### Status-Update-E-Mail
- **Subject**: `📝 Ticket aktualisiert: {title} (#{id})`
- **Inhalt**: Status-Änderungen, Zuweisungen, Prioritäts-Updates

### Kommentar-E-Mail
- **Subject**: `💬 Neue Antwort: {title} (#{id})`
- **Inhalt**: Neuer Kommentar mit Antwort-Link

## 🔄 E-Mail-Workflow

```mermaid
graph TD
    A[Kunde sendet E-Mail] --> B[Resend Webhook]
    B --> C[/api/tickets/webhook]
    C --> D{Ticket-ID im Subject?}
    D -->|Ja| E[Kommentar hinzufügen]
    D -->|Nein| F[Neues Ticket erstellen]
    E --> G[Team benachrichtigen]
    F --> H[Bestätigung an Kunden]
    G --> I[E-Mail-Thread continues...]
    H --> I
```

## 🎨 E-Mail-Design

### Branding
- **Hauptfarbe**: `#14ad9f` (Taskilo Türkis)
- **Layout**: Responsive HTML mit Inline-CSS
- **Logo**: Taskilo-Logo in Header
- **CTA-Buttons**: Taskilo-Branding mit Hover-Effekten

### Responsive Design
- Mobile-optimiert
- Inline-CSS für E-Mail-Client-Kompatibilität
- Fallback-Styles für ältere Clients

## ⚙️ Konfiguration

### E-Mail-Einstellungen pro User
```typescript
interface TicketEmailPreferences {
  onCreated: boolean;     // Bei Ticket-Erstellung
  onUpdated: boolean;     // Bei Updates
  onCommented: boolean;   // Bei Kommentaren  
  onResolved: boolean;    // Bei Lösung
  onAssigned: boolean;    // Bei Zuweisung
  userEmail: string;      // User-E-Mail
}
```

### Standard-Empfänger
- **Admin**: `andy.staudinger@taskilo.de`
- **Support**: `support@taskilo.de`
- **Assignee**: Variable je nach Zuweisung
- **Reporter**: Ticket-Ersteller

## 🔒 Sicherheit

### Webhook-Validierung
```typescript
// TODO: Implementierung für Produktion
const isValidSignature = validateResendSignature(
  body, 
  signature, 
  process.env.RESEND_WEBHOOK_SECRET
);
```

### Spam-Schutz
- Rate-Limiting für eingehende E-Mails
- Blacklist für bekannte Spam-Adressen
- Content-Filter für verdächtige Inhalte

## 📊 Monitoring & Analytics

### E-Mail-Tracking
- Zustellungsrate über Resend Dashboard
- E-Mail-Open-Rate (optional)
- Bounce-Rate Monitoring

### Ticket-Metriken
- E-Mail → Ticket Konversionsrate
- Durchschnittliche Antwortzeit
- Kundenzufriedenheit via E-Mail-Follow-up

## 🚀 Nächste Schritte

### Phase 1: Basis-Integration ✅
- [x] E-Mail-Templates erstellt
- [x] API-Endpunkte implementiert
- [x] Service-Klasse für einfache Verwendung

### Phase 2: Erweiterte Features
- [ ] Webhook-Integration aktivieren
- [ ] Automatische Ticket-Kategorisierung
- [ ] E-Mail-Thread-Tracking
- [ ] Signatur-Validierung

### Phase 3: Premium-Features
- [ ] KI-basierte Priority-Detection
- [ ] Multi-Language E-Mail-Templates
- [ ] SLA-basierte Escalation-E-Mails
- [ ] Customer Satisfaction Surveys

## 💡 Best Practices

### E-Mail-Frequency
- Sofortige Benachrichtigung bei kritischen Tickets
- Batching für weniger wichtige Updates
- Digest-E-Mails für tägliche Zusammenfassungen

### Content-Optimierung
- Kurze, prägnante Subject Lines
- Wichtige Informationen im Preview-Text
- Clear Call-to-Action Buttons
- Mobile-First E-Mail-Design

### Deliverability
- Resend's optimierte IP-Reputation nutzen
- SPF/DKIM/DMARC korrekt konfiguriert
- Bounce-Handling implementiert
- Unsubscribe-Links wo erforderlich

---

## 📞 Support

Bei Fragen zur E-Mail-Integration:
- **E-Mail**: andy.staudinger@taskilo.de
- **Dashboard**: https://taskilo.de/dashboard/admin/tickets
- **Resend Dashboard**: https://resend.com/dashboard
