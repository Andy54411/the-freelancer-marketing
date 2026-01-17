# E-Mail-Ordner Kritischer Bugfix (Gmail + Webmail)

**Datum:** 16. Januar 2026  
**Priorität:** KRITISCH 🔥  
**Typ:** Bugfix

## Problem

ALLE E-Mails wurden im Papierkorb angezeigt UND permanent gelöschte E-Mails kamen beim nächsten Sync wieder. Dies betraf sowohl Gmail-verbundene Konten als auch Webmail-Accounts.

### 1. Gmail: Permanent gelöschte E-Mails kamen wieder

**Was war falsch:**
- Beim Gmail-Sync wurden alle E-Mails von Gmail geholt und in den Firebase Cache geschrieben
- E-Mails die permanent gelöscht wurden (aus Gmail entfernt) blieben im Firebase Cache
- Beim nächsten Sync erschienen diese E-Mails wieder in der UI

**Lösung in `firebase_functions/src/gmail-sync-http.ts`:**
```typescript
// VORHER: Keine Prüfung auf gelöschte E-Mails

// NACHHER: Prüfe welche E-Mails permanent gelöscht wurden
const existingEmailsSnapshot = await db
  .collection('companies').doc(companyId).collection('emailCache')
  .where('userId', '==', effectiveUserId)
  .where('source', '==', 'gmail_http_sync')
  .get();

const existingEmailIds = new Set(existingEmailsSnapshot.docs.map(doc => doc.id));
const gmailEmailIds = new Set(emails.map(email => email.id));

// Finde E-Mails die gelöscht wurden (im Cache aber nicht mehr in Gmail)
const deletedEmailIds = Array.from(existingEmailIds).filter(id => !gmailEmailIds.has(id));

// Lösche sie aus dem Cache
for (const deletedId of deletedEmailIds) {
  batch.delete(emailCacheRef.doc(deletedId));
}
```

### 2. Webmail: Falsche Label-Zuweisung beim Sync
E-Mails aus **allen Ordnern** (Gesendet, Papierkorb, Spam etc.) erhielten beim Sync **immer** das Label `['INBOX']`, egal in welchem Ordner sie sich befanden.

**Vorher:**
```typescript
labels: ['INBOX'],  // ❌ FALSCH - alle E-Mails bekamen INBOX-Label
labelIds: ['INBOX'],
```

**Nachher:**
```typescript
// ✅ KORREKT - E-Mails erhalten das Label des Ordners
const folderToLabel: Record<string, string> = {
  'INBOX': 'INBOX',
  'Sent': 'SENT',
  'Trash': 'TRASH',
  'Junk': 'SPAM',
  // etc.
};
const emailLabel = folderToLabel[requestedMailbox] || 'INBOX';
labels: [emailLabel],
labelIds: [emailLabel],
```

### 2. Kategoriefilterung blendete alle E-Mails aus
Im WebmailClient wurde eine Gmail-Style-Kategorisierung angewendet, die **ALLE** E-Mails filterte, wenn sie nicht zur aktiven Kategorie passten. Da die Kategorisierung nicht korrekt funktionierte, wurden alle E-Mails ausgeblendet.

**Vorher:**
```typescript
if (currentMailbox.toLowerCase() === 'inbox') {
  filtered = filtered.filter(msg => categorizeEmail(msg) === activeCategory);
  // ❌ Filtert ALLE E-Mails raus!
}
```

**Nachher:**
```typescript
// ✅ Kategoriefilterung deaktiviert
// BUGFIX: Kategoriefilterung deaktiviert, da sie alle E-Mails ausblendet
// TODO: Kategorisierung muss überarbeitet werden
```

### 3. Unvollständiger Ordner-Sync
Beim Webmail-Sync wurde **nur der aktuell angefragte Ordner** synchronisiert. Wenn der Benutzer dann den Ordner wechselte, waren keine E-Mails vorhanden.

**Vorher:**
```typescript
await syncWebmailEmails(uid, email, password, folder);
// ❌ Nur ein Ordner wird geladen
```

**Nachher:**
```typescript
// ✅ ALLE wichtigen Ordner werden synchronisiert
const foldersToSync = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Junk'];
for (const folderName of foldersToSync) {
  await syncWebmailEmails(uid, email, password, folderName.toLowerCase());
}
```

## Auswirkung

- ✅ E-Mails werden jetzt im **richtigen Ordner** angezeigt
- ✅ Posteingang zeigt nur INBOX-E-Mails (ohne Trash/Spam)
- ✅ Papierkorb zeigt nur gelöschte E-Mails
- ✅ Gesendet zeigt nur gesendete E-Mails
- ✅ Alle Ordner werden beim ersten Sync geladen

## Betroffene Dateien

**Gmail-System:**
1. `firebase_functions/src/gmail-sync-http.ts` - Permanente Löschungen werden jetzt erkannt und aus Cache entfernt

**Webmail-System:**
1. `src/app/api/company/[uid]/emails/route.ts` - Korrekte Label-Zuweisung und Löschungen
2. `src/components/webmail/WebmailClient.tsx` - Kategoriefilterung deaktiviert
3. `webmail-proxy/src/services/EmailService.ts` - Permanentes Löschen hinzugefügt
4. `webmail-proxy/src/routes/actions.ts` - permanentDelete Action
5. `src/app/api/webmail/actions/route.ts` - permanentDelete Support

**Dokumentation:**
6. `updates/2026-01-16-email-ordner-kritischer-bugfix.md` - Diese Notification

## Migration

Keine Migration erforderlich. Der Fix ist sofort wirksam.

## Nächste Schritte

1. **Kategorisierung überarbeiten** - Die Gmail-Style-Kategorien (Primary, Promotions, Social, Updates) müssen neu implementiert werden
2. **Cache-Optimierung** - Prüfen ob alle 5 Ordner immer geladen werden müssen oder nur bei Bedarf
3. **Testing** - Umfassende Tests für alle E-Mail-Ordner durchführen

## Testing

Getestet mit:
- ✅ Posteingang (INBOX)
- ✅ Gesendet (Sent)
- ✅ Entwürfe (Drafts)
- ✅ Papierkorb (Trash)
- ✅ Spam (Junk)
