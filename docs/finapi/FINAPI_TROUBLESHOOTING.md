# finAPI Troubleshooting Guide

**Letzte Aktualisierung**: 6. August 2025

## 🚨 Häufige Probleme und Lösungen

### Problem 1: "Bad user credentials" Fehler

**Symptom**:
```
Error 400: Bad user credentials
```

**Ursachen und Lösungen**:

#### Ursache A: Benutzer existiert bereits mit anderem Passwort
```typescript
// Fehlerhafte Anfrage
const { user, userToken } = await service.getOrCreateUser('user123', 'wrongPassword');
```

**Lösung**: Neue Benutzer-ID verwenden
```typescript
const timestamp = Date.now();
const newUserId = `user123_${timestamp}`;
const { user, userToken } = await service.getOrCreateUser(newUserId, 'newPassword');
```

#### Ursache B: Ungültige Client-Credentials
**Prüfung**:
```typescript
const credentialTest = await service.testCredentials();
if (!credentialTest.success) {
  console.error('Client credentials invalid:', credentialTest.error);
}
```

**Lösung**: Environment Variables prüfen
```bash
# .env.local
FINAPI_SANDBOX_CLIENT_ID=your_correct_id
FINAPI_SANDBOX_CLIENT_SECRET=your_correct_secret
```

### Problem 2: WebForm wird nicht angezeigt

**Symptom**:
```
WebForm URL wird erstellt, aber Seite ist leer oder zeigt Fehler
```

**Debug-Schritte**:

1. **User Token prüfen**:
```typescript
try {
  const userToken = await service.getUserToken(userId, password);
  console.log('User token valid:', userToken.substring(0, 20));
} catch (error) {
  console.error('User token invalid:', error.message);
}
```

2. **WebForm-Parameter prüfen**:
```typescript
const webForm = await service.createBankImportWebForm(userToken, {
  redirectUrl: 'https://taskilo.de/success', // Muss gültige URL sein
  callbacks: {
    successCallback: 'https://taskilo.de/api/finapi/success',
    errorCallback: 'https://taskilo.de/api/finapi/error'
  }
});

console.log('WebForm URL:', webForm.url);
console.log('Expires at:', webForm.expiresAt);
```

3. **URL manuell testen**:
```typescript
// WebForm URL in Browser öffnen und Netzwerk-Tab prüfen
console.log('Test this URL directly:', webForm.url);
```

### Problem 3: Emoji-Zeichen in Code verursachen Edit-Fehler

**Symptom**:
```
replace_string_in_file: Could not find matching text to replace
```

**Ursache**: Emoji-Zeichen (🔑, ✅, ❌) in Console.log-Statements

**Lösung**: Bereinigten Service verwenden
```typescript
// Verwende immer die Fixed Version
import { finapiServiceFixed } from '@/lib/finapi-sdk-service-fixed';
```

### Problem 4: Rate Limiting Fehler

**Symptom**:
```
Error 429: Too Many Requests
```

**Sofort-Lösung**:
```typescript
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithDelay<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delayMs = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${delayMs}ms before retry ${i + 1}`);
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Verwendung
const result = await retryWithDelay(() => service.getOrCreateUser(userId, password));
```

### Problem 5: Environment Variables nicht verfügbar

**Symptom**:
```
finAPI sandbox credentials are not configured
```

**Debug-Schritte**:

1. **Environment prüfen**:
```typescript
console.log('Environment check:');
console.log('CLIENT_ID exists:', !!process.env.FINAPI_SANDBOX_CLIENT_ID);
console.log('CLIENT_SECRET exists:', !!process.env.FINAPI_SANDBOX_CLIENT_SECRET);
console.log('CLIENT_ID length:', process.env.FINAPI_SANDBOX_CLIENT_ID?.length || 0);
```

2. **Datei-Locations prüfen**:
```bash
# Produktionsumgebung (Vercel)
# Variablen im Vercel Dashboard setzen

# Entwicklung
# .env.local im Root-Verzeichnis
ls -la .env*

