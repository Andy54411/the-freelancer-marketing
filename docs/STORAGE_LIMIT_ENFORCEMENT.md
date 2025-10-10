# Storage Limit Enforcement - Implementation Guide

## ✅ Implementiert

### 1. StorageLimitService (`/src/services/storageLimitService.ts`)

**Features:**
- ✅ `canUpload()` - Prüft vor jedem Upload ob Limit erreicht
- ✅ `canDownload()` - Blockiert Downloads bei Limit-Überschreitung  
- ✅ `recordCancellationConsent()` - Speichert Kündigungs-Zustimmung mit IP & Signatur
- ✅ `hasCancellationConsent()` - Prüft ob Consent gegeben wurde
- ✅ `getStorageStatus()` - Aktueller Status für UI

### 2. CancelPlanModal (`/src/components/storage/CancelPlanModal.tsx`)

**Consent-Flow:**
- ⚠️ Warnung über Datenlöschung
- ✅ 3 Checkboxen für Bestätigung
- ✅ Digitale Unterschrift (vollständiger Name)
- ✅ IP-Adresse wird automatisch erfasst
- ✅ Timestamp in Firestore gespeichert

**Firestore Struktur:**
```typescript
companies/{companyId}: {
  storageCancellation: {
    consentGiven: true,
    consentDate: Timestamp,
    ipAddress: "192.168.1.1",
    userSignature: "Max Mustermann",
    acknowledgement: "Ich bestätige...",
    warningShown: true,
    currentUsage: 2097152, // bytes
    planId: "10gb"
  }
}
```

### 3. Upload-Blocking integriert

**CustomerDocumentsTab.tsx:**
- ✅ Prüft Limit VOR Upload
- ✅ Stoppt Upload mit Fehlermeldung
- ✅ Zeigt Upgrade-Hinweis

**Fehler-Toast:**
```typescript
"Sie haben Ihr 500 MB Limit erreicht. 
Bitte upgraden Sie Ihren Plan."
```

### 4. Download-Blocking integriert

**CustomerDocumentsTab.tsx:**
- ✅ Download-Button prüft Limit
- ✅ Blockiert bei Überschreitung
- ✅ Zeigt Fehler-Toast

**Fehler-Toast:**
```typescript
"❌ Downloads sind gesperrt. 
Sie haben Ihr Speicherlimit überschritten."
```

## 📋 TODO - Standard 500 MB für neue Firmen

### Wo neue Firmen erstellt werden:

1. **Company Onboarding** (`/src/app/(authenticated)/company-onboarding/*`)
2. **Firebase Functions** (`/firebase_functions/src/triggers_auth.ts`)
3. **Admin Company Creation** (`/src/app/api/admin/create-company/*`)

### Änderungen vornehmen:

```typescript
// Bei Company-Erstellung:
const companyData = {
  // ... andere Felder
  storageLimit: 500 * 1024 * 1024, // 500 MB (statt 5GB)
  storagePlanId: 'free',
  usage: {
    storageUsed: 0,
    firestoreUsed: 0,
    totalUsed: 0,
    lastUpdate: serverTimestamp(),
    stats: {
      totalFiles: 0,
      totalDocuments: 0
    }
  }
};
```

### Dateien die geändert werden müssen:

1. **Firebase Functions - Auth Trigger**
   ```
   /firebase_functions/src/triggers_auth.ts
   ```
   Suche nach: `onUserCreate` oder `createCompanyProfile`
   
2. **Company Onboarding - Final Step**
   ```
   /src/app/(authenticated)/company-onboarding/page.tsx
   /src/app/(authenticated)/company-onboarding/[...step]/page.tsx
   ```
   Suche nach: Firestore `setDoc` oder `updateDoc` auf `companies`

3. **Admin API**
   ```
   /src/app/api/admin/create-company/route.ts (falls vorhanden)
   ```

### Migration für bestehende Firmen:

