# GMAIL MESSAGE ID EXTRACTION FIX

**Datum:** 16.01.2026  
**Typ:** 🔴 CRITICAL BUGFIX  
**Priorität:** URGENT  
**Status:** ✅ FIXED

---

## PROBLEM

Gmail API Fehler: **"Invalid id value"** beim Verschieben von E-Mails in Papierkorb oder dauerhaftem Löschen.

**Root Cause:**  
Die Firestore `emailId` hat das Format: `a.staudinger32@gmail.com_19b0ce3c8af7c640`  
→ Zusammengesetzt aus: `{userEmail}_{gmailMessageId}`

Der Code sendete die **GESAMTE emailId** an die Gmail API, aber die Gmail API braucht **NUR** den Teil nach dem Unterstrich (`19b0ce3c8af7c640`).

```typescript
// FALSCH (vorher):
gmailMessageId = emailData?.messageId || emailData?.id || emailId;
// → Sendet: "a.staudinger32@gmail.com_19b0ce3c8af7c640"
// → Gmail API Error: "Invalid id value"

// RICHTIG (jetzt):
if (emailId.includes('_')) {
  gmailMessageId = emailId.split('_')[1]; // → "19b0ce3c8af7c640"
}
```

---

## LÖSUNG

### Betroffene Dateien:
1. `src/app/api/company/[uid]/emails/[emailId]/trash/route.ts`
2. `src/app/api/company/[uid]/emails/[emailId]/delete/route.ts`

### Code-Änderung:

```typescript
// Gmail Message ID extrahieren
// Format: email@address_gmailMessageId -> wir brauchen nur den Teil nach dem Unterstrich
if (emailData?.messageId) {
  gmailMessageId = emailData.messageId;
} else if (emailData?.gmailMessageId) {
  gmailMessageId = emailData.gmailMessageId;
} else if (emailId.includes('_')) {
  // Extrahiere Gmail Message ID aus zusammengesetzter ID
  gmailMessageId = emailId.split('_')[1];
} else {
  gmailMessageId = emailId;
}
```

**Logik:**
1. Prüfe zuerst `emailData.messageId` (falls explizit gespeichert)
2. Prüfe `emailData.gmailMessageId` (falls vorhanden)
3. Falls `emailId` einen Unterstrich enthält → Split nach Unterstrich, nimm zweiten Teil
4. Fallback: Verwende `emailId` direkt

---

## TECHNISCHE DETAILS

### Firestore emailCache Structure:
```
companies/{companyId}/emailCache/{emailId}
  - id: "a.staudinger32@gmail.com_19b0ce3c8af7c640"
  - messageId: "19b0ce3c8af7c640" (optional)
  - gmailMessageId: "19b0ce3c8af7c640" (optional)
  - labels: ["INBOX", "UNREAD"]
  - userId: "LSeyPKLSCXTnyQd48Vuc6JLx7nH2"
```

### Gmail API Calls:
| Function | Gmail API Methode | Benötigt |
|----------|-------------------|----------|
| trash | `gmail.users.messages.trash()` | Nur Gmail Message ID |
| untrash | `gmail.users.messages.untrash()` | Nur Gmail Message ID |
| delete | `gmail.users.messages.delete()` | Nur Gmail Message ID |

---

## TESTING

### Vor dem Fix:
```
⚠️ Gmail API Fehler (nicht kritisch): Error: Invalid id value
    at async trashEmailInGmail (src/app/api/company/[uid]/emails/[emailId]/trash/route.ts:52:6)
{
  config: [Object],
  response: [Response],
  code: 400,
  status: 400,
}
```

### Nach dem Fix:
```
✅ Gmail: E-Mail 19b0ce3c8af7c640 in Papierkorb verschoben
✅ Gmail Sync erfolgreich für a.staudinger32@gmail.com_19b0ce3c8af7c640
✅ Email a.staudinger32@gmail.com_19b0ce3c8af7c640 trash status updated to true
```

---

## WICHTIG FÜR ZUKUNFT

**BEI JEDEM Gmail API Call MUSS die Message ID korrekt extrahiert werden:**
- NIEMALS die zusammengesetzte Firestore `emailId` direkt an Gmail API senden
- IMMER den Teil nach dem Unterstrich extrahieren
- Oder `messageId` / `gmailMessageId` Feld in Firestore speichern

**Betroffene Gmail API Endpoints:**
- `gmail.users.messages.trash()`
- `gmail.users.messages.untrash()`
- `gmail.users.messages.delete()`
- `gmail.users.messages.modify()`
- `gmail.users.messages.get()`

---

## RELATED

- `firebase_functions/src/gmail-webhook.ts` - Verwendet korrekte Gmail Message IDs
- `firebase_functions/src/gmail-sync-http.ts` - Verwendet korrekte Gmail Message IDs
- `2026-01-16-gmail-webhook-deletion-fix.md` - Vorheriger Gmail Fix

---

**Erstellt von:** GitHub Copilot  
**Reviewed von:** Andy Staudinger
