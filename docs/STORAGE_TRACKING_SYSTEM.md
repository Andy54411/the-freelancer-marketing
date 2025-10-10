# Storage Tracking System

## Übersicht

Das Storage Tracking System misst automatisch den Speicherverbrauch jeder Firma über alle Dokumente hinweg.

## Wie es funktioniert

### Automatisches Tracking

Bei **jedem Upload** wird die Dateigröße automatisch erfasst:
- Kundendokumente (PDFs, Bilder, Excel, etc.)
- Rechnungs-PDFs
- Angebots-PDFs  
- Kalender-Anhänge
- Mitarbeiter-Dokumente
- Steuerberater-Dokumente

### Firestore-Struktur

```typescript
companies/{companyId}:
  - storageUsed: number           // Bytes
  - storageLimit: number          // Bytes (z.B. 5GB = 5368709120)
  - lastStorageUpdate: timestamp
  - storageBreakdown: {           // Optional: Aufschlüsselung
      invoices: number,
      customerDocs: number,
      employeeDocs: number,
      calendarFiles: number,
      taxDocs: number,
      other: number
    }
```

## Integration

### Upload-Tracking

```typescript
import { StorageTrackingService } from '@/services/storageTrackingService';

// Nach erfolgreichem Upload
await uploadBytes(fileRef, file);
await StorageTrackingService.trackUpload(companyId, file.size);
```

### Lösch-Tracking

```typescript
// Vor dem Löschen
await deleteObject(fileRef);
await StorageTrackingService.trackDeletion(companyId, document.size);
```

### Storage-Prüfung vor Upload

```typescript
const hasSpace = await StorageTrackingService.hasStorageAvailable(
  companyId,
  file.size
);

if (!hasSpace) {
  toast.error('Speicherplatz nicht ausreichend. Bitte upgraden Sie Ihr Paket.');
  return;
}
```

## API-Methoden

### `trackUpload(companyId, fileSize)`
Fügt die Dateigröße zum Gesamt-Storage hinzu.

### `trackDeletion(companyId, fileSize)`
Entfernt die Dateigröße vom Gesamt-Storage.

### `getStorageUsage(companyId)`
Gibt den aktuellen Verbrauch in Bytes zurück.

### `hasStorageAvailable(companyId, requiredSize)`
Prüft, ob genügend Platz für einen Upload vorhanden ist.

### `getStoragePercentage(companyId)`
Berechnet den Prozentsatz (0-100) des genutzten Speichers.

### `formatBytes(bytes)`
Formatiert Bytes in lesbare Größe (z.B. "1.5 GB").

## Skripte

### Storage neu berechnen

Berechnet den aktuellen Storage-Verbrauch für alle existierenden Dateien:

```bash
# Einzelne Firma
node scripts/calculate-storage-usage.js LLc8PX1VYHfpoFknk8o51LAOfSA2

# Alle Firmen
node scripts/calculate-storage-usage.js
```

Das Skript scannt alle Firebase Storage Pfade:
- `invoices/{companyId}/`
- `companies/{companyId}/`
- `employee_documents/{companyId}/`
- `steuerberater-docs/{companyId}/`

## Bereits integriert in:

✅ `CustomerDocumentsTab` - Kundendokument-Uploads
✅ `financeService.ts` - Rechnungs-PDFs
⏳ `ExpenseComponent` - Beleg-Uploads (TODO)
⏳ `CalendarEventModal` - Kalender-Anhänge (TODO)
⏳ `PersonalService` - Mitarbeiter-Dokumente (TODO)

## Storage-Limits

| Paket | Speicher | Preis/Monat |
|-------|----------|-------------|
| 5 GB  | 5 GB     | €0.99       |
| 20 GB | 20 GB    | €2.99       |
| 50 GB | 50 GB    | €5.99       |
| 100 GB| 100 GB   | €9.99       |

## Monitoring

Die Storage-Card in der Sidebar zeigt den aktuellen Verbrauch an:
- Real-time Updates via Firestore Listener
- Farb-kodierter Fortschrittsbalken
- Upgrade-Button bei Bedarf

## Migration

Für **existierende Systeme** muss einmalig das Storage-Berechnungsskript ausgeführt werden:

```bash
node scripts/calculate-storage-usage.js
```

Dies scannt alle vorhandenen Dateien und aktualisiert die `storageUsed` Felder.

## Best Practices

### Vor Upload prüfen
```typescript
// Prüfe IMMER vor Upload
const hasSpace = await StorageTrackingService.hasStorageAvailable(companyId, file.size);
if (!hasSpace) {
  // Zeige Upgrade-Dialog
  return;
}
```

### Fehlerbehandlung
```typescript
try {
  await uploadBytes(fileRef, file);
  await StorageTrackingService.trackUpload(companyId, file.size);
} catch (error) {
  // Wenn Upload fehlschlägt, wird Storage nicht getrackt
  console.error('Upload failed:', error);
}
```

### Batch-Uploads
```typescript
let totalSize = 0;

for (const file of files) {
  await uploadBytes(fileRef, file);
  totalSize += file.size;
}

// Track als Summe
await StorageTrackingService.trackUpload(companyId, totalSize);
```

## Troubleshooting

### Storage-Anzeige falsch?
Führe das Berechnungsskript aus:
```bash
node scripts/calculate-storage-usage.js <companyId>
```

### Storage wird nicht aktualisiert?
- Prüfe ob `StorageTrackingService` importiert ist
- Prüfe ob `trackUpload()` nach `uploadBytes()` aufgerufen wird
- Prüfe Console für Fehler

### Negative Werte?
Storage kann nie negativ werden durch `increment()`. Falls doch:
```bash
node scripts/calculate-storage-usage.js <companyId>
```

## Zukunft

### Geplante Features:
- [ ] Storage-Analytics Dashboard
- [ ] Email-Benachrichtigungen bei 80%, 90%, 95%
- [ ] Automatische Datei-Kompression
- [ ] Archivierung alter Dokumente
- [ ] Storage-Trends und Prognosen
- [ ] Deduplizierung identischer Dateien