**Option A: Bestandsschutz (Empfohlen)**
```javascript
// Bestehende Firmen behalten 5GB
// Nur NEUE Firmen bekommen 500MB

// In Migration Script:
const existingCompanies = await db.collection('companies')
  .where('createdAt', '<', new Date('2025-10-10'))
  .get();

// Diese behalten ihre 5GB
```

**Option B: Alle migrieren**
```javascript
// Script: scripts/migrate-to-500mb-free.js
const companies = await db.collection('companies')
  .where('storagePlanId', '==', 'free')
  .orWhere('storagePlanId', '==', null)
  .get();

for (const doc of companies.docs) {
  const usage = doc.data().usage?.totalUsed || 0;
  
  if (usage <= 500 * 1024 * 1024) {
    // Unter 500MB: Auf Free migrieren
    await doc.ref.update({
      storageLimit: 500 * 1024 * 1024,
      storagePlanId: 'free'
    });
  } else {
    // Über 500MB: Warnung senden
    await sendStorageWarningEmail(doc.id, usage);
  }
}
```

## 🔄 Plan-Kündigung Flow

### 1. User klickt "Plan kündigen"
→ `CancelPlanModal` öffnet sich

### 2. Modal zeigt Warnung:
- Aktuelle Nutzung: X MB
- Plan läuft bis Monatsende
- Downgrade auf Free (500 MB)
- **Alle Daten werden gelöscht**

### 3. User muss bestätigen:
- ✅ Checkbox 1: Verstehe Datenlöschung
- ✅ Checkbox 2: Habe Daten gesichert
- ✅ Checkbox 3: Keine Verantwortung für Taskilo
- ✅ Unterschrift: Vollständiger Name

### 4. System speichert Consent:
```typescript
{
  storageCancellation: {
    consentGiven: true,
    consentDate: "2025-10-10T15:30:00Z",
    ipAddress: "192.168.1.100",
    userSignature: "Max Mustermann",
    currentUsage: 5242880, // 5 MB
    planId: "10gb"
  }
}
```

### 5. Stripe Webhook (am Monatsende):
```typescript
// In /src/app/api/storage/webhook/route.ts

case 'customer.subscription.deleted':
  // 1. Prüfe Consent
  const hasConsent = await StorageLimitService.hasCancellationConsent(companyId);
  
  if (!hasConsent) {
    // ERROR: Keine Zustimmung vorhanden!
    throw new Error('Cancellation consent not found');
  }
  
  // 2. Downgrade auf Free
  await updateDoc(companyRef, {
    storageLimit: 500 * 1024 * 1024,
    storagePlanId: 'free',
    subscriptionStatus: 'cancelled'
  });
  
  // 3. Prüfe Usage
  const usage = await getUsage(companyId);
  
  if (usage.totalUsed > 500 * 1024 * 1024) {
    // 4. Über Limit: Sperre Uploads & Downloads
    await updateDoc(companyRef, {
      'storage.uploadsBlocked': true,
      'storage.downloadsBlocked': true,
      'storage.blockReason': 'over_limit_after_cancellation'
    });
    
    // 5. Sende Warnung
    await sendDataDeletionWarningEmail(companyId, usage.totalUsed);
    
    // 6. Schedule Deletion (30 Tage)
    await scheduleDataDeletion(companyId, 30); // days
  }
  
  break;
```

## 📧 Email-Benachrichtigungen

### 1. Limit erreicht (90%)
```
Betreff: ⚠️ Ihr Speicher ist fast voll

Sie nutzen 450 MB von 500 MB (90%).
Bitte upgraden Sie oder löschen Sie Dateien.

[Jetzt upgraden]
```

### 2. Limit überschritten
```
Betreff: 🚫 Speicherlimit überschritten - Uploads gesperrt

Sie haben Ihr 500 MB Limit überschritten.
Uploads sind gesperrt, Downloads weiterhin möglich.

Aktuelle Nutzung: 520 MB / 500 MB

[Plan upgraden] [Dateien löschen]
```

