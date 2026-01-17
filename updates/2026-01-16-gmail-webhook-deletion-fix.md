# GMAIL WEBHOOK - DELETION DETECTION FIX

**Datum:** 16.01.2026  
**Typ:** KRITISCHER BUGFIX  
**Priorität:** 🔴 CRITICAL  
**Status:** ✅ DEPLOYED

---

## PROBLEM

Permanent aus Gmail gelöschte E-Mails tauchten nach Webhook-Sync wieder im Cache auf, was zu:
- E-Mails im falschen Ordner (Papierkorb-E-Mails im Posteingang)
- Gelöschte E-Mails reappearing nach Sync
- Verwirrung für User

**Root Cause:** Die `gmail-webhook.ts` Function hatte KEINE Deletion Detection - nur `gmail-sync-http.ts` wurde gefixed.

---

## LÖSUNG

### 1. Deletion Detection in gmail-webhook.ts (Zeilen 520-545)

```typescript
// WICHTIG: Prüfe welche E-Mails permanent gelöscht wurden (nicht mehr in Gmail)
const existingEmailsSnapshot = await db
  .collection('companies')
  .doc(companyId)
  .collection('emailCache')
  .where('userId', '==', userId)
  .where('source', '==', 'gmail')
  .get();

const existingEmailIds = new Set(existingEmailsSnapshot.docs.map(doc => doc.id));
const gmailEmailIds = new Set(emails.map(email => email.id));

// Finde E-Mails die permanent gelöscht wurden
const deletedEmailIds = Array.from(existingEmailIds).filter(id => !gmailEmailIds.has(id));

if (deletedEmailIds.length > 0) {
  const deleteBatch = db.batch();
  for (const deletedId of deletedEmailIds) {
    const emailRef = db.collection('companies').doc(companyId).collection('emailCache').doc(deletedId);
    deleteBatch.delete(emailRef);
  }
  await deleteBatch.commit();
}
```

### 2. Label Update Logic (Zeilen 555-577)

```typescript
// Prüfe ob E-Mail bereits existiert
const existingEmail = await emailRef.get();

if (existingEmail.exists) {
  const existingData = existingEmail.data();
  const existingLabels = existingData?.labels || [];
  
  // Wenn lokale Label-Änderungen existieren, NICHT mit Gmail überschreiben
  const hasLocalTrash = existingLabels.includes('TRASH');
  const hasLocalSpam = existingLabels.includes('SPAM');
  const hasLocalArchive = existingLabels.includes('ARCHIVED');
  const isLocallyModified = existingData?.locallyModified === true;
  
  if (hasLocalTrash || hasLocalSpam || hasLocalArchive || isLocallyModified) {
    continue; // Überspringe Gmail-Update
  }
  
  // Prüfe ob Labels sich geändert haben
  const labelsChanged = JSON.stringify(existingLabels.sort()) !== JSON.stringify((email.labels || []).sort());
  
  if (labelsChanged) {
    batch.update(emailRef, {
      labels: email.labels.slice(0, 20),
      read: email.read !== undefined ? email.read : existingData.read,
      updatedAt: new Date()
    });
  }
}
```

---

## TECHNISCHE DETAILS

**Betroffene Dateien:**
- `firebase_functions/src/gmail-webhook.ts` - saveEmailsToFirestore Function

**Gmail Sync-Architektur:**
| Sync-Typ | Function | Trigger | Deletion Detection |
|----------|----------|---------|-------------------|
| Real-time | gmail-webhook.ts | Gmail Push Notifications | ✅ JETZT FIXED |
| Manual/Scheduled | gmail-sync-http.ts | HTTP Request | ✅ BEREITS FIXED |

**Firestore Structure:**
```
companies/{companyId}/emailCache/{emailId}
  - labels: string[] (INBOX, TRASH, SPAM, etc.)
  - userId: string
  - source: 'gmail' | 'webmail'
  - locallyModified: boolean (bei lokalen Änderungen)
  - timestamp: Timestamp
```

---

## DEPLOYMENT

```bash
firebase deploy --only functions:gmailWebhook
```

**Status:** ✅ Erfolgreich deployed nach europe-west1

---

## TESTING

1. **Permanent Delete Test:**
   - E-Mail in Gmail permanent löschen (Papierkorb → leeren)
   - Gmail Webhook triggern (automatisch via Push Notification)
   - Verifizieren: E-Mail wird aus Firestore emailCache entfernt

2. **Label Change Test:**
   - E-Mail in Gmail archivieren (ARCHIVED Label)
   - Webhook triggered
   - Verifizieren: Labels im Cache werden aktualisiert

3. **Local Modification Protection Test:**
   - E-Mail in Taskilo in Papierkorb verschieben (locallyModified: true)
   - Gmail Webhook triggered
   - Verifizieren: Lokale Änderung bleibt erhalten, wird NICHT überschrieben

---

## WICHTIG FÜR ZUKUNFT

**IMMER BEIDE SYNC-PATHS FIXEN:**
1. `gmail-webhook.ts` - Real-time Push Notifications (PRIMARY)
2. `gmail-sync-http.ts` - Manual/Scheduled Sync (BACKUP)

Beide Functions müssen identische Deletion-Detection-Logik haben!

---

## RELATED

- `2026-01-16-email-ordner-kritischer-bugfix.md` - Ursprünglicher Fix für gmail-sync-http.ts
- `firebase_functions/src/gmail-sync-http.ts` - Manual Sync Function
- `src/components/email-client/EmailClient.tsx` - Client-Side Label Filtering

---

**Erstellt von:** GitHub Copilot  
**Reviewed von:** Andy Staudinger
