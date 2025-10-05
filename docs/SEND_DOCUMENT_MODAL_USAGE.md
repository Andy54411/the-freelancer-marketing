# SendDocumentModal - Dynamic Navigation Guide

## Überblick
Das `SendDocumentModal` unterstützt jetzt dynamische Navigation nach Aktionen (Herunterladen, E-Mail, Drucken, Speichern, etc.). Dies ist besonders wichtig für Create-Seiten, wo nach erfolgreichen Aktionen zur entsprechenden Listen- oder Detail-Seite navigiert werden soll.

## Neue Props

### `redirectAfterAction` (optional)
Definiert, wohin nach erfolgreichen Aktionen navigiert werden soll.

**Typ:** `string | ((documentId: string, documentType: string) => string)`

## Verwendung

### 1. Static URL Template (Einfach)
```tsx
<SendDocumentModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  document={document}
  documentType="quote"
  companyId={companyId}
  redirectAfterAction="/dashboard/company/{companyId}/finance/quotes"
  onSend={handleSend}
/>
```

**Verfügbare Platzhalter:**
- `{companyId}` - Wird durch die tatsächliche companyId ersetzt
- `{documentId}` - Wird durch die gespeicherte Dokument-ID ersetzt

### 2. Dynamic Function (Erweitert)
```tsx
<SendDocumentModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  document={document}
  documentType="invoice"
  companyId={companyId}
  redirectAfterAction={(documentId, documentType) => {
    // Custom logic basierend auf Dokument-Typ
    if (documentType === 'invoice') {
      return `/dashboard/company/${companyId}/finance/invoices/${documentId}`;
    }
    return `/dashboard/company/${companyId}/finance/quotes`;
  }}
  onSend={handleSend}
/>
```

## Beispiele für verschiedene Create-Seiten

### Quote Create Page
```tsx
redirectAfterAction="/dashboard/company/{companyId}/finance/quotes"
```

### Invoice Create Page
```tsx
redirectAfterAction="/dashboard/company/{companyId}/finance/invoices"
```

### Reminder Create Page
```tsx
redirectAfterAction="/dashboard/company/{companyId}/finance/reminders"
```

### Complex Logic Example
```tsx
redirectAfterAction={(documentId, documentType) => {
  const baseUrl = `/dashboard/company/${companyId}/finance`;
  
  switch (documentType) {
    case 'invoice':
      return `${baseUrl}/invoices/${documentId}`; // Zur Detail-Seite
    case 'quote':
      return `${baseUrl}/quotes`; // Zur Listen-Seite
    case 'reminder':
      return `${baseUrl}/reminders`; // Zur Listen-Seite
    default:
      return `${baseUrl}/overview`; // Fallback
  }
}}
```

## Navigation-Verhalten

### Nach erfolgreichem Action:
1. **onSend** wird ausgeführt (falls vorhanden)
2. **handleRedirectAfterAction** wird mit der documentId aufgerufen
3. Navigation zur definierten URL
4. **onClose** wird aufgerufen (Modal schließt sich)

### Unterstützte Aktionen:
- ✅ **Herunterladen** (download)
- ✅ **E-Mail versenden** (email)
- ✅ **Drucken** (print)
- ✅ **Speichern** (save)
- ✅ **Per Post versenden** (post)

## Migration bestehender Create-Pages

### Vorher:
```tsx
<SendDocumentModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  document={document}
  documentType="quote"
  companyId={companyId}
  onSend={handleSend}
/>
```

### Nachher:
```tsx
<SendDocumentModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  document={document}
  documentType="quote"
  companyId={companyId}
  redirectAfterAction="/dashboard/company/{companyId}/finance/quotes" // ← Neu hinzufügen
  onSend={handleSend}
/>
```

## Debug/Logs
Die Navigation wird in der Browser-Konsole geloggt:
```
🔀 Redirecting after action to: /dashboard/company/xxx/finance/quotes
```

## Backward Compatibility
Das neue `redirectAfterAction` Prop ist **optional**. Bestehende Implementierungen funktionieren weiterhin, navigieren aber nicht automatisch nach Aktionen.

## Best Practices

1. **Create-Seiten**: Immer zur entsprechenden Listen-Seite navigieren
2. **Edit-Seiten**: Zur Detail-Seite oder zurück zur Liste
3. **Complex Logic**: Function verwenden für documentType-spezifisches Routing
4. **Platzhalter**: Static strings mit `{companyId}` und `{documentId}` für einfache Fälle
