# 🔄 OCR Migration Guide

## Batch-OCR für bestehende Dokumente

Wenn du bereits Dokumente hochgeladen hast (ohne OCR), kannst du diese nachträglich verarbeiten.

---

## Option 1: Manuell über UI

1. Öffne das **Kunden-Dokumente-Tab**
2. Dokumente ohne OCR haben den **"OCR neu verarbeiten"** Button (🔄)
3. Klicke auf den Button für jedes Dokument
4. Warte auf Completion-Toast ✅

**Geeignet für:** 1-10 Dokumente

---

## Option 2: Bulk-Script (Firebase Function)

Erstelle eine neue Firebase Function für Batch-Processing:

```typescript
// firebase_functions/src/batch-ocr.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const batchOCRDocuments = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    const { companyId, customerId, limit = 10 } = data;

    // 1. Hole alle Dokumente ohne OCR
    const documentsRef = admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('customers')
      .doc(customerId)
      .collection('documents');

    const snapshot = await documentsRef
      .where('ocrStatus', '==', null)
      .limit(limit)
      .get();

    const results = [];

    // 2. Verarbeite jedes Dokument
    for (const doc of snapshot.docs) {
      const document = doc.data();
      
      try {
        // Call OCR API
        const response = await fetch('YOUR_CLOUD_FUNCTION_URL/finance/ocr/extract-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: document.url,
            companyId,
            enhanced: true,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Update document
          await doc.ref.update({
            ocrStatus: 'completed',
            ocrProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            ocrText: result.data.fullText,
            ocrMetadata: {
              invoiceNumber: result.data.invoiceNumber,
              totalAmount: result.data.totalAmount,
              // ... other fields
            },
          });

          results.push({ id: doc.id, status: 'success' });
        } else {
          results.push({ id: doc.id, status: 'failed', error: result.error });
        }
      } catch (error) {
        results.push({ id: doc.id, status: 'error', error: error.message });
      }

      // Delay zwischen Requests (Rate Limiting)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { processed: results.length, results };
  });
```

**Verwendung:**

```typescript
const batchOCR = httpsCallable(functions, 'batchOCRDocuments');
const result = await batchOCR({
  companyId: 'LLc8PX1VYHfpoFknk8o51LAOfSA2',
  customerId: 'KswA2hGnvV5nl1IIBXLv',
  limit: 50, // Max. Dokumente pro Durchlauf
});

console.log('Processed:', result.data.processed);
```

**Geeignet für:** 10-1000 Dokumente

---

## Option 3: Admin-Script (Node.js)

Für sehr viele Dokumente (>1000), erstelle ein lokales Script:

```typescript
// scripts/migrate-ocr.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from './serviceAccountKey.json';

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function migrateOCR(companyId: string) {
  const customersRef = db.collection('companies').doc(companyId).collection('customers');
  const customersSnapshot = await customersRef.get();

  let totalProcessed = 0;

  for (const customerDoc of customersSnapshot.docs) {
    const documentsRef = customerDoc.ref.collection('documents');
    const documentsSnapshot = await documentsRef
      .where('ocrStatus', '==', null)
      .get();

    console.log(`Customer ${customerDoc.id}: ${documentsSnapshot.size} documents without OCR`);

    for (const docSnapshot of documentsSnapshot.docs) {
      const document = docSnapshot.data();

      try {
        const response = await fetch('https://YOUR_API_URL/api/finance/ocr-cloud-storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: document.url,
            companyId,
            enhanced: true,
          }),
        });

        const result = await response.json();

        if (result.success) {
          await docSnapshot.ref.update({
            ocrStatus: 'completed',
            ocrProcessedAt: new Date(),
            ocrText: result.data.fullText,
            ocrMetadata: result.data,
          });

          totalProcessed++;
          console.log(`✓ ${document.originalName}`);
        } else {
          console.error(`✗ ${document.originalName}: ${result.error}`);
        }
      } catch (error) {
        console.error(`✗ ${document.originalName}:`, error);
      }

      // Rate limiting: 1 request per 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\nTotal processed: ${totalProcessed}`);
}

// Run migration
migrateOCR('LLc8PX1VYHfpoFknk8o51LAOfSA2')
  .then(() => console.log('Migration complete'))
  .catch(console.error);
```

**Ausführen:**

```bash
cd scripts
npx tsx migrate-ocr.ts
```

**Geeignet für:** >1000 Dokumente

---

## ⚠️ Wichtige Hinweise

### Rate Limits

- **AWS Textract**: 10 Requests/Sekunde
- **Firebase Functions**: 1000 concurrent executions
- **Empfehlung**: Max. 30 Dokumente/Minute

### Kosten

- **AWS Textract**: ~$1.50 pro 1000 Seiten
- **Firebase Functions**: ~$0.40 pro 1M invocations
- **Storage**: ~$0.026 per GB/Monat

**Beispiel:**
- 1000 Dokumente (je 2 Seiten)
- Kosten: ~$3 für OCR + $0.40 für Functions = **$3.40**

### Fehlerbehandlung

Bei Fehlern wird `ocrStatus: 'failed'` gesetzt. Diese Dokumente können mit dem Re-process-Button erneut verarbeitet werden.

### Monitoring

Überwache den Fortschritt:

```typescript
// Count documents by OCR status
const stats = await db
  .collection('companies')
  .doc(companyId)
  .collection('customers')
  .doc(customerId)
  .collection('documents')
  .get();

const statusCounts = {
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  no_ocr: 0,
};

stats.docs.forEach(doc => {
  const status = doc.data().ocrStatus || 'no_ocr';
  statusCounts[status]++;
});

console.log('OCR Status:', statusCounts);
```

---

## 🎯 Empfohlene Strategie

1. **Starte klein**: 10 Dokumente als Test
2. **Prüfe Qualität**: Schaue dir OCR-Confidence an
3. **Skaliere langsam**: 100 → 1000 → alle
4. **Überwache Kosten**: AWS CloudWatch aktivieren
5. **Fehler nachbearbeiten**: Failed Documents manuell prüfen

---

**Stand:** 10. Oktober 2025  
**Version:** 1.0
