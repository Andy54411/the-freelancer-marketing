# finAPI SDK Service API Dokumentation

**Version**: 1.1.0  
**Letzte Aktualisierung**: 6. August 2025

## 📚 Service-Übersicht

Der `FinAPISDKService` ist die zentrale Schnittstelle für alle finAPI-Operationen in Taskilo. Er verwaltet Authentifizierung, Benutzer-Management und Banking-Operationen.

## 🔧 Service-Instanziierung

### Standard-Service (Sandbox)
```typescript
import { finapiServiceFixed } from '@/lib/finapi-sdk-service-fixed';

// Verwende den Fixed Service (ohne Emoji-Probleme)
const result = await finapiServiceFixed.testCredentials();
```

### Custom-Service
```typescript
import { createFixedFinAPIService } from '@/lib/finapi-sdk-service-fixed';

const service = createFixedFinAPIService('sandbox');
```

## 🔑 Authentifizierungs-Methoden

### 1. Client Credentials Token
**Zweck**: Für öffentliche API-Calls (Bank-Listing etc.)

```typescript
const token = await service.getClientToken();
// Returns: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Eigenschaften**:
- Automatisches Caching und Refresh
- 90% Sicherheitsmargin vor Ablauf
- Verwendet OAuth2 Client Credentials Grant

### 2. User Access Token
**Zweck**: Für benutzerspezifische Operationen

```typescript
const userToken = await service.getUserToken(userId, password);
// Returns: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Error-Handling**:
- `400 Bad Request`: "Bad credentials" - Benutzer existiert, falsches Passwort
- `401 Unauthorized`: Ungültige Client-Credentials
- `404 Not Found`: Benutzer existiert nicht

## 👤 Benutzer-Management

### 1. Benutzer erstellen

```typescript
const user = await service.createUser(
  'user123',           // finAPI User ID
  'secure_password',   // Passwort
  'user@taskilo.de'    // Optional: E-Mail
);
```

**Return Value**:
```typescript
{
  id: 'user123',
  password: 'XXXXX',  // finAPI versteckt echtes Passwort
  email: 'user@taskilo.de',
  isAutoUpdateEnabled: true
}
```

### 2. Benutzer abrufen oder erstellen

```typescript
const { user, userToken } = await service.getOrCreateUser(
  'user123',
  'secure_password',
  'user@taskilo.de'
);
```

**Verhalten**:
1. Versucht zuerst Authentifizierung bestehender Benutzer
2. Bei Erfolg: Gibt existierenden Benutzer zurück
3. Bei "Bad credentials": Fehler - Benutzer existiert mit anderem Passwort
4. Bei "User not found": Erstellt neuen Benutzer

**Error-Scenarios**:
```typescript
// Benutzer existiert mit anderem Passwort
throw new Error(
  "finAPI user 'user123' exists but authentication failed. " +
  "The user was created with a different password. Since finAPI doesn't allow " +
  "password updates, you need to use a different user ID or contact support."
);
```

## 🏦 Banking-Operationen

### 1. Banken auflisten (öffentlich)

```typescript
const banks = await service.listBanks(
  'Sparkasse',  // Optional: Suchbegriff
  'Germany',    // Optional: Land
  1,           // Seite (Standard: 1)
  20           // Pro Seite (Standard: 20)
);
```

**Return Value**:
```typescript
[
  {
    id: 277672,
    name: 'Sparkasse Musterstadt',
    loginHint: 'Bitte geben Sie Ihre Zugangsdaten ein',
    bic: 'BYLADEM1XXX',
    // ... weitere Bank-Details
  }
]
```

### 2. WebForm 2.0 erstellen

```typescript
const webForm = await service.createBankImportWebForm(
  userToken,     // User-Token erforderlich
  {
    bankId: 277672,                           // Optional: Spezifische Bank
    redirectUrl: 'https://taskilo.de/success', // Redirect nach Erfolg
    callbacks: {
      successCallback: 'https://taskilo.de/api/finapi/success',
      errorCallback: 'https://taskilo.de/api/finapi/error'
    }
  }
);
```

