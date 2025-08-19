# CSP (Content Security Policy) Konfiguration für Taskilo

## Überblick

Die neue CSP-Konfiguration behebt die Netzwerkfehler, die in der Browser-Konsole aufgetreten sind. Sie ist professionell strukturiert und wartbar.

## Installierte Tools

```bash
pnpm add csp-header next-secure-headers helmet
```

- **csp-header**: CSP-String-Generierung
- **next-secure-headers**: Next.js Security Headers
- **helmet**: Express-Style Security Headers

## Konfiguration

### Hauptkonfiguration
📁 `next.config.mjs` - Zentrale CSP-Konfiguration

### Backup-Konfiguration
📁 `src/lib/security/csp-config.ts` - TypeScript-basierte CSP-Definitionen

## Domains-Kategorien

### 🔥 Firebase & Google Services
- `*.firebase.com`, `*.firebaseapp.com`, `*.web.app`
- `*.firebasedatabase.app`, `*.firebaseio.com`
- `*.googleapis.com`, `identitytoolkit.googleapis.com`
- `firestore.googleapis.com`, `securetoken.googleapis.com`

### 📊 Google Analytics & Marketing
- `*.google.com`, `*.google.de`
- `*.googletagmanager.com`, `*.google-analytics.com`
- `*.googleadservices.com`, `*.gstatic.com`

### 💳 Payment Services
- `js.stripe.com`, `checkout.stripe.com`
- `api.stripe.com`, `hooks.stripe.com`

### 🌐 CDN & External APIs
- `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`
- `connect.facebook.net`, `va.vercel-scripts.com`

## CSP-Direktiven

| Direktive | Zweck | Erlaubte Quellen |
|-----------|-------|------------------|
| `default-src` | Standard-Fallback | `'self'` |
| `script-src` | JavaScript-Ausführung | `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, Firebase, Stripe, etc. |
| `style-src` | CSS-Styling | `'self'`, `'unsafe-inline'`, Google Fonts, CDNs |
| `img-src` | Bilder | `'self'`, `https:`, `data:`, Firebase, externe APIs |
| `connect-src` | AJAX/Fetch-Anfragen | `'self'`, Firebase, Stripe, Google Analytics |
| `frame-src` | iFrames | `'self'`, Stripe, Google, YouTube |
| `font-src` | Schriftarten | `'self'`, Google Fonts, CDNs |

## Development vs Production

- **Development**: Weniger restriktive Regeln, `localhost:*` erlaubt
- **Production**: Striktere Sicherheitsregeln, nur benötigte Domains

## CSP Monitoring

### Live-Monitoring (Neu!)
- **Hotkey**: `Ctrl + Shift + C` öffnet CSP Monitor
- **Auto-Detection**: Rote Badge bei CSP-Violations
- **Export**: Violations können kopiert werden

### Debugging
```javascript
// Browser-Konsole
document.addEventListener('securitypolicyviolation', (e) => {
  console.log('CSP Violation:', e);
});
```

## Häufige Fixes

### 1. Neue Domain hinzufügen
```javascript
// In next.config.mjs
const NEW_SERVICE_DOMAINS = [
  'https://newservice.com',
  'https://api.newservice.com',
];

// Zu entsprechender Kategorie hinzufügen
const ALL_SCRIPT_SOURCES = [
  // ... existing
  ...NEW_SERVICE_DOMAINS,
];
```

### 2. Firebase Realtime Database Fehler
```javascript
// Bereits behoben durch:
'wss://*.firebaseio.com',
'wss://*.web.app',
'https://*.firebasedatabase.app',
```

### 3. Stripe Payment Fehler
```javascript
// Bereits behoben durch:
'https://js.stripe.com',
'https://checkout.stripe.com',
'https://api.stripe.com',
'https://hooks.stripe.com',
```

## Testing

### 1. Build Test
```bash
pnpm build
```

### 2. Live Test
Nach Deployment auf https://taskilo.de:
- Browser-Konsole prüfen
- CSP Monitor mit `Ctrl + Shift + C` öffnen
- Alle Funktionen testen (Payment, Chat, etc.)

### 3. Automated Testing
```bash
# CSP-Konfiguration validieren
node -e "const config = require('./next.config.mjs'); console.log('✅ CSP Config loaded');"
```

## Troubleshooting

### Problem: CSP Violation
1. `Ctrl + Shift + C` drücken
2. Violation-Details kopieren
3. Blockierte Domain zu entsprechender Kategorie hinzufügen
4. `pnpm build && git push` für Deployment

### Problem: Firebase Connection Failed
- Überprüfe WebSocket-Verbindungen in `connect-src`
- Stelle sicher, dass alle Firebase-Domains inkludiert sind

### Problem: Stripe Payment Issues
- Alle Stripe-Domains müssen in `script-src` und `frame-src` stehen
- `'unsafe-inline'` für Stripe erforderlich

## Migration von alter CSP

### Vorher (next.config.mjs)
- 🚫 Unleserlich lange Zeile
- 🚫 Schwer wartbar
- 🚫 Keine Struktur

### Nachher (Neue Konfiguration)
- ✅ Modulare Struktur
- ✅ Kategorisierte Domains
- ✅ TypeScript-Support
- ✅ Live-Monitoring
- ✅ Development/Production-Modi

## Security Benefits

1. **XSS-Schutz**: Blockiert unerlaubte Skripte
2. **Data Exfiltration**: Verhindert unerlaubte Datenübertragung
3. **Clickjacking**: `frame-ancestors 'none'`
4. **Mixed Content**: Nur HTTPS-Ressourcen erlaubt
5. **Monitoring**: Real-time Violation Detection

## Performance Impact

- **Build Time**: Keine Änderung
- **Runtime**: Minimaler Overhead durch CSP-Header
- **Monitoring**: Nur bei Development/Debugging aktiv
- **Caching**: Header werden gecacht

## Support

Bei Problemen:
1. CSP Monitor prüfen (`Ctrl + Shift + C`)
2. Browser-Konsole checken
3. Violation-Details sammeln
4. Domain zur Konfiguration hinzufügen

## Updates

### Version 1.0.0 (19.08.2025)
- ✅ Initiale professionelle CSP-Konfiguration
- ✅ Firebase Realtime Database Support
- ✅ Stripe Payment Integration
- ✅ Live CSP-Monitoring
- ✅ Development/Production-Modi

---

🚀 **Deployment-Status**: Live auf https://taskilo.de
🛡️ **Security-Level**: Production-Ready
📊 **Monitoring**: Aktiv mit Real-Time Violations Detection
