# Mitarbeiter-Berechtigungen bearbeiten

**Datum:** 17.12.2025  
**Typ:** Feature  
**Status:** Implementiert

## Zusammenfassung

Administratoren können nun die Dashboard-Berechtigungen von Mitarbeitern nachträglich bearbeiten. Ein neuer Dialog ermöglicht das Anpassen einzelner Berechtigungen oder das Anwenden von Vorlagen (Basis, Erweitert, Manager).

## Neue Funktionen

### 1. PATCH API-Endpunkt
- Neuer `PATCH /api/company/[uid]/employees/invite` Endpunkt
- Aktualisiert Berechtigungen in:
  - Mitarbeiter-Dokument (`dashboardAccess.permissions`)
  - User-Dokument (`linkedCompanies[].permissions`)
- Zod-Validierung aller Eingaben

### 2. EmployeePermissionsDialog Komponente
- Neue Dialog-Komponente zum Bearbeiten von Berechtigungen
- Drei Vorlagen zur Schnellauswahl:
  - **Basis:** Übersicht, Dienstplanung, Zeiterfassung, Abwesenheit, Kalender, Workspace, Einstellungen
  - **Erweitert:** + Mein Bereich, Auswertungen, Aufträge, Kunden, Lagerverwaltung
  - **Manager:** Alle Berechtigungen
- Kategorisierte Ansicht (Allgemein, Personal, Geschäft)
- Einzeln anpassbare 17 Berechtigungen

### 3. UI-Integration
- Neuer Schild-Button in der Mitarbeiterliste
- Nur sichtbar bei Mitarbeitern mit aktivem Dashboard-Zugang
- Lila Farbgebung zur Unterscheidung vom Einlade-Button (blau)

## Betroffene Dateien

### Geändert
- `/src/app/api/company/[uid]/employees/invite/route.ts` - PATCH-Methode hinzugefügt
- `/src/app/dashboard/company/[uid]/personal/employees/page.tsx` - Dialog-Integration

### Neu erstellt
- `/src/components/personal/EmployeePermissionsDialog.tsx` - Dialog-Komponente

## Technische Details

### Berechtigungsstruktur
```typescript
interface EmployeePermissions {
  overview: boolean;      // Dashboard-Übersicht
  personal: boolean;      // Mein Bereich
  employees: boolean;     // Mitarbeiterverwaltung
  shiftPlanning: boolean; // Dienstplanung
  timeTracking: boolean;  // Zeiterfassung
  absences: boolean;      // Urlaub & Abwesenheit
  evaluations: boolean;   // Auswertungen
  orders: boolean;        // Aufträge
  quotes: boolean;        // Angebote
  invoices: boolean;      // Rechnungen
  customers: boolean;     // Kunden
  calendar: boolean;      // Kalender
  workspace: boolean;     // Workspace
  finance: boolean;       // Finanzen
  expenses: boolean;      // Ausgaben
  inventory: boolean;     // Lagerverwaltung
  settings: boolean;      // Einstellungen
}
```

### API-Aufruf
```typescript
// Berechtigungen aktualisieren
const response = await fetch(`/api/company/${companyId}/employees/invite`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'employee-id',
    permissions: {
      overview: true,
      personal: true,
      // ... weitere Berechtigungen
    },
  }),
});
```

## Verwendung

1. Navigiere zu Personal -> Mitarbeiter
2. Suche den Mitarbeiter mit aktivem Dashboard-Zugang
3. Klicke auf das Schild-Symbol (lila)
4. Wähle eine Vorlage oder passe einzelne Berechtigungen an
5. Klicke auf "Speichern"

Die Änderungen werden sofort wirksam. Der Mitarbeiter muss sich neu anmelden, um die aktualisierten Berechtigungen zu sehen.
