# 📊 Text Template Service - Nutzungsanalyse

## 🎯 Übersicht

Analyse aller Stellen im Code, die `TextTemplateService` verwenden, nach der Migration zu Subcollections.

**Migration Status**: ✅ Alle kritischen Stellen bereits angepasst

---

## ✅ BEREITS KORREKT (Keine Änderungen nötig)

### 1. Read-Only Methoden (kein companyId als Parameter nötig)

Diese Methoden benötigen `companyId` nur als ersten Parameter - **bereits korrekt implementiert**:

#### ✅ `getTextTemplates(companyId)`
```typescript
// Verwendung in:
- /app/dashboard/company/[uid]/finance/invoices/recurring/create/page.tsx (Zeile 1170)
- /app/dashboard/company/[uid]/settings/textvorlagen/page.tsx (Zeile 49)
- /app/dashboard/company/[uid]/finance/invoices/create/page.tsx (Zeile 1161)
- /app/dashboard/company/[uid]/finance/quotes/create/page.tsx (Zeile 1218)
- /app/dashboard/company/[uid]/finance/quotes/[quoteId]/edit/page.tsx (Zeile 1354)
- /app/dashboard/company/[uid]/finance/invoices/[invoiceId]/edit/page.tsx (Zeile 1165)
- /components/finance/HeaderTextEditor.tsx (Zeile 109)
- /components/finance/FooterTextEditor.tsx (Zeile 109)
- /hooks/useTextTemplates.ts (Zeile 19)

✅ Status: Alle korrekt - verwenden bereits uid/companyId
```

#### ✅ `getTextTemplatesByType(companyId, objectType, textType?)`
```typescript
// Verwendung in:
- /components/finance/RecurringInvoiceSettings.tsx (Zeile 79)
- /components/finance/HeaderTextEditor.tsx (Zeile 95, 104)
- /components/finance/FooterTextEditor.tsx (Zeile 95, 104)
- /components/finance/SendInvoiceDialog.tsx (Zeile 63)

✅ Status: Alle korrekt - verwenden bereits companyId als ersten Parameter
```

#### ✅ `createDefaultTemplatesIfNeeded(companyId, userId)`
```typescript
// Verwendung in:
- /app/dashboard/company/[uid]/settings/textvorlagen/page.tsx (Zeile 47)
- /components/finance/HeaderTextEditor.tsx (Zeile 89)
- /components/finance/FooterTextEditor.tsx (Zeile 89)

✅ Status: Alle korrekt - verwenden bereits companyId
```

### 2. Write-Methoden (bereits angepasst)

#### ✅ `createTextTemplate(templateData)`
```typescript
// WICHTIG: companyId ist IN den templateData enthalten!
// Signatur: createTextTemplate(templateData: Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt'>)

// Verwendung in:
- /app/dashboard/company/[uid]/settings/textvorlagen/page.tsx (Zeile 63)
  ✅ Korrekt: templateData enthält bereits companyId
  
- /components/finance/HeaderTextEditor.tsx (Zeile 270)
  ✅ Korrekt: fullTemplateData enthält companyId
  
- /components/finance/FooterTextEditor.tsx (Zeile 253)
  ✅ Korrekt: fullTemplateData enthält companyId

✅ Status: Alle korrekt - kein Refactoring nötig
```

#### ✅ `updateTextTemplate(companyId, templateId, templateData)`
```typescript
// ⚠️ NEUE SIGNATUR: Benötigt jetzt companyId als ersten Parameter!

// Verwendung in:
- /app/dashboard/company/[uid]/settings/textvorlagen/page.tsx (Zeile 71)
  ✅ BEREITS ANGEPASST: updateTextTemplate(uid, editingTemplate.id, templateData)

✅ Status: Bereits korrekt angepasst
```

#### ✅ `deleteTextTemplate(companyId, templateId)`
```typescript
// ⚠️ NEUE SIGNATUR: Benötigt jetzt companyId als ersten Parameter!

// Verwendung in:
- /app/dashboard/company/[uid]/settings/textvorlagen/page.tsx (Zeile 79)
  ✅ BEREITS ANGEPASST: deleteTextTemplate(uid, templateId)

✅ Status: Bereits korrekt angepasst
```

---

## 📋 ZUSAMMENFASSUNG

### Geänderte Methoden-Signaturen

| Methode | Vorher | Nachher | Status |
|---------|--------|---------|--------|
| `getTextTemplates()` | ✅ Bereits `companyId` Parameter | Unverändert | ✅ OK |
| `getTextTemplatesByType()` | ✅ Bereits `companyId` Parameter | Unverändert | ✅ OK |
| `createTextTemplate()` | ✅ `companyId` in Data | Unverändert | ✅ OK |
| `updateTextTemplate()` | ❌ `(templateId, data)` | ✅ `(companyId, templateId, data)` | ✅ **ANGEPASST** |
| `deleteTextTemplate()` | ❌ `(templateId)` | ✅ `(companyId, templateId)` | ✅ **ANGEPASST** |

### Betroffene Dateien

