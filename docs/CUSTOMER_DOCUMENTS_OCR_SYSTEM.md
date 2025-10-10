# 📄 Customer Documents OCR System

## Übersicht

Das **Customer Documents Tab** ist jetzt ein vollwertiges **Cloud-Dokumentenmanagementsystem mit intelligenter OCR-Verarbeitung**. Kunden können ihre Geschäftsdokumente hochladen und das System extrahiert automatisch alle relevanten Daten.

---

## 🎯 Features

### ✅ Phase 1: OCR-Integration (ABGESCHLOSSEN)

#### 1. **Automatische OCR-Verarbeitung beim Upload**
- Erkennung OCR-fähiger Dateien (PDF, Bilder)
- Automatischer Start der OCR-Verarbeitung im Hintergrund
- Non-blocking: Upload ist sofort fertig, OCR läuft asynchron

#### 2. **Receipt-Upload-Komponente Integration**
- Verwendet die bewährte `ReceiptPreviewUpload` Komponente
- Live-Vorschau während des Uploads
- Progress-Tracking ("Datei wird hochgeladen...", "OCR läuft...")
- Enhanced Mode mit Gemini AI

#### 3. **OCR-Status-Tracking**
```typescript
ocrStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable'
```

Visuelle Status-Badges:
- 🔄 **OCR wartet** (gelb)
- ⚡ **OCR läuft** (blau)
- ✓ **OCR fertig** (grün) mit Konfidenz-Prozent
- ✗ **OCR fehlgeschlagen** (rot)

#### 4. **Intelligente Daten-Extraktion**
Automatisch extrahiert aus Rechnungen:
- 📄 Lieferantenname
- 🔢 Rechnungsnummer
- 📅 Rechnungsdatum
- 💰 Gesamtbetrag, Nettobetrag, MwSt
- 💱 Währung
- 📋 Zahlungsbedingungen
- 🏢 USt-IdNr

#### 5. **Metadata-Anzeige in Dokumentenliste**
- Rechnungsdaten direkt sichtbar
- Keine zusätzlichen Klicks nötig
- Kompakte Darstellung mit Icons

#### 6. **Re-process OCR Button**
- Button für Dokumente ohne OCR oder mit Fehler
- Manuelle Neuverarbeitung möglich
- Nur bei PDF/Bildern sichtbar

---

## 🏗️ Technische Architektur

### Workflow

```
1. User lädt Dokument hoch (via ReceiptPreviewUpload)
   ↓
2. Datei → Cloud Storage (/api/storage/upload)
   ↓
3. Storage URL wird zurückgegeben
   ↓
4. OCR-Processing (/api/finance/ocr-cloud-storage)
   ↓
5. Firebase Function: AWS Textract + Gemini AI
   ↓
6. Extrahierte Daten werden zurückgegeben
   ↓
7. Dokument wird in Firestore gespeichert (mit OCR-Daten)
   ↓
8. Activity Log wird erstellt
   ↓
9. User sieht Rechnungsdaten direkt in der Liste!
```

### Komponenten-Stack

```typescript
CustomerDocumentsTab
  ├── ReceiptPreviewUpload (Upload + OCR)
  │   ├── /api/storage/upload (Cloud Storage)
  │   └── /api/finance/ocr-cloud-storage (OCR Processing)
  │       └── Firebase Function: financeApiWithOCR
  │           ├── AWS Textract (Text-Extraktion)
  │           └── Gemini AI (Intelligente Analyse)
  │
  ├── handleOCRDataExtracted() (Daten speichern)
  ├── reprocessDocumentOCR() (Neuverarbeitung)
  └── Document List (mit OCR-Metadata)
```

---

## 📊 Datenmodell

### DocumentItem Interface

