# Google Ads Integration - Taskilo Platform

## Übersicht

Das Google Ads Integration System von Taskilo ermöglicht es Unternehmen, ihre Google Ads Accounts zu verknüpfen und Kampagnen direkt aus dem Taskilo Dashboard zu verwalten. Das System befindet sich in **PHASE 1** und konzentriert sich auf die Grundlagen-Implementierung mit Account-Verknüpfung und API-Setup.

## Technische Architektur

### 🔧 Core Components

#### 1. Dashboard Page (`/dashboard/company/[uid]/google-ads`)
- **Datei**: `src/app/dashboard/company/[uid]/google-ads/page.tsx`
- **Zweck**: Hauptseite für Google Ads Integration im Company Dashboard
- **Features**:
  - Phase-Status-Badge (PHASE 1: Setup)
  - Success/Error Message Handling
  - OAuth2 Callback Parameter Processing
  - Integration in Taskilo Design System

#### 2. Google Ads Overview Component
- **Datei**: `src/components/google-ads/GoogleAdsOverview.tsx`
- **Zweck**: Hauptkomponente für Google Ads Dashboard mit Account-Verknüpfung
- **Features**:
  - Verbindungsstatus-Monitoring
  - Account-Liste mit Details
  - Entwicklungsstatus-Übersicht
  - Automatische Status-Aktualisierung

#### 3. API Endpoints

##### OAuth2 Authorization (`/api/google-ads/auth`)
- **Datei**: `src/app/api/google-ads/auth/route.ts`
- **Zweck**: Startet OAuth-Flow für Account-Verknüpfung
- **Methoden**: GET, POST
- **Parameter**: `companyId`, `customRedirectUri` (optional)

##### OAuth2 Callback (`/api/google-ads/callback`)
- **Datei**: `src/app/api/google-ads/callback/route.ts`
- **Zweck**: Verarbeitet OAuth-Callback und speichert Tokens
- **Flow**: Code → Token Exchange → Account Fetch → Firestore Storage

##### Connection Status (`/api/google-ads/status`)
- **Datei**: `src/app/api/google-ads/status/route.ts`
- **Zweck**: Prüft Verbindungsstatus und Account-Zugriff
- **Features**: Token-Validation, Account-Info, Quota-Monitoring

#### 4. Core Service
- **Datei**: `src/services/googleAdsService.ts`
- **Zweck**: Zentrale API-Kommunikation mit Google Ads API
- **Features**: OAuth2 Flow, Token Management, API Requests

#### 5. TypeScript Types
- **Datei**: `src/types/googleAds.ts`
- **Zweck**: Umfassende Typen-Definitionen für Google Ads API Integration

## UI/UX Status Definitionen

### Connection Status Types
```typescript
type GoogleAdsServiceStatus = 
  | 'CONNECTED'       // ✅ Erfolgreich verbunden und funktionsfähig
  | 'DISCONNECTED'    // ⚠️ Verbindung getrennt, Neuverbindung erforderlich
  | 'ERROR'           // ❌ Fehler aufgetreten, Benutzeraktion erforderlich
  | 'SYNCING'         // 🔄 Synchronisation läuft
  | 'SETUP_REQUIRED'  // 🛠️ Noch nicht konfiguriert, Ersteinrichtung nötig
```

### Status Visualisierung

#### SETUP_REQUIRED
- **Badge**: Blau (`bg-blue-100 text-blue-800`)
- **Icon**: Settings
- **Action**: "Google Ads verbinden" Button
- **Beschreibung**: OAuth2-Flow starten

#### CONNECTED
- **Badge**: Grün (`bg-green-100 text-green-800`)
- **Icon**: CheckCircle2
- **Display**: Account-Statistics, Letzte Synchronisation, API Quota
- **Actions**: "Verbindung testen", "Status aktualisieren"

#### ERROR
- **Badge**: Rot (`bg-red-100 text-red-800`)
- **Icon**: AlertCircle
- **Display**: Fehler-Details mit Retry-Information
- **Actions**: "Erneut verbinden", "Status prüfen"

#### DISCONNECTED
- **Badge**: Rot (`bg-red-100 text-red-800`)
- **Icon**: AlertCircle
- **Action**: "Neu verbinden" Button
- **Beschreibung**: Verbindung wiederherstellen

## PHASE 1: Implementierte Features

### ✅ Vollständig implementiert

1. **Google Ads API Konfiguration**
   - OAuth2 Client Setup
   - Developer Token Integration
   - API Version v17 Support

2. **OAuth2-Flow für Account-Verknüpfung**
   - Authorization URL Generation
   - Callback Processing
   - Token Exchange & Storage

3. **Token-Management System**
   - Access Token Handling
   - Refresh Token Storage
   - Automatic Token Renewal

4. **Grundlegendes Dashboard**
   - Connection Status Display
   - Account Information
   - Error Handling & User Feedback

### 🔄 Aktuelle Capabilities

- Account-Verknüpfung mit Google Ads
- Verbindungsstatus-Monitoring
- Token-basierte Authentifizierung
- Grundlegende Fehlerbehandlung
- Dashboard-Integration

## PHASE 2: Geplante Features

### 🚧 In Entwicklung (Bald verfügbar)

