# 🚀 FIRESTORE MIGRATION GUIDE
## Von globalen Collections zu Company Subcollections

### 📊 MIGRATION ÜBERSICHT

**Ziel:** Optimierung der Firestore-Struktur von 37 auf 15 Collections  
**Methode:** Company-spezifische Daten als Subcollections  
**Vorteile:** Bessere Performance, einfachere Security Rules, saubere Mandantentrennung

---

## 🎯 COLLECTIONS ZU MIGRIEREN

### ❌ AUS (Global Collections)
```
customers/
inventory/ 
stockMovements/
timeEntries/
quotes/
expenses/
orderTimeTracking/
```

### ✅ ZU (Company Subcollections)
```
companies/[companyId]/customers/
companies/[companyId]/inventory/
companies/[companyId]/stockMovements/
companies/[companyId]/timeEntries/
companies/[companyId]/quotes/
companies/[companyId]/expenses/
companies/[companyId]/orderTimeTracking/
```

---

## 📋 SCHRITT-FÜR-SCHRITT ANLEITUNG

### Phase 1: Vorbereitung (KRITISCH)

#### 1.1 Backup erstellen
```bash
# Firebase Backup
firebase firestore:export gs://your-bucket/backup-$(date +%Y%m%d)

# Lokaler Export (Emulator)
firebase emulators:export ./emulator-backup --only firestore
```

#### 1.2 Dependencies installieren
```bash
cd scripts/
npm install firebase-admin firebase
```

#### 1.3 Migration Scripts testen
```typescript
// Test mit einer kleinen Company
const testMigration = new FirestoreMigration(true); // DRY RUN
await testMigration.migrateCollection({
  collectionName: 'customers',
  companyIdField: 'companyId', 
  batchSize: 10
});
```

### Phase 2: Code-Updates

#### 2.1 Services automatisch aktualisieren
```typescript
// Alle Services auf einmal aktualisieren
const updater = new ServiceUpdater(true); // DRY RUN first
await updater.updateServices();

// Nach Review: Echte Updates
const realUpdater = new ServiceUpdater(false);
await realUpdater.updateServices();
```

#### 2.2 Manuelle Component-Updates
Folgende Komponenten müssen manuell geprüft werden:
- `src/components/finance/CustomerManager.tsx`
- `src/components/finance/CustomerDetailModal.tsx`  
- `src/components/finance/SupplierManager.tsx`
- `src/components/finance/ProjectsComponent.tsx`
- `src/components/chart-*.tsx`

#### 2.3 Firestore Rules aktualisieren
```bash
# Neue Rules deployen
cp firestore-subcollection.rules firestore.rules
firebase deploy --only firestore:rules
```

### Phase 3: Migration (PRODUKTIV)

#### 3.1 Wartungsmodus aktivieren
```typescript
// Optional: Maintenance Mode in App
const maintenanceFlag = await setDoc(doc(db, 'system', 'maintenance'), {
  active: true,
  message: 'Database migration in progress...',
  estimatedDuration: '30 minutes'
});
```

#### 3.2 Echte Migration starten
```typescript
const migration = new FirestoreMigration(false); // ECHT!
await migration.runFullMigration();
```

#### 3.3 Daten validieren
```typescript
// Prüfe, ob alle Daten migriert wurden
for (const companyId of ['LLc8PX1VYHfpoFknk8o51LAOfSA2', 'other-company-ids']) {
  const customers = await getDocs(collection(db, 'companies', companyId, 'customers'));
  console.log(`Company ${companyId}: ${customers.size} customers migrated`);
}
```

#### 3.4 App-Funktionalität testen
- [ ] Kundenmanagement
- [ ] Inventarverwaltung  
- [ ] Zeiterfassung
- [ ] Angebotserstellung
- [ ] Ausgabenverwaltung
- [ ] Dashboard-Charts

#### 3.5 Alte Collections löschen (VORSICHT!)
```typescript
// NUR NACH ERFOLGREICHEM TEST!
await migration.deleteOriginalCollection('customers');
await migration.deleteOriginalCollection('inventory');
// ... etc
```

### Phase 4: Cleanup

#### 4.1 Wartungsmodus deaktivieren
```typescript
await deleteDoc(doc(db, 'system', 'maintenance'));
```

#### 4.2 Performance überwachen
```bash
# Firebase Console → Performance → Firestore
# Prüfe Query-Performance nach Migration
```

---

## 🔧 TROUBLESHOOTING

### Problem: Migration bricht ab
**Lösung:** 
```typescript
// Continuation-Migration für spezifische Collection
const continueMigration = new FirestoreMigration(false);
await continueMigration.migrateCollection({
  collectionName: 'customers', // Nur diese Collection
  companyIdField: 'companyId',
  batchSize: 50 // Kleinere Batches
});
```

### Problem: Service-Calls funktionieren nicht
**Lösung:**
```typescript
// Prüfe ob companyId Parameter überall korrekt übergeben wird
// ALT:
await CustomerService.getCustomers(); // ❌ Fehlt companyId

// NEU:  
await CustomerService.getCustomers(companyId); // ✅ Mit companyId
```

### Problem: Security Rules blockieren Zugriff
**Lösung:**
```javascript
// Debug Rules in Firebase Console
match /companies/{companyId}/customers/{customerId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == companyId &&
    // DEBUG:
    debug(request.auth.uid) == debug(companyId);
}
```

---

## 📈 PERFORMANCE VORTEILE

### Vorher (Globale Collections)
```javascript
// Muss ALLE Kunden durchsuchen + Filter
query(collection(db, 'customers'), where('companyId', '==', companyId))
// → Scannt potentiell 10.000+ Dokumente
```

### Nachher (Subcollections)  
```javascript
// Nur Company-spezifische Kunden
query(collection(db, 'companies', companyId, 'customers'))
// → Scannt nur 50-200 Dokumente pro Company
```

**Ergebnis:** 50-100x schnellere Queries! 🚀

---

## ✅ ERFOLGS-CHECKLISTE

- [ ] **Backup erstellt und getestet**
- [ ] **Migration Scripts DRY RUN erfolgreich**
- [ ] **Alle Services aktualisiert**
- [ ] **Components aktualisiert** 
- [ ] **Firestore Rules deployed**
- [ ] **Migration durchgeführt**
- [ ] **Daten validiert**
- [ ] **App-Funktionalität getestet**
- [ ] **Performance überwacht**
- [ ] **Alte Collections gelöscht**

---

## 🆘 ROLLBACK-PLAN

Falls etwas schief geht:

### Option 1: Restore von Backup
```bash
firebase firestore:import gs://your-bucket/backup-YYYYMMDD
```

### Option 2: Service-Rollback
```typescript
// Services auf alte Collection-Struktur zurücksetzen
const rollback = new ServiceUpdater(false);
await rollback.rollbackToGlobalCollections();
```

### Option 3: Rules-Rollback
```bash
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

---

## 📞 SUPPORT

Bei Problemen:
1. **Console Logs prüfen:** Browser DevTools → Console
2. **Firebase Logs:** Firebase Console → Functions → Logs  
3. **Firestore Debug:** Firebase Console → Firestore → Rules Playground
4. **Performance:** Firebase Console → Performance → Firestore

**WICHTIG:** Niemals ohne Backup migrieren! 🚨