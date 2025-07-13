# Google Analytics Integration - Taskilo

## 🚀 Setup & Konfiguration

### 1. Google Analytics 4 (GA4) einrichten

1. **Google Analytics Account erstellen/verwenden**:
   - Gehe zu [Google Analytics](https://analytics.google.com)
   - Erstelle ein neues Property für `taskilo.de`
   - Wähle "GA4" als Property-Typ

2. **Tracking ID kopieren**:
   - Die Tracking ID hat das Format `G-XXXXXXXXXX`
   - Diese findest du unter: Admin → Property → Data Streams → Web

3. **Umgebungsvariable setzen**:
   ```bash
   # In .env.local und Vercel
   NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
   ```

### 2. Vercel Deployment

```bash
# Umgebungsvariable in Vercel setzen
vercel env add NEXT_PUBLIC_GA_ID
```

## 📊 Verfügbare Analytics Events

### Standard Events
- **Page Views**: Automatisch getrackt
- **User Registration**: `trackUserRegistration()`
- **Login**: `trackLogin()`
- **Navigation**: `trackNavigation()`

### Taskilo-spezifische Events
- **Order Creation**: `trackOrderCreation(category, subcategory, value)`
- **Provider Registration**: `trackProviderRegistration(type)`
- **Feature Usage**: `trackFeatureUsage(feature, action)`
- **Search**: `trackSearch(term, category)`
- **Contact Interactions**: `trackContactInteraction(type)`

## 🔧 Verwendung in Komponenten

### Mit useAnalyticsContext Hook
```tsx
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

function MyComponent() {
  const { trackEvent, trackNavigation } = useAnalyticsContext();
  
  const handleClick = () => {
    trackEvent('button_click', 'user_interaction', 'header_cta');
    trackNavigation('registration', 'header');
  };
  
  return <button onClick={handleClick}>Registrieren</button>;
}
```

### Mit useAnalytics Hook (direkt)
```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackOrderCreation } = useAnalytics();
  
  const handleOrderSubmit = (order) => {
    trackOrderCreation(order.category, order.subcategory, order.value);
  };
}
```

## 📈 Enhanced Ecommerce

### Order/Purchase Tracking
```tsx
const { trackPurchase } = useAnalytics();

trackPurchase('order_12345', 150.00, [
  {
    item_id: 'handwerk_001',
    item_name: 'Badezimmer Renovierung',
    category: 'Handwerk',
    quantity: 1,
    price: 150.00
  }
]);
```

## 🎯 Custom Events für Taskilo

### Registrierung Events
```tsx
// Company Registration Step 1 abgeschlossen
trackEvent('registration_step_completed', 'registration', 'company_step_1');

// Provider wird aktiv
trackProviderRegistration('company');
```

### Business Events
```tsx
// Auftrag erstellt
trackOrderCreation('Handwerk', 'Renovierung', 500);

// Chat-Interaktion
trackContactInteraction('chat');

// Suche durchgeführt
trackSearch('Elektriker Berlin', 'Handwerk');
```

## 🔍 Google Analytics Dashboard

### Wichtige Reports zu überwachen:
1. **Acquisition**: Woher kommen die Benutzer?
2. **Engagement**: Welche Seiten/Features werden am meisten genutzt?
3. **Conversions**: Registrierungen, Aufträge, Provider-Anmeldungen
4. **Real-time**: Live Aktivität auf der Website

### Custom Conversions einrichten:
1. GA4 → Events → Create Custom Event
2. Wichtige Events markieren als "Conversions":
   - `sign_up`
   - `task_order_created`
   - `provider_registration`
   - `purchase`

## 🛡️ Datenschutz & DSGVO

Die Integration ist DSGVO-konform konfiguriert:
- ✅ `anonymize_ip: true`
- ✅ `cookie_flags: 'SameSite=None;Secure'`
- ✅ Client-side only (NEXT_PUBLIC_ prefix)

### Cookie Consent Integration
Für vollständige DSGVO-Konformität sollte ein Cookie-Banner implementiert werden, der GA4 erst nach Zustimmung lädt.

## 📱 Mobile App Tracking

Für zukünftige Mobile Apps (React Native):
- Firebase Analytics SDK verwenden
- Gleiche Event-Struktur beibehalten
- Cross-Platform Reporting in GA4

## 🔧 Debugging

### Google Analytics DebugView
1. Chrome Extension: "Google Analytics Debugger" installieren
2. GA4 → Admin → DebugView aktivieren
3. Events in Echtzeit überwachen

### Console Logs
```tsx
// Events werden automatisch geloggt (nur in development)
console.log('GA Event:', { action, category, label, value });
```

## 🚀 Deployment Checklist

- [ ] `NEXT_PUBLIC_GA_ID` in Vercel gesetzt
- [ ] GA4 Property erstellt und konfiguriert
- [ ] Custom Events als Conversions markiert
- [ ] Real-time Tracking getestet
- [ ] Mobile Responsiveness geprüft
- [ ] Cookie Consent implementiert (optional)

## 📊 KPIs für Taskilo

### User Acquisition
- Neue Benutzer pro Tag/Woche/Monat
- Traffic-Quellen (Organic, Paid, Social, Direct)
- Conversion Rate von Besuchern zu Registrierungen

### User Engagement
- Seiten pro Session
- Session Duration
- Bounce Rate
- Feature Usage (Suche, Chat, etc.)

### Business Metrics
- Anzahl erstellter Aufträge
- Provider-Registrierungen
- Order Value Distribution
- Geographic Distribution

### Conversion Funnel
1. Homepage Besuch
2. Service-Kategorie Auswahl
3. Registrierung gestartet
4. Registrierung abgeschlossen
5. Erster Auftrag erstellt

Mit dieser umfassenden Analytics-Integration können Sie das Nutzerverhalten detailliert verfolgen und datenbasierte Entscheidungen für das Wachstum von Taskilo treffen.
