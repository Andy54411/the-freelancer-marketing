# Real-Time Payment & Webhook Monitoring System

## Übersicht

Das neue Payment & Webhook Monitoring System bietet vollständige Echtzeit-Überwachung aller Stripe-Aktivitäten mit erweiterten Debugging- und Monitoring-Funktionen.

## Features

### 🔄 Real-Time Monitoring
- **Live Payment Tracking**: Überwachung aller Zahlungen von Haupt- und Connected Accounts
- **Webhook Health Monitoring**: Echtzeit-Status aller Webhook-Zustellungen
- **System Health Dashboard**: API-Latenz, Fehlerrate und Account-Status
- **Auto-Refresh**: Automatische Updates alle 30 Sekunden

### 💳 Vollständige Stripe Connect Integration
- **Multi-Account Support**: Daten von Hauptkonto + allen Connected Accounts
- **Account-Spezifische Anzeige**: Klare Unterscheidung zwischen Haupt- und Connected Accounts
- **Comprehensive Data Coverage**: 
  - Events, Payment Intents, Charges
  - Transfers, Payouts, Balance Transactions
  - Invoices, Subscriptions, Customers
  - Setup Intents, Refunds, Disputes
  - Application Fees

### 🎯 Webhook Management
- **Webhook Event Tracking**: Vollständige Übersicht aller Webhook-Events
- **Status Monitoring**: Delivered, Failed, Pending, Retrying
- **Error Analysis**: Detaillierte Fehleranalyse und Retry-Information
- **Test Functionality**: Manuelle Webhook-Tests und Retry-Funktionen
- **Health Scoring**: Automatische Webhook-Gesundheitsbewertung

### 📊 Advanced Analytics
- **Real-Time Metrics**: Live-Statistiken für Payments und Webhooks
- **Financial Overview**: Umsatzvolumen, Durchschnittswerte, Erfolgsraten
- **System Performance**: API-Latenz, Error-Rate, Uptime-Monitoring
- **Account Health**: Status aller Connected Accounts

### 🛠 Debug & Troubleshooting
- **Debug Logs**: Zentrale Sammlung aller System-Logs
- **Error Tracking**: Detaillierte Fehleranalyse mit Kontext
- **Performance Monitoring**: API-Response-Zeiten und Bottleneck-Identifikation
- **Data Export**: CSV-Export für alle Daten

## API Endpunkte

### `/api/admin/payments`
Vollständige Stripe Connect Payment-Daten
```typescript
GET /api/admin/payments?date=24h&status=all&search=&limit=100
```

**Response:**
```json
{
  "events": [...],
  "stripeDataSources": {
    "mainAccount": { "events": 45, "paymentIntents": 23, ... },
    "connectedAccounts": {
      "total": 3,
      "accounts": [...]
    }
  }
}
```

### `/api/admin/webhooks`
Webhook-Monitoring und -Management
```typescript
GET /api/admin/webhooks?date=24h&status=all
POST /api/admin/webhooks { "action": "test-webhook" }
```

**Response:**
```json
{
  "events": [...],
  "stats": {
    "total": 156,
    "delivered": 148,
    "failed": 3,
    "pending": 5
  },
  "health": {
    "score": 95,
    "status": "excellent"
  }
}
```

### `/api/admin/monitoring`
Real-Time System Monitoring
```typescript
GET /api/admin/monitoring?realtime=true&interval=5min
POST /api/admin/monitoring { "action": "health-check" }
```

**Response:**
```json
{
  "metrics": {
    "timestamp": "2025-07-30T...",
    "payments": { "total": 45, "successful": 42, ... },
    "webhooks": { "healthScore": 95, ... },
    "accounts": { "main": {...}, "connected": {...} },
    "system": { "apiLatency": 245, "errorRate": 2.1 }
  },
  "alerts": [...],
  "health": { "overall": "excellent" }
}
```

## Frontend Features

