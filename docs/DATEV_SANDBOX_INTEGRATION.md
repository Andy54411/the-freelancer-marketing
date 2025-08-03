# DATEV Sandbox Integration - Taskilo Platform

## 🔧 Vollständiger DATEV OAuth 2.0 + PKCE Workflow

Diese Dokumentation beschreibt die korrekte Implementierung der DATEV-Integration für die Taskilo-Plattform mit den offiziellen Sandbox-Endpunkten und Testdaten.

## 📋 Schritt 1: DATEV Developer Portal Setup

### Organisation und App-Erstellung
1. **DATEV Developer Portal**: Anmeldung unter https://developer.datev.de
2. **Organisation beitreten**: Teil einer Organisation mit DATEV-Beraternummer werden
3. **App erstellen**: Neue App mit aussagekräftigem Namen anlegen
4. **Redirect URI**: `https://taskilo.de/api/datev/callback` konfigurieren
5. **API-Produkte abonnieren**:
   - `cashregister:import v2.6.0`
   - `master-data:master-clients v3`
   - `accounting:extf-files v2.0`
   - `accounting:dxso-jobs v2.0`
   - `accounting:documents v2.0`

### Sandbox Credentials (bereits konfiguriert)
```env
DATEV_CLIENT_ID=6111ad8e8cae82d1a805950f2ae4adc4
DATEV_CLIENT_SECRET=8caca150047703ca73ab6f9a789482ec
NODE_ENV=development # Für Sandbox
```

## 🔐 Schritt 2: OAuth 2.0 Authorization Code Flow + PKCE

### Phase 1: Autorisierungsanfrage

#### PKCE-Generierung (automatisch)
- **Code Verifier**: 128 Zeichen, URL-safe
- **Code Challenge**: SHA256-Hash + Base64-URL-Encoding
- **Challenge Method**: `S256` (DATEV-Standard)

#### Authorization URL
```
POST /api/datev/auth-url
{
  "companyId": "test-company-123"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://login.datev.de/openidsandbox/authorize?...",
  "state": "company:test-company-123:1722658800000:abc123...",
  "timestamp": "2025-08-03T10:00:00.000Z"
}
```

#### Authorization URL Parameter
- `response_type=code`
- `client_id=6111ad8e8cae82d1a805950f2ae4adc4`
- `redirect_uri=https://taskilo.de/api/datev/callback`
- `scope=openid profile account_id email`
- `code_challenge=<generiert>`
- `code_challenge_method=S256`
- `state=<eindeutig>`
- `nonce=<zufällig>`

### Phase 2: Benutzer-Login (Sandbox)

#### Sandbox-Testdaten
- **Benutzername**: `Test6`
- **Passwort**: `bTomu4cTKg`
- **Login-URL**: https://login.datev.de/openidsandbox/authorize

#### Consent (Zustimmung)
Nach dem Login stimmt der Benutzer den angeforderten Berechtigungen zu.

### Phase 3: Token-Austausch

#### Callback-Handling
```
GET /api/datev/callback?code=<auth_code>&state=<state>
```

#### Token-Request (automatisch)
```http
POST https://sandbox-api.datev.de/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

grant_type=authorization_code
&code=<authorization_code>
&redirect_uri=https://taskilo.de/api/datev/callback
&code_verifier=<original_code_verifier>
&client_id=6111ad8e8cae82d1a805950f2ae4adc4
```

#### Token-Response
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "openid profile account_id email"
}
```

## 🔧 Schritt 3: API-Aufrufe

### Authentifizierte Requests
```http
GET https://sandbox-api.datev.de/platform-sandbox/accounting/v2.0/documents
Authorization: Bearer <access_token>
X-Requested-With: XMLHttpRequest
Accept: application/json
```

### Verfügbare Sandbox-Endpunkte

#### User & Organization
- `GET /userinfo` - Benutzerinformationen
- `GET /platform/v1/organizations` - Organisationen

#### Accounting APIs (subscribed)
- `GET /accounting/v2.0/documents` - Buchungsbelege
- `GET /accounting/v2.0/extf-files` - EXTF-Dateien
- `GET /accounting/v2.0/dxso-jobs` - DXSO-Jobs
- `GET /master-data/v3/master-clients` - Mandantenstammdaten
- `POST /cashregister/v2.6.0/import` - Kassenbuch-Import

### Token Refresh (automatisch)
```http
POST https://sandbox-api.datev.de/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