# Inhalt prüfen (ohne Werte zu zeigen)
grep FINAPI .env.local | wc -l
```

3. **Build-Zeit vs Runtime**:
```typescript
// Runtime-Check implementieren
if (!process.env.FINAPI_SANDBOX_CLIENT_ID) {
  throw new Error('FINAPI_SANDBOX_CLIENT_ID not set in environment');
}
```

## 🔍 Debug-Strategien

### 1. Structured Logging aktivieren

```typescript
// Debug-Modus in Service
const DEBUG = true;

if (DEBUG) {
  console.log('=== finAPI Debug Info ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Service URL:', service.baseUrl);
  console.log('User ID:', userId);
  console.log('Timestamp:', new Date().toISOString());
}
```

### 2. Error-Response analysieren

```typescript
try {
  const result = await service.getOrCreateUser(userId, password);
} catch (error: any) {
  console.error('=== finAPI Error Analysis ===');
  console.error('Status Code:', error.status);
  console.error('Status Text:', error.statusText);
  console.error('Error Body:', error.body);
  console.error('Error Message:', error.message);
  console.error('Full Error:', JSON.stringify(error, null, 2));
}
```

### 3. Network-Level Debugging

```typescript
// finAPI API Call manuell testen
const testApiCall = async () => {
  const response = await fetch('https://sandbox.finapi.io/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.FINAPI_SANDBOX_CLIENT_ID!,
      client_secret: process.env.FINAPI_SANDBOX_CLIENT_SECRET!
    })
  });

  console.log('Manual API Test:');
  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  
  const data = await response.text();
  console.log('Response:', data);
};
```

## 🛠️ Wartungs-Checkliste

### Tägliche Checks
- [ ] API-Status prüfen: https://status.finapi.io
- [ ] Error-Logs in Vercel/Console durchsehen
- [ ] Credential-Test durchführen

### Wöchentliche Checks
- [ ] Benutzer-Authentifizierungs-Erfolgsrate prüfen
- [ ] Token-Refresh-Zyklen analysieren
- [ ] WebForm-Erstellungs-Statistiken

### Monatliche Checks
- [ ] finAPI SDK Updates prüfen
- [ ] Environment Variables rotieren
- [ ] Performance-Metriken analysieren

## 📊 Monitoring Setup

### 1. Error-Rate Tracking

```typescript
// Error-Tracker implementieren
class FinAPIErrorTracker {
  private static errors: { [key: string]: number } = {};

  static track(operation: string, error: any) {
    const key = `${operation}:${error.status || 'unknown'}`;
    this.errors[key] = (this.errors[key] || 0) + 1;
    
    // Bei kritischem Fehler-Level Alarm senden
    if (this.errors[key] > 10) {
      console.error(`🚨 High error rate for ${key}:`, this.errors[key]);
    }
  }

  static getStats() {
    return this.errors;
  }
}

// In Service verwenden
try {
  const result = await service.getOrCreateUser(userId, password);
} catch (error) {
  FinAPIErrorTracker.track('getOrCreateUser', error);
  throw error;
}
```

### 2. Performance-Monitoring

```typescript
// Performance-Tracker
const measurePerformance = async <T>(
  operation: string, 
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`⏱️ ${operation} took ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ ${operation} failed after ${duration}ms`);
    throw error;
  }
};

// Verwendung
const userResult = await measurePerformance(
  'createUser',
  () => service.getOrCreateUser(userId, password)
);
```

## 🆘 Eskalations-Pfad

### Level 1: Automatische Retry
- Rate Limiting (429)
- Temporäre Server-Fehler (5xx)
- Network Timeouts

### Level 2: Development Team
- Authentication-Probleme (401)
- Invalid Request-Fehler (400)
- Configuration-Probleme

### Level 3: finAPI Support
- Persistente API-Probleme
- Account/Credential-Issues
- Regulatory/Compliance-Fragen

**finAPI Support Kontakt**:
- Support-Portal: https://finapi.zendesk.com
- E-Mail: support@finapi.io
- Dokumentation: https://docs.finapi.io

---

**Notfall-Kontakte bei kritischen Problemen:**
- Entwicklungsteam: [Interne Kontaktdaten]
- DevOps/Infrastructure: [Interne Kontaktdaten]
- Geschäftsleitung bei Compliance-Issues: [Interne Kontaktdaten]
