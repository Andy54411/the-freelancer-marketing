# Firestore Migration - Troubleshooting Guide

## 🚨 Häufige Probleme nach der Migration

### Problem 1: TypeScript-Fehler "companyId wurde nicht gefunden"

**Symptom:**
```
Error: Der Name "companyId" wurde nicht gefunden.
Zeile: await someFunction(companyId, itemId);
```

**Ursache:** Service-Funktionen wurden automatisch migriert, aber Funktions-Parameter nicht korrekt aktualisiert.

**Lösung:**
```typescript
// ❌ Vorher (fehlender Parameter)
static async updateItem(itemId: string, updates: any) {
  const ref = doc(db, 'companies', companyId, 'items', itemId); // companyId nicht verfügbar
}

// ✅ Nachher (Parameter hinzugefügt)
static async updateItem(companyId: string, itemId: string, updates: any) {
  const ref = doc(db, 'companies', companyId, 'items', itemId);
}
```

**Schritte:**
1. Funktions-Signatur um `companyId` Parameter erweitern
2. Alle Aufrufe der Funktion entsprechend anpassen
3. TypeScript-Check durchführen: `npm run type-check`

---

### Problem 2: API-Endpoints geben 404 zurück

**Symptom:**
```
GET /api/companies/ABC123/inventory → 404 Not Found
```

**Ursache:** API-Route existiert nicht oder verwendet noch alte Root-Collection-Struktur.

**Lösung:**
1. **Neue API-Route erstellen:**
```typescript
// src/app/api/companies/[uid]/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  
  // Neue Subcollection-Struktur verwenden
  const items = await InventoryService.getInventoryItems(uid);
  
  return NextResponse.json({ success: true, items });
}
```

2. **Bestehende Route aktualisieren:**
```typescript
// Von Root-Collection
const items = await getDocs(collection(db, 'inventory').where('companyId', '==', uid));

// Zu Subcollection  
const items = await getDocs(collection(db, 'companies', uid, 'inventory'));
```

---

### Problem 3: Leere Daten-Arrays trotz erfolgreicher Migration

**Symptom:**
```json
{
  "success": true,
  "customers": []
}
```

**Ursache:** Service verwendet noch alte Collection-Pfade oder falsche companyId.

**Debug-Schritte:**
```typescript
// 1. CompanyId validieren
console.log('CompanyId:', companyId);

// 2. Collection-Pfad prüfen
const collectionRef = collection(db, 'companies', companyId, 'customers');
console.log('Collection Path:', collectionRef.path);

// 3. Direkte Firestore-Abfrage
const snapshot = await getDocs(collectionRef);
console.log('Document Count:', snapshot.size);
```

**Lösung:**
```typescript
// Service-Funktion korrigieren
static async getCustomers(companyId: string) {
  try {
    // Neue Subcollection-Struktur
    const customersQuery = query(
      collection(db, 'companies', companyId, 'customers'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(customersQuery);
    // ... Rest der Implementierung
  } catch (error) {
    console.error('Error loading customers:', error);
    throw error;
  }
}
```

---

### Problem 4: Firebase Build-Fehler

**Symptom:**
```
Error: Cannot find module './vendor-chunks/@firebase+firestore@4.9.1_@firebase+app@0.14.2.js'
```

**Ursache:** Next.js Build-Cache-Probleme nach Firebase-Änderungen.

**Lösung:**
```bash
# 1. Build-Cache löschen
rm -rf .next/

# 2. Node-Modules neu installieren
rm -rf node_modules/
pnpm install

# 3. Neu bauen
pnpm run build

# 4. Falls Memory-Probleme:
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build
```

---

### Problem 5: Security Rules-Fehler

**Symptom:**
```
FirebaseError: Missing or insufficient permissions
```

**Ursache:** Security Rules noch nicht für neue Subcollection-Struktur aktualisiert.

**Lösung:**
```javascript
// firestore.rules aktualisieren
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Neue Subcollection-Rules
    match /companies/{companyId}/customers/{customerId} {
      allow read, write: if request.auth.uid == companyId;
    }
    
    match /companies/{companyId}/inventory/{itemId} {
      allow read, write: if request.auth.uid == companyId;
    }
    
    // Weitere Subcollections...
  }
}
```

