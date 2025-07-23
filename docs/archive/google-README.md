# Google Integration für Taskilo

Dieses Verzeichnis enthält alle Google-bezogenen Integrationen und Konfigurationen für das Taskilo-Projekt.

## 📁 Struktur

```
google/
├── gtm/                    # Google Tag Manager Integration
│   ├── configs/           # GTM-Konfigurationsdateien
│   ├── scripts/           # GTM-Upload und Management Scripts
│   └── .env.gtm          # GTM-Umgebungsvariablen
└── README.md             # Diese Datei
```

## 🏷️ Google Tag Manager (GTM)

### Konfiguration
- **GTM Container ID**: GTM-TG3H7QHX
- **Numerische Container ID**: 224969531
- **Account ID**: 6304012978
- **Google Analytics 4**: G-WWXT65CVC8

### Verfügbare Configs
- `gtm-dsgvo-triggers-fixed.json` - DSGVO-konforme Cookie-Consent Trigger
- `gtm-erweiterte-tracking-konfiguration-fixed.json` - User Registration & Order Tracking

### Scripts
- `gtm-upload-fixed.js` - Haupt-Upload-Script mit Service Account Auth
- `gtm-debug.js` - Debug-Utilities für GTM API
- `gtm-check-permissions.js` - Permissions-Checker

### Verwendung

1. **Konfiguration hochladen:**
   ```bash
   cd google/gtm
   node scripts/gtm-upload-fixed.js configs/gtm-erweiterte-tracking-konfiguration-fixed.json
   ```

2. **Permissions prüfen:**
   ```bash
   cd google/gtm
   node scripts/gtm-check-permissions.js
   ```

## 🔐 Authentifizierung

Die GTM-Integration verwendet Firebase Service Account Authentication:
- Service Account: `firebase-adminsdk-fbsvc@tilvo-f142f.iam.gserviceaccount.com`
- Key-Datei: `firebase-service-account-key.json` (im Root-Verzeichnis)

## 📊 Tracking Events

### User Registration
```typescript
import { trackUserRegistration } from '@/lib/gtm-erweiterte-events';

trackUserRegistration({
  category: 'kunde', // oder 'dienstleister'
  userId: 'user123',
  email: 'user@example.com',
  registrationMethod: 'email',
  timestamp: new Date().toISOString()
});
```

### Order Creation
```typescript
import { trackOrderCreation } from '@/lib/gtm-erweiterte-events';

trackOrderCreation({
  category: 'reinigung',
  subcategory: 'wohnungsreinigung',
  orderId: 'order123',
  userId: 'user123',
  value: 150,
  currency: 'EUR',
  timestamp: new Date().toISOString()
});
```

## 🛡️ DSGVO-Konformität

Alle Tracking-Events berücksichtigen die Cookie-Consent-Einstellungen:
- Analytics-Consent erforderlich für GTM-Events
- Automatische Consent-Prüfung vor Event-Übertragung
- Lokale Speicherung der Consent-Einstellungen

## 📈 Verfügbare Trigger in GTM

### DSGVO Triggers
- Analytics Consent Gegeben/Verweigert
- Marketing Consent Gegeben/Verweigert
- Cookie Banner Angezeigt/Akzeptiert/Abgelehnt

### User Registration Triggers
- User Registration - Alle Kategorien
- User Registration - Kunde
- User Registration - Dienstleister

### Order Creation Triggers
- Order Created - Alle Kategorien
- Order Created - Reinigung
- Order Created - Garten & Landschaft
- Order Created - Handwerk
- Order Created - Transport & Umzug
- Order Created - IT & Technik
- Order Created - Beratung & Coaching
- Order Created - Gesundheit & Wellness
- Order Created - Sonstiges

## 🔧 Wartung

1. **Neue Trigger hinzufügen:**
   - Konfiguration in `configs/` erstellen
   - Mit `gtm-upload-fixed.js` hochladen
   - In GTM veröffentlichen

2. **Debug-Modus:**
   - `gtm-debug.js` für API-Debugging
   - Console-Logs in Browser-Entwicklertools

3. **Permissions-Probleme:**
   - `gtm-check-permissions.js` ausführen
   - Service Account in GTM-Benutzereinstellungen prüfen