### Tabs
1. **Stats**: Real-Time System Health + klassische Statistiken
2. **Payments**: Alle Zahlungsereignisse mit Account-Information
3. **Connect Accounts**: Übersicht aller Stripe Connect Accounts
4. **Webhooks**: Webhook-Events und -Management
5. **Debug Logs**: System-Logs und Fehleranalyse

### Real-Time Controls
- **Live Toggle**: Ein/Aus-Schalter für Echtzeit-Monitoring
- **Status Indicator**: Live, Connecting, Error, Offline
- **Auto-Refresh**: Automatische Updates mit visueller Anzeige
- **Manual Refresh**: Sofortige Datenaktualisierung

### Payment Event Display
- **Account Badges**: Haupt-Account vs Connected Account Kennzeichnung
- **Raw Stripe Data**: Vollständige Stripe-Objektdaten für Debugging
- **Enhanced Metadata**: Erweiterte Metadaten je nach Objekttyp
- **Error Details**: Detaillierte Fehlermeldungen und Kontextinformationen

## Real-Time Monitor (JavaScript)

Das `RealTimeMonitor` System (public/real-time-monitor.js) bietet:

- **Endpoint Monitoring**: Überwachung mehrerer API-Endpunkte
- **Error Handling**: Automatische Retry-Logik mit Backoff
- **Event System**: Custom Events für Integration
- **Health Checks**: Regelmäßige Gesundheitsprüfungen
- **Visibility API**: Pausierung bei inaktiven Tabs

```javascript
// Verwendung
const monitor = window.RealTimeMonitor;
monitor.startMonitoring('/api/admin/payments', (data, error) => {
  if (error) {
    console.error('Update failed:', error);
    return;
  }
  updateUI(data);
}, 30000);
```

## Deployment & Setup

### Umgebungsvariablen
```env
STRIPE_SECRET_KEY=sk_live_... # oder sk_test_...
```

### Stripe Connect Setup
1. Aktiviere Stripe Connect in deinem Stripe Dashboard
2. Konfiguriere Webhook-Endpunkte für Haupt- und Connected Accounts
3. Stelle sicher, dass alle benötigten Scopes konfiguriert sind

### Webhook Configuration
Empfohlene Webhook-Events:
```
payment_intent.*
charge.*
transfer.*
payout.*
invoice.*
customer.*
account.*
connect.*
```

## Monitoring & Alerts

### Health Scores
- **Excellent**: ≥95% Erfolgsrate
- **Good**: 85-94% Erfolgsrate  
- **Warning**: 70-84% Erfolgsrate
- **Critical**: <70% Erfolgsrate

### Automatische Alerts
- Webhook-Gesundheit <80%
- API-Latenz >5000ms
- Fehlerrate >10%
- Connected Account Probleme

## Troubleshooting

### Häufige Probleme
1. **Webhook Failures**: Prüfe Endpunkt-URLs und SSL-Zertifikate
2. **Connected Account Errors**: Verificiere Account-Berechtigungen
3. **API Latency**: Optimiere Datenbank-Queries und Stripe-Calls
4. **Real-Time Issues**: Prüfe Browser-Console für JavaScript-Fehler

### Debug-Informationen
- Alle Stripe-API-Calls werden geloggt
- Raw Stripe-Daten verfügbar für Deep-Debugging
- Performance-Metriken für jeden Request
- Detaillierte Error-Traces mit Kontext

## Performance Optimierung

### Backend
- Parallele API-Calls zu Stripe
- Effiziente Datenfilterung
- Optimierte Datenbank-Queries

### Frontend
- Lazy Loading von Tabs
- Virtuelle Scrolling für große Listen
- Smart Re-rendering mit React

### Real-Time
- Adaptive Polling-Intervalle
- Intelligent Error Recovery
- Background Tab Optimization

## Sicherheit

- Stripe API-Keys sicher gespeichert
- Webhook-Signatur-Verification
- Admin-Zugriff beschränkt
- Sensitive Daten gefiltert

---

**🎉 Das System ist jetzt vollständig einsatzbereit für umfassende Payment & Webhook Überwachung!**
