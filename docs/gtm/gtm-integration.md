# Google Tag Manager Integration für TASKILO

## Übersicht

Diese Dokumentation beschreibt die vollständige GTM-Integration für das TASKILO-Projekt mit VS Code-Unterstützung.

## 🚀 Schnellstart

### 1. Extensions installieren

Die folgenden VS Code Extensions sind bereits installiert:

- **Google Analytics Snippets for VS Code** (`clydedsouza.google-analytics-snippets-vscode`)
- **Google Tag Manager editor Support** (`1nvitr0.gtm-editor`)

### 2. GTM-Konfiguration

- **Container ID**: `GTM-TG3H7QHX`
- **GA4 Measurement ID**: `G-WWXT65CVC8`
- **Account ID**: `1022290879475`

### 3. Verfügbare Commands

In VS Code können Sie folgende Commands verwenden:

```
Cmd/Ctrl + Shift + P → "GTM: Validate Configuration"
Cmd/Ctrl + Shift + P → "GTM: Open Tag Manager"
Cmd/Ctrl + Shift + P → "GTM: Debug Mode"
```

## 📁 Dateien-Struktur

```
├── gtm-config.json                 # GTM Container-Konfiguration
├── gtm-setup.md                    # Detaillierte Setup-Anleitung
├── src/
│   └── lib/
│       ├── gtm-events.ts          # Event-Tracking Utilities
│       ├── gtm-debug.ts           # Debugging-Tools
│       └── gtag.ts                # Google Analytics Integration
├── .vscode/
│   ├── gtm-snippets.json         # Code-Snippets für GTM
│   └── gtm-tasks.json            # VS Code Tasks für GTM
```

## 🔧 Code-Snippets

### Verfügbare Snippets (Tab-Completion):

- `gtm-pageview` → Page View Event
- `gtm-form-submit` → Form Submit Event
- `gtm-button-click` → Button Click Event
- `gtm-cookie-consent` → Cookie Consent Event
- `gtm-purchase` → Purchase Event
- `gtm-custom-event` → Custom Event
- `gtm-consent-update` → Consent Update

### Beispiel-Verwendung:

```typescript
import { trackFormSubmit, trackButtonClick } from '@/lib/gtm-events';

// Form Submit tracken
trackFormSubmit('contact_form', 'contact-form-id', '/submit');

// Button Click tracken
trackButtonClick('Jetzt buchen', 'booking-button', 'btn-primary');
```

## 🛠️ Entwicklung

### Debug-Modus aktivieren

```typescript
// In der Browser-Konsole
window.GTMDebugger.isDebugMode(); // false
window.GTMDebugger.logAllEvents(); // Alle Events anzeigen
```

### Tests ausführen

```typescript
// In der Browser-Konsole
window.GTMTestSuite.runAllTests(); // Alle Tests ausführen
```

### Performance überwachen

```typescript
// Performance-Monitoring starten
window.GTMPerformanceMonitor.startMonitoring();

// ... Events auslösen ...

// Performance-Report anzeigen
window.GTMPerformanceMonitor.stopMonitoring();
```

## 📊 Verfügbare Events

### Standard-Events

1. **Page View** (`page_view`)
2. **Form Submit** (`form_submit`)
3. **Button Click** (`button_click`)
4. **Cookie Consent** (`cookie_consent`)
5. **Purchase** (`purchase`)
6. **Add to Cart** (`add_to_cart`)
7. **Begin Checkout** (`begin_checkout`)

### TASKILO-spezifische Events

1. **Service Booking** (`service_booking`)
2. **Provider Registration** (`provider_registration`)
3. **Search** (`search`)
4. **Chat Interaction** (`chat_interaction`)
5. **Video Play** (`video_play`)
6. **Newsletter Signup** (`newsletter_signup`)

## 🔍 Debugging

### URL-Parameter für Debug-Modus

```
http://localhost:3000/?gtm_debug=1
```

### Browser-Konsole Commands

```javascript
// GTM-Status prüfen
GTMDebugger.isGTMLoaded();

// Alle Events anzeigen
GTMDebugger.logAllEvents();

// Spezifische Events anzeigen
GTMDebugger.logEventsByName('page_view');

// DataLayer exportieren
GTMDebugger.exportDataLayer();
```

## 📈 Analytics Dashboard

### Schnellzugriff auf Dashboards

- **GTM Container**: [Tag Manager](https://tagmanager.google.com/#/container/accounts/1022290879475/containers/GTM-TG3H7QHX/workspaces/1/overview)
- **GA4 Property**: [Analytics Dashboard](https://analytics.google.com/analytics/web/#/p424084042/reports/home)

### Wichtige Metriken

- Seitenaufrufe
- Formularbearbeitungen
- Button-Klicks
- Cookie-Einwilligungen
- Service-Buchungen

## 🔐 Datenschutz & Consent

### Consent Mode V2

Die Integration unterstützt Google Consent Mode V2:

```typescript
// Consent-Status aktualisieren
gtag('consent', 'update', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  functionality_storage: 'granted',
  personalization_storage: 'granted',
  security_storage: 'granted'
});
```

### Cookie-Kategorien

- **Analytics**: GA4-Tracking
- **Marketing**: Werbung und Remarketing
- **Functional**: Funktionale Cookies
- **Personalization**: Personalisierung
- **Security**: Sicherheit (immer aktiv)

## 🚀 Deployment

### Vor dem Deployment

1. GTM-Konfiguration validieren
2. Debug-Modus testen
3. Events testen
4. Performance prüfen

### Nach dem Deployment

1. GTM-Container veröffentlichen
2. GA4-Events überwachen
3. Consent-Mode prüfen
4. Performance-Metriken überwachen

## 🆘 Troubleshooting

### Häufige Probleme

1. **GTM lädt nicht**: Prüfen Sie die Container-ID
2. **Events werden nicht gesendet**: Debug-Modus aktivieren
3. **Consent Mode funktioniert nicht**: Cookie-Banner prüfen
4. **Performance-Probleme**: Event-Häufigkeit reduzieren

### Hilfe-Resources

- [GTM Dokumentation](https://developers.google.com/tag-manager)
- [GA4 Dokumentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Consent Mode V2](https://developers.google.com/tag-platform/security/consent-mode)

## 📞 Support

Bei Problemen mit der GTM-Integration:

1. Debug-Modus aktivieren
2. Browser-Konsole prüfen
3. DataLayer exportieren
4. Performance-Report erstellen
