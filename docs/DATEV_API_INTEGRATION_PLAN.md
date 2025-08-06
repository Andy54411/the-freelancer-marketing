# DATEV API Integration Plan für Taskilo

## Verfügbare DATEV Sandbox APIs

### 1. 🏪 cashregister:import (v2.6.0)
**Zweck**: Kassendaten-Import für Bargeld-Transaktionen
- **Use Case**: Handwerker/Services mit Barzahlungen
- **Integration**: Taskilo → DATEV Kassenbuch
- **Beispiel**: Reinigungskraft erhält 50€ bar → automatisch ins DATEV-Kassenbuch

### 2. 👥 master-data:master-clients (v3)
**Zweck**: Mandanten-Stammdaten synchronisieren
- **Use Case**: Kundendaten zwischen Taskilo und DATEV abgleichen
- **Integration**: Bidirektionale Synchronisation
- **Beispiel**: Neue Taskilo-Kunden → automatisch als DATEV-Mandanten anlegen

### 3. 📄 accounting:extf-files (v2.0)
**Zweck**: DATEV-Buchungsdateien generieren
- **Use Case**: Alle Taskilo-Transaktionen für Steuerberater exportieren
- **Integration**: Stripe-Payments → DATEV-Buchungssätze
- **Beispiel**: Monatlicher Export aller Service-Buchungen als EXTF-Datei

### 4. ⚙️ accounting:dxso-jobs (v2.0)
**Zweck**: Batch-Verarbeitung von Buchungsjobs
- **Use Case**: Große Mengen Stripe-Transaktionen stapelweise verarbeiten
- **Integration**: Asynchrone Verarbeitung für Performance
- **Beispiel**: Nächtlicher Job für alle Tages-Transaktionen

### 5. 📋 accounting:documents (v2.0)
**Zweck**: Belege und Dokumente verwalten
- **Use Case**: Alle Taskilo-Rechnungen automatisch archivieren
- **Integration**: PDF-Rechnungen → DATEV-Belegarchiv
- **Beispiel**: Service-Rechnung wird automatisch als DATEV-Beleg gespeichert

## Implementierungsreihenfolge

### Phase 1: Grundlagen (Woche 1-2)
1. ✅ **Token-Management** - Invalid Token Handling beheben
2. ✅ **Organizations API** - Mandanten-Zuordnung
3. 🔄 **master-data:master-clients** - Kundendaten-Sync

### Phase 2: Transaktionen (Woche 3-4)
1. **accounting:extf-files** - Stripe → DATEV Buchungen
2. **accounting:dxso-jobs** - Batch-Verarbeitung
3. **cashregister:import** - Bar-Transaktionen

### Phase 3: Dokumentation (Woche 5-6)
1. **accounting:documents** - Rechnungs-Archivierung
2. **Steuerberater-Portal** - Vollständige Integration
3. **Automatisierung** - Scheduled Jobs

## API-Endpunkte in Taskilo

### Bestehend:
- `/api/datev/organizations` ✅
- `/api/datev/status` ✅
- `/api/datev/auth-cookie` ✅

### Zu implementieren:
- `/api/datev/clients` (master-data:master-clients)
- `/api/datev/export` (accounting:extf-files)
- `/api/datev/jobs` (accounting:dxso-jobs)
- `/api/datev/documents` (accounting:documents)
- `/api/datev/cashregister` (cashregister:import)

## Nutzen für Taskilo-User

### Für Service-Anbieter:
- 📊 **Automatische Buchhaltung**: Alle Einnahmen automatisch in DATEV
- 💰 **Kassenbuch**: Barzahlungen werden erfasst
- 📄 **Belegarchiv**: Alle Rechnungen automatisch archiviert
- ⏰ **Zeitersparnis**: Keine manuelle Dateneingabe

### Für Steuerberater:
- 🔍 **Vollständige Daten**: Alle Geschäftsvorfälle automatisch verfügbar
- 📋 **EXTF-Export**: Standardisierte DATEV-Datenformate
- 📊 **Real-time**: Aktuelle Daten statt monatliche Übertragung
- 🤝 **Integration**: Nahtlose Zusammenarbeit mit Mandanten

### Für Unternehmen:
- 📈 **Compliance**: DATEV-konforme Buchführung
- 💼 **B2B-Ready**: Professionelle Rechnungsstellung
- 🔄 **Automatisierung**: Weniger manuelle Arbeit
- 📊 **Reporting**: Bessere Geschäftsübersicht

## Technische Implementierung

```typescript
// Beispiel: EXTF-File Export
export async function exportToDatev(companyId: string, dateRange: DateRange) {
  const transactions = await getStripeTransactions(companyId, dateRange);
  const extfData = transformToExtfFormat(transactions);
  
  const response = await fetch('/api/datev/extf-files', {
    method: 'POST',
    body: JSON.stringify({ extfData, companyId })
  });
  
  return response.json();
}
```

## Nächste Schritte

1. **Sofort**: Token-Problem in organizations API beheben
2. **Diese Woche**: master-data:master-clients implementieren
3. **Nächste Woche**: accounting:extf-files für Stripe-Export
4. **Testing**: Mit Sandbox-Daten alle APIs testen
5. **Go-Live**: Schrittweise Aktivierung für Beta-User