#### ✅ Vollständig angepasst:
1. `/src/services/TextTemplateService.ts` - Service-Layer komplett refactored
2. `/src/app/dashboard/company/[uid]/settings/textvorlagen/page.tsx` - Update/Delete angepasst
3. `/firestore.rules` - Neue Subcollection Rules deployed

#### ✅ Bereits korrekt (kein Refactoring nötig):
- Alle 9 Verwendungen von `getTextTemplates()`
- Alle 4 Verwendungen von `getTextTemplatesByType()`
- Alle 3 Verwendungen von `createDefaultTemplatesIfNeeded()`
- Alle 3 Verwendungen von `createTextTemplate()`

---

## 🔍 DETAILLIERTE DATEI-ANALYSE

### 📄 1. `/app/dashboard/company/[uid]/settings/textvorlagen/page.tsx`
**Status**: ✅ Vollständig angepasst

```typescript
// VORHER:
await TextTemplateService.updateTextTemplate(editingTemplate.id, templateData);
await TextTemplateService.deleteTextTemplate(templateId);

// NACHHER:
await TextTemplateService.updateTextTemplate(uid, editingTemplate.id, templateData);
await TextTemplateService.deleteTextTemplate(uid, templateId);
```

### 📄 2. `/components/finance/HeaderTextEditor.tsx`
**Status**: ✅ Korrekt (kein Refactoring nötig)

```typescript
// createTextTemplate - companyId ist in fullTemplateData:
const fullTemplateData = {
  ...templateData,
  companyId,  // ✅ Bereits enthalten
  createdBy: userId,
};
await TextTemplateService.createTextTemplate(fullTemplateData);

// Andere Methoden verwenden bereits companyId:
await TextTemplateService.getTextTemplates(companyId);
await TextTemplateService.getTextTemplatesByType(companyId, objectType);
```

### 📄 3. `/components/finance/FooterTextEditor.tsx`
**Status**: ✅ Korrekt (kein Refactoring nötig)

```typescript
// Identisch zu HeaderTextEditor - bereits korrekt
const fullTemplateData = {
  ...templateData,
  companyId,  // ✅ Bereits enthalten
  createdBy: userId,
};
await TextTemplateService.createTextTemplate(fullTemplateData);
```

### 📄 4. `/components/finance/RecurringInvoiceSettings.tsx`
**Status**: ✅ Korrekt

```typescript
// Zeile 79 - verwendet bereits companyId:
const templates = await TextTemplateService.getTextTemplatesByType(
  companyId,
  'INVOICE',
  'BODY'
);
```

### 📄 5. `/components/finance/SendInvoiceDialog.tsx`
**Status**: ✅ Korrekt

```typescript
// Zeile 63 - verwendet bereits companyId:
const templates = await TextTemplateService.getTextTemplatesByType(
  companyId,
  'INVOICE',
  'BODY'
);
```

### 📄 6. `/hooks/useTextTemplates.ts`
**Status**: ✅ Korrekt

```typescript
// Zeile 19 - verwendet bereits companyId:
const loadedTemplates = await TextTemplateService.getTextTemplates(companyId);
```

### 📄 7. Alle Invoice/Quote Create/Edit Pages
**Status**: ✅ Korrekt

```typescript
// Alle verwenden bereits uid (companyId):
const templates = await TextTemplateService.getTextTemplates(uid);
```

---

## 🎯 FAZIT

### ✅ Migration Status: 100% Abgeschlossen

**Zusammenfassung:**
- ✅ Service-Layer komplett refactored
- ✅ Alle kritischen Methoden angepasst (`update`, `delete`)
- ✅ Alle bestehenden Verwendungen bereits kompatibel
- ✅ Firestore Rules deployed
- ✅ Migration durchgeführt (32 Templates erfolgreich)
- ✅ Backup erstellt

**Keine weiteren Code-Änderungen erforderlich!**

### 📊 Statistik

- **Geprüfte Dateien**: 13
- **Verwendungen gesamt**: 23
- **Angepasst**: 2 (update/delete in textvorlagen/page.tsx)
- **Bereits korrekt**: 21
- **Fehler**: 0

### 🚀 Nächste Schritte

1. ✅ **Testing**: Alle Template-Funktionen testen
2. ✅ **Update-Notification**: Erstellen (Script bereit)
3. ⏳ **Monitoring**: 30 Tage alte Collection beobachten
4. ⏳ **Cleanup**: Nach 30 Tagen alte Collection löschen

---

## 🔐 Sicherheit

### Firestore Rules Vergleich

**Vorher (Root Collection):**
```javascript
match /textTemplates/{templateId} {
  allow read: if resource.data.companyId == request.auth.uid;
  allow write: if resource.data.companyId == request.auth.uid;
}
```

**Nachher (Subcollection):**
```javascript
match /companies/{companyId}/textTemplates/{templateId} {
  allow read: if request.auth.uid == companyId;
  allow write: if request.auth.uid == companyId;
}
```

**Vorteil:** Pfad-basierte Sicherheit (automatische Isolation durch Subcollection-Struktur)

---

**Erstellt**: 15. Oktober 2025  
**Autor**: Andy Staudinger  
**Status**: ✅ Migration abgeschlossen - Keine weiteren Änderungen nötig
