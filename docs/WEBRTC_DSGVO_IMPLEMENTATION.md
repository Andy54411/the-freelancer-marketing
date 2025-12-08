# DSGVO-konforme WebRTC Implementierung

## Aktueller Status: ❌ NICHT DSGVO-konform

### Probleme:
1. **Unverschlüsseltes Signaling** über Firebase
2. **Keine End-to-End-Verschlüsselung**
3. **US-Server** ohne angemessene Schutzmaßnahmen
4. **Logging von personenbezogenen Daten**

## DSGVO-konforme Lösung:

### 1. EU-Server Migration
```typescript
// Firebase Hosting/Database in EU-Region
const firebaseConfig = {
  databaseURL: "https://PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app/"
};
```

### 2. End-to-End Verschlüsselung
```typescript
import { encrypt, decrypt } from '@/utils/crypto';

// Verschlüsseltes Signaling
private async sendSignal(signal: SignalingData): Promise<void> {
  const encryptedSignal = await encrypt(JSON.stringify(signal), this.chatEncryptionKey);
  await push(this.signalingRef, {
    data: encryptedSignal,
    from: signal.from,
    timestamp: signal.timestamp
  });
}
```

### 3. Sichere Schlüssel-Austausch
```typescript
// ECDH Key Exchange für Chat-spezifische Schlüssel
private async generateChatKeys(chatId: string): Promise<string> {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-384" },
    false,
    ["deriveKey"]
  );
  // Sicherer Schlüsselaustausch über separaten Kanal
}
```

### 4. Datenminimierung
```typescript
// Keine UserIDs in Logs
console.log('📨 [SIGNALING] Signal received:', { 
  type: signal.type, 
  timestamp: Date.now() 
  // Keine User-identifizierbaren Daten
});
```

### 5. Automatische Datenlöschung
```typescript
// Signaling-Daten nach Anruf löschen
private async cleanupSignaling(chatId: string): Promise<void> {
  await remove(ref(rtdb, `videoCalls/${chatId}/signals`));
  await remove(ref(rtdb, `videoCalls/${chatId}/requests`));
}
```

## Implementierung:

### Schritt 1: Crypto-Utils erstellen
```bash
mkdir -p src/utils
touch src/utils/crypto.ts
```

### Schritt 2: E2E Encryption
```typescript
// AES-GCM Verschlüsselung für Signaling
export async function encrypt(data: string, key: string): Promise<string> {
  // Implementierung der Verschlüsselung
}
```

### Schritt 3: Firebase EU-Konfiguration
```typescript
// Umstellung auf EU-Server
const rtdb = getDatabase(app, EU_DATABASE_URL);
```

### Schritt 4: Einverständniserklärung
```typescript
// Explizite Zustimmung vor Videoanruf
const consent = await showConsentDialog();
if (!consent) return;
```

## Rechtliche Anforderungen:

- ✅ **Einverständniserklärung** vor Datenverarbeitung
- ✅ **Datenschutzerklärung** für Videoanrufe
- ✅ **EU-Server** oder angemessene Schutzmaßnahmen
- ✅ **Datenminimierung** (keine unnötigen Logs)
- ✅ **Automatische Löschung** nach Anruf
- ✅ **End-to-End-Verschlüsselung** für alle Daten

## Kosten/Nutzen:
- **Aufwand**: 2-3 Wochen Implementierung
- **Nutzen**: DSGVO-Konformität, Vertrauen der Benutzer
- **Risiko ohne Lösung**: €20M oder 4% Jahresumsatz Strafe