### 3. Plan gekündigt - Warnung
```
Betreff: ⚠️ Datenlöschung in 30 Tagen

Ihr Plan wurde gekündigt.
Sie nutzen 5 GB, der Free-Plan bietet nur 500 MB.

In 30 Tagen werden ALLE Ihre Daten gelöscht.

[Daten jetzt sichern] [Plan reaktivieren]
```

### 4. Datenlöschung in 7 Tagen
```
Betreff: 🔴 LETZTE WARNUNG: Datenlöschung in 7 Tagen

Ihre Daten werden in 7 Tagen unwiderruflich gelöscht.

Aktuelle Nutzung: 5 GB
Free-Plan Limit: 500 MB

[Daten sichern] [Plan upgraden]
```

## 🧪 Testing Checklist

### Free Plan (500 MB)
- [ ] Neue Firma hat 500 MB Limit
- [ ] Upload bei 490 MB funktioniert
- [ ] Upload bei 510 MB wird blockiert
- [ ] Fehler-Toast erscheint
- [ ] Download bei 510 MB wird blockiert

### Paid Plan Cancellation
- [ ] CancelPlanModal öffnet sich
- [ ] Warnung zeigt aktuelle Nutzung
- [ ] Alle 3 Checkboxen müssen aktiviert sein
- [ ] Unterschrift muss ausgefüllt sein
- [ ] IP-Adresse wird erfasst
- [ ] Consent wird in Firestore gespeichert
- [ ] Webhook verarbeitet Kündigung korrekt

### Over-Limit Scenarios
- [ ] Upload blockiert mit korrekter Meldung
- [ ] Download blockiert mit korrekter Meldung
- [ ] Upgrade-Modal kann geöffnet werden
- [ ] Nach Upgrade funktionieren Uploads wieder

## 🔐 Rechtliche Absicherung

### Consent-Daten (DSGVO-konform):
```typescript
{
  storageCancellation: {
    consentGiven: boolean,        // Explizite Zustimmung
    consentDate: Timestamp,        // Wann
    ipAddress: string,             // Von wo
    userSignature: string,         // Wer (Name)
    acknowledgement: string,       // Voller Text der Bestätigung
    currentUsage: number,          // Wie viel Daten
    planId: string                 // Welcher Plan
  }
}
```

### Aufbewahrungspflicht:
- Consent-Daten: **10 Jahre** aufbewahren
- Bei Rechtsstreit nachweisbar
- DSGVO Art. 7 (1): "Nachweis der Einwilligung"

### Email-Archivierung:
- Alle Warn-Emails archivieren
- Zustellbestätigung speichern
- Bei Streitfall: "User wurde informiert"

## 📊 Monitoring

### Metriken überwachen:
1. Anzahl blockierte Uploads pro Tag
2. Anzahl blockierte Downloads pro Tag
3. Anzahl Plan-Kündigungen mit Consent
4. Durchschnittliche Nutzung bei Free-Plan
5. Conversion-Rate: Free → Paid nach Block

### Alerts einrichten:
- Alert: >10 blockierte Uploads in 1 Stunde
- Alert: Plan-Kündigung ohne Consent
- Alert: Datenlöschung steht an (30 Tage vorher)

---

## 🚀 Deployment Checklist

- [ ] StorageLimitService deployed
- [ ] CancelPlanModal deployed
- [ ] Upload-Blocking in CustomerDocumentsTab
- [ ] Download-Blocking in CustomerDocumentsTab
- [ ] Standard 500 MB für neue Firmen
- [ ] Stripe Webhook updated (cancellation flow)
- [ ] Email-Templates erstellt
- [ ] Monitoring eingerichtet
- [ ] Testing abgeschlossen
- [ ] Dokumentation aktualisiert