```bash
# Rules deployen
firebase deploy --only firestore:rules
```

---

### Problem 6: Migration unvollständig - Dokumente fehlen

**Symptom:** Nur 23 von 27 Dokumenten migriert.

**Diagnose:**
```bash
# Fehlende companyId-Dokumente finden
./scripts/validate-live-migration.sh
```

**Manuelle Korrektur:**
```typescript
// 1. Quotes ohne companyId identifizieren
const quotesQuery = query(
  collection(db, 'quotes'),
  where('companyId', '==', null)
);

// 2. CompanyId über Kundenbeziehung ermitteln
const customerId = quote.customerId;
const customer = await getDoc(doc(db, 'companies', '[companyId]', 'customers', customerId));

// 3. Manuell migrieren
await setDoc(
  doc(db, 'companies', companyId, 'quotes', quote.id),
  { ...quote, companyId }
);
```

---

## 🔧 Debug-Tools

### 1. Firestore-Debugger
```typescript
// Debug-Funktion für Collection-Zugriff
export async function debugCollection(path: string) {
  try {
    const ref = collection(db, path);
    const snapshot = await getDocs(ref);
    
    console.log(`✅ Collection "${path}": ${snapshot.size} documents`);
    
    snapshot.forEach(doc => {
      console.log(`  - ${doc.id}:`, doc.data());
    });
  } catch (error) {
    console.error(`❌ Collection "${path}":`, error.message);
  }
}

// Verwendung
await debugCollection('companies/ABC123/customers');
```

### 2. Migration-Validator
```bash
#!/bin/bash
# scripts/validate-migration.sh

echo "🔍 Validiere Migration..."

# Alle Companies testen
for companyId in $(gcloud firestore collections list --format="value(id)" | grep -v companies); do
  echo "Testing company: $companyId"
  
  # API-Test
  curl -s "http://localhost:3000/api/companies/$companyId/customers" | jq .
done
```

### 3. Performance-Monitor
```typescript
// Performance-Tracking für API-Calls
export async function monitoredApiCall<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    console.log(`✅ ${name}: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ ${name}: ${duration}ms -`, error.message);
    throw error;
  }
}

// Verwendung
const customers = await monitoredApiCall(
  'Load Customers',
  () => CustomerService.getCustomers(companyId)
);
```

---

## 📋 Rollback-Checkliste

Falls die Migration rückgängig gemacht werden muss:

### Schritt 1: Backup wiederherstellen
```bash
# 1. Aktuelle Daten exportieren (Sicherheit)
gcloud firestore export gs://backup-bucket/rollback-backup-$(date +%Y%m%d-%H%M%S)

# 2. Original-Backup importieren
gcloud firestore import gs://tilvo-f142f.firebasestorage.app/migration-backup-20250915-143000
```

### Schritt 2: Code zurücksetzen
```bash
# Git-History prüfen
git log --oneline | grep migration

# Migration-Commits rückgängig machen
git revert [commit-hash-1] [commit-hash-2] [commit-hash-3]

# Dependencies aktualisieren
pnpm install
```

### Schritt 3: Tests durchführen
```bash
# TypeScript-Check
npm run type-check

# API-Tests
curl localhost:3000/api/inventory?companyId=ABC123

# Build-Test
npm run build
```

### Schritt 4: Services neu starten
```bash
# Development-Server
pnpm dev

# Oder Production-Deployment
vercel --prod
```

---

## 🆘 Notfall-Kontakte

**Bei kritischen Problemen:**
1. Sofort Development-Server stoppen: `Ctrl+C`
2. Backup-Status prüfen: `gsutil ls gs://tilvo-f142f.firebasestorage.app/migration-backup-*`
3. Rollback initiieren (siehe oben)
4. Live-Datenbank via Firebase Console überwachen

**Backup-Wiederherstellung (Notfall):**
```bash
# Komplette Datenbank zurücksetzen
gcloud firestore databases delete --database=(default)
gcloud firestore import gs://tilvo-f142f.firebasestorage.app/migration-backup-20250915-143000
```

---

**Letzte Aktualisierung:** 15. September 2025  
**Getestet mit:** Next.js 15.4.1, Firebase 10.x