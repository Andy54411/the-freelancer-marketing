# Multi-Login System: Admin erstellt Mitarbeiter-Zugang

## Datum
16. Dezember 2025

## Kategorie
Feature

## Beschreibung
Das Multi-Login System wurde grundlegend überarbeitet. Statt dass Mitarbeiter sich selbst registrieren, erstellt der Firmen-Admin den Dashboard-Zugang direkt. Der Admin legt E-Mail-Adresse, Passwort und Berechtigungen fest. Der Mitarbeiter erhält seine Zugangsdaten per E-Mail.

## Änderungen

### Neuer Workflow
1. Admin öffnet Mitarbeiter-Dialog (UserPlus-Button)
2. System generiert sicheres Passwort (oder Admin setzt manuell)
3. Admin wählt Berechtigungsstufe (Basis/Erweitert/Manager)
4. System erstellt Firebase Auth Account
5. Mitarbeiter erhält E-Mail mit Zugangsdaten
6. Mitarbeiter loggt sich ein und sieht berechtigungs-basierte Sidebar

### Berechtigungsstufen
- **Basis**: Dienstplan, Zeiterfassung, Kalender
- **Erweitert**: + Aufträge, Kunden, Auswertungen
- **Manager**: Voller Zugang inkl. Finanzen und Mitarbeiter

### 17 individuelle Berechtigungen
overview, personal, employees, shiftPlanning, timeTracking, absences, evaluations, orders, quotes, invoices, customers, calendar, workspace, finance, expenses, inventory, settings

### Technische Änderungen
- `dashboardAccess.authUid` statt `linkedUserId`
- Firebase Admin SDK erstellt Accounts serverseitig
- linkedCompanies Array für Multi-Firma-Zugang
- Automatische Passwort-Generierung mit Sicherheitskriterien

## Betroffene Dateien
- `/src/app/api/company/[uid]/employees/invite/route.ts` - Komplett neu geschrieben
- `/src/components/personal/EmployeeInviteDialog.tsx` - Komplett neu geschrieben
- `/src/services/personalService.ts` - dashboardAccess Interface aktualisiert
- `/src/app/api/auth/check-company-links/route.ts` - Für neues System angepasst
- `/src/app/dashboard/company/[uid]/personal/employees/page.tsx` - Button-Bedingung aktualisiert

## Migration
Bestehende `linkedUserId` Felder werden nicht automatisch migriert. Neue Zugangs-Erstellungen nutzen das neue `authUid` Feld.

## Status
Implementiert