**Return Value**:
```typescript
{
  id: 'webform_123',
  url: 'https://sandbox.finapi.io/webForm?token=...',
  expiresAt: '2025-08-07T10:30:00Z'
}
```

## 🧪 Testing & Debugging

### Credentials testen
```typescript
const test = await service.testCredentials();

// Erfolg
{
  success: true,
  token: "eyJhbGciOiJSUzI1NiIsInR..."
}

// Fehler
{
  success: false,
  error: "Invalid client credentials"
}
```

### Debug-Logging
Der Service verwendet strukturiertes Logging:

```typescript
// Erfolg
console.log('SUCCESS: finAPI user token obtained for:', userId);

// Fehler
console.error('FAILED: Could not get user token for:', userId);
console.error('Error details:', error.body || error.message);

// Info
console.log('INFO: User already exists, will attempt authentication');
```

## ⚠️ Bekannte Einschränkungen

### 1. Passwort-Updates
finAPI erlaubt **keine** Passwort-Updates für bestehende Benutzer:
```typescript
// NICHT MÖGLICH in finAPI
await service.updateUserPassword('user123', 'newPassword');
```

**Workaround**: Neue Benutzer-ID verwenden:
```typescript
const timestamp = Date.now();
const newUserId = `${originalUserId}_${timestamp}`;
```

### 2. Benutzer-Löschung
finAPI erlaubt normalerweise keine Benutzer-Löschung in Sandbox:
```typescript
// Meist nicht verfügbar
await service.deleteUser('user123');
```

### 3. Rate Limiting
finAPI hat API-Rate-Limits:
- Client Credentials: ~50 Requests/Minute
- User Operations: ~30 Requests/Minute
- WebForm Creation: ~10 Requests/Minute

## 🔐 Sicherheits-Hinweise

### 1. Token-Verwaltung
- Client Tokens werden automatisch gecacht und erneuert
- User Tokens haben kürzere Lebensdauer (meist 30 Minuten)
- Tokens niemals im Frontend speichern

### 2. Passwort-Sicherheit
- Verwende starke, einzigartige Passwörter
- Passwörter werden nicht im Service gespeichert
- finAPI hasht und speichert Passwörter sicher

### 3. Environment Variables
```bash
# Immer verwenden:
FINAPI_SANDBOX_CLIENT_ID=your_id
FINAPI_SANDBOX_CLIENT_SECRET=your_secret

# Niemals in Code hardcoden!
```

## 📝 API-Response-Codes

| Code | Bedeutung | Aktion |
|------|-----------|---------|
| 200  | Erfolg | Weiter verarbeiten |
| 400  | Bad Request | Anfrage prüfen, oft "Bad credentials" |
| 401  | Unauthorized | Client-Credentials prüfen |
| 404  | Not Found | Benutzer oder Resource existiert nicht |
| 422  | Unprocessable Entity | Oft bei doppelter Benutzer-Erstellung |
| 429  | Rate Limited | Warten und erneut versuchen |
| 500  | Server Error | finAPI-Problem, später erneut versuchen |

## 🔄 Migration Guide

### Von alter Version zu Fixed Version

1. **Import ändern**:
```typescript
// Alt
import { finapiService } from '@/lib/finapi-sdk-service';

// Neu
import { finapiServiceFixed } from '@/lib/finapi-sdk-service-fixed';
```

2. **Service-Aufrufe anpassen**:
```typescript
// Alt
const result = await finapiService.testCredentials();

// Neu  
const result = await finapiServiceFixed.testCredentials();
```

3. **Error-Handling erweitern**:
```typescript
try {
  const { user, userToken } = await service.getOrCreateUser(userId, password);
} catch (error) {
  if (error.message.includes('exists but authentication failed')) {
    // Benutzer existiert mit anderem Passwort
    // Neue User-ID verwenden oder Support kontaktieren
  }
}
```

---

**Hinweis**: Diese API-Dokumentation wird bei Änderungen am Service automatisch aktualisiert.