```typescript
interface DocumentItem {
  id: string;
  originalName: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Timestamp;
  category: 'contract' | 'invoice' | 'certificate' | 'correspondence' | 'other';
  uploadedBy: string;
  uploadedByName: string;
  description?: string;
  url: string;
  
  // OCR Fields
  ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';
  ocrProcessedAt?: Timestamp;
  ocrText?: string;
  ocrConfidence?: number; // 0-100%
  ocrError?: string;
  
  ocrMetadata?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: number;
    netAmount?: number;
    vatAmount?: number;
    vatRate?: number;
    supplierName?: string;
    supplierAddress?: string;
    supplierVatId?: string;
    currency?: string;
    paymentTerms?: string;
    extractedAt?: string;
    provider?: string; // 'AWS_TEXTRACT' | 'GOOGLE_VISION' | 'GEMINI_AI'
  };
}
```

### Firestore Collections

```
companies/{companyId}/customers/{customerId}/
  ├── documents/          (Dokumente mit OCR-Daten)
  └── activities/         (Upload-Logs)
```

---

## 🚀 Verwendung

### Für Endbenutzer

1. **Dokument hochladen**
   - Drag & Drop oder Datei auswählen
   - Unterstützte Formate: PDF, Bilder, Word, Excel
   - Max. 15MB

2. **Automatische Verarbeitung**
   - System zeigt Progress an
   - OCR läuft im Hintergrund
   - Keine manuelle Eingabe nötig

3. **Daten prüfen**
   - Extrahierte Daten werden angezeigt
   - Bei Bedarf OCR neu starten
   - Dokument ist sofort durchsuchbar

### Für Entwickler

#### Handler integrieren

```typescript
import { CustomerDocumentsTab } from '@/components/finance/customer-detail';

<CustomerDocumentsTab
  customer={customer}
  companyId={companyId}
  onDocumentsCountChange={(count) => console.log('Docs:', count)}
/>
```

#### OCR neu verarbeiten

```typescript
const reprocessDocumentOCR = async (document: DocumentItem) => {
  const response = await fetch('/api/finance/ocr-cloud-storage', {
    method: 'POST',
    body: JSON.stringify({
      fileUrl: document.url,
      companyId,
      enhanced: true,
    }),
  });
  
  const result = await response.json();
  // Update document with result.data
};
```

---

## 🎨 UI-Komponenten

### Upload-Bereich
```tsx
<Card className="border-2 border-[#14ad9f]/20">
  <CardHeader className="bg-gradient-to-r from-[#14ad9f]/5">
    <Sparkles /> Intelligenter Dokument-Upload mit OCR
  </CardHeader>
  <ReceiptPreviewUpload ... />
</Card>
```

### Dokument mit OCR-Daten
```tsx
<div className="document-item">
  <h4>{document.originalName}</h4>
  <Badge>Rechnung</Badge>
  <Badge>✓ OCR fertig (92%)</Badge>
  
  {/* OCR Metadata */}
  <div>
    📄 Lieferant: Amazon Web Services
    🔢 Rechnungs-Nr.: RE-2024-001
    💰 Betrag: 238,00 EUR
    📅 Datum: 10.10.2025
  </div>
</div>
```

---

## 🔧 Konfiguration

### OCR-Einstellungen

```typescript
const ocrSettings = {
  language: 'de',
  detectInvoice: true,
  extractVAT: true,
  extractDates: true,
  extractAmounts: true,
};
```

### Enhanced Mode (Gemini AI)

```typescript
<ReceiptPreviewUpload
  enhancedMode={true}  // Aktiviert Gemini AI
  ocrSettings={ocrSettings}
/>
```

---

## 📈 Performance

- **Upload**: ~2-5 Sekunden
- **OCR Processing**: ~5-15 Sekunden (abhängig von Dateigröße)
- **Total Time**: ~7-20 Sekunden bis Daten angezeigt werden

### Optimierungen

1. **Non-blocking Upload**: Dokument ist sofort verfügbar
2. **Background Processing**: OCR läuft asynchron
3. **Progressive Updates**: UI wird live aktualisiert
4. **Caching**: OCR-Ergebnisse werden gespeichert

---

## 🐛 Troubleshooting

### OCR schlägt fehl

**Symptom**: Document hat `ocrStatus: 'failed'`

