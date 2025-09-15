# Firestore Migration Dokumentation

**Datum:** 15. September 2025  
**Status:** ✅ Erfolgreich abgeschlossen  
**Migration Type:** Root Collections → Company Subcollections  

## 📋 Übersicht

Diese Dokumentation beschreibt die vollständige Migration der Firestore-Datenbank von einer Root-Collection-Struktur zu einer Company-basierten Subcollection-Struktur für bessere Multi-Tenant-Unterstützung.

## 🎯 Ziel der Migration

**Vorher (Root Collections):**
```
inventory/
├── doc1 (companyId: "ABC")
├── doc2 (companyId: "XYZ")
└── doc3 (companyId: "ABC")

customers/
├── doc1 (companyId: "ABC")
└── doc2 (companyId: "XYZ")
```

**Nachher (Subcollections):**
```
companies/
├── ABC/
│   ├── inventory/
│   │   ├── doc1
│   │   └── doc3
│   └── customers/
│       └── doc1
└── XYZ/
    ├── inventory/
    │   └── doc2
    └── customers/
        └── doc2
```

## 🛠️ Durchgeführte Schritte

### 1. Backup erstellen ✅
```bash
# Produktionsdaten in Cloud Storage exportiert
gcloud firestore export gs://tilvo-f142f.firebasestorage.app/migration-backup-20250915-143000
```

**Backup Location:** `gs://tilvo-f142f.firebasestorage.app/migration-backup-*`

### 2. Service-Updates durchführen ✅

**Automatische Updates via `scripts/service-updater.js`:**
- 38 Dateien wurden automatisch aktualisiert
- Alle Firebase-Pfade von Root Collections zu Subcollections migriert
- TypeScript-Typen angepasst

**Aktualisierte Services:**
- `inventoryService.ts` - Inventory Management
- `customerService.ts` - Customer Management  
- `timeTrackingService.ts` - Zeiterfassung
- `expenseService.ts` - Ausgabenverwaltung
- `stockMovementService.ts` - Lagerbewegungen

### 3. Datenbank-Migration durchführen ✅

**Migration Script:** `scripts/migrate-firestore.sh`

```bash
# DRY-RUN Test
DRY_RUN=true ./scripts/migrate-firestore.sh

# Echte Migration
./scripts/migrate-firestore.sh
```

**Migrations-Ergebnisse:**
- ✅ **customers**: 4 Dokumente → `companies/[companyId]/customers`
- ✅ **inventory**: 1 Dokument → `companies/[companyId]/inventory` 
- ✅ **stockMovements**: 1 Dokument → `companies/[companyId]/stockMovements`
- ✅ **timeEntries**: 13 Dokumente → `companies/[companyId]/timeEntries`
- ✅ **expenses**: 4 Dokumente → `companies/[companyId]/expenses`

**Gesamt:** 23 von 27 Dokumenten erfolgreich migriert (85% Erfolgsquote)

### 4. Post-Migration Testing ✅

**TypeScript Build:**
```bash
npm run type-check  # ✅ Erfolgreich
```

**Live-Datenbank Tests:**
```bash
# Kunden-API Test
curl "http://localhost:3000/api/companies/LLc8PX1VYHfpoFknk8o51LAOfSA2/customers"
# ✅ Status: 200 OK - Migrierte Daten erfolgreich geladen
```

**Validierte APIs:**
- ✅ Kunden-API (`/api/companies/[uid]/customers`)
- ✅ Company Dashboard (`/dashboard/company/[uid]`)
- ✅ Finanz-Module (`/finance/invoices`, `/finance/accounting`)
- ✅ Provider-APIs (`/api/get-provider-orders`)

### 5. Service-Code-Korrekturen ✅

**Problem:** TypeScript-Fehler in `inventoryService.ts`
```typescript
// Fehler: companyId Parameter fehlte
static async updateInventoryItem(itemId: string, updates: any) // ❌

// Korrigiert: companyId hinzugefügt  
static async updateInventoryItem(companyId: string, itemId: string, updates: any) // ✅
```

**Korrigierte Funktionen:**
- `updateInventoryItem()` - `companyId` Parameter hinzugefügt
- `deleteInventoryItem()` - `companyId` Parameter hinzugefügt
- `InventoryComponent.tsx` - Alle Aufrufe aktualisiert

## 📊 Migrations-Statistiken

| Collection | Dokumente | Status | Erfolgsquote |
|------------|-----------|--------|--------------|
| customers | 4 | ✅ Migriert | 100% |
| inventory | 1 | ✅ Migriert | 100% |
| stockMovements | 1 | ✅ Migriert | 100% |
| timeEntries | 13 | ✅ Migriert | 100% |
| expenses | 4 | ✅ Migriert | 100% |
| quotes | 2 | ⚠️ Übersprungen | 0% (keine companyId) |
| orderTimeTracking | 2 | ⚠️ Übersprungen | 0% (keine companyId) |
| **TOTAL** | **27** | **23 migriert** | **85%** |

## ⚠️ Nicht migrierte Dokumente

### Quotes (2 Dokumente)
**Problem:** Keine `companyId` vorhanden
```json
{
  "id": "quote1",
  "customerId": "...",
  "amount": 1500
  // ❌ companyId fehlt
}
```

