# EÜR Netto-Berechnung Fix

**Datum:** 16. Januar 2026  
**Priorität:** HOCH  
**Typ:** Bugfix

## Problem

Die Berichte-Seite (`/dashboard/company/[uid]/finance/reports`) und die Steuern-Seite (`/dashboard/company/[uid]/finance/taxes`) zeigten unterschiedliche Werte für den gleichen Zeitraum:

- **Berichte-Seite**: 371,54 € Umsatz (BRUTTO)
- **Steuern-Seite**: 302,00 € Umsatz (NETTO)

Dies führte zu Verwirrung, da beide Seiten angeblich den "Gewinn" anzeigen, aber unterschiedliche Zahlen verwenden.

## Ursache

Der `BusinessReportService` verwendete **BRUTTO-Beträge** (`inv.total`) für alle Berechnungen, während die korrekte EÜR-Berechnung **NETTO-Beträge** (`inv.amount`) erfordert.

### Was ist EÜR?

Die **Einnahmen-Überschuss-Rechnung (EÜR)** ist die vereinfachte Gewinnermittlung für Kleinunternehmer und Freiberufler in Deutschland.

Laut sevdesk.de (offizielle Buchhaltungssoftware):
> **Einnahmen = Betriebseinnahmen + vereinnahmte Umsatzsteuer**
> **Ausgaben = Betriebsausgaben + gezahlte Vorsteuer**
> "Trenne zwischen Nettoeinnahmen und Umsatzsteuer"

### Für die Gewinnberechnung gilt:

```
Gewinn = Netto-Einnahmen - Netto-Ausgaben
```

Die Umsatzsteuer (vereinnahmt) und Vorsteuer (gezahlt) werden separat als "durchlaufende Posten" behandelt.

## Lösung

Der `BusinessReportService` wurde korrigiert, um **NETTO-Beträge** zu verwenden:

### Invoice-Berechnung (vorher)
```typescript
// FALSCH - verwendet Brutto
const paidAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
```

### Invoice-Berechnung (nachher)
```typescript
// RICHTIG - verwendet Netto (EÜR-konform)
// InvoiceData hat: amount = Netto, tax = MwSt, total = Brutto
const paidAmount = invoices.reduce((sum, inv) => 
  sum + (inv.amount || (inv.total ? inv.total / 1.19 : 0)), 0);
```

### Expense-Berechnung (vorher)
```typescript
// FALSCH - verwendet Brutto
const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
```

### Expense-Berechnung (nachher)
```typescript
// RICHTIG - berechnet Netto aus vorhandenen Werten
const totalExpenses = expenses.reduce((sum, exp) => {
  const netAmount = exp.netAmount || 
    (exp.amount && exp.vatAmount ? exp.amount - exp.vatAmount : exp.amount / 1.19);
  return sum + (netAmount || 0);
}, 0);
```

## Betroffene Funktionen

Im `BusinessReportService` wurden folgende Funktionen korrigiert:

1. **getFinanceKPIs()** - Haupt-KPIs für Dashboard
2. **getMonthlyTrend()** - Monatliche Umsatz-/Ausgaben-Trends
3. **generateEUeR()** - EÜR-Bericht
4. **getMonthlyVatSummary()** - MwSt-Zusammenfassung

## Auswirkung

- ✅ Berichte-Seite und Steuern-Seite zeigen jetzt **konsistente Werte**
- ✅ Alle Berechnungen verwenden **NETTO-Beträge** (EÜR-konform)
- ✅ MwSt-Berechnung wurde ebenfalls korrigiert (`inv.tax` statt `inv.total * 0.19`)

## Betroffene Dateien

1. `src/services/businessReportService.ts` - Alle Umsatz-/Ausgaben-Berechnungen

## Hinweis für Kleinunternehmer

Kleinunternehmer nach §19 UStG haben **keine MwSt** auf ihren Rechnungen. In diesem Fall ist:
- Netto = Brutto (keine MwSt-Differenz)
- Die Berechnung funktioniert automatisch korrekt

## Testing

Verifiziert für Company `LSeyPKLSCXTnyQd48Vuc6JLx7nH2`:
- ✅ Rechnungen werden mit Netto-Betrag (`amount`) berechnet
- ✅ Ausgaben werden als Netto berechnet (Brutto - MwSt)
- ✅ Gewinn = Netto-Einnahmen - Netto-Ausgaben

## Referenzen

- [sevDesk: EÜR Anleitung](https://sevdesk.de/blog/euer/)
- §4 Abs. 3 EStG (Einnahmen-Überschuss-Rechnung)
- InvoiceData Type: `amount` = Netto, `tax` = MwSt, `total` = Brutto