**Lösung**:
1. "OCR neu verarbeiten" Button klicken
2. Prüfen ob Datei lesbar ist (nicht gescannt mit schlechter Qualität)
3. Firebase Function Logs prüfen

### Keine OCR-Daten extrahiert

**Symptom**: `ocrMetadata` ist leer

**Mögliche Ursachen**:
- Dokument ist keine Rechnung
- Text ist nicht maschinenlesbar
- OCR hat keine strukturierten Daten gefunden

**Lösung**:
- Enhanced Mode aktivieren (Gemini AI)
- Dokument als Bild/PDF neu hochladen
- Manuelle Dateneingabe

### Langsame Verarbeitung

**Symptom**: OCR dauert > 30 Sekunden

**Mögliche Ursachen**:
- Große Datei (>10MB)
- Viele Seiten (>20 Seiten)
- AWS/Firebase Limits

**Lösung**:
- Datei komprimieren
- Dokument in kleinere Teile aufteilen
- Firebase Function Timeout erhöhen

---

## 🚧 Roadmap

### Phase 2: Volltextsuche (GEPLANT)

- [ ] Suche im `ocrText` aller Dokumente
- [ ] Highlight von Suchbegriffen in Preview
- [ ] Fuzzy Search für Tippfehler

### Phase 3: Advanced Filtering (GEPLANT)

- [ ] Filter nach Betrag (z.B. "> 1000 EUR")
- [ ] Filter nach Datum (Zeitraum)
- [ ] Filter nach Lieferant
- [ ] Multi-Select Kategorien

### Phase 4: Ordner-Struktur (GEPLANT)

- [ ] Hierarchische Ordner
- [ ] Drag & Drop zwischen Ordnern
- [ ] Ordner-Freigabe

### Phase 5: Batch Operations (GEPLANT)

- [ ] Mehrere Dokumente gleichzeitig hochladen
- [ ] Batch-OCR für alte Dokumente
- [ ] Bulk-Download als ZIP

### Phase 6: Advanced Features (GEPLANT)

- [ ] Dokumenten-Versionierung
- [ ] Kommentare & Annotations
- [ ] E-Signatur-Integration
- [ ] Workflow-Automation (z.B. "Bei Rechnung > 1000€ → Approval")

---

## 📝 Best Practices

### Für Admins

1. **OCR-Qualität überwachen**
   - Regelmäßig `ocrConfidence` prüfen
   - Bei <70% Dokument neu verarbeiten

2. **Storage-Kosten optimieren**
   - Alte Dokumente archivieren
   - Kompression aktivieren
   - Lifecycle Policies setzen

3. **Compliance sicherstellen**
   - GoBD-konforme Archivierung
   - Audit-Logs aktivieren
   - Zugriffsrechte prüfen

### Für Entwickler

1. **Error Handling**
   ```typescript
   try {
     await handleOCRDataExtracted(data);
   } catch (error) {
     // Fallback: Dokument ohne OCR speichern
     await saveDocumentWithoutOCR(data);
   }
   ```

2. **Progress Feedback**
   ```typescript
   toast.info('🔍 OCR läuft...');
   toast.success('✅ Fertig!');
   toast.error('❌ Fehler');
   ```

3. **Lazy Loading**
   ```typescript
   // Nur OCR-Metadaten laden, nicht den vollständigen Text
   const documents = await getDocuments({ includeOcrText: false });
   ```

---

## 🔗 Links

- [Firebase Function: financeApiWithOCR](../firebase_functions/src/finance/functions/finance-http.ts)
- [OCR Cloud Storage API](../src/app/api/finance/ocr-cloud-storage/route.ts)
- [Receipt Upload Component](../src/components/finance/ReceiptPreviewUpload.tsx)
- [Customer Documents Tab](../src/components/finance/customer-detail/CustomerDocumentsTab.tsx)

---

**Stand:** 10. Oktober 2025  
**Version:** 2.0 (mit Receipt-Upload-Integration)  
**Status:** ✅ Phase 1 abgeschlossen