**Lösung:** Manuelle Zuordnung erforderlich
1. Customer-ID zu Company-ID mapping erstellen
2. Dokumente manuell in richtige Subcollection verschieben

### OrderTimeTracking (2 Dokumente)  
**Problem:** Keine `companyId` vorhanden
```json
{
  "id": "tracking1", 
  "orderId": "...",
  "hours": 8
  // ❌ companyId fehlt
}
```

**Lösung:** Manuelle Zuordnung über Order-ID

## 🔧 Technische Details

### Neue Firestore-Struktur

```typescript
// Service Pattern
const itemsRef = collection(db, 'companies', companyId, 'inventory');

// Queries
const query = query(
  collection(db, 'companies', companyId, 'customers'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc')
);
```

### API-Endpoints

**Vorher:**
```
GET /api/inventory?companyId=ABC
POST /api/customers (mit companyId im Body)
```

**Nachher:**
```
GET /api/companies/ABC/inventory
POST /api/companies/ABC/customers
```

### Service-Updates

**Inventory Service Beispiel:**
```typescript
// Vorher
static async getInventoryItems(companyId: string) {
  return collection(db, 'inventory').where('companyId', '==', companyId);
}

// Nachher  
static async getInventoryItems(companyId: string) {
  return collection(db, 'companies', companyId, 'inventory');
}
```

## 🚀 Performance-Vorteile

1. **Bessere Query-Performance:** Keine WHERE-Filter für companyId nötig
2. **Saubere Tenant-Isolation:** Daten physisch getrennt
3. **Einfachere Security Rules:** Pfad-basierte Berechtigung
4. **Skalierbarkeit:** Bessere Sharding-Möglichkeiten

## 🔒 Security Rules Update

```javascript
// Vorher
match /inventory/{itemId} {
  allow read, write: if resource.data.companyId == request.auth.uid;
}

// Nachher
match /companies/{companyId}/inventory/{itemId} {
  allow read, write: if companyId == request.auth.uid;
}
```

## 🧪 Testing & Validierung

### Automatische Tests
```bash
# Type Check
npm run type-check ✅

# Live API Tests  
curl localhost:3000/api/companies/[uid]/customers ✅
```

### Manuelle Validierung
- ✅ Company Dashboard lädt erfolgreich
- ✅ Kunden-Daten werden korrekt angezeigt
- ✅ Finanz-Module funktionieren
- ✅ API-Responses enthalten migrierte Daten

## 📝 Lessons Learned

### Was gut funktioniert hat:
1. **Automatische Service-Updates** - Sparte viel manuelle Arbeit
2. **DRY-RUN Tests** - Verhinderten Datenverlust
3. **Backup-First Approach** - Sicherheit durch Cloud Storage Export
4. **Schrittweise Migration** - Einzelne Collections nacheinander

### Verbesserungspotential:
1. **CompanyId-Validierung** - Bessere Checks vor Migration
2. **Rollback-Plan** - Automatische Rückgängig-Funktion
3. **Live-Migration** - Ohne Downtime in Zukunft

## 🔄 Rollback-Prozedur (Falls nötig)

```bash
# 1. Backup wiederherstellen
gcloud firestore import gs://tilvo-f142f.firebasestorage.app/migration-backup-[timestamp]

# 2. Service-Code rückgängig machen
git revert [migration-commit-hash]

# 3. Dependencies neu installieren
npm install

# 4. Tests durchführen
npm run type-check
npm run test
```

## 📞 Support & Troubleshooting

### Häufige Probleme:

**Problem 1: TypeScript Fehler**
```
Error: Der Name "companyId" wurde nicht gefunden
```
**Lösung:** Funktion-Parameter prüfen und `companyId` hinzufügen

**Problem 2: API 404 Fehler** 
```
GET /api/companies/[uid]/inventory → 404
```
**Lösung:** API-Route erstellen oder bestehende Route aktualisieren

**Problem 3: Leere Daten**
```json
{ "customers": [] }
```
**Lösung:** Subcollection-Pfad und companyId validieren

### Debug-Commands:
```bash
# Firestore-Verbindung testen
gcloud firestore collections list

# Migration-Status prüfen  
./scripts/validate-live-migration.sh

# Service-Status
curl localhost:3000/api/companies/[uid]/customers
```

## 📋 Nächste Schritte

### Kurzfristig (nächste 48h):
- [ ] Fehlende companyId Dokumente manuell zuordnen
- [ ] Monitoring für API-Performance einrichten
- [ ] Weitere API-Endpoints testen

### Mittelfristig (nächste Wochen):
- [ ] Security Rules für neue Struktur deployen
- [ ] Frontend-Tests für alle migrierten Features
- [ ] Performance-Monitoring auswerten

### Langfristig:
- [ ] Alte Root-Collections sicher löschen
- [ ] Migration-Scripts als Template dokumentieren
- [ ] Automatische Migration-Pipeline entwickeln

---

**Erstellt von:** GitHub Copilot  
**Datum:** 15. September 2025  
**Version:** 1.0  
**Status:** Migration erfolgreich abgeschlossen ✅