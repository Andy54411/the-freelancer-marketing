# GTM API Upload Workflow - Schritt für Schritt

## 🚀 Schnellstart

### 1. API Setup (Einmalig)
```bash
# Setup ausführen
npm run gtm:setup

# .env.gtm mit Google Cloud Credentials bearbeiten
# Gehen Sie zu: https://console.cloud.google.com/
# Aktivieren Sie die Tag Manager API
# Erstellen Sie OAuth 2.0 Credentials
```

### 2. OAuth Authentifizierung
```bash
# OAuth Flow starten
npm run gtm:auth

# Folgen Sie den Browser-Anweisungen
# Kopieren Sie den Authorization Code
# Führen Sie erneut aus mit dem Code
```

### 3. Trigger Upload
```bash
# Dry Run (Test ohne Upload)
npm run gtm:upload-dry

# Actual Upload
npm run gtm:upload
```

## 🎯 Verfügbare Commands

### VS Code Tasks (Cmd+Shift+P)
- `GTM: Setup API Authentication`
- `GTM: Start OAuth Flow`
- `GTM: Complete OAuth (Enter Code)`
- `GTM: Dry Run Upload`
- `GTM: Upload Triggers to GTM`
- `GTM: Validate Configuration`
- `GTM: Open Tag Manager`

### NPM Scripts
```bash
npm run gtm:setup      # Einmalige API-Konfiguration
npm run gtm:auth       # OAuth-Authentifizierung
npm run gtm:upload-dry # Test-Upload (ohne tatsächlich zu uploaden)
npm run gtm:upload     # Upload der Trigger zu GTM
npm run gtm:validate   # Konfiguration validieren
```

## 📋 DSGVO-Konforme Trigger

### Automatisch erstellte Trigger:
1. **Analytics Consent Trigger** - Feuert nur nach Cookie-Einwilligung
2. **Marketing Consent Trigger** - Nur für Marketing-Cookies
3. **Functional Consent Trigger** - Für funktionale Cookies
4. **Page View mit Consent** - Seitenaufrufe nur mit Einwilligung
5. **Button Click mit Consent** - Button-Klicks nur mit Einwilligung
6. **Form Submit mit Consent** - Formulare nur mit Einwilligung

### Automatisch erstellte Variablen:
- `Analytics Consent Status` - Prüft localStorage auf Analytics-Consent
- `Marketing Consent Status` - Prüft localStorage auf Marketing-Consent
- `Functional Consent Status` - Prüft localStorage auf Functional-Consent
- `Consent Timestamp` - Zeitstempel der Einwilligung

### Automatisch erstellte Tags:
- GA4 Konfiguration (nur mit Consent)
- GA4 Page View (nur mit Consent)
- GA4 Button Click (nur mit Consent)
- GA4 Form Submit (nur mit Consent)
- Cookie Consent Tracking

## 🔧 Anpassungen

### Neue Trigger hinzufügen:
```json
// In gtm-dsgvo-triggers.json
{
  "triggers": {
    "mein_neuer_trigger": {
      "name": "Mein neuer DSGVO-Trigger",
      "type": "CUSTOM_EVENT",
      "customEventFilter": [
        {
          "type": "EQUALS",
          "parameter": [
            {
              "type": "TEMPLATE",
              "key": "arg0",
              "value": "{{Event}}"
            },
            {
              "type": "TEMPLATE",
              "key": "arg1",
              "value": "mein_custom_event"
            }
          ]
        }
      ],
      "description": "Mein neuer Trigger für DSGVO-konforme Events"
    }
  }
}
```

### Neue Variablen hinzufügen:
```json
// In gtm-dsgvo-triggers.json
{
  "variables": {
    "meine_neue_variable": {
      "name": "Meine neue Variable",
      "type": "JAVASCRIPT",
      "code": "function() { return 'mein_wert'; }",
      "description": "Meine neue GTM-Variable"
    }
  }
}
```

## 🔍 Debugging

### Lokale Tests:
```bash
# Entwicklungsserver starten
npm run dev

# Browser öffnen mit Debug-Modus
open "http://localhost:3000/?gtm_debug=1"
```

### Browser-Konsole:
```javascript
// GTM-Status prüfen
window.GTMDebugger.isGTMLoaded();

// Alle Events anzeigen
window.GTMDebugger.logAllEvents();

// Cookie-Consent Status prüfen
localStorage.getItem('cookieConsent');
```

## 🛡️ Sicherheit

### Best Practices:
- `.env.gtm` ist in `.gitignore` - niemals committen!
- OAuth-Tokens haben begrenzte Lebensdauer
- Verwenden Sie minimale Scopes
- Regelmäßige Token-Rotation

### Produktions-Deployment:
1. Testen Sie alle Trigger im Preview-Modus
2. Verwenden Sie GTM-Versionierung
3. Überwachen Sie die Event-Qualität
4. Implementieren Sie Consent-Logging

## 🆘 Troubleshooting

### Häufige Probleme:

#### "OAuth-Token ungültig"
```bash
# Token erneuern
npm run gtm:auth
```

#### "API-Limits erreicht"
```bash
# Warten Sie 1 Minute und versuchen Sie erneut
npm run gtm:upload
```

#### "Trigger wird nicht ausgelöst"
```bash
# Debug-Modus aktivieren
open "http://localhost:3000/?gtm_debug=1"

# In Browser-Konsole prüfen:
window.GTMDebugger.logAllEvents();
```

#### "Cookie-Consent wird nicht erkannt"
```javascript
// In Browser-Konsole prüfen:
localStorage.getItem('cookieConsent');

// Consent manuell setzen für Tests:
localStorage.setItem('cookieConsent', JSON.stringify({
  necessary: true,
  analytics: true,
  marketing: true,
  functional: true,
  personalization: true,
  timestamp: new Date().toISOString()
}));
```

## 📊 Nach dem Upload

### Prüfung im GTM:
1. Öffnen Sie: https://tagmanager.google.com/
2. Wählen Sie Ihren Container (GTM-TG3H7QHX)
3. Überprüfen Sie die Trigger unter "Triggers"
4. Testen Sie im Preview-Modus
5. Veröffentlichen Sie die Änderungen

### Prüfung in GA4:
1. Öffnen Sie: https://analytics.google.com/
2. Gehen Sie zu "Realtime" > "Events"
3. Testen Sie die Cookie-Einwilligung
4. Überprüfen Sie die Event-Parameter

### Langfristige Überwachung:
- Überwachen Sie die Event-Qualität
- Prüfen Sie die Consent-Rate
- Optimieren Sie die Trigger-Performance
- Halten Sie die DSGVO-Compliance im Blick

---

## 🎉 Fertig!

Sie haben jetzt eine vollständige GTM API-Integration mit DSGVO-konformen Triggern!

Die Trigger werden nur ausgelöst, wenn der Benutzer seine Einwilligung gegeben hat.
Alle Events enthalten Consent-Informationen für die Compliance-Dokumentation.