1. **Kampagnen-Management**
   - Kampagnen erstellen und bearbeiten
   - Budget-Verwaltung
   - Zielgruppen-Setup

2. **Performance Analytics**
   - Detaillierte Berichte
   - Metriken-Dashboard
   - ROI-Tracking

3. **Automatisierung**
   - Automatische Regeln
   - Budget-Optimierung
   - Bid-Management

4. **DATEV Integration**
   - Automatische Buchung von Werbekosten
   - Rechnungs-Export
   - Steuerliche Kategorisierung

## Datenmodell

### Firestore Struktur
```
companies/{companyId}/integrations/googleAds
├── accountConfig: GoogleAdsOAuthConfig
├── linkedAccounts: GoogleAdsAccount[]
├── lastSync: Date
├── status: GoogleAdsServiceStatus
└── quotaUsage: QuotaInfo
```

### Environment Variables
```bash
GOOGLE_ADS_CLIENT_ID=          # OAuth2 Client ID
GOOGLE_ADS_CLIENT_SECRET=      # OAuth2 Client Secret  
GOOGLE_ADS_DEVELOPER_TOKEN=    # Google Ads API Developer Token
NEXT_PUBLIC_BASE_URL=          # Basis-URL für OAuth Redirects
```

## Error Handling

### Error Types
- **AUTHENTICATION**: Token-Probleme, OAuth-Fehler
- **QUOTA_EXCEEDED**: API-Limits erreicht
- **INVALID_REQUEST**: Ungültige API-Anfrage
- **SERVER_ERROR**: Google Ads API Server-Fehler
- **NETWORK_ERROR**: Netzwerk-Verbindungsfehler

### User Feedback
- Spezifische Fehlermeldungen für jeden Error-Type
- Retry-Mechanismus für behebbare Fehler
- Hilfreiche Aktions-Buttons (Neu verbinden, Status prüfen)

## API Quota Management

### Daily Limits
- **Standard Account**: 15,000 Requests/Tag
- **Basic Access**: 15,000 Requests/Tag  
- **Standard Access**: 100,000 Requests/Tag

### Monitoring
- Quota-Usage Display im Dashboard
- Automatische Warnung bei 80% Verbrauch
- Graceful Degradation bei Limit-Erreichen

## Security & Compliance

### Token Security
- Refresh Tokens verschlüsselt in Firestore
- Access Tokens nur im Memory
- Automatic Token Rotation

### Data Privacy
- Minimale Daten-Speicherung
- GDPR-konforme Datenbehandlung
- Opt-in für Account-Verknüpfung

## Testing & Monitoring

### Live Testing
- **Produktions-URL**: `https://taskilo.de/dashboard/company/[uid]/google-ads`
- **Sofortige Tests** nach jeder Änderung
- **Kein lokaler Test** - nur Live-Umgebung

### Monitoring
- Connection Status Tracking
- API Error Logging
- Performance Metriken
- User Action Analytics

## Entwicklungs-Roadmap

### Phase 1 (Aktuell) ✅
- [x] API Setup & OAuth2
- [x] Basic Dashboard
- [x] Account Connection
- [x] Status Monitoring

### Phase 2 (Q1 2024) 🚧
- [ ] Campaign Management
- [ ] Performance Analytics  
- [ ] Basic Automation
- [ ] Reporting System

### Phase 3 (Q2 2024) 📋
- [ ] DATEV Integration
- [ ] Advanced Automation
- [ ] Custom Dashboards
- [ ] White-Label Features

## Support & Troubleshooting

### Häufige Probleme

1. **"Verbindung fehlgeschlagen"**
   - Environment Variables prüfen
   - OAuth2 Credentials validieren
   - Redirect URI konfiguration

2. **"Token Exchange Failed"**
   - Google Ads API Access prüfen
   - Developer Token Status
   - Scopes-Berechtigung

3. **"Account nicht gefunden"**
   - Google Ads Account Status
   - Zugriffsberechtigungen
   - Manager Account Structure

### Debug-Informationen
- Browser Console für Client-Fehler
- Server Logs für API-Probleme
- Firestore Dokument-Status
- OAuth2 Flow Validation

## Code-Konventionen

### Dateien-Struktur
```
src/
├── app/api/google-ads/          # API Routes
├── components/google-ads/       # UI Components
├── services/googleAdsService.ts # Core Service
├── types/googleAds.ts          # TypeScript Types
└── app/dashboard/company/[uid]/google-ads/ # Dashboard Page
```

### Naming Conventions
- **API Routes**: kebab-case (`google-ads`, `callback`)
- **Components**: PascalCase (`GoogleAdsOverview`)
- **Services**: camelCase (`googleAdsService`)
- **Types**: PascalCase (`GoogleAdsAccount`)

### Taskilo Design Integration
- **Primary Color**: `#14ad9f` für alle CTA-Buttons
- **Hover States**: `#129488` als Standard-Hover
- **Status Colors**: Grün (Connected), Rot (Error), Blau (Setup)
- **Shadcn/ui Components**: Card, Button, Badge, Alert

---

**Status**: PHASE 1 - Produktiv verfügbar auf https://taskilo.de  
**Letztes Update**: Dezember 2024  
**Nächste Phase**: Kampagnen-Management & Analytics