grant_type=refresh_token
&refresh_token=<refresh_token>
&client_id=6111ad8e8cae82d1a805950f2ae4adc4
```

## 🧪 Sandbox-Testszenarien

### Consultant & Client Numbers
- **Berater-Nummer**: `455148`
- **Mandanten-Nummern**: `1-6` (für Tests)
- **Vollberechtigt**: Nur Mandant `455148-1` (Rechnungsdatenservice 1.0)

### Rechnungsdatenservice 1.0 Spezialfall
```javascript
// Nur Client 455148-1 hat volle Berechtigungen
const clientValidation = validateSandboxClientPermissions('455148-1');
console.log(clientValidation.hasFullPermissions); // true
```

### Implementierte Endpunkte

#### 1. Auth URL Generation
```bash
POST https://taskilo.de/api/datev/auth-url
{
  "companyId": "test-company-123"
}
```

#### 2. OAuth Callback
```bash
GET https://taskilo.de/api/datev/callback?code=...&state=...
```

#### 3. API Testing (existierende Route)
```bash
GET https://taskilo.de/api/datev/test?action=config
```

## 🛡️ Sicherheitsaspekte

### PKCE (Proof Key for Code Exchange)
- ✅ Code Verifier: 128 Zeichen, kryptographisch sicher
- ✅ Code Challenge: SHA256 + Base64-URL-Encoding
- ✅ Challenge Method: `S256`
- ✅ State Parameter: CSRF-Schutz
- ✅ Nonce: Replay-Attack-Schutz

### DATEV-spezifische Anforderungen
- ✅ `X-Requested-With: XMLHttpRequest` Header (MANDATORY)
- ✅ Basic Authentication für Token-Endpunkt
- ✅ Sandbox vs. Production Endpunkte
- ✅ Client-Secret sichere Übertragung

### Token-Management
- ✅ Access Token: 15 Minuten Gültigkeit
- ✅ Refresh Token: Automatisches Erneuern
- ✅ Secure Storage: PKCE-Daten temporär gespeichert
- ✅ Token Revocation: Logout-Funktionalität

## 📊 Live Testing Workflow

### 1. Auth URL generieren
```bash
curl -X POST https://taskilo.de/api/datev/auth-url \
  -H "Content-Type: application/json" \
  -d '{"companyId":"test-company-123"}'
```

### 2. Browser-Login
1. URL aus Response kopieren
2. Im Browser öffnen
3. Login mit `Test6` / `bTomu4cTKg`
4. Consent erteilen

### 3. Callback-Verarbeitung
Automatische Weiterleitung zu:
```
https://taskilo.de/dashboard/company/setup/datev?datev_auth=success&company=test-company-123
```

### 4. API-Zugriff testen
Nach erfolgreichem OAuth können alle API-Produkte getestet werden.

## 🔗 Wichtige Links

- **DATEV Developer Portal**: https://developer.datev.de
- **Sandbox Discovery**: https://login.datev.de/openidsandbox/.well-known/openid-configuration
- **Production Discovery**: https://login.datev.de/openid/.well-known/openid-configuration
- **API Documentation**: DATEV Developer Portal → API Products

## ⚠️ Production Deployment

Für Production folgende Anpassungen:
1. `NODE_ENV=production` setzen
2. Production Client-ID/Secret verwenden
3. Secure Token Storage implementieren
4. Error Handling erweitern
5. Logging für Audit-Trails

---

**Status**: ✅ Vollständig implementiert und getestet
**Letzte Aktualisierung**: 3. August 2025